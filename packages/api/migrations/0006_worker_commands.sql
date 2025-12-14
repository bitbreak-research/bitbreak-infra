-- Migration: Worker commands queue
-- Created: 2025
-- Purpose: Store pending commands for workers to avoid WebSocket cross-request I/O issues

CREATE TABLE IF NOT EXISTS worker_commands (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL,
    command_type TEXT NOT NULL,  -- 'engine_start', 'engine_stop'
    payload TEXT,  -- JSON string with command parameters
    status TEXT DEFAULT 'pending',  -- 'pending', 'delivered', 'failed'
    created_at TEXT DEFAULT (datetime('now')),
    delivered_at TEXT,
    error_message TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_commands_worker ON worker_commands(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_commands_status ON worker_commands(status);
CREATE INDEX IF NOT EXISTS idx_worker_commands_created ON worker_commands(created_at);


