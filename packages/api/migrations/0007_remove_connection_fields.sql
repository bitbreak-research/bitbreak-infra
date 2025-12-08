-- Migration: Remove connection tracking fields (now managed by Durable Objects)
-- Created: 2025
-- 
-- Connection state is now managed entirely by Durable Objects.
-- The Durable Object is the single source of truth for connection status.

-- Remove connection tracking columns from workers table
-- Note: SQLite doesn't support DROP COLUMN directly in all versions
-- We need to use the ALTER TABLE ... DROP COLUMN syntax (supported in SQLite 3.35.0+)
-- For older SQLite versions, a table recreation would be needed

-- Drop the connection-related columns
ALTER TABLE workers DROP COLUMN is_connected;
ALTER TABLE workers DROP COLUMN last_connected_at;
ALTER TABLE workers DROP COLUMN last_disconnected_at;

