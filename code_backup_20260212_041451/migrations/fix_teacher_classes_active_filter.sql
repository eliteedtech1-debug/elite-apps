-- ============================================================================
-- FIX: Teacher Classes Active Status Filter
-- Date: December 7, 2025
-- Issue: teacher_classes shows inactive/deleted subjects and classes
-- Solution: Create view that filters by active status
-- ============================================================================

-- Drop view if exists
DROP VIEW IF EXISTS active_teacher_classes;

-- Create view that only shows active teacher assignments
CREATE VIEW active_teacher_classes AS
SELECT 
    tc.*
FROM teacher_classes tc
INNER JOIN classes c ON tc.class_code = c.class_code 
    AND tc.school_id = c.school_id
    AND c.status = 'active'
INNER JOIN subjects s ON tc.subject_code = s.subject_code 
    AND tc.school_id = s.school_id
    AND s.status = 'Active'
INNER JOIN teachers t ON tc.teacher_id = t.id 
    AND tc.school_id = t.school_id
    AND t.status = 'active';

-- ============================================================================
-- Cleanup: Remove orphaned teacher_classes records
-- ============================================================================

-- Delete teacher_classes where class no longer exists or is inactive
DELETE tc FROM teacher_classes tc
LEFT JOIN classes c ON tc.class_code = c.class_code AND tc.school_id = c.school_id
WHERE c.class_code IS NULL OR c.status != 'active';

-- Delete teacher_classes where subject no longer exists or is inactive
DELETE tc FROM teacher_classes tc
LEFT JOIN subjects s ON tc.subject_code = s.subject_code AND tc.school_id = s.school_id
WHERE s.subject_code IS NULL OR s.status != 'Active';

-- Delete teacher_classes where teacher no longer exists or is inactive
DELETE tc FROM teacher_classes tc
LEFT JOIN teachers t ON tc.teacher_id = t.id AND tc.school_id = t.school_id
WHERE t.id IS NULL OR t.status != 'active';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Cleanup Complete' AS status;
SELECT COUNT(*) as remaining_records FROM teacher_classes;
SELECT COUNT(*) as active_records FROM active_teacher_classes;
