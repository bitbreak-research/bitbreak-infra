-- Migration: Extend metrics table with additional fields
-- Created: 2025

-- Add new columns to metrics table
ALTER TABLE metrics ADD COLUMN mnemonic_language TEXT;
ALTER TABLE metrics ADD COLUMN threads INTEGER;
ALTER TABLE metrics ADD COLUMN batch_size INTEGER;
ALTER TABLE metrics ADD COLUMN gpu_enabled INTEGER DEFAULT 0;
ALTER TABLE metrics ADD COLUMN gpu_batch_size INTEGER;
ALTER TABLE metrics ADD COLUMN report_interval_seconds INTEGER;
ALTER TABLE metrics ADD COLUMN keep_address INTEGER DEFAULT 0;
ALTER TABLE metrics ADD COLUMN power_level TEXT;

