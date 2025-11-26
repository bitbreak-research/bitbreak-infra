# Worker Metrics

> Documentation for real-time metrics reporting from Mac Mini workers

## Overview

Workers continuously report system metrics to the Master Server via WebSocket. These metrics are stored in Cloudflare D1 for monitoring, alerting, and historical analysis.

### Architecture

```
┌─────────────────┐                          ┌─────────────────┐
│    Mac Mini     │                          │  Master Server  │
│    (Worker)     │                          │  (CF Worker)    │
│                 │                          │                 │
│  ┌───────────┐  │      WSS Connection      │  ┌───────────┐  │
│  │  Metrics  │  │  ───────────────────────►│  │  Metrics  │  │
│  │ Collector │  │  { type: "metrics", ...} │  │  Handler  │  │
│  └───────────┘  │                          │  └─────┬─────┘  │
│       │         │                          │        │        │
│       ▼         │                          │        ▼        │
│  ┌───────────┐  │                          │  ┌───────────┐  │
│  │  System   │  │                          │  │    D1     │  │
│  │  Stats    │  │                          │  │  metrics  │  │
│  └───────────┘  │                          │  └───────────┘  │
└─────────────────┘                          └─────────────────┘
```

### Metrics Collected

| Metric | Type | Description |
|--------|------|-------------|
| `memory` | Integer | Memory usage in MB |
| `cpu` | Integer | CPU usage percentage (0-100) |
| `rate` | Integer | Current task processing rate (tasks/minute) |

---

## 1. Metrics Reporting Flow

### Normal Operation

```
  WORKER                                 SERVER
    │                                       │
    │  Every 30 seconds                     │
    │                                       │
    │  {                                    │
    │    "type": "metrics",                 │
    │    "memory": 4096,                    │
    │    "cpu": 45,                         │
    │    "rate": 12                         │
    │  }                                    │
    │──────────────────────────────────────►│
    │                                       │
    │                                       │  INSERT INTO metrics
    │                                       │  (worker_id, memory,
    │                                       │   cpu, rate)
    │                                       │
    │  {                                    │
    │    "type": "metrics_ack",             │
    │    "received": true                   │
    │  }                                    │
    │◄──────────────────────────────────────│
    │                                       │
    ▼                                       ▼
```

### Connection Timeline

```
Connect    Auth OK    Metrics    Metrics    Metrics
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
───┼──────────┼──────────┼──────────┼──────────┼─────────►
   0s         1s        31s        61s        91s      time
              │          │          │          │
              │          └──────────┴──────────┘
              │                 │
              │          Every 30 seconds
              │
        First metrics sent
        immediately after auth
```

---

## 2. Message Format

### Metrics Report (Worker → Server)

```json
{
  "type": "metrics",
  "memory": 4096,
  "cpu": 45,
  "rate": 12
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always `"metrics"` |
| `memory` | integer | Yes | Memory usage in MB (0 - 999999) |
| `cpu` | integer | Yes | CPU percentage (0 - 100) |
| `rate` | integer | Yes | Tasks per minute (0 - 999999) |

### Metrics Acknowledgment (Server → Worker)

```json
{
  "type": "metrics_ack",
  "received": true
}
```

### Metrics Error (Server → Worker)

```json
{
  "type": "metrics_error",
  "code": "INVALID_METRICS",
  "message": "CPU value must be between 0 and 100"
}
```

**Error Codes**

| Code | Description |
|------|-------------|
| `INVALID_METRICS` | One or more metric values are invalid |
| `RATE_LIMITED` | Too many metrics reports (throttled) |
| `NOT_AUTHENTICATED` | Metrics received before authentication |

---

## 3. Worker Implementation

### Collecting System Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                     WORKER METRICS COLLECTOR                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Memory Usage:                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ total_memory = os.totalmem()                        │    │
│  │ free_memory  = os.freemem()                         │    │
│  │ used_memory  = (total - free) / 1024 / 1024  → MB   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  CPU Usage:                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Sample CPU times at T0                              │    │
│  │ Wait 1 second                                       │    │
│  │ Sample CPU times at T1                              │    │
│  │ cpu_percent = (busy_delta / total_delta) * 100      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Task Rate:                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ tasks_completed_last_minute / 1  → tasks/min        │    │
│  │ (tracked internally by task executor)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Reporting Interval

| Scenario | Interval | Notes |
|----------|----------|-------|
| Normal operation | 30 seconds | Standard reporting |
| High CPU (>90%) | 30 seconds | No change (avoid overhead) |
| Idle (rate = 0) | 60 seconds | Reduced frequency when idle |
| Disconnected | — | Queue metrics, send on reconnect |

### Queuing During Disconnection

```
  WORKER                                 SERVER
    │                                       │
    │  Connection lost                      X
    │                                       
    │  Queue metrics locally                
    │  (max 10 entries)                     
    │                                       
    │  ┌─────────────────┐                  
    │  │ Metric @ T+0s   │                  
    │  │ Metric @ T+30s  │                  
    │  │ Metric @ T+60s  │                  
    │  └─────────────────┘                  
    │                                       │
    │  Reconnected                          │
    │──────────────────────────────────────►│
    │                                       │
    │  Send queued metrics (batch)          │
    │  {                                    │
    │    "type": "metrics_batch",           │
    │    "metrics": [...]                   │
    │  }                                    │
    │──────────────────────────────────────►│
    │                                       │
    ▼                                       ▼
```

---

## 4. Server Implementation

### Metrics Handler Flow

```
Incoming WebSocket Message
           │
           ▼
    ┌──────────────┐
    │ Authenticated?│───── No ────► Send metrics_error
    └──────┬───────┘                NOT_AUTHENTICATED
           │ Yes
           ▼
    ┌──────────────┐
    │ type = metrics│───── No ────► Handle other message
    └──────┬───────┘
           │ Yes
           ▼
    ┌──────────────┐
    │ Validate     │───── Error ──► Send metrics_error
    │ values       │                INVALID_METRICS
    └──────┬───────┘
           │ OK
           ▼
    ┌──────────────┐
    │ Rate limit   │───── Exceeded ► Send metrics_error
    │ check        │                 RATE_LIMITED
    └──────┬───────┘
           │ OK
           ▼
    ┌──────────────┐
    │ INSERT INTO  │
    │ D1 metrics   │
    └──────┬───────┘
           │
           ▼
    Send metrics_ack
```

### Validation Rules

```
memory:  integer, >= 0, <= 999999
cpu:     integer, >= 0, <= 100
rate:    integer, >= 0, <= 999999
```

### Rate Limiting

| Limit | Value | Action |
|-------|-------|--------|
| Max reports per minute | 10 | Reject with RATE_LIMITED |
| Min interval between reports | 5 seconds | Reject with RATE_LIMITED |

---

## 5. Database Schema

### Metrics Table

```sql
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id TEXT NOT NULL,
    memory INTEGER NOT NULL,
    cpu INTEGER NOT NULL,
    rate INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_worker ON metrics(worker_id);
CREATE INDEX idx_metrics_created ON metrics(created_at);
CREATE INDEX idx_metrics_worker_created ON metrics(worker_id, created_at);
```

### Migration File

Location: `migrations/0003_metrics_table.sql`

```sql
-- migrations/0003_metrics_table.sql

CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id TEXT NOT NULL,
    memory INTEGER NOT NULL,
    cpu INTEGER NOT NULL,
    rate INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metrics_worker ON metrics(worker_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created ON metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_worker_created ON metrics(worker_id, created_at);
```

Run with:
```bash
wrangler d1 migrations apply bb --local  # development
wrangler d1 migrations apply bb          # production
```

---

## 6. Worker Connection Status

### Concept

A worker is considered **disconnected** if its last metrics report exceeds a time threshold. This provides a simple health check mechanism based on metrics reporting.

### Connection States

```
                    Last Report Age
                          │
    ┌─────────────────────┴─────────────────────┐
    │                                           │
    ▼                                           ▼
< 2 minutes                               >= 2 minutes
    │                                           │
    ▼                                           ▼
┌───────────┐                             ┌──────────────┐
│ CONNECTED │                             │ DISCONNECTED │
│     ●     │                             │      ○       │
└───────────┘                             └──────────────┘
```

### Threshold

| State | Last Report Age | Description |
|-------|-----------------|-------------|
| `connected` | < 2 minutes | Worker is operating normally |
| `disconnected` | >= 2 minutes | Worker is considered offline |

### Detection Query

```sql
-- Get worker connection status based on last metrics report
SELECT 
    w.id,
    w.name,
    w.status,
    m.created_at as last_report,
    CASE
        WHEN m.created_at IS NULL THEN 'disconnected'
        WHEN datetime(m.created_at) > datetime('now', '-2 minutes') THEN 'connected'
        ELSE 'disconnected'
    END as connection_status
FROM workers w
LEFT JOIN (
    SELECT worker_id, MAX(created_at) as created_at
    FROM metrics
    GROUP BY worker_id
) m ON w.id = m.worker_id
WHERE w.status = 'active';
```

### Dashboard Indicator

```
┌─────────────────────────────────────────────────────────────────┐
│  Workers Overview                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MacMini-Office-01                              ● Connected     │
│  ├─ Memory: 4,096 MB | CPU: 45% | Rate: 12 tasks/min           │
│  └─ Last report: 15 seconds ago                                 │
│                                                                 │
│  MacMini-Office-02                              ○ Disconnected  │
│  ├─ Memory: 8,192 MB | CPU: 72% | Rate: 25 tasks/min           │
│  └─ Last report: 5 minutes ago                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. API Endpoints

### Get Latest Metrics

```http
GET /api/workers/:id/metrics/latest
Authorization: Bearer <admin_token>
```

**Response (200 OK)**

```json
{
  "worker_id": "wrk_a1b2c3d4e5f6",
  "memory": 4096,
  "cpu": 45,
  "rate": 12,
  "created_at": "2025-02-19T14:30:00Z"
}
```

### Get Metrics History

```http
GET /api/workers/:id/metrics?from=2025-02-19T00:00:00Z&to=2025-02-19T23:59:59Z&limit=100
Authorization: Bearer <admin_token>
```

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `from` | No | Start datetime (ISO 8601), default: 1 hour ago |
| `to` | No | End datetime (ISO 8601), default: now |
| `limit` | No | Max records to return (default: 100, max: 1000) |

**Response (200 OK)**

```json
{
  "worker_id": "wrk_a1b2c3d4e5f6",
  "from": "2025-02-19T14:00:00Z",
  "to": "2025-02-19T14:30:00Z",
  "metrics": [
    {
      "memory": 4000,
      "cpu": 42,
      "rate": 10,
      "created_at": "2025-02-19T14:00:00Z"
    },
    {
      "memory": 4100,
      "cpu": 45,
      "rate": 12,
      "created_at": "2025-02-19T14:00:30Z"
    }
  ]
}
```

### Get All Workers Status

```http
GET /api/workers/status
Authorization: Bearer <admin_token>
```

**Response (200 OK)**

```json
{
  "workers": [
    {
      "worker_id": "wrk_a1b2c3d4e5f6",
      "name": "MacMini-Office-01",
      "status": "active",
      "connected": true,
      "memory": 4096,
      "cpu": 45,
      "rate": 12,
      "last_report": "2025-02-19T14:30:00Z",
      "last_report_age_seconds": 15
    },
    {
      "worker_id": "wrk_b2c3d4e5f6g7",
      "name": "MacMini-Office-02",
      "status": "active",
      "connected": false,
      "memory": 8192,
      "cpu": 72,
      "rate": 25,
      "last_report": "2025-02-19T14:25:00Z",
      "last_report_age_seconds": 315
    }
  ]
}
```

---

## 8. Dashboard Display

### Real-time Workers View

```
┌─────────────────────────────────────────────────────────────────┐
│  Workers Overview                                    [Refresh]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MacMini-Office-01                              ● Connected     │
│  ├─ Memory: ████████░░░░░░░░ 4,096 MB                           │
│  ├─ CPU:    ████░░░░░░░░░░░░ 45%                                │
│  ├─ Rate:   12 tasks/min                                        │
│  └─ Last report: 15 seconds ago                                 │
│                                                                 │
│  MacMini-Office-02                              ○ Disconnected  │
│  ├─ Memory: ████████████░░░░ 8,192 MB                           │
│  ├─ CPU:    ███████░░░░░░░░░ 72%                                │
│  ├─ Rate:   25 tasks/min                                        │
│  └─ Last report: 5 minutes ago                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Connection Status Legend

```
● Connected    - Last report < 2 minutes ago
○ Disconnected - Last report >= 2 minutes ago
```

---

## 9. Configuration Reference

### Server Configuration

```yaml
# config/server.yaml
metrics:
  # Reporting
  expected_interval_seconds: 30
  max_reports_per_minute: 10
  min_interval_seconds: 5
  
  # Connection threshold (seconds)
  disconnect_threshold_seconds: 120    # 2 minutes
```

### Worker Configuration

```json
{
  "metrics": {
    "enabled": true,
    "interval_seconds": 30,
    "idle_interval_seconds": 60,
    "queue_max_size": 10
  }
}
```

---

## 10. Quick Reference

### Message Types Summary

| Message | Direction | Purpose |
|---------|-----------|---------|
| `metrics` | Worker → Server | Report current metrics |
| `metrics_batch` | Worker → Server | Report queued metrics after reconnect |
| `metrics_ack` | Server → Worker | Confirm metrics received |
| `metrics_error` | Server → Worker | Report validation/rate error |

### Metrics Fields

| Field | Type | Range | Unit |
|-------|------|-------|------|
| `memory` | int | 0-999999 | MB |
| `cpu` | int | 0-100 | % |
| `rate` | int | 0-999999 | tasks/min |

### Connection States

| State | Last Report Age | Indicator |
|-------|-----------------|-----------|
| `connected` | < 2 minutes | ● |
| `disconnected` | >= 2 minutes | ○ |

### Key Intervals

| Event | Value |
|-------|-------|
| Normal metrics report | 30 seconds |
| Idle metrics report | 60 seconds |
| Disconnect threshold | 2 minutes |
