-- COMBINED SQL FILE FOR ALL UPDATES
-- This file contains all the SQL updates from individual .sql files
-- Plus the database schema from elite_yazid.sql and Ishaq-Changes.sql
-- Generated for easy execution on live database

-- START OF ADD_SUBJECT_COLUMNS.SQL
-- Add columns to the subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS subject_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS subject_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS subject_teacher VARCHAR(255),
ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS class_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS section VARCHAR(50),
ADD COLUMN IF NOT EXISTS semester VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

-- Create an index on subject_code for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(subject_code);

-- END OF ADD_SUBJECT_COLUMNS.SQL

-- START OF ADD_SUBJECT_COLUMNS_SAFE.SQL
-- Safe update to add columns to the subjects table
-- This version includes checks to prevent errors if columns already exist

-- First, check if columns exist before adding them
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME IN ('subject_category', 'subject_code', 'subject_teacher', 'teacher_id', 'class_level', 'section', 'semester', 'is_active', 'created_by', 'updated_by')
);

-- Only run ALTER statements if fewer than 10 of these columns exist
SET @sql = IF(@column_exists < 10, 
    'ALTER TABLE subjects 
    ADD COLUMN IF NOT EXISTS subject_category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS subject_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS subject_teacher VARCHAR(255),
    ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS class_level VARCHAR(50),
    ADD COLUMN IF NOT EXISTS section VARCHAR(50),
    ADD COLUMN IF NOT EXISTS semester VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50)',
    'SELECT "Columns already exist" as Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- END OF ADD_SUBJECT_COLUMNS_SAFE.SQL

-- START OF AUTO_FILL_BRANCH_ID_FROM_CLASSES.SQL
-- Auto fill branch_id in subjects table based on class associations
-- This script fills branch_id in subjects table by referencing the classes table

-- First, let's check what the current state is
SELECT COUNT(*) as missing_branch_ids FROM subjects WHERE branch_id IS NULL OR branch_id = '';

-- Update subjects branch_id based on class relationships
UPDATE subjects s
JOIN classes c ON s.class_code = c.class_code
SET s.branch_id = c.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND c.branch_id IS NOT NULL
AND c.branch_id != '';

-- Verify the update worked
SELECT COUNT(*) as remaining_missing_branch_ids FROM subjects WHERE branch_id IS NULL OR branch_id = '';

-- END OF AUTO_FILL_BRANCH_ID_FROM_CLASSES.SQL

-- START OF CHECK_CLASS_AND_CONSTRAINTS.SQL
-- Check table structure and constraints for subjects and classes tables
-- This file helps diagnose potential issues with class and subject relationships

-- Check subjects table structure
DESCRIBE subjects;

-- Check classes table structure
DESCRIBE classes;

-- Check for existence of necessary indexes
SHOW INDEX FROM subjects;

-- Check for foreign key constraints between subjects and classes if any
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE 
    REFERENCED_TABLE_NAME = 'classes' 
    AND TABLE_NAME = 'subjects';

-- Check for orphaned records in subjects that reference non-existent classes
SELECT 
    s.id, 
    s.subject_name, 
    s.class_code, 
    s.branch_id 
FROM 
    subjects s 
LEFT JOIN 
    classes c ON s.class_code = c.class_code 
WHERE 
    c.class_code IS NULL;

-- END OF CHECK_CLASS_AND_CONSTRAINTS.SQL

-- START OF CORRECTED_QUICK_FIX.SQL
-- Corrected version of the quick fix for subject branch_id issue
-- This addresses the issue where subjects were created without proper branch_id

-- Backup of current state before making changes
CREATE TABLE subjects_backup_before_fix AS SELECT * FROM subjects WHERE branch_id IS NULL OR branch_id = '';

-- Update subjects with missing branch_id using school_id as fallback
UPDATE subjects 
SET branch_id = school_id 
WHERE (branch_id IS NULL OR branch_id = '') 
AND school_id IS NOT NULL;

-- Verify the update
SELECT 
    COUNT(*) as total_records, 
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as still_missing_branch_id
FROM subjects;

-- Drop the backup table if the fix was successful
-- DROP TABLE subjects_backup_before_fix;

-- END OF CORRECTED_QUICK_FIX.SQL

-- START OF CORRECTED_UPDATE_BRANCH_IDS.SQL
-- Corrected update for branch_id in subjects table
-- Fixes issue where branch_id was missing from subjects records

-- Check for subjects with missing branch_id
SELECT 
    id, 
    subject_name, 
    class_code, 
    school_id,
    branch_id 
FROM subjects 
WHERE branch_id IS NULL OR branch_id = '';

-- Update branch_id by joining with classes table where possible
UPDATE subjects s
JOIN classes c ON s.class_code = c.class_code
SET s.branch_id = c.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND s.school_id = c.school_id;

-- Update remaining records where only school_id is available
UPDATE subjects
SET branch_id = school_id
WHERE (branch_id IS NULL OR branch_id = '')
AND school_id IS NOT NULL;

-- Final verification
SELECT 
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as still_missing_branch_id
FROM subjects;

-- END OF CORRECTED_UPDATE_BRANCH_IDS.SQL

-- START OF DEBUG_SUBJECT_CREATION.SQL
-- Debug script to test subject creation and branch_id assignment
-- This helps track the issue where branch_id is not properly assigned

-- Enable general query logging temporarily to track what happens when subjects are created
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/tmp/mysql_general.log';

-- Test subject insertion
INSERT INTO subjects (
    subject_name, 
    class_code, 
    section, 
    ca_mark, 
    exam_mark, 
    subject_teacher, 
    teacher_id, 
    school_id, 
    branch_id, 
    is_active
) VALUES (
    'Test Subject',
    'GEN',
    'General',
    30,
    70,
    'Test Teacher',
    'TEACHER001',
    'SCHOOL001',
    'BRANCH001',
    TRUE
) ON DUPLICATE KEY UPDATE 
    subject_name = VALUES(subject_name),
    section = VALUES(section);

-- Check the newly inserted subject
SELECT * FROM subjects WHERE subject_name = 'Test Subject';

-- Disable general logging
SET GLOBAL general_log = 'OFF';

-- END OF DEBUG_SUBJECT_CREATION.SQL

-- START OF FIX_SELECT_BILLS_PROCEDURE.SQL
-- Fix for the select_bills stored procedure to handle branch filtering correctly
-- Addresses issue where bills were not properly filtered by branch

DELIMITER $$

DROP PROCEDURE IF EXISTS select_bills$$

CREATE PROCEDURE select_bills(
    IN p_query_type VARCHAR(100),
    IN p_admission_no VARCHAR(50),
    IN p_class_code VARCHAR(20),
    IN p_student_name VARCHAR(100),
    IN p_term VARCHAR(20),
    IN p_academic_year VARCHAR(20),
    IN p_branch_id VARCHAR(100),
    IN p_status VARCHAR(20),
    IN p_item_code BIGINT,
    IN p_ref_no INT,
    IN p_school_id VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_query_type = 'select-all' THEN
        -- Main query with proper branch filtering
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM 
            bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id)
            AND (p_status IS NULL OR p_status = 'All' OR b.status = p_status)
            AND (p_term IS NULL OR p_term = '' OR b.term = p_term)
            AND (p_academic_year IS NULL OR p_academic_year = '' OR b.academic_year = p_academic_year)
            AND (p_class_code IS NULL OR p_class_code = '' OR b.class_name = p_class_code)
            AND (p_student_name IS NULL OR p_student_name = '' OR s.student_name LIKE CONCAT('%', p_student_name, '%'))
            AND (p_admission_no IS NULL OR p_admission_no = '' OR b.admission_no = p_admission_no)
            AND (p_item_code IS NULL OR p_item_code = 0 OR b.item_code = p_item_code)
            AND (p_ref_no IS NULL OR p_ref_no = 0 OR b.ref_no = p_ref_no)
        ORDER BY 
            b.created_at DESC;
            
    ELSEIF p_query_type = 'select-by-admission' THEN
        -- Query for a specific student with branch filtering
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM 
            bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            b.admission_no = p_admission_no
            AND (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id)
        ORDER BY 
            b.created_at DESC;
            
    ELSEIF p_query_type = 'select-by-ref-no' THEN
        -- Query for a specific bill with branch filtering
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM 
            bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            b.ref_no = p_ref_no
            AND (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id);
            
    ELSE
        -- Default case: return all records that match branch and school
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM 
            bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id)
        ORDER BY 
            b.created_at DESC;
    END IF;
END$$

DELIMITER ;

-- END OF FIX_SELECT_BILLS_PROCEDURE.SQL

-- START OF HANDLE_ORPHANED_SUBJECTS.SQL
-- Handle orphaned subjects that don't match any existing class
-- This script identifies and fixes subjects that reference non-existent classes

-- Identify orphaned subjects
SELECT 
    s.id,
    s.subject_name,
    s.class_code,
    s.school_id,
    s.branch_id
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
WHERE c.class_code IS NULL AND s.class_code IS NOT NULL AND s.class_code != '';

-- Option 1: Update orphaned subjects to use a default class if they exist
UPDATE subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
SET s.class_code = 'GEN'
WHERE c.class_code IS NULL 
AND s.class_code IS NOT NULL 
AND s.class_code != ''
AND EXISTS(SELECT 1 FROM classes WHERE class_code = 'GEN' AND school_id = s.school_id);

-- Option 2: Create missing classes (this would need to be handled separately in code)

-- Option 3: Mark orphaned subjects as inactive
UPDATE subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
SET s.is_active = FALSE
WHERE c.class_code IS NULL 
AND s.class_code IS NOT NULL 
AND s.class_code != '';

-- Verify the cleanup
SELECT 
    COUNT(*) as total_subjects,
    SUM(CASE WHEN s.class_code IS NOT NULL AND c.class_code IS NULL THEN 1 ELSE 0 END) as still_orphaned_subjects
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id;

-- END OF HANDLE_ORPHANED_SUBJECTS.SQL

-- START OF MIGRATE_SUBJECTS_TABLE.SQL
-- Migration script for subjects table to add branch_id and update existing records
-- This is a comprehensive script to ensure all subjects have proper branch_id

-- Step 1: Add branch_id column if it doesn't exist
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS branch_id VARCHAR(100) DEFAULT NULL;

-- Step 2: Create a temporary mapping table to establish class->branch relationships
CREATE TEMPORARY TABLE class_branch_map AS
SELECT DISTINCT 
    class_code, 
    school_id, 
    branch_id
FROM classes
WHERE branch_id IS NOT NULL;

-- Step 3: Update subjects with branch_id from classes where possible
UPDATE subjects s
JOIN class_branch_map cb ON s.class_code = cb.class_code AND s.school_id = cb.school_id
SET s.branch_id = cb.branch_id
WHERE s.branch_id IS NULL OR s.branch_id = '';

-- Step 4: For remaining subjects without branch_id, use school_id as default
UPDATE subjects
SET branch_id = school_id
WHERE branch_id IS NULL OR branch_id = '';

-- Step 5: Verify the migration
SELECT 
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as subjects_without_branch_id
FROM subjects;

-- Step 6: Add an index on branch_id for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_branch_id ON subjects(branch_id);

-- Step 7: Add foreign key constraint if needed (optional)
-- ALTER TABLE subjects ADD CONSTRAINT fk_subjects_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id);

-- END OF MIGRATE_SUBJECTS_TABLE.SQL

-- START OF QUICK_FIX_SUBJECTS.sql
-- Quick fix script to populate missing branch_id in subjects table
-- This is a minimal script to fix the immediate issue

-- Update subjects where branch_id is missing, using school_id as default
UPDATE subjects 
SET branch_id = school_id 
WHERE branch_id IS NULL OR branch_id = '';

-- END OF QUICK_FIX_SUBJECTS.sql

-- START OF SAFE_MIGRATE_SUBJECTS_TABLE.SQL
-- Safe migration script for subjects table to add branch_id
-- Includes checks and backups before making changes

-- Create a backup of the current subjects table before making changes
CREATE TABLE subjects_backup_safe_migration AS SELECT * FROM subjects;

-- Check if branch_id column exists, if not create it
SET @branch_col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'branch_id'
);

SET @alter_sql = IF(@branch_col_exists = 0,
    'ALTER TABLE subjects ADD COLUMN branch_id VARCHAR(100) DEFAULT NULL',
    'SELECT "branch_id column already exists" as Message'
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Before updating, count records that need fixing
SELECT 
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as missing_branch_id_count
FROM subjects;

-- Perform the update with a transaction to ensure safety
START TRANSACTION;

UPDATE subjects 
SET branch_id = school_id 
WHERE branch_id IS NULL OR branch_id = '';

-- Verify the update worked
SELECT 
    COUNT(*) as total_subjects_after,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as remaining_missing_branch_id
FROM subjects;

COMMIT;

-- END OF SAFE_MIGRATE_SUBJECTS_TABLE.SQL

-- START OF SIMPLE_AUTO_FILL_BRANCH_ID.SQL
-- Simple script to auto-fill branch_id in subjects table
-- Uses school_id as a fallback when branch_id is missing

UPDATE subjects
SET branch_id = school_id
WHERE branch_id IS NULL OR branch_id = '';

-- END OF SIMPLE_AUTO_FILL_BRANCH_ID.SQL

-- START OF SIMPLE_MIGRATE_SUBJECTS.SQL
-- Simple migration to add branch_id to subjects table and fill with school_id

-- Add the branch_id column if it doesn't exist
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS branch_id VARCHAR(100);

-- Fill any missing branch_id values with school_id
UPDATE subjects
SET branch_id = school_id
WHERE branch_id IS NULL;

-- END OF SIMPLE_MIGRATE_SUBJECTS.SQL

-- START OF SIMPLE_UPDATE_BRANCH_IDS.SQL
-- Simple update to populate missing branch_id values in subjects table

UPDATE subjects
SET branch_id = school_id
WHERE branch_id = '' OR branch_id IS NULL;

-- END OF SIMPLE_UPDATE_BRANCH_IDS.SQL

-- START OF SIMPLE_WORKING_UPDATE.SQL
-- Simple working update to fix branch_id in subjects table

UPDATE subjects 
SET branch_id = school_id 
WHERE (branch_id = '' OR branch_id IS NULL) 
AND school_id IS NOT NULL;

-- END OF SIMPLE_WORKING_UPDATE.SQL

-- START OF STUDENT_TYPE_MIGRATION.sql
-- Migration script to update student_type values to use standardized values

-- First, check the current distribution of student_type values
SELECT 
    student_type,
    COUNT(*) as count
FROM students
GROUP BY student_type
ORDER BY count DESC;

-- Update non-standard values to standardized ones
UPDATE students 
SET student_type = 'Returning'
WHERE student_type IN ('returning', 'returning_student', 'Returnee', 'Old Student', '');

-- Add 'Fresh' for new students if they have a flag
-- This assumes new students might be identifiable by admission_date being recent
-- or some other criteria depending on your business logic

-- Add 'Alumni' for students with graduated status (if graduation_date exists)
-- UPDATE students SET student_type = 'Alumni' WHERE graduation_date IS NOT NULL;

-- Add a check to verify the update worked
SELECT 
    student_type,
    COUNT(*) as count
FROM students
GROUP BY student_type
ORDER BY count DESC;

-- END OF STUDENT_TYPE_MIGRATION.sql

-- START OF UPDATE_BRANCH_IDS_SUBJECTS.SQL
-- Comprehensive script to update branch_id in subjects table
-- Ensures all subjects have proper branch_id based on class relationships

-- Update subjects by joining with classes to get the correct branch_id
UPDATE subjects s
JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
SET s.branch_id = c.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = '' OR s.branch_id != c.branch_id)
AND c.branch_id IS NOT NULL
AND c.branch_id != '';

-- For any remaining subjects without branch_id, use school_id as fallback
UPDATE subjects
SET branch_id = school_id
WHERE branch_id IS NULL OR branch_id = '';

-- Verify the update
SELECT 
    'Final verification:' as status_check,
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as subjects_without_branch_id
FROM subjects;

-- END OF UPDATE_BRANCH_IDS_SUBJECTS.SQL

-- START OF UPDATE_EXISTING_SUBJECTS_BRANCH_ID.sql
-- Script to update existing subjects with missing branch_id

-- Check current state
SELECT 
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as subjects_missing_branch_id
FROM subjects;

-- Update missing branch_id using school_id as default
UPDATE subjects
SET branch_id = school_id
WHERE branch_id IS NULL OR branch_id = '';

-- Verify update worked
SELECT 
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as subjects_still_missing_branch_id
FROM subjects;

-- END OF UPDATE_EXISTING_SUBJECTS_BRANCH_ID.sql

-- START OF URGENT_FIX_SELECT_BILLS.SQL
-- Urgent fix for the select_bills procedure to address branch filtering issues

DELIMITER $$

DROP PROCEDURE IF EXISTS select_bills$$

CREATE PROCEDURE select_bills(
    IN p_query_type VARCHAR(100),
    IN p_admission_no VARCHAR(50),
    IN p_class_code VARCHAR(20),
    IN p_student_name VARCHAR(100),
    IN p_term VARCHAR(20),
    IN p_academic_year VARCHAR(20),
    IN p_branch_id VARCHAR(100),
    IN p_status VARCHAR(20),
    IN p_item_code BIGINT,
    IN p_ref_no INT,
    IN p_school_id VARCHAR(20)
)
BEGIN
    -- Local variables
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_error_message TEXT DEFAULT '';
    
    -- Error handler
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_error_message = MESSAGE_TEXT;
        RESIGNAL;
    END;

    -- Main logic based on query type
    IF p_query_type = 'select-all' THEN
        -- Fetch all bills with proper branch filtering
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id)
            AND (p_status IS NULL OR p_status = 'All' OR b.status = p_status)
            AND (p_term IS NULL OR p_term = '' OR b.term = p_term)
            AND (p_academic_year IS NULL OR p_academic_year = '' OR b.academic_year = p_academic_year)
            AND (p_class_code IS NULL OR p_class_code = '' OR b.class_name = p_class_code)
            AND (p_student_name IS NULL OR p_student_name = '' OR s.student_name LIKE CONCAT('%', p_student_name, '%'))
            AND (p_admission_no IS NULL OR p_admission_no = '' OR b.admission_no = p_admission_no)
            AND (p_item_code IS NULL OR p_item_code = 0 OR b.item_code = p_item_code)
            AND (p_ref_no IS NULL OR p_ref_no = 0 OR b.ref_no = p_ref_no)
        ORDER BY b.created_at DESC, b.ref_no DESC;
        
    ELSEIF p_query_type = 'select-by-admission' THEN
        -- Fetch bills for a specific student
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            b.admission_no = p_admission_no
            AND (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id)
        ORDER BY b.created_at DESC, b.ref_no DESC;
        
    ELSEIF p_query_type = 'select-by-ref-no' THEN
        -- Fetch bill by reference number
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            b.ref_no = p_ref_no
            AND (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id);
        
    ELSE
        -- Default case: return all relevant records
        SELECT 
            b.ref_no,
            b.item_code,
            b.description,
            b.class_name,
            b.admission_no,
            b.term,
            b.academic_year,
            b.payment_mode,
            b.due_date,
            b.payment_date,
            b.qty,
            b.amount,
            b.amount_paid,
            b.discount,
            b.fines,
            b.status,
            b.created_at,
            b.updated_at,
            b.school_id,
            b.branch_id,
            s.student_name,
            s.parent_name,
            s.parent_phone,
            s.parent_email
        FROM bills b
        LEFT JOIN students s ON b.admission_no = s.admission_no
        WHERE 
            (p_branch_id IS NULL OR p_branch_id = '' OR b.branch_id = p_branch_id)
            AND (p_school_id IS NULL OR p_school_id = '' OR b.school_id = p_school_id)
        ORDER BY b.created_at DESC, b.ref_no DESC;
    END IF;
END$$

DELIMITER ;

-- END OF URGENT_FIX_SELECT_BILLS.SQL

-- START OF WORKING_AUTO_FILL_BRANCH_ID.SQL
-- Working script to auto-fill branch_id in subjects table
-- This version includes proper validation and error handling

-- First, create a temporary backup to ensure we can rollback if needed
-- CREATE TEMPORARY TABLE temp_subjects_backup AS SELECT * FROM subjects WHERE branch_id IS NULL OR branch_id = '';

-- Update branch_id for subjects by joining with classes table
UPDATE subjects s
JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
SET s.branch_id = c.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = '');

-- For any remaining subjects without branch_id, use school_id as fallback
UPDATE subjects
SET branch_id = school_id
WHERE branch_id IS NULL OR branch_id = '';

-- Verify the update worked correctly
SELECT 
    'Verification Results:' as validation_step,
    COUNT(*) as total_subjects,
    SUM(CASE WHEN branch_id IS NOT NULL AND branch_id != '' THEN 1 ELSE 0 END) as subjects_with_branch_id,
    SUM(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 ELSE 0 END) as subjects_still_without_branch_id
FROM subjects;

-- Clean up: drop the backup if validation passes
-- DROP TEMPORARY TABLE IF EXISTS temp_subjects_backup;

-- END OF WORKING_AUTO_FILL_BRANCH_ID.SQL

-- START OF ELITE_YAZID.SQL EXTRACT
-- This contains the database structure from elite_yazid.sql

-- Database: `elite_yazid`
-- Note: This is a simplified extraction focusing on key procedures and tables

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `academic_year` (IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(50), IN `in_section_id` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_year` VARCHAR(50), IN `in_begin_date` VARCHAR(50), IN `in_end_date` VARCHAR(50), IN `in_status` VARCHAR(20))   
BEGIN
IF in_query_type = 'create' THEN
INSERT INTO `academic_calendar`(`academic_year`, `term`, `begin_date`, `end_date`, `status`, `school_id`, `section_id`) VALUES (in_year,in_term,date(in_begin_date),date(in_end_date),'active',in_school_id,in_section_id);

ELSEIF in_query_type = 'select' THEN
SELECT * FROM academic_calendar;

ELSEIF in_query_type = 'selectByid' THEN
SELECT * FROM academic_calendar WHERE school_id=in_school_id;

END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `account_chart` (IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_account_type` VARCHAR(100), IN `in_school_id` VARCHAR(11))   
BEGIN
    -- Handle 'create' operation
    IF query_type = "create" THEN
        INSERT INTO `account_chart`(
            `description`, `amount`, `term`, `section`, `class_name`,
            `revenue_type`, `account_type`, `is_optional`, `status`, `school_id`
        )
        VALUES (
            in_description, in_amount, in_term, in_section, in_class_name,
            in_revenue_type, in_account_type, in_is_optional, in_status, in_school_id
        );

    ELSEIF query_type = "update" THEN
    UPDATE `account_chart`
    SET
        `description` = COALESCE(in_description, `description`),
        `amount` = COALESCE(in_amount, `amount`),
        `term` = COALESCE(in_term, `term`),
        `section` = COALESCE(in_section, `section`),
        `class_name` = COALESCE(in_class_name, `class_name`),
        `revenue_type` = COALESCE(in_revenue_type, `revenue_type`),
        `account_type` = COALESCE(in_account_type, `account_type`),
        `is_optional` = COALESCE(in_is_optional, `is_optional`),
        `status` = COALESCE(in_status, `status`),
        `school_id` = COALESCE(in_school_id, `school_id`)
    WHERE `code` = in_id;

    -- Handle 'select-all' operation
    ELSEIF query_type = "select-all" THEN
        SELECT * FROM account_chart;

    -- Handle 'select' operation with dynamic filtering
    ELSEIF query_type = "select" THEN
        SET @query = 'SELECT * FROM account_chart';
        SET @where_clause = '';

        -- Filter by section
        IF in_section IS NOT NULL AND in_section != '' THEN
            SET @where_clause = CONCAT(@where_clause, 'section = "', in_section, '"');
        END IF;

        -- Filter by class name, including 'All Classes'
        IF in_class_name IS NOT NULL AND in_class_name != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('class_name = "', in_class_name, '" OR class_name = "All Classes"'),
                CONCAT(@where_clause, ' AND (class_name = "', in_class_name, '" OR class_name = "All Classes")')
            );
        END IF;

        -- Filter by term, including specific term and Each Term
        IF in_term IS NOT NULL AND in_term != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('(term = "', in_term, '" OR term = "Each Term")'),
                CONCAT(@where_clause, ' AND (term = "', in_term, '" OR term = "Each Term")')
            );
        END IF;

        -- Apply filters if any exist
        IF @where_clause != '' THEN
            SET @query = CONCAT(@query, ' WHERE ', @where_clause);
        END IF;

        SET @sql = CONCAT(@query, ';');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    END IF;
END$$

DELIMITER ;

-- END OF ELITE_YAZID.SQL EXTRACT

-- START OF ISHAQ_CHANGES.SQL EXTRACT
-- This contains key changes from Ishaq-Changes.sql

-- 29/3/2025
ALTER TABLE `character_traits` ADD `id` INT NOT NULL AUTO_INCREMENT FIRST, ADD UNIQUE (`id`);
ALTER TABLE `character_scores` CHANGE `category` `category` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;

DELIMITER $$
DROP PROCEDURE `get_class_results`$$
CREATE PROCEDURE `get_class_results`(
    IN `query_type` VARCHAR(30),
    IN `in_admission_no` VARCHAR(30),
    IN `in_class_name` VARCHAR(30),
    IN `in_academic_year` VARCHAR(30),
    IN `in_term` VARCHAR(30),
    IN `in_school_id` VARCHAR(30))
BEGIN
  IF query_type = 'Select Class Reports' THEN
    SELECT *
    FROM exam_reports
    WHERE school_id = in_school_id
      AND class_name = in_class_name
      AND academic_year = in_academic_year
      AND term = in_term
    ORDER BY student_name DESC;

  ELSEIF query_type = 'Select Joined Class Reports' THEN
    SELECT
      s.current_class AS class_name,
      s.admission_no,
      s.student_name,
        COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count, -- Count distinct subjects
        COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count,
    SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) AS avg_score, -- Avoid division by zero
    RANK() OVER (ORDER BY SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) DESC) AS position,
      COALESCE(MAX(e.academic_year), '') AS academic_year,  -- Use MAX to avoid splitting rows
      COALESCE(MAX(e.term), '') AS term,
      COALESCE(SUM(e.ca1Score), 0) AS total_assignment_score,
      COALESCE(SUM(e.ca2Score), 0) AS total_ca_score,
      COALESCE(SUM(e.examScore), 0) AS total_exam_score,
      COALESCE(SUM(e.total_score), 0) AS total_score,
      s.school_id AS school_id
    FROM students s
    LEFT JOIN exam_reports e
        ON s.admission_no = e.admission_no
        AND s.current_class = e.class_name
    WHERE
      s.school_id = in_school_id
      AND s.current_class = in_class_name
    GROUP BY
      s.current_class,
      s.admission_no,
      s.student_name,
      s.school_id
    ORDER BY s.student_name DESC;

  ELSEIF query_type = 'Select Class Summary' THEN
    SELECT
        student_name,
        admission_no,
        SUM(total_score) AS total_score,
        COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count,
    SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) AS avg_score, -- Avoid division by zero
    RANK() OVER (ORDER BY SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) DESC) AS position
FROM exam_reports
    WHERE school_id = in_school_id
      AND class_name = in_class_name
      AND academic_year = in_academic_year
    GROUP BY student_name, admission_no
    ORDER BY total_score DESC;

  ELSEIF query_type = 'Select Student Report' THEN
    SELECT
        admission_no,
        SUM(total_score) AS total_score,
       COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count -- Added subjects_count
    FROM exam_reports
    WHERE admission_no = in_admission_no
    GROUP BY admission_no
    ORDER BY total_score DESC;

  ELSEIF query_type = 'Select Student Draft' THEN
    SELECT * FROM `exam_reports` WHERE admission_no= in_admission_no;

  END IF;
END$$
DELIMITER ;

ALTER TABLE `students` CHANGE `school_location` `branch_id` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;
ALTER TABLE `school_locations` ADD `primary_phone` VARCHAR(20) NULL DEFAULT NULL AFTER `admin_id`, ADD `secondary_phone` VARCHAR(20) NULL DEFAULT NULL AFTER `primary_phone`, ADD `email` VARCHAR(60) NULL DEFAULT NULL AFTER `secondary_phone`, ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `email`, ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `school_locations` ADD INDEX(`branch_id`);
ALTER TABLE `students` ADD `class_name` VARCHAR(50) NOT NULL AFTER `current_class`;

DELIMITER $$
DROP PROCEDURE IF EXISTS `students_queries`$$
CREATE  PROCEDURE `students_queries`(
    IN `query_type` VARCHAR(30),
    IN `p_id` INT,
    IN `p_parent_id` VARCHAR(20),
    IN `p_guardian_id` INT,
    IN `p_student_name` VARCHAR(255),
    IN `p_home_address` TEXT,
    IN `p_date_of_birth` DATE,
    IN `p_sex` VARCHAR(10),
    IN `p_religion` VARCHAR(50),
    IN `p_tribe` VARCHAR(50),
    IN `p_state_of_origin` VARCHAR(100),
    IN `p_l_g_a` VARCHAR(100),
    IN `p_nationality` VARCHAR(100),
    IN `p_last_school_attended` VARCHAR(100),
    IN `p_special_health_needs` VARCHAR(100),
    IN `p_blood_group` VARCHAR(100),
    IN `p_admission_no` VARCHAR(50),
    IN `p_admission_date` DATE,
    IN `p_academic_year` VARCHAR(20),
    IN `p_status` VARCHAR(100),
    IN `p_section` VARCHAR(100),
    IN `p_mother_tongue` VARCHAR(100),
    IN `p_language_known` VARCHAR(100),
    IN `p_current_class` VARCHAR(50),
    IN `p_profile_picture` VARCHAR(300),
    IN `p_medical_condition` VARCHAR(300),
    IN `p_transfer_certificate` VARCHAR(500),
    IN `p_school_location` VARCHAR(300),
    IN `in_school_id` INT(11))
BEGIN
    DECLARE code CHAR(5) DEFAULT '00000';
    DECLARE msg TEXT;
    DECLARE rows INT;
    DECLARE result TEXT;

    -- Declare exception handler
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            code = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    END;

    IF query_type = 'create' THEN
        -- Insert the student record
        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion,
            tribe, state_of_origin, l_g_a, nationality, last_school_attended, special_health_needs,
            blood_group, admission_no, admission_date, academic_year, status, section, mother_tongue,
            language_known, current_class, profile_picture, medical_condition, transfer_certificate,
            school_location, school_id, password
        ) VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion,
            p_tribe, p_state_of_origin, p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs,
            p_blood_group, p_admission_no, p_admission_date, p_academic_year, p_status, p_section, p_mother_tongue,
            p_language_known, p_current_class, p_profile_picture, p_medical_condition, p_transfer_certificate,
            p_school_location, in_school_id,
            CASE WHEN p_admission_no IS NULL OR p_admission_no = '' THEN NULL ELSE SHA2(CONCAT(p_admission_no, p_admission_no), 256) END
        );

        -- Check for errors after insert
        IF code != '00000' THEN
            SELECT code AS 'Return Code', msg AS 'Message';
        ELSE
            SELECT '00000' AS 'Return Code', 'Student record created successfully!' AS 'Message';
        END IF;

    ELSEIF query_type = 'update' THEN
        -- Update the student record
        UPDATE students SET
            parent_id = COALESCE(p_parent_id, parent_id),
            guardian_id = COALESCE(p_guardian_id, guardian_id),
            student_name = COALESCE(p_student_name, student_name),
            home_address = COALESCE(p_home_address, home_address),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            sex = COALESCE(p_sex, sex),
            religion = COALESCE(p_religion, religion),
            tribe = COALESCE(p_tribe, tribe),
            state_of_origin = COALESCE(p_state_of_origin, state_of_origin),
            l_g_a = COALESCE(p_l_g_a, l_g_a),
            nationality = COALESCE(p_nationality, nationality),
            last_school_attended = COALESCE(p_last_school_attended, last_school_attended),
            special_health_needs = COALESCE(p_special_health_needs, special_health_needs),
            blood_group = COALESCE(p_blood_group, blood_group),
            admission_date = COALESCE(p_admission_date, admission_date),
            academic_year = COALESCE(p_academic_year, academic_year),
            status = COALESCE(p_status, status),
            section = COALESCE(p_section, section),
            mother_tongue = COALESCE(p_mother_tongue, mother_tongue),
            language_known = COALESCE(p_language_known, language_known),
            current_class = COALESCE(p_current_class, current_class),
            profile_picture = COALESCE(p_profile_picture, profile_picture),
            medical_condition = COALESCE(p_medical_condition, medical_condition),
            transfer_certificate = COALESCE(p_transfer_certificate, transfer_certificate),
            school_location = COALESCE(p_school_location, school_location),
            updated_at = NOW()
        WHERE admission_no = p_admission_no AND school_id = in_school_id;

        -- Check for errors after update
        IF code != '00000' THEN
            SELECT code AS 'Return Code', msg AS 'Message';
        ELSE
            SELECT ROW_COUNT() INTO rows;
            IF rows > 0 THEN
                SELECT '00000' AS 'Return Code', CONCAT(rows, ' Student record(s) updated successfully!') AS 'Message';
            ELSE
                SELECT '02000' AS 'Return Code', 'No matching Student record found to update!' AS 'Message';
            END IF;
        END IF;

    ELSEIF query_type = 'select-all' THEN
        -- Select all students for the school with branch filtering
        SELECT 
            s.id,
            s.parent_id,
            s.guardian_id,
            s.student_name,
            s.home_address,
            s.date_of_birth,
            s.sex,
            s.religion,
            s.tribe,
            s.state_of_origin,
            s.l_g_a,
            s.nationality,
            s.last_school_attended,
            s.special_health_needs,
            s.blood_group,
            s.admission_no,
            s.admission_date,
            s.academic_year,
            s.status,
            s.section,
            s.mother_tongue,
            s.language_known,
            s.current_class,
            s.profile_picture,
            s.medical_condition,
            s.transfer_certificate,
            s.school_location,
            s.school_id,
            s.password,
            s.created_at,
            s.updated_at,
            p.fullname AS parent_name,
            p.phone_no AS parent_phone,
            p.email AS parent_email
        FROM students s
        LEFT JOIN parents p ON s.parent_id = p.id
        WHERE s.school_id = in_school_id
        ORDER BY s.student_name ASC;

    ELSEIF query_type = 'select-by-admission' THEN
        -- Select a specific student by admission number
        SELECT 
            s.id,
            s.parent_id,
            s.guardian_id,
            s.student_name,
            s.home_address,
            s.date_of_birth,
            s.sex,
            s.religion,
            s.tribe,
            s.state_of_origin,
            s.l_g_a,
            s.nationality,
            s.last_school_attended,
            s.special_health_needs,
            s.blood_group,
            s.admission_no,
            s.admission_date,
            s.academic_year,
            s.status,
            s.section,
            s.mother_tongue,
            s.language_known,
            s.current_class,
            s.profile_picture,
            s.medical_condition,
            s.transfer_certificate,
            s.school_location,
            s.school_id,
            s.password,
            s.created_at,
            s.updated_at,
            p.fullname AS parent_name,
            p.phone_no AS parent_phone,
            p.email AS parent_email
        FROM students s
        LEFT JOIN parents p ON s.parent_id = p.id
        WHERE s.admission_no = p_admission_no AND s.school_id = in_school_id;

    END IF; 
END$$
DELIMITER ;

-- END OF ISHAQ_CHANGES.SQL EXTRACT

-- FINAL COMMAND TO VERIFY EXECUTION
SELECT 'All SQL updates have been combined into this single file!' AS status_message,
       NOW() AS execution_timestamp;