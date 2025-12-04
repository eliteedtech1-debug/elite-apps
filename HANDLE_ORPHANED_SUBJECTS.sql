-- Handle subjects that couldn't be auto-filled from classes table
-- This script deals with subjects that have class_codes not found in classes table

-- Step 1: Find orphaned subjects (subjects with class_codes not in classes table)
SELECT 'Orphaned subjects (class_code not found in classes table):' as info;
SELECT 
    s.subject_code,
    s.subject,
    s.school_id,
    s.class_code,
    s.section,
    'Class not found in classes table' as issue
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND c.class_code IS NULL;

-- Step 2: Count orphaned subjects by school
SELECT 'Orphaned subjects count by school:' as info;
SELECT 
    s.school_id,
    COUNT(*) as orphaned_subjects,
    GROUP_CONCAT(DISTINCT s.class_code) as missing_class_codes
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND c.class_code IS NULL
GROUP BY s.school_id;

-- Step 3: Option 1 - Assign orphaned subjects to first available branch per school
SELECT 'Option 1: Auto-assign orphaned subjects to first branch per school' as option;

-- Preview what will be assigned
SELECT 
    s.subject_code,
    s.subject,
    s.school_id,
    s.class_code,
    first_branch.branch_id as will_be_assigned_to
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
INNER JOIN (
    SELECT 
        school_id,
        MIN(branch_id) as branch_id
    FROM school_locations 
    WHERE status = 'Active'
    GROUP BY school_id
) first_branch ON s.school_id = first_branch.school_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND c.class_code IS NULL;

-- Execute Option 1 (UNCOMMENT TO RUN):
/*
UPDATE subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
INNER JOIN (
    SELECT 
        school_id,
        MIN(branch_id) as branch_id
    FROM school_locations 
    WHERE status = 'Active'
    GROUP BY school_id
) first_branch ON s.school_id = first_branch.school_id
SET s.branch_id = first_branch.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND c.class_code IS NULL;
*/

-- Step 4: Option 2 - Manual assignment based on section
SELECT 'Option 2: Manual assignment suggestions based on section:' as option;
SELECT 
    s.school_id,
    s.section,
    COUNT(*) as subject_count,
    GROUP_CONCAT(DISTINCT s.class_code) as orphaned_class_codes,
    'Assign to appropriate branch based on section' as suggestion
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
WHERE (s.branch_id IS NULL OR s.branch_id = '')
AND c.class_code IS NULL
GROUP BY s.school_id, s.section;

-- Step 5: Option 3 - Create missing classes in classes table
SELECT 'Option 3: Missing classes that should be created:' as option;
SELECT DISTINCT
    s.school_id,
    s.class_code,
    s.section,
    COUNT(*) as subjects_using_this_class,
    'CREATE CLASS NEEDED' as action_required
FROM subjects s
LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
WHERE c.class_code IS NULL
GROUP BY s.school_id, s.class_code, s.section
ORDER BY s.school_id, s.section, s.class_code;

-- Step 6: Generate CREATE statements for missing classes
SELECT 'Suggested CREATE statements for missing classes:' as info;
SELECT CONCAT(
    'INSERT INTO classes (class_name, class_code, section, school_id, branch_id, status) VALUES (',
    '\"', s.class_code, '\", ',
    '\"', s.class_code, '\", ',
    '\"', s.section, '\", ',
    '\"', s.school_id, '\", ',
    '\"', first_branch.branch_id, '\", ',
    '\"Active\");'
) as suggested_insert_statement
FROM (
    SELECT DISTINCT
        s.school_id,
        s.class_code,
        s.section
    FROM subjects s
    LEFT JOIN classes c ON s.class_code = c.class_code AND s.school_id = c.school_id
    WHERE c.class_code IS NULL
) s
INNER JOIN (
    SELECT 
        school_id,
        MIN(branch_id) as branch_id
    FROM school_locations 
    WHERE status = 'Active'
    GROUP BY school_id
) first_branch ON s.school_id = first_branch.school_id
ORDER BY s.school_id, s.section, s.class_code;

-- Step 7: Final verification
SELECT 'Final check - subjects still without branch_id:' as final_check;
SELECT COUNT(*) as remaining_subjects FROM subjects WHERE branch_id IS NULL OR branch_id = '';
