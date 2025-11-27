# Connect Machine

> Documentation for connecting Mac Mini workers to the Master Server

## Overview

This document describes the authentication and connection system between Mac Mini workers and the central Master Server. The system uses a single-token approach with automatic renewal to ensure continuous operation without manual intervention.

### Architecture

```
┌─────────────┐         WSS          ┌─────────────────┐
│  Mac Mini   │◄────────────────────►│  Master Server  │
│  (Worker)   │     Authenticated    │  (CF Worker)    │
└─────────────┘      Connection      └─────────────────┘
       │                                     │
       │ config.json                         │ Cloudflare D1
       │ - worker_id                         │ - workers table
       │ - token                             │ - token_log table
       └─────────────────────────────────────┘
```

### Key Concepts

| Term | Description |
|------|-------------|
| **Worker** | A Mac Mini machine that executes tasks |
| **Master Server** | Central server that orchestrates all workers |
| **Token** | Authentication credential with 90-day lifetime |
| **Renewal Zone** | Last 7 days before token expiration |

---

## 1. Worker Registration

Workers are created by an administrator through the Master Server dashboard. Self-registration is not supported.

### Flow

```
    ADMIN                           SERVER                    
      │                                │                        
      │  POST /api/workers             │                        
      │  {                             │                        
      │    "name": "MacMini-Office-01" │                        
      │  }                             │                        
      │───────────────────────────────►│                        
      │                                │                        
      │                                │  Generates:            
      │                                │  - worker_id (unique)  
      │                                │  - token (secure)      
      │                                │  - expires_at (+90d)   
      │                                │                        
      │  {                             │                        
      │    "worker_id": "wrk_...",     │                        
      │    "token": "tk_...",          │                        
      │    "expires_at": "2025-05-20T" │                        
      │  }                             │                        
      │◄───────────────────────────────│                        
      │                                │                        
      ▼                                │                        
   Copy credentials                    │
   Configure Mac Mini                  │
```

### API Reference

#### Create Worker

```http
POST /api/workers
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "MacMini-Office-01"
}
```

**Response (201 Created)**

```json
{
  "worker_id": "wrk_a1b2c3d4e5f6",
  "name": "MacMini-Office-01",
  "token": "tk_x7y8z9w0v1u2t3s4r5q6p7o8n9m0l1k2j3i4h5g6f7e8d9c0",
  "expires_at": "2025-05-20T14:30:00Z",
  "created_at": "2025-02-19T14:30:00Z"
}
```

> ⚠️ **Important**: The token is only shown once at creation time. Store it securely.

### Token Format

```
tk_<random_64_characters>

Prefix: tk_           → Identifies as worker token
Random: 64 chars      → Cryptographically secure random string
```

---

## 2. Worker Configuration

After registration, the Mac Mini must be configured with the credentials.

### Configuration File

Location: `~/.mac-mini-worker/config.json`

```json
{
  "server_url": "wss://master-server.example.com",
  "worker_id": "wrk_a1b2c3d4e5f6",
  "token": "tk_x7y8z9w0v1u2t3s4r5q6p7o8n9m0l1k2j3i4h5g6f7e8d9c0"
}
```

| Field | Description |
|-------|-------------|
| `server_url` | WebSocket URL of the Master Server (must be `wss://`) |
| `worker_id` | Unique identifier assigned during registration |
| `token` | Authentication token (auto-updated on renewal) |

### File Permissions

```bash
chmod 600 ~/.mac-mini-worker/config.json
```

The configuration file contains sensitive credentials and should only be readable by the worker process owner.

---

## 3. WebSocket Connection

Workers connect to the Master Server using secure WebSocket (WSS).

### Connection Flow

```
  WORKER                               SERVER                    
    │                                     │                       
    │  1. WSS Connect                     │                       
    │  wss://server.example.com/ws        │                       
    │────────────────────────────────────►│                       
    │                                     │                       
    │  2. Send Auth Message               │                       
    │  {                                  │                       
    │    "type": "auth",                  │                       
    │    "worker_id": "wrk_...",          │                       
    │    "token": "tk_..."                │                       
    │  }                                  │                       
    │────────────────────────────────────►│                       
    │                                     │                       
    │                                     │  3. Validate:         
    │                                     │  - Token exists?      
    │                                     │  - Not expired?       
    │                                     │  - Matches worker_id? 
    │                                     │  - Not revoked?       
    │                                     │                       
    │  4. Auth Response                   │                       
    │  { "type": "auth_ok", ... }         │                       
    │◄────────────────────────────────────│                       
    │                                     │                       
    │  5. Begin Normal Operation          │                       
    │  (heartbeats, tasks, etc.)          │                       
    │◄───────────────────────────────────►│                       
    ▼                                     ▼                       
```

### Message Types

#### Authentication Request (Worker → Server)

```json
{
  "type": "auth",
  "worker_id": "wrk_a1b2c3d4e5f6",
  "token": "tk_x7y8z9w0v1u2t3s4r5q6p7o8n9m0l1k2j3i4h5g6f7e8d9c0"
}
```

#### Authentication Success (Server → Worker)

```json
{
  "type": "auth_ok",
  "worker_id": "wrk_a1b2c3d4e5f6",
  "name": "MacMini-Office-01",
  "token_expires_at": "2025-05-20T14:30:00Z",
  "server_time": "2025-02-19T14:30:00Z"
}
```

#### Authentication Error (Server → Worker)

```json
{
  "type": "auth_error",
  "code": "INVALID_TOKEN",
  "message": "Token is invalid or has expired"
}
```

**Error Codes**

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | Token does not exist or is malformed |
| `TOKEN_EXPIRED` | Token has passed its expiration date |
| `WORKER_NOT_FOUND` | Worker ID does not exist |
| `WORKER_REVOKED` | Worker has been revoked by administrator |
| `TOKEN_MISMATCH` | Token does not belong to this worker |

### Connection Timeout

- Worker must send `auth` message within **10 seconds** of connecting
- Server closes connection if no auth message is received

---

## 4. Token Auto-Renewal

Tokens are automatically renewed by the server when approaching expiration. This ensures workers remain connected indefinitely without manual intervention.

### Token Lifecycle

```
Day 0                      Day 83                    Day 90
  │                           │                         │
  ▼                           ▼                         ▼
┌───────────────────────────────────────────────────────────┐
│                      TOKEN LIFETIME                       │
├─────────────────────────────┬─────────────────────────────┤
│      Normal Operation       │      Renewal Zone           │
│         (83 days)           │        (7 days)             │
└─────────────────────────────┴─────────────────────────────┘
                              │
                              │  Server detects expiration approaching
                              │  → Sends new token to worker
                              │  → Worker saves and confirms
                              │  → Old token is invalidated
                              │  → New 90-day cycle begins
```

### Renewal Flow

```
  WORKER                               SERVER                    
    │                                     │                       
    │                                     │  Detects:             
    │                                     │  Token expires in     
    │                                     │  < 7 days             
    │                                     │                       
    │                                     │  Generates:           
    │                                     │  - New token          
    │                                     │  - New expiration     
    │                                     │                       
    │  Token Renewal Message              │                       
    │  {                                  │                       
    │    "type": "token_renewal",         │                       
    │    "new_token": "tk_new...",        │                       
    │    "expires_at": "2025-08-18T..."   │                       
    │  }                                  │                       
    │◄────────────────────────────────────│                       
    │                                     │                       
    │  Worker:                            │                       
    │  1. Saves new token to config.json  │                       
    │  2. Updates in-memory token         │                       
    │                                     │                       
    │  Acknowledgment                     │                       
    │  {                                  │                       
    │    "type": "token_renewal_ack",     │                       
    │    "success": true                  │                       
    │  }                                  │                       
    │────────────────────────────────────►│                       
    │                                     │                       
    │                                     │  Server:              
    │                                     │  Invalidates old token
    │                                     │                       
    │  Connection continues               │                       
    │  (no reconnection needed)           │                       
    ▼                                     ▼                       
```

### Renewal Messages

#### Token Renewal (Server → Worker)

```json
{
  "type": "token_renewal",
  "new_token": "tk_new_token_here...",
  "expires_at": "2025-08-18T14:30:00Z"
}
```

#### Token Renewal Acknowledgment (Worker → Server)

```json
{
  "type": "token_renewal_ack",
  "success": true
}
```

#### Token Renewal Failure (Worker → Server)

```json
{
  "type": "token_renewal_ack",
  "success": false,
  "error": "Failed to write config file"
}
```

### Renewal Timing

| Parameter | Value |
|-----------|-------|
| Token lifetime | 90 days |
| Renewal zone | Last 7 days |
| ACK timeout | 24 hours |
| Retry interval | 1 hour |

---

## 5. Worker States

```
                    ┌─────────┐
                    │ CREATED │
                    └────┬────┘
                         │ First connection
                         ▼
┌─────────┐  auth   ┌─────────────────┐  auth_ok   ┌────────┐
│ OFFLINE │────────►│ AUTHENTICATING  │───────────►│ ONLINE │
└─────────┘         └─────────────────┘            └────────┘
     ▲                     │                           │
     │                auth_error                       │
     │                     │                      disconnect
     │                     ▼                           │
     │              ┌────────────┐                     │
     │              │  REJECTED  │                     │
     │              └────────────┘                     │
     │                                                 │
     └─────────────────────────────────────────────────┘
                    reconnect with backoff


                    Token Renewal Failure
                            │
                            ▼
                  ┌─────────────────┐
                  │ UPDATE_REQUIRED │
                  └─────────────────┘
                  (worker still connected,
                   needs manual intervention)
```

### State Descriptions

| State | Description |
|-------|-------------|
| `CREATED` | Worker registered but never connected |
| `OFFLINE` | Worker not currently connected |
| `AUTHENTICATING` | Connection open, awaiting auth validation |
| `ONLINE` | Authenticated and operational |
| `REJECTED` | Authentication failed |
| `REVOKED` | Administratively disabled |
| `UPDATE_REQUIRED` | Token renewal failed, needs manual intervention |

---

## 6. Edge Cases

### Case: Worker Fails to Save New Token

**Scenario**: Server sends renewal, worker cannot write to config.json

**Handling**:
1. Worker sends `token_renewal_ack` with `success: false`
2. Server marks worker status as `UPDATE_REQUIRED`
3. Server retains **both** old and new tokens as valid
4. Server retries renewal every hour
5. Dashboard shows worker needs manual intervention

```
  WORKER                               SERVER                    
    │                                     │                       
    │  { type: "token_renewal", ... }     │                       
    │◄────────────────────────────────────│                       
    │                                     │                       
    │  Cannot write to disk!              │                       
    │                                     │                       
    │  {                                  │                       
    │    "type": "token_renewal_ack",     │                       
    │    "success": false,                │                       
    │    "error": "Permission denied"     │                       
    │  }                                  │                       
    │────────────────────────────────────►│                       
    │                                     │                       
    │                                     │  Server:              
    │                                     │  - Keeps both tokens  
    │                                     │    valid temporarily  
    │                                     │  - Sets status to     
    │                                     │    UPDATE_REQUIRED    
    │                                     │                       
    │  Connection continues with          │                       
    │  original token                     │                       
    ▼                                     ▼                       
```

**Dashboard Indicator**:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  MacMini-Office-01                    UPDATE_REQUIRED   │
│      Token renewal failed: Permission denied                │
│      Last attempt: 2025-02-19 14:30:00                      │
│                                                             │
│      [Retry Renewal]  [Generate New Token]                  │
└─────────────────────────────────────────────────────────────┘
```

**Recovery**: When renewal eventually succeeds (either automatic retry or manual), the worker status returns to `active` and `renewal_failure_*` fields are cleared.

### Case: Administrator Revokes Worker

**Scenario**: Admin revokes a worker from the dashboard

**Handling**:
1. If worker is connected: server sends `revoked` message and closes connection
2. If worker is offline: next connection attempt is rejected
3. Token is permanently invalidated

```
  WORKER                               SERVER                    
    │                                     │                       
    │                                     │  Admin clicks         
    │                                     │  "Revoke Worker"      
    │                                     │                       
    │  {                                  │                       
    │    "type": "revoked",               │                       
    │    "reason": "Revoked by admin"     │                       
    │  }                                  │                       
    │◄────────────────────────────────────│                       
    │                                     │                       
    │  Connection closed                  │                       
    ▼                                     ▼                       
```

### Case: Duplicate Connection Attempt

**Scenario**: Same worker_id tries to connect while already connected

**Handling**:
1. Server rejects the new connection
2. Existing connection remains active
3. Useful for detecting misconfigured workers

```json
{
  "type": "auth_error",
  "code": "ALREADY_CONNECTED",
  "message": "This worker is already connected from another location"
}
```

---

## 7. Database Schema

### Workers Table

```sql
CREATE TABLE workers (
    -- Identity
    id TEXT PRIMARY KEY,                  -- wrk_a1b2c3d4e5f6
    name TEXT NOT NULL,                   -- "MacMini-Office-01"
    
    -- Current Token
    token_hash TEXT NOT NULL,             -- SHA-256 hash
    token_expires_at TEXT NOT NULL,       -- ISO 8601 timestamp
    
    -- Pending Token (during renewal)
    pending_token_hash TEXT,
    pending_token_expires_at TEXT,
    pending_token_created_at TEXT,
    
    -- Status
    status TEXT DEFAULT 'active',         -- active, revoked, update_required
    
    -- Renewal Failure Tracking
    renewal_failure_reason TEXT,          -- Error message from worker
    renewal_failure_at TEXT,
    renewal_retry_count INTEGER DEFAULT 0,
    
    -- Connection Info
    last_connected_at TEXT,
    last_disconnected_at TEXT,
    last_ip TEXT,
    is_connected INTEGER DEFAULT 0,       -- 0 = false, 1 = true
    
    -- Audit
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    revoked_at TEXT,
    revoked_by TEXT,
    revoke_reason TEXT
);

CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_token_expires ON workers(token_expires_at);
```

### Token Log Table (Audit)

```sql
CREATE TABLE token_log (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    event_type TEXT NOT NULL,             -- created, renewed, renewal_failed, revoked
    token_hash TEXT,                      -- Hash of affected token
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    metadata TEXT,                        -- JSON string with additional context
    
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX idx_token_log_worker ON token_log(worker_id);
CREATE INDEX idx_token_log_event ON token_log(event_type);
CREATE INDEX idx_token_log_created ON token_log(created_at);
```

### Migration File

Location: `migrations/0002_workers_tables.sql`

```sql
-- migrations/0002_workers_tables.sql

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_expires_at TEXT NOT NULL,
    pending_token_hash TEXT,
    pending_token_expires_at TEXT,
    pending_token_created_at TEXT,
    status TEXT DEFAULT 'active',
    renewal_failure_reason TEXT,
    renewal_failure_at TEXT,
    renewal_retry_count INTEGER DEFAULT 0,
    last_connected_at TEXT,
    last_disconnected_at TEXT,
    last_ip TEXT,
    is_connected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    revoked_at TEXT,
    revoked_by TEXT,
    revoke_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_token_expires ON workers(token_expires_at);

-- Token log table
CREATE TABLE IF NOT EXISTS token_log (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    token_hash TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    metadata TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_token_log_worker ON token_log(worker_id);
CREATE INDEX IF NOT EXISTS idx_token_log_event ON token_log(event_type);
CREATE INDEX IF NOT EXISTS idx_token_log_created ON token_log(created_at);
```

Run with:
```bash
wrangler d1 migrations apply bb --local  # development
wrangler d1 migrations apply bb          # production
```

---

## 8. Security Considerations

### Token Storage

- Tokens are stored as SHA-256 hashes in the database
- Raw tokens are never logged or stored on the server
- Only the worker possesses the raw token

### Transport Security

- All connections must use WSS (WebSocket Secure)
- TLS 1.2+ required
- Certificate validation enforced

### Token Generation

```
Token = "tk_" + crypto.randomBytes(48).toString('base64url')

Length: 67 characters total
Entropy: 384 bits
```

### Rate Limiting

| Action | Limit |
|--------|-------|
| Auth attempts per IP | 10/minute |
| Auth failures per worker | 5/hour |
| Token renewals | 1/day per worker |

## 9. Quick Reference

### Worker Lifecycle

1. **Register**: Admin creates worker in dashboard
2. **Configure**: Copy credentials to Mac Mini config file
3. **Connect**: Worker connects via WSS and authenticates
4. **Operate**: Normal operation with heartbeats and tasks
5. **Renew**: Token auto-renewed when approaching expiration
6. **Repeat**: Steps 4-5 continue indefinitely

### Important URLs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/workers` | Create new worker |
| `GET /api/workers` | List all workers |
| `DELETE /api/workers/:id` | Revoke worker |
| `POST /api/workers/:id/token` | Regenerate token (admin) |
| `wss://server/ws` | WebSocket connection |

### Message Types Summary

| Message | Direction | Purpose |
|---------|-----------|---------|
| `auth` | Worker → Server | Authenticate connection |
| `auth_ok` | Server → Worker | Authentication successful |
| `auth_error` | Server → Worker | Authentication failed |
| `token_renewal` | Server → Worker | New token issued |
| `token_renewal_ack` | Worker → Server | Confirm token saved |
| `revoked` | Server → Worker | Worker has been revoked |