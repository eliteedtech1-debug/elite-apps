-- Add missing academic_year and term columns to ca_setup table
-- These columns are required by the API but missing from the current table structure
-- This will fix the error: "Unknown column 'cs.academic_year' in 'where clause'"

ALTER TABLE `ca_setup` 
ADD COLUMN `academic_year` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Academic year for the CA setup',
ADD COLUMN `term` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Term for the CA setup';

-- Update any existing records to have appropriate default values if needed
-- UPDATE ca_setup SET academic_year = '2024/2025', term = 'First Term' WHERE academic_year IS NULL;