#!/bin/bash
# Pre-Migration Analysis Script
# Analyzes current database structure before migration

set -e

DB_USER="root"
DB_PASS=""
SOURCE_DB="full_skcooly"
OUTPUT_DIR="./pre_migration_analysis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== Pre-Migration Analysis ==="
echo "Database: $SOURCE_DB"
echo "Output: $OUTPUT_DIR"
echo ""

mkdir -p $OUTPUT_DIR

# 1. List all tables to migrate
echo "[1/7] Analyzing tables..."
mysql -u$DB_USER -e "
SELECT 
  table_name,
  table_rows,
  ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb,
  engine,
  table_collation
FROM information_schema.tables
WHERE table_schema = '$SOURCE_DB'
AND table_name IN (
  'lesson_plans', 'lesson_notes', 'lesson_plan_reviews', 'lesson_comments',
  'lesson_time_table', 'lesson_time_table_backup', 'lessons',
  'syllabus', 'syllabus_tracker', 'syllabus_suggestions',
  'subjects', 'predefined_subjects', 'student_subjects', 'school_subject_mapping', 'subject_streams',
  'recitations', 'recitation_replies', 'recitation_feedbacks',
  'knowledge_domains_enhanced',
  'assignments', 'student_assignments', 'assignment_questions', 'assignment_responses', 'assignment_question_options',
  'virtual_classrooms', 'virtual_classroom_participants', 'virtual_classroom_attendance',
  'virtual_classroom_chat_messages', 'virtual_classroom_recordings', 'virtual_classroom_notifications',
  'teacher_classes', 'class_timing'
)
ORDER BY table_rows DESC;
" > $OUTPUT_DIR/01_tables.txt
cat $OUTPUT_DIR/01_tables.txt
echo ""

# 2. Check foreign keys
echo "[2/7] Analyzing foreign keys..."
mysql -u$DB_USER -e "
SELECT 
  TABLE_NAME as 'table',
  COLUMN_NAME as 'column',
  CONSTRAINT_NAME as 'constraint',
  REFERENCED_TABLE_NAME as 'references_table',
  REFERENCED_COLUMN_NAME as 'references_column'
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = '$SOURCE_DB'
AND REFERENCED_TABLE_NAME IS NOT NULL
AND TABLE_NAME IN (
  'lesson_plans', 'lesson_notes', 'lesson_plan_reviews', 'lesson_comments',
  'lesson_time_table', 'lesson_time_table_backup', 'lessons',
  'syllabus', 'syllabus_tracker', 'syllabus_suggestions',
  'subjects', 'predefined_subjects', 'student_subjects', 'school_subject_mapping', 'subject_streams',
  'recitations', 'recitation_replies', 'recitation_feedbacks',
  'knowledge_domains_enhanced',
  'assignments', 'student_assignments', 'assignment_questions', 'assignment_responses', 'assignment_question_options',
  'virtual_classrooms', 'virtual_classroom_participants', 'virtual_classroom_attendance',
  'virtual_classroom_chat_messages', 'virtual_classroom_recordings', 'virtual_classroom_notifications',
  'teacher_classes', 'class_timing'
)
ORDER BY TABLE_NAME;
" > $OUTPUT_DIR/02_foreign_keys.txt
cat $OUTPUT_DIR/02_foreign_keys.txt
echo ""

# 3. Check cross-database references (tables referencing content tables)
echo "[3/7] Checking cross-database references..."
mysql -u$DB_USER -e "
SELECT 
  TABLE_NAME as 'external_table',
  COLUMN_NAME as 'column',
  REFERENCED_TABLE_NAME as 'content_table'
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = '$SOURCE_DB'
AND REFERENCED_TABLE_NAME IN (
  'lesson_plans', 'lesson_notes', 'subjects', 'teacher_classes', 
  'assignments', 'virtual_classrooms', 'knowledge_domains_enhanced'
)
AND TABLE_NAME NOT IN (
  'lesson_plans', 'lesson_notes', 'lesson_plan_reviews', 'lesson_comments',
  'lesson_time_table', 'lesson_time_table_backup', 'lessons',
  'syllabus', 'syllabus_tracker', 'syllabus_suggestions',
  'subjects', 'predefined_subjects', 'student_subjects', 'school_subject_mapping', 'subject_streams',
  'recitations', 'recitation_replies', 'recitation_feedbacks',
  'knowledge_domains_enhanced',
  'assignments', 'student_assignments', 'assignment_questions', 'assignment_responses', 'assignment_question_options',
  'virtual_classrooms', 'virtual_classroom_participants', 'virtual_classroom_attendance',
  'virtual_classroom_chat_messages', 'virtual_classroom_recordings', 'virtual_classroom_notifications',
  'teacher_classes', 'class_timing'
);
" > $OUTPUT_DIR/03_cross_db_references.txt
cat $OUTPUT_DIR/03_cross_db_references.txt
echo ""

# 4. List stored procedures
echo "[4/7] Analyzing stored procedures..."
mysql -u$DB_USER -e "
SELECT 
  ROUTINE_NAME as procedure_name,
  ROUTINE_TYPE as type,
  DTD_IDENTIFIER as returns,
  CREATED as created_date
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = '$SOURCE_DB'
AND ROUTINE_NAME IN (
  'lessons', 'lesson_comments', 'lesson_time_table',
  'syllabus', 'syllabusTracker',
  'subjects', 'subject_management',
  'assignments', 'assignment_questions',
  'GetSubjectsByClass', 'GetStudentsByClassSubject'
)
ORDER BY ROUTINE_NAME;
" > $OUTPUT_DIR/04_procedures.txt
cat $OUTPUT_DIR/04_procedures.txt
echo ""

# 5. Export full procedure definitions
echo "[5/7] Exporting procedure definitions..."
for proc in lessons lesson_comments lesson_time_table syllabus syllabusTracker subjects subject_management assignments assignment_questions GetSubjectsByClass GetStudentsByClassSubject; do
  mysql -u$DB_USER -e "SHOW CREATE PROCEDURE $proc\G" $SOURCE_DB >> $OUTPUT_DIR/05_procedure_definitions.txt 2>/dev/null || echo "Procedure $proc not found" >> $OUTPUT_DIR/05_procedure_definitions.txt
done
echo "✓ Saved to 05_procedure_definitions.txt"
echo ""

# 6. Find controllers using these tables
echo "[6/7] Scanning controllers..."
cd elscholar-api/src/controllers 2>/dev/null || cd ../elscholar-api/src/controllers
grep -r "lesson_plans\|syllabus\|subjects\|assignments\|virtual_classroom\|teacher_classes\|recitations\|knowledge_domains" . \
  | grep -v "node_modules" \
  | cut -d: -f1 \
  | sort -u \
  > ../../../$OUTPUT_DIR/06_controllers.txt 2>/dev/null || echo "No controllers found" > ../../../$OUTPUT_DIR/06_controllers.txt
cd - > /dev/null
cat $OUTPUT_DIR/06_controllers.txt
echo ""

# 7. Generate database replacement plan
echo "[7/7] Generating replacement plan..."
cat > $OUTPUT_DIR/07_replacement_plan.md << 'EOF'
# Database Connection Replacement Plan

## 1. Update config/databases.js

```javascript
const contentDB = createConnection({
  database: process.env.CONTENT_DB_NAME || process.env.DB_NAME,
  username: process.env.CONTENT_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.CONTENT_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.CONTENT_DB_HOST || process.env.DB_HOST,
  port: process.env.CONTENT_DB_PORT || process.env.DB_PORT,
  pool: { max: 10, min: 2 }
}, 'Content');

module.exports = {
  mainDB,
  auditDB,
  aiDB,
  contentDB  // ADD THIS
};
```

## 2. Create models/content/index.js

```javascript
const { contentDB } = require('../../config/databases');

// Import all content models
const LessonPlan = require('./LessonPlan')(contentDB, contentDB.Sequelize.DataTypes);
const Subject = require('./Subject')(contentDB, contentDB.Sequelize.DataTypes);
// ... etc

module.exports = {
  sequelize: contentDB,
  LessonPlan,
  Subject,
  // ... etc
};
```

## 3. Update Controllers

### Pattern 1: Simple queries
**Before:**
```javascript
const db = require('../models');
await db.sequelize.query('SELECT * FROM subjects');
```

**After:**
```javascript
const { contentDB } = require('../config/databases');
await contentDB.query('SELECT * FROM subjects');
```

### Pattern 2: Model usage
**Before:**
```javascript
const db = require('../models');
const { Subject } = db;
```

**After:**
```javascript
const contentDB = require('../models/content');
const { Subject } = contentDB;
```

### Pattern 3: Stored procedures
**Before:**
```javascript
await db.sequelize.query('CALL subjects(:action, ...)', { replacements });
```

**After:**
```javascript
const { contentDB } = require('../config/databases');
await contentDB.query('CALL subjects(:action, ...)', { replacements });
```

### Pattern 4: Cross-database queries
```javascript
const { mainDB } = require('../config/databases');
const { contentDB } = require('../config/databases');

// Get from content DB
const subject = await contentDB.query('SELECT * FROM subjects WHERE id = ?', [id]);

// Get from main DB
const student = await mainDB.query('SELECT * FROM students WHERE id = ?', [student_id]);

// Combine
return { ...subject[0], student: student[0] };
```

## 4. Controllers to Update

See file: 06_controllers.txt

For each controller:
1. Replace `require('../models')` with `require('../models/content')` for content tables
2. Replace `db.sequelize.query` with `contentDB.query` for content queries
3. Keep `mainDB` for cross-database references (students, staff, classes)

## 5. Common Cross-Database References

Content tables often reference:
- `students` (student_id)
- `staff` (teacher_id)
- `classes` (class_id)
- `school_setup` (school_id, branch_id)

These stay in mainDB, so queries need both connections.

## 6. Testing Strategy

1. Update one controller at a time
2. Test endpoint after each change
3. Check logs for connection errors
4. Verify data integrity
5. Monitor performance

## 7. Rollback Strategy

If issues occur:
1. Revert controller changes (git)
2. Update .env: CONTENT_DB_NAME=full_skcooly
3. Restart application
4. Run rollback script if needed
EOF

cat $OUTPUT_DIR/07_replacement_plan.md
echo ""

# Summary
echo "=== Analysis Complete ==="
echo ""
echo "Files created in $OUTPUT_DIR:"
echo "  01_tables.txt                  - Tables to migrate"
echo "  02_foreign_keys.txt            - Foreign key constraints"
echo "  03_cross_db_references.txt     - External tables referencing content"
echo "  04_procedures.txt              - Stored procedures list"
echo "  05_procedure_definitions.txt   - Full procedure code"
echo "  06_controllers.txt             - Controllers to update"
echo "  07_replacement_plan.md         - Database replacement guide"
echo ""
echo "⚠️  CRITICAL: Review 03_cross_db_references.txt"
echo "   These tables will need cross-database queries after migration"
echo ""
echo "Next: Review all files, then run ./migrate_elite_content.sh"
