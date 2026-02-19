# Elite Content Migration - Complete Workflow

## 📋 Pre-Migration (DONE)
- ✅ Analyzed 30 tables for migration
- ✅ Removed 9 unused tables
- ✅ Created 16 missing models
- ✅ Generated migration scripts
- ✅ Identified 45 controllers to update

## 🚀 Migration Steps

### Step 1: Run Pre-Migration Analysis
```bash
./analyze_before_migration.sh
# Review output in pre_migration_analysis/
```

### Step 2: Test Before Migration
```bash
./test_elite_content.sh full_skcooly > before_migration.txt
```

### Step 3: Run Migration
```bash
./migrate_elite_content.sh
```
**Creates:**
- elite_content database
- Migrates 30 tables + stored procedures
- Generates rollback script
- Generates cleanup script (for later)

### Step 4: Test After Migration
```bash
./test_elite_content.sh elite_content > after_migration.txt
diff before_migration.txt after_migration.txt
```

### Step 5: Update Application Config

#### A. Update config/databases.js
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

#### B. Update .env
```bash
echo "CONTENT_DB_NAME=elite_content" >> elscholar-api/.env
echo "CONTENT_DB_USERNAME=root" >> elscholar-api/.env
echo "CONTENT_DB_PASSWORD=" >> elscholar-api/.env
echo "CONTENT_DB_HOST=localhost" >> elscholar-api/.env
echo "CONTENT_DB_PORT=3306" >> elscholar-api/.env
```

### Step 6: Move Existing Models
```bash
cd elscholar-api/src/models

# Move to content/
mv LessonPlan.js content/
mv LessonNote.js content/
mv LessonPlanReview.js content/
mv Syllabus.js content/
mv SyllabusTracker.js content/
mv Subject.js content/
mv PredefinedSubject.js content/
mv Assignment.js content/
mv AssignmentQuestion.js content/
mv Recitation.js content/
mv RecitationReply.js content/
mv RecitationFeedback.js content/
mv VirtualClassroom.js content/
```

### Step 7: Update Controllers
```bash
./prepare_controller_updates.sh
# Follow controller_update_guide.md
```

**Update pattern:**
```javascript
// Before
const db = require('../models');
await db.sequelize.query('SELECT * FROM subjects');

// After
const { contentDB } = require('../config/databases');
await contentDB.query('SELECT * FROM subjects');
```

**Controllers to update (45 files):**
See `pre_migration_analysis/06_controllers.txt`

### Step 8: Test Application
```bash
cd elscholar-api
npm restart

# Test endpoints
curl http://localhost:34567/api/subjects
curl http://localhost:34567/api/lessons
curl http://localhost:34567/api/assignments
curl http://localhost:34567/api/virtual-classroom
curl http://localhost:34567/api/syllabus

# Monitor logs
tail -f logs/queries.log
```

### Step 9: Monitor (7 Days)
- Check application logs daily
- Verify all content features work
- Monitor database performance
- Keep backups accessible

### Step 10: Cleanup Source Tables (After 7 Days)
```bash
# Only after confirming everything works
./cleanup_source_tables.sh
```
**Removes 30 tables from full_skcooly**

## 🔄 Rollback Procedures

### Immediate Rollback (During Migration)
```bash
./backups/rollback_TIMESTAMP.sh
```

### Rollback After Config Update
```bash
# Revert .env
sed -i.bak '/CONTENT_DB/d' elscholar-api/.env

# Restart
cd elscholar-api
npm restart
```

### Rollback After Controller Updates
```bash
# Restore controllers
rm -rf elscholar-api/src/controllers
mv controllers_backup_TIMESTAMP elscholar-api/src/controllers

# Revert .env
CONTENT_DB_NAME=full_skcooly

# Restart
npm restart
```

## 📊 Migration Summary

### Tables Migrated: 30
- Lessons (7): lesson_plans, lesson_notes, lesson_plan_reviews, lesson_comments, lesson_time_table, lesson_time_table_backup, lessons
- Syllabus (3): syllabus, syllabus_tracker, syllabus_suggestions
- Subjects (4): subjects, predefined_subjects, student_subjects, school_subject_mapping
- Assignments (5): assignments, student_assignments, assignment_questions, assignment_responses, assignment_question_options
- Recitations (3): recitations, recitation_replies, recitation_feedbacks
- Virtual Classroom (6): virtual_classrooms, virtual_classroom_participants, virtual_classroom_attendance, virtual_classroom_chat_messages, virtual_classroom_recordings, virtual_classroom_notifications
- Teacher Assignment (2): teacher_classes, class_timing

### Data Volume
- ~4,000 rows
- ~7.5 MB
- 11 stored procedures

### Controllers to Update: 45 files

### Models Created: 16 new models

### Tables Removed: 9 unused tables

## 🎯 Success Criteria

- ✅ All 30 tables migrated with matching row counts
- ✅ All stored procedures working
- ✅ All endpoints responding correctly
- ✅ No errors in application logs
- ✅ Performance maintained or improved
- ✅ Rollback script tested and ready

## 📞 Support

If issues occur:
1. Check logs: `logs/queries.log`, `logs/errors.log`
2. Review verification: `backups/verification_TIMESTAMP.txt`
3. Run rollback immediately if data integrity issues
4. Test one controller at a time
5. Keep backups for 30+ days

---

*Ready to execute*
*Date: 2026-02-12*
