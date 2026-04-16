#!/bin/bash
# Test Elite Content Database
# Run BEFORE and AFTER migration to compare results

set -e

DB_USER="root"
DB_PASS=""
DB_NAME="${1:-full_skcooly}"  # Default to full_skcooly, or use elite_content after migration

echo "=== Testing Database: $DB_NAME ==="
echo ""

# Test 1: Table counts
echo "[1] Table Counts:"
mysql -u$DB_USER -e "
SELECT 
  'lesson_plans' as table_name, COUNT(*) as row_count FROM $DB_NAME.lesson_plans
UNION ALL SELECT 'lesson_notes', COUNT(*) FROM $DB_NAME.lesson_notes
UNION ALL SELECT 'lesson_time_table', COUNT(*) FROM $DB_NAME.lesson_time_table
UNION ALL SELECT 'syllabus', COUNT(*) FROM $DB_NAME.syllabus
UNION ALL SELECT 'syllabus_tracker', COUNT(*) FROM $DB_NAME.syllabus_tracker
UNION ALL SELECT 'subjects', COUNT(*) FROM $DB_NAME.subjects
UNION ALL SELECT 'predefined_subjects', COUNT(*) FROM $DB_NAME.predefined_subjects
UNION ALL SELECT 'student_subjects', COUNT(*) FROM $DB_NAME.student_subjects
UNION ALL SELECT 'teacher_classes', COUNT(*) FROM $DB_NAME.teacher_classes
UNION ALL SELECT 'assignments', COUNT(*) FROM $DB_NAME.assignments
UNION ALL SELECT 'virtual_classrooms', COUNT(*) FROM $DB_NAME.virtual_classrooms;
"
echo ""

# Test 2: Sample data integrity
echo "[2] Sample Data Integrity:"
mysql -u$DB_USER -e "
SELECT 'subjects' as test, subject_code, subject, class_code FROM $DB_NAME.subjects LIMIT 3;
"
echo ""

mysql -u$DB_USER -e "
SELECT 'teacher_classes' as test, id, teacher_id, class_code, subject_code FROM $DB_NAME.teacher_classes LIMIT 3;
"
echo ""

# Test 3: Stored procedures
echo "[3] Stored Procedures:"
mysql -u$DB_USER -e "
SELECT ROUTINE_NAME, ROUTINE_TYPE 
FROM information_schema.ROUTINES 
WHERE ROUTINE_SCHEMA = '$DB_NAME' 
AND ROUTINE_NAME IN ('lessons', 'subjects', 'assignments', 'syllabus', 'GetSubjectsByClass')
ORDER BY ROUTINE_NAME;
"
echo ""

# Test 4: Foreign key constraints
echo "[4] Foreign Key Constraints:"
mysql -u$DB_USER -e "
SELECT 
  TABLE_NAME, 
  CONSTRAINT_NAME, 
  REFERENCED_TABLE_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND REFERENCED_TABLE_NAME IS NOT NULL
AND TABLE_NAME IN ('lesson_plans', 'subjects', 'teacher_classes', 'assignments')
LIMIT 10;
"
echo ""

# Test 5: Database size
echo "[5] Database Size:"
mysql -u$DB_USER -e "
SELECT 
  table_schema as database_name,
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = '$DB_NAME'
GROUP BY table_schema;
"
echo ""

echo "=== Test Complete ==="
echo ""
echo "Usage:"
echo "  Before migration: ./test_elite_content.sh full_skcooly"
echo "  After migration:  ./test_elite_content.sh elite_content"
