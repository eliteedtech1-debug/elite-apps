-- Migration: Update recitations table to use class_code and class_name
-- Date: 2025-12-06
-- Description: Rename class_id to class_code and add class_name column

-- Rename class_id to class_code
ALTER TABLE recitations CHANGE COLUMN class_id class_code VARCHAR(50) NOT NULL;

-- Add class_name column
ALTER TABLE recitations ADD COLUMN class_name VARCHAR(255) NOT NULL DEFAULT '';

-- Update indexes (drop old, create new)
ALTER TABLE recitations DROP INDEX IF EXISTS recitations_class_id;
ALTER TABLE recitations ADD INDEX recitations_class_code (class_code);
