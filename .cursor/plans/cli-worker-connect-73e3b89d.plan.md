---
name: Implement CLI Worker Connect Flow
overview: ""
todos:
  - id: 4b50c69c-b6ef-49bf-9eb0-1ac0b4bcc834
    content: Remove unused menu options and handlers from CLI
    status: pending
  - id: af9d948d-3d32-49e4-9011-b503f31f80de
    content: Change config dir to ~/.bb-worker with new schema
    status: pending
  - id: 0e3c9c11-0599-4fa1-8b47-2cbff8bf05fc
    content: Modify callback to handle worker config instead of API key
    status: pending
  - id: e505bea4-3ea3-4484-8666-811f3482666f
    content: Create WorkerConnectModal component for accepting connections
    status: pending
  - id: 74500277-30d7-4ff8-a091-f028ece86d83
    content: Create WorkerConnectController to manage modal from URL params
    status: pending
  - id: e7fa3a57-0f73-4ea7-8acd-e21aad40aea4
    content: Integrate modal controller into workers page
    status: pending
  - id: 51c5f069-3bd0-4dd1-856f-0acb051cf47d
    content: Update mock-worker to read from ~/.bb-worker/config.json
    status: pending
  - id: 1dde8041-7b85-4d1f-8e65-4829f7ac4d17
    content: Add mock-worker spawning to CLI after successful config
    status: pending
---

# Implement CLI Worker Connect Flow

## 1. Update CLI Package

### Simplify CLI Menu ([`packages/cli/src/cli-menu.ts`](packages/cli/src/cli-menu.ts))

- Remove Dashboard, Logs, and Settings options from main menu
- Keep only "Connect To Web" and "Exit" options
- Remove all handler functions except `handleConnectWeb()`
- Update `handleConnectWeb()` to:
  - Call `connectToWeb()` to open browser and wait for worker config
  - After receiving config, prompt user if they want to start the mock-worker
  - If yes, spawn mock-worker process from `packages/mock-worker/`
  - Display success message with worker details

### Update Config Storage ([`packages/cli/src/utils/config-storage.ts`](packages/cli/src/utils/config-storage.ts))

- Change `CONFIG_DIR` from `~/.bb-lite` to `~/.bb-worker`
- Update config interface to store worker configuration:
  - `worker_id`: string
  - `token`: string
  - `server_url`: string (default: `ws://localhost:8787/ws`)
- Add `saveWorkerConfig(workerId: string, token: string, serverUrl: string)` function
- Add `getWorkerConfig()` function to retrieve full config

### Update Web Connect ([`packages/cli/src/utils/web-connect.ts`](packages/cli/src/utils/web-connect.ts))

- Change callback to receive worker config instead of API key
- Update callback handler to expect: `workerId`, `token`, `serverUrl` parameters
- Update `connectToWeb()` return type to return full worker config object
- Change `EXTERNAL_WEB_URL` to point to `/workers` page (will show modal if has callback params)
- Update success/error pages to reflect worker connection instead of API key

## 2. Update Web Package

### Create Worker Connect Modal Component ([`packages/web/src/features/workers/components/WorkerConnectModal.tsx`](packages/web/src/features/workers/components/WorkerConnectModal.tsx) - NEW)

- Accept props: `callbackUrl`, `token`, `onClose`
- Display modal with worker name input form
- On submit:
  - Call existing `createWorker` API with the name
  - On success, send worker config back to CLI via callback URL:
    - Format: `{callbackUrl}?token={token}&workerId={id}&apiToken={token}&serverUrl=ws://localhost:8787/ws`
  - Show success state in modal
  - Close modal after 2 seconds

### Update Workers Page ([`packages/web/src/pages/workers.astro`](packages/web/src/pages/workers.astro))

- Check URL for `callback` and `token` query parameters
- If present, pass them to a new `WorkerConnectModal` component
- The modal will overlay the existing workers page

### Add Modal Controller Component ([`packages/web/src/features/workers/components/WorkerConnectController.tsx`](packages/web/src/features/workers/components/WorkerConnectController.tsx) - NEW)

- SolidJS component that:
  - Reads URL params for `callback` and `token`
  - Manages modal open/close state
  - Renders `WorkerConnectModal` when params are present
  - Checks authentication status first (redirect to login if needed with `redirect` param)

## 3. Update Mock Worker

### Update Config Reading ([`packages/mock-worker/index.js`](packages/mock-worker/index.js))

- Change `CONFIG_FILE` from `./config.json` to `~/.bb-worker/config.json` (using `homedir()`)
- Update to read `worker_id` and `token` from new config structure
- Keep fallback to environment variables if config file doesn't exist

## 4. Update Dependencies

### CLI Package ([`packages/cli/package.json`](packages/cli/package.json))

- Ensure necessary dependencies are present (all should already be there)
- May need to add `node:os` for homedir in mock-worker spawning

## Key Implementation Details

- **Authentication Flow**: When CLI opens `/workers?callback=...&token=...`, middleware will check if user is logged in. If not, redirect to `/login?redirect=/workers?callback=...&token=...`
- **Config Format** (saved to `~/.bb-worker/config.json`):
  ```json
  {
    "worker_id": "wrk_...",
    "token": "tk_...",
    "server_url": "ws://localhost:8787/ws"
  }
  ```

- **Mock Worker Spawning**: Use `spawn('node', [mockWorkerPath], { detached: true, stdio: 'inherit' })`
- **No New API Routes**: Use existing `POST /api/workers` route through web proxy