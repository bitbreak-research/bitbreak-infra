---
name: Durable Objects Implementation
overview: Implement Cloudflare Durable Objects to manage WebSocket connections per worker with hibernation support, and simplify connection status tracking by removing database fields in favor of Durable Object as the single source of truth.
todos:
  - id: create-do-class
    content: Create WorkerConnection Durable Object class with hibernation
    status: completed
  - id: update-wrangler
    content: Update wrangler.jsonc with Durable Object bindings
    status: completed
  - id: update-types
    content: Add WORKER_CONNECTIONS binding to TypeScript types
    status: completed
  - id: create-migration
    content: Create migration to remove connection fields from database
    status: completed
  - id: refactor-ws-route
    content: Refactor WebSocket route to use Durable Objects
    status: completed
  - id: update-workers-api
    content: Update workers API routes to query Durable Objects
    status: completed
  - id: update-status-endpoint
    content: Refactor GET /workers/status to use Durable Objects
    status: completed
  - id: update-scheduled
    content: Remove stale connection detection from scheduled tasks
    status: completed
  - id: update-frontend-types
    content: Remove connection timestamp fields from frontend types
    status: completed
  - id: update-tests
    content: Update and create tests for Durable Object implementation
    status: completed
  - id: export-do
    content: Export Durable Object class in index.ts
    status: completed
---

# Durable Objects Implementation for WebSocket Management

## Overview

Replace the in-memory Map-based WebSocket connection tracking with Cloudflare Durable Objects. Each worker will have its own Durable Object instance that persists WebSocket connections and manages connection state with hibernation support for cost optimization.

## Architecture Changes

**Current State:**

- WebSocket connections tracked in `activeConnections` Map (lost on restart)
- `is_connected`, `last_connected_at`, `last_disconnected_at` fields in database
- Connection status checked against both database and in-memory Map

**New State:**

- One Durable Object instance per worker (keyed by worker ID)
- Durable Object is the single source of truth for connection status
- Database fields removed - query Durable Object for real-time connection status
- WebSocket hibernation enabled for cost optimization

## Implementation Steps

### 1. Create Durable Object Class

Create [`packages/api/src/durable-objects/WorkerConnection.ts`](packages/api/src/durable-objects/WorkerConnection.ts):

```typescript
export class WorkerConnection extends DurableObject {
  private state: DurableObjectState
  private env: Env
  private sessions: Set<WebSocket>
  private workerId: string
  private authenticated: boolean = false

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.state = state
    this.env = env
    this.sessions = new Set()
    this.state.blockConcurrencyWhile(async () => {
      // Load persisted state on initialization
      this.workerId = await this.state.storage.get('workerId') || ''
      this.authenticated = await this.state.storage.get('authenticated') || false
    })
  }

  // Hibernation API handlers
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) { ... }
  async webSocketClose(ws: WebSocket, code: number, reason: string) { ... }
  async webSocketError(ws: WebSocket, error: unknown) { ... }

  async fetch(request: Request) {
    // Handle HTTP requests (connection check, send message)
  }
}
```

Key features:

- Hibernation handlers (`webSocketMessage`, `webSocketClose`, `webSocketError`)
- Persistent storage for worker ID and auth status
- Track multiple sessions per worker (reconnection support)
- HTTP endpoints: `/connect` (upgrade to WebSocket), `/status` (check connection), `/send` (send message)

### 2. Update Wrangler Configuration

Update [`packages/api/wrangler.jsonc`](packages/api/wrangler.jsonc):

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "WORKER_CONNECTIONS",
        "class_name": "WorkerConnection",
        "script_name": "api"
      }
    ]
  }
}
```

Add to migrations section if deploying to production:

```jsonc
{
  "new_classes": ["WorkerConnection"]
}
```

### 3. Update TypeScript Bindings

Update [`packages/api/types/worker-configuration.d.ts`](packages/api/types/worker-configuration.d.ts):

```typescript
interface CloudflareBindings {
  bb: D1Database
  JWT_SECRET: string
  WORKER_CONNECTIONS: DurableObjectNamespace
}
```

### 4. Create Database Migration

Create [`packages/api/migrations/0007_remove_connection_fields.sql`](packages/api/migrations/0007_remove_connection_fields.sql):

```sql
-- Remove connection tracking fields (now managed by Durable Objects)
ALTER TABLE workers DROP COLUMN is_connected;
ALTER TABLE workers DROP COLUMN last_connected_at;
ALTER TABLE workers DROP COLUMN last_disconnected_at;
```

### 5. Refactor WebSocket Route

Update [`packages/api/src/routes/ws.ts`](packages/api/src/routes/ws.ts):

**Remove:**

- `activeConnections` Map
- `sendMessageToWorker()` function
- `isWorkerConnected()` function
- All `is_connected` database updates

**Add:**

- Route `/ws/:workerId` that forwards to Durable Object
- Get Durable Object stub: `env.WORKER_CONNECTIONS.get(env.WORKER_CONNECTIONS.idFromName(workerId))`
- Forward WebSocket upgrade request to Durable Object

**Example:**

```typescript
ws.get('/ws/:workerId', async (c) => {
  const workerId = c.req.param('workerId')
  const id = c.env.WORKER_CONNECTIONS.idFromName(workerId)
  const stub = c.env.WORKER_CONNECTIONS.get(id)
  return stub.fetch(c.req.raw)
})
```

### 6. Update Workers API Routes

Update [`packages/api/src/routes/workers.ts`](packages/api/src/routes/workers.ts):

**Changes needed:**

- Remove `is_connected` from all database queries
- Add helper function `getWorkerConnectionStatus(workerId: string)` that queries Durable Object
- Update `POST /workers/:id/start` and `POST /workers/:id/stop` to send messages via Durable Object
- Update `GET /workers` to fetch connection status from Durable Objects (batch query)
- Update `GET /workers/:id` to include connection status from Durable Object

**Helper function:**

```typescript
async function getWorkerConnectionStatus(
  env: Bindings,
  workerId: string
): Promise<{ connected: boolean }> {
  const id = env.WORKER_CONNECTIONS.idFromName(workerId)
  const stub = env.WORKER_CONNECTIONS.get(id)
  const response = await stub.fetch(new Request('http://do/status'))
  return response.json()
}
```

### 7. Update GET /workers/status Endpoint

Refactor [`packages/api/src/routes/workers.ts`](packages/api/src/routes/workers.ts) line 124-203:

**Current:** Determines connection status based on last metrics report age (< 2 minutes = connected)

**New approach:**

1. Query workers and latest metrics (same as before)
2. For each worker, query its Durable Object for real-time connection status
3. Return combined data with actual WebSocket connection status

### 8. Update Scheduled Tasks

Update [`packages/api/src/scheduled.ts`](packages/api/src/scheduled.ts):

**Remove:** Stale connection detection logic (database-based)

**Keep:** Token expiration checks and other scheduled tasks

Connection staleness is now handled automatically by Durable Object WebSocket lifecycle.

### 9. Update Frontend Types

Update [`packages/web/src/lib/api/workers.ts`](packages/web/src/lib/api/workers.ts):

**Remove from interfaces:**

- `last_connected_at` field from `Worker` interface (line 10)
- `last_disconnected_at` field from `WorkerDetail` interface (line 22)

Keep `is_connected` in frontend (API still returns it, sourced from Durable Object).

### 10. Update Tests

Update [`packages/api/test/workers.test.ts`](packages/api/test/workers.test.ts):

**Changes:**

- Mock Durable Object bindings in test environment
- Remove assertions on `is_connected`, `last_connected_at`, `last_disconnected_at` database fields
- Add tests for Durable Object WebSocket lifecycle
- Update connection status tests to expect Durable Object queries

Create [`packages/api/test/durable-objects.test.ts`](packages/api/test/durable-objects.test.ts) for WorkerConnection class tests.

## Benefits

1. **Persistence:** Connections survive worker restarts (within DO lifetime)
2. **Consistency:** Single source of truth for connection state
3. **Scalability:** Each worker gets isolated Durable Object instance
4. **Cost Optimization:** Hibernation reduces costs for idle connections
5. **Simpler Logic:** No database sync, no stale connection detection
6. **Real-time Status:** Query Durable Object directly for current connection state

## Migration Path

1. Deploy Durable Object class and updated routes
2. Run database migration to remove fields (safe because DO is now source of truth)
3. Existing workers will reconnect and create their Durable Object instances
4. Monitor Durable Object metrics in Cloudflare dashboard

## Files Changed

**Backend:**

- `packages/api/src/durable-objects/WorkerConnection.ts` (new)
- `packages/api/wrangler.jsonc`
- `packages/api/types/worker-configuration.d.ts`
- `packages/api/migrations/0007_remove_connection_fields.sql` (new)
- `packages/api/src/routes/ws.ts`
- `packages/api/src/routes/workers.ts`
- `packages/api/src/scheduled.ts`
- `packages/api/src/index.ts` (export Durable Object)

**Frontend:**

- `packages/web/src/lib/api/workers.ts`

**Tests:**

- `packages/api/test/workers.test.ts`
- `packages/api/test/durable-objects.test.ts` (new)

**Documentation:**

- Update `docs/worker-metrics.md` to reflect Durable Object architecture