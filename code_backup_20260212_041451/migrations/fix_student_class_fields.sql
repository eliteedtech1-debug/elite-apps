-- Fix Student Class Fields Inconsistency
-- This script synchronizes class_code and class_name based on current_class

-- Update students table to sync class fields with their current_class
UPDATE students s
INNER JOIN classes c ON s.current_class = c.class_code AND s.school_id = c.school_id
SET
  s.class_code = c.class_code,
  s.class_name = c.class_name,
  s.updated_at = NOW()
WHERE
  s.current_class IS NOT NULL
  AND s.current_class != ''
  AND (
    s.class_code != c.class_code
    OR s.class_name != c.class_name
    OR s.class_code IS NULL
    OR s.class_name IS NULL
  );

-- Show how many records were updated
SELECT
  COUNT(*) as fixed_records,
  'Student class fields synchronized' as message
FROM students s
INNER JOIN classes c ON s.current_class = c.class_code AND s.school_id = c.school_id
WHERE s.class_code = c.class_code AND s.class_name = c.class_name;
