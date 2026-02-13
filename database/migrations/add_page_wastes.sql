-- Migration: Add page_wastes column to production_records table
-- Date: 2026-02-13
-- Description: Add new column to track wasted pages/copies

USE mmcl_production;

-- Check if column doesn't already exist and add it
ALTER TABLE production_records 
ADD COLUMN page_wastes INT DEFAULT 0 AFTER plate_consumption;

-- Verify the column was added
SHOW COLUMNS FROM production_records WHERE Field = 'page_wastes';
