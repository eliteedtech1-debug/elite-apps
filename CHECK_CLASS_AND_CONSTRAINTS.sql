-- Debug script to check class existence and database constraints
-- Run this to diagnose the assign_to_class error

-- Step 1: Check if the class exists
SELECT 'Checking if class CLS0199 exists:' as check_step;
SELECT 
    class_code,
    class_name,
    section,
    school_id,
    branch_id,
    status
FROM classes 
WHERE class_code = 'CLS0199' 
AND school_id = 'SCH/1' 
AND branch_id = 'BRCH00001';

-- Step 2: Check subjects table structure and constraints
SELECT 'Subjects table structure:' as check_step;
DESCRIBE subjects;

-- Step 3: Check if there are any existing subjects for this class
SELECT 'Existing subjects for class CLS0199:' as check_step;
SELECT 
    subject_code,
    subject,
    type,
    status,
    section
FROM subjects 
WHERE class_code = 'CLS0199' 
AND school_id = 'SCH/1' 
AND branch_id = 'BRCH00001'
LIMIT 10;

-- Step 4: Check type constraint
SELECT 'Checking type constraint:' as check_step;
SELECT 
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE TABLE_NAME = 'subjects' 
AND TABLE_SCHEMA = DATABASE();

-- Step 5: Test inserting a subject with null type (this might fail)
SELECT 'Testing null type insertion (this might show the error):' as check_step;
-- Uncomment the following to test:
/*
INSERT INTO subjects (
    subject_code, 
    subject, 
    school_id, 
    branch_id, 
    class_code, 
    section, 
    type, 
    status
) VALUES (
    'TEST001', 
    'Test Subject', 
    'SCH/1', 
    'BRCH00001', 
    'CLS0199', 
    'PRIMARY', 
    NULL,  -- This might cause the error
    'Active'
);
*/

-- Step 6: Show valid type values
SELECT 'Valid type values according to constraint:' as info;
SELECT 'core, science, art, commercial, technology, vocational, health, language, selective' as valid_types;

-- Step 7: Check if class CLS0199 needs to be created
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'CLASS MISSING: You need to create class CLS0199 first'
        ELSE CONCAT('CLASS EXISTS: ', class_name, ' in section ', section)
    END as class_status
FROM classes 
WHERE class_code = 'CLS0199' 
AND school_id = 'SCH/1' 
AND branch_id = 'BRCH00001';

-- Step 8: Suggested class creation (if needed)
SELECT 'If class is missing, run this INSERT:' as suggestion;
SELECT 'INSERT INTO classes (class_name, class_code, section, school_id, branch_id, status) VALUES ("Class CLS0199", "CLS0199", "PRIMARY", "SCH/1", "BRCH00001", "Active");' as create_class_sql;
