-- Migration: Workers and token log tables
-- Created: 2025

-- Table: workers
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

-- Table: token_log
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

