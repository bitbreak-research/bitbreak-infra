-- Migration: Metrics table
-- Created: 2025

-- Table: metrics
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

