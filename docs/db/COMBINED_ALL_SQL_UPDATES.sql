-- COMBINED SQL FILE FOR ALL UPDATES
-- This file contains all the SQL updates from individual .sql files
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