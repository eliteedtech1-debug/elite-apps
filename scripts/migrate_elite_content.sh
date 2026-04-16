#!/bin/bash
# Elite Content Database Migration Script
# Date: 2026-02-12
# Purpose: Migrate educational content tables to elite_content database

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database credentials
DB_USER="root"
DB_PASS=""
SOURCE_DB="full_skcooly"
TARGET_DB="elite_content"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}=== Elite Content Migration ===${NC}"
echo "Source: $SOURCE_DB"
echo "Target: $TARGET_DB"
echo "Backup: $BACKUP_DIR/backup_$TIMESTAMP.sql"
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# Step 1: Backup source database
echo -e "${YELLOW}[1/8] Creating backup...${NC}"
mysqldump -u$DB_USER $SOURCE_DB > $BACKUP_DIR/backup_$TIMESTAMP.sql
echo -e "${GREEN}✓ Backup created${NC}"

# Step 2: Test source database connection
echo -e "${YELLOW}[2/8] Testing source database...${NC}"
mysql -u$DB_USER -e "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema='$SOURCE_DB'" > /dev/null
echo -e "${GREEN}✓ Source database accessible${NC}"

# Step 3: Create target database
echo -e "${YELLOW}[3/8] Creating target database...${NC}"
mysql -u$DB_USER -e "CREATE DATABASE IF NOT EXISTS $TARGET_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
echo -e "${GREEN}✓ Target database created${NC}"

# Step 4: Export and import schema
echo -e "${YELLOW}[4/8] Migrating schema...${NC}"
mysqldump -u$DB_USER --no-data $SOURCE_DB \
  lesson_plans lesson_notes lesson_plan_reviews lesson_comments \
  lesson_time_table lesson_time_table_backup lessons \
  syllabus syllabus_tracker syllabus_suggestions \
  subjects predefined_subjects student_subjects school_subject_mapping subject_streams \
  recitations recitation_replies recitation_feedbacks \
  assignments student_assignments assignment_questions assignment_responses assignment_question_options \
  virtual_classrooms virtual_classroom_participants virtual_classroom_attendance \
  virtual_classroom_chat_messages virtual_classroom_recordings virtual_classroom_notifications \
  teacher_classes class_timing \
  > $BACKUP_DIR/schema_$TIMESTAMP.sql

mysql -u$DB_USER $TARGET_DB < $BACKUP_DIR/schema_$TIMESTAMP.sql
echo -e "${GREEN}✓ Schema migrated (31 tables)${NC}"

# Step 5: Export and import stored procedures
echo -e "${YELLOW}[5/8] Migrating stored procedures...${NC}"
mysqldump -u$DB_USER --routines --no-create-info --no-data --no-create-db $SOURCE_DB \
  | grep -A 500 "PROCEDURE \`lessons\`\|PROCEDURE \`lesson_comments\`\|PROCEDURE \`lesson_time_table\`\|PROCEDURE \`syllabus\`\|PROCEDURE \`syllabusTracker\`\|PROCEDURE \`subjects\`\|PROCEDURE \`subject_management\`\|PROCEDURE \`assignments\`\|PROCEDURE \`assignment_questions\`\|PROCEDURE \`GetSubjectsByClass\`\|PROCEDURE \`GetStudentsByClassSubject\`" \
  > $BACKUP_DIR/procedures_$TIMESTAMP.sql 2>/dev/null || true

if [ -s $BACKUP_DIR/procedures_$TIMESTAMP.sql ]; then
  mysql -u$DB_USER $TARGET_DB < $BACKUP_DIR/procedures_$TIMESTAMP.sql
  echo -e "${GREEN}✓ Stored procedures migrated${NC}"
else
  echo -e "${YELLOW}⚠ No stored procedures found${NC}"
fi

# Step 6: Migrate data
echo -e "${YELLOW}[6/8] Migrating data...${NC}"
mysqldump -u$DB_USER $SOURCE_DB \
  lesson_plans lesson_notes lesson_plan_reviews lesson_comments \
  lesson_time_table lesson_time_table_backup lessons \
  syllabus syllabus_tracker syllabus_suggestions \
  subjects predefined_subjects student_subjects school_subject_mapping subject_streams \
  recitations recitation_replies recitation_feedbacks \
  assignments student_assignments assignment_questions assignment_responses assignment_question_options \
  virtual_classrooms virtual_classroom_participants virtual_classroom_attendance \
  virtual_classroom_chat_messages virtual_classroom_recordings virtual_classroom_notifications \
  teacher_classes class_timing \
  > $BACKUP_DIR/data_$TIMESTAMP.sql

mysql -u$DB_USER $TARGET_DB < $BACKUP_DIR/data_$TIMESTAMP.sql
echo -e "${GREEN}✓ Data migrated${NC}"

# Step 7: Verify migration
echo -e "${YELLOW}[7/8] Verifying migration...${NC}"
mysql -u$DB_USER -e "
SELECT 
  '$SOURCE_DB' as database_name,
  'subjects' as table_name,
  COUNT(*) as row_count
FROM $SOURCE_DB.subjects
UNION ALL
SELECT 
  '$TARGET_DB' as database_name,
  'subjects' as table_name,
  COUNT(*) as row_count
FROM $TARGET_DB.subjects
UNION ALL
SELECT 
  '$SOURCE_DB' as database_name,
  'teacher_classes' as table_name,
  COUNT(*) as row_count
FROM $SOURCE_DB.teacher_classes
UNION ALL
SELECT 
  '$TARGET_DB' as database_name,
  'teacher_classes' as table_name,
  COUNT(*) as row_count
FROM $TARGET_DB.teacher_classes
UNION ALL
SELECT 
  '$SOURCE_DB' as database_name,
  'lesson_plans' as table_name,
  COUNT(*) as row_count
FROM $SOURCE_DB.lesson_plans
UNION ALL
SELECT 
  '$TARGET_DB' as database_name,
  'lesson_plans' as table_name,
  COUNT(*) as row_count
FROM $TARGET_DB.lesson_plans;
" > $BACKUP_DIR/verification_$TIMESTAMP.txt

cat $BACKUP_DIR/verification_$TIMESTAMP.txt
echo -e "${GREEN}✓ Verification complete${NC}"

# Step 8: Generate rollback script
echo -e "${YELLOW}[8/8] Generating rollback script...${NC}"
cat > $BACKUP_DIR/rollback_$TIMESTAMP.sh << 'ROLLBACK_EOF'
#!/bin/bash
# Rollback script for elite_content migration

set -e

DB_USER="root"
DB_PASS=""
TARGET_DB="elite_content"
BACKUP_FILE="BACKUP_FILE_PLACEHOLDER"

echo "=== ROLLBACK: Elite Content Migration ==="
echo "This will:"
echo "1. Drop elite_content database"
echo "2. Restore from backup: $BACKUP_FILE"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 1
fi

echo "Dropping elite_content database..."
mysql -u$DB_USER -e "DROP DATABASE IF EXISTS $TARGET_DB"

echo "Restoring from backup..."
mysql -u$DB_USER < $BACKUP_FILE

echo "✓ Rollback complete"
echo "✓ Source database restored"
ROLLBACK_EOF

sed -i.bak "s|BACKUP_FILE_PLACEHOLDER|$BACKUP_DIR/backup_$TIMESTAMP.sql|g" $BACKUP_DIR/rollback_$TIMESTAMP.sh
chmod +x $BACKUP_DIR/rollback_$TIMESTAMP.sh
rm $BACKUP_DIR/rollback_$TIMESTAMP.sh.bak 2>/dev/null || true

echo -e "${GREEN}✓ Rollback script created: $BACKUP_DIR/rollback_$TIMESTAMP.sh${NC}"

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Review verification results above"
echo "2. Update config/databases.js to add contentDB"
echo "3. Update .env: CONTENT_DB_NAME=elite_content"
echo "4. Update controllers to use contentDB (see pre_migration_analysis/06_controllers.txt)"
echo "5. Test application: npm restart && test endpoints"
echo "6. After 7 days of stable operation, run: ./cleanup_source_tables.sh"
echo ""
echo "Backup files:"
echo "  - Full backup: $BACKUP_DIR/backup_$TIMESTAMP.sql"
echo "  - Schema: $BACKUP_DIR/schema_$TIMESTAMP.sql"
echo "  - Data: $BACKUP_DIR/data_$TIMESTAMP.sql"
echo "  - Verification: $BACKUP_DIR/verification_$TIMESTAMP.txt"
echo "  - Rollback: $BACKUP_DIR/rollback_$TIMESTAMP.sh"
echo ""

# Generate cleanup script for source tables (run after verification)
echo -e "${YELLOW}Generating source cleanup script...${NC}"
cat > cleanup_source_tables.sh << 'CLEANUP_EOF'
#!/bin/bash
# Cleanup source tables after successful migration
# WARNING: Only run after 7+ days of stable operation

set -e

DB_USER="root"
SOURCE_DB="full_skcooly"

echo "=== CLEANUP: Remove Migrated Tables from Source ==="
echo ""
echo "⚠️  WARNING: This will permanently delete 30 tables from $SOURCE_DB"
echo "⚠️  Ensure elite_content has been running successfully for 7+ days"
echo ""
read -p "Type 'DELETE TABLES' to confirm: " confirm

if [ "$confirm" != "DELETE TABLES" ]; then
  echo "Cleanup cancelled"
  exit 1
fi

echo "Dropping 30 tables from $SOURCE_DB..."

mysql -u$DB_USER $SOURCE_DB << 'SQL'
-- Drop content tables (now in elite_content)
DROP TABLE IF EXISTS lesson_comments;
DROP TABLE IF EXISTS lesson_plan_reviews;
DROP TABLE IF EXISTS lesson_notes;
DROP TABLE IF EXISTS lesson_plans;
DROP TABLE IF EXISTS lesson_time_table_backup;
DROP TABLE IF EXISTS lesson_time_table;
DROP TABLE IF EXISTS lessons;

DROP TABLE IF EXISTS syllabus_suggestions;
DROP TABLE IF EXISTS syllabus_tracker;
DROP TABLE IF EXISTS syllabus;

DROP TABLE IF EXISTS student_subjects;
DROP TABLE IF EXISTS school_subject_mapping;
DROP TABLE IF EXISTS predefined_subjects;
DROP TABLE IF EXISTS subjects;

DROP TABLE IF EXISTS recitation_feedbacks;
DROP TABLE IF EXISTS recitation_replies;
DROP TABLE IF EXISTS recitations;

DROP TABLE IF EXISTS assignment_question_options;
DROP TABLE IF EXISTS assignment_responses;
DROP TABLE IF EXISTS assignment_questions;
DROP TABLE IF EXISTS student_assignments;
DROP TABLE IF EXISTS assignments;

DROP TABLE IF EXISTS virtual_classroom_notifications;
DROP TABLE IF EXISTS virtual_classroom_recordings;
DROP TABLE IF EXISTS virtual_classroom_chat_messages;
DROP TABLE IF EXISTS virtual_classroom_attendance;
DROP TABLE IF EXISTS virtual_classroom_participants;
DROP TABLE IF EXISTS virtual_classrooms;

DROP TABLE IF EXISTS class_timing;
DROP TABLE IF EXISTS teacher_classes;
SQL

echo "✓ Cleanup complete"
echo "✓ 30 tables removed from $SOURCE_DB"
echo "✓ Data preserved in elite_content database"
CLEANUP_EOF

chmod +x cleanup_source_tables.sh
echo -e "${GREEN}✓ Cleanup script created: cleanup_source_tables.sh${NC}"
echo -e "${YELLOW}⚠️  Do NOT run cleanup until migration is verified stable${NC}"
