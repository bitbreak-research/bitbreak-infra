<!-- c4f0a2b3-f8cb-4cdf-add1-b770b58da7a7 41d28b6a-e44d-4276-b8b2-78d0cc7d0d24 -->
# Implement Delete Worker Feature

## Overview

Transform the existing revoke functionality into a true delete feature that removes worker records from the database, making their credentials immediately invalid.

## Database Changes

The database already has the necessary CASCADE constraints:

- `token_log` table has `FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE`
- `metrics` table has `FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE`

When a worker is deleted, all related records are automatically removed.

## Backend Changes

### 1. Update DELETE endpoint in [`packages/api/src/routes/workers.ts`](packages/api/src/routes/workers.ts)

Current behavior (lines 237-278):

- Sets `status = 'revoked'`
- Updates `revoked_at` and `revoked_by`
- Logs revocation event
- Returns error if already revoked

New behavior:

- Delete worker record with `DELETE FROM workers WHERE id = ?`
- Log deletion event before deletion (token_log will cascade delete after)
- Allow deletion regardless of current status (remove status check)
- If worker is currently connected, the WebSocket will be closed on next message (ws.ts already handles non-existent workers at lines 118-125)

### 2. Update error handling

Add new error code in [`packages/api/src/lib/errors.ts`](packages/api/src/lib/errors.ts):

- Add `WORKER_DELETED: 'WORKER_004'` (shift existing codes)
- Add corresponding message

WebSocket handling already checks for worker existence and will send `WORKER_NOT_FOUND` error.

## Frontend Changes

### 1. Update API client in [`packages/web/src/lib/api/workers.ts`](packages/web/src/lib/api/workers.ts)

Rename function for clarity:

- Rename `revokeWorker()` to `deleteWorker()` (line 191)
- Update JSDoc comment

### 2. Update WorkersList component in [`packages/web/src/features/workers/components/WorkersList.tsx`](packages/web/src/features/workers/components/WorkersList.tsx)

Update UI text and behavior (lines 63-80, 242-248):

- Rename `handleRevoke()` to `handleDelete()`
- Update confirmation message: "Are you sure you want to delete this worker? This will permanently remove the worker and all its data."
- Update button text from "Revoke" to "Delete"
- Remove the check for `worker.status === 'revoked'` since workers can be deleted in any status
- Update error messages

## Implementation Details

### Deletion Flow

1. User clicks "Delete" button
2. Confirmation dialog appears
3. If confirmed, DELETE request sent to `/api/workers/:id`
4. Backend:

- Logs deletion event to `token_log`
- Deletes worker record: `DELETE FROM workers WHERE id = ?`
- Database automatically cascades delete to `token_log` and `metrics`

5. If worker is connected via WebSocket:

- Next message check in ws.ts will detect worker doesn't exist
- WebSocket sends `WORKER_NOT_FOUND` error and closes connection

6. Frontend refreshes worker list

### Security

- Deletion requires valid user session token (already enforced by middleware)
- Worker record is permanently removed, credentials immediately invalid
- No way to recover deleted worker (intentional)

## Files to Modify

1. `packages/api/src/routes/workers.ts` - Update DELETE endpoint logic
2. `packages/api/src/lib/errors.ts` - Add WORKER_DELETED error code (optional)
3. `packages/web/src/lib/api/workers.ts` - Rename revokeWorker to deleteWorker
4. `packages/web/src/features/workers/components/WorkersList.tsx` - Update UI text and handler

### To-dos

- [ ] Update DELETE endpoint to actually delete worker record from database
- [ ] Rename revokeWorker to deleteWorker in API client
- [ ] Update WorkersList component with delete terminology and remove status checks