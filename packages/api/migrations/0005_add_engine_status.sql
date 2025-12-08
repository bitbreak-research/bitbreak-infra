-- Migration: Add engine_status to metrics table
-- Created: 2025

-- Add engine_status column to track if worker engine is running or stopped
ALTER TABLE metrics ADD COLUMN engine_status TEXT DEFAULT 'stopped';

