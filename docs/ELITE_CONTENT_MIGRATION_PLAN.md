# Elite Content Database Migration Plan

> **Focus:** elite_content database only  
> **Date:** 2026-02-12  
> **Status:** Implementation Ready

---

## 🎯 Goal

Extract educational content tables to `elite_content` database and ensure all controllers/procedures use correct database connection.

---

## 📊 Tables to Migrate (35 tables)

### Lesson Management (7 tables)
```
lesson_plans (5 rows)
lesson_notes (0 rows)
lesson_plan_reviews (0 rows)
lesson_comments (0 rows)
lesson_time_table (73 rows)
lesson_time_table_backup (3 rows) - BLOAT
lessons (4 rows)
```

### Syllabus & Curriculum (3 tables)
```
syllabus (30 rows)
syllabus_tracker (10 rows)
syllabus_suggestions (5 rows)
```

### Subject Management (5 tables)
```
subjects (2,573 rows) ⚠️ LARGEST
predefined_subjects (67 rows)
student_subjects (46 rows)
school_subject_mapping (4 rows)
subject_streams (0 rows)
```

### Recitation System (3 tables)
```
recitations (0 rows)
recitation_replies (0 rows)
recitation_feedbacks (0 rows)
```

### Knowledge Domains (4 tables)
```
knowledge_domains (0 rows)
knowledge_domain_criteria (0 rows)
knowledge_domains_simplified (0 rows)
knowledge_domains_enhanced (0 rows)
```

### Assignments (5 tables)
```
assignments (3 rows)
student_assignments (0 rows)
assignment_questions (2 rows)
assignment_responses (0 rows)
assignment_question_options (0 rows)
```

### Virtual Classroom (6 tables)
```
virtual_classrooms (6 rows)
virtual_classroom_participants (36 rows)
virtual_classroom_attendance (0 rows)
virtual_classroom_chat_messages (0 rows)
virtual_classroom_recordings (0 rows)
virtual_classroom_notifications (55 rows)
```

### Teacher Assignments (2 tables)
```
teacher_classes (1,096 rows)
class_timing (39 rows)
```

**Total:** 35 tables, ~4,200 rows, ~7.5 MB

---

## 🗑️ Bloat Tables to Clean (NOT migrate)

### Backup Tables (DELETE after verification)
```sql
-- 4,740 rows, 1.52 MB
DROP TABLE _backup_payment_entries_20251215;

-- 2,228 rows, 0.17 MB
DROP TABLE students_credit_backup_20260120;

-- 875 rows, 0.08 MB
DROP TABLE rbac_menu_access_backup_20260119;

-- 135 rows, 0.02 MB
DROP TABLE rbac_menu_items_backup_20260119;

-- 3 rows, 0.02 MB (keep in elite_content as archive)
-- lesson_time_table_backup

-- 0 rows, 0.02 MB
DROP TABLE student_ledger_backup_20260120;
```

**Total Bloat:** ~7,500 rows, ~1.8 MB to delete

---

## 🔧 Stored Procedures Using Content Tables

### Must Update to Use contentDB Connection

| Procedure | Tables Used | Controllers Using It |
|-----------|-------------|---------------------|
| `lessons` | lessons, lesson_comments | lessons.js |
| `lesson_comments` | lesson_comments | lessons.js |
| `lesson_time_table` | lesson_time_table | lesson_time_table.js |
| `syllabus` | syllabus | school-setups.js |
| `syllabusTracker` | syllabus_tracker | school-setups.js |
| `subjects` | subjects | (multiple) |
| `subject_management` | subjects | (multiple) |
| `assignments` | assignments | assignments.js, assignments-fixed.js |
| `assignment_questions` | assignment_questions | assignments.js, assignments-fixed.js |
| `GetSubjectsByClass` | subjects | (multiple) |
| `GetStudentsByClassSubject` | subjects, student_subjects | (multiple) |

---

## 📝 Controllers Requiring Database Connection Updates

### High Priority (Active Usage)

| Controller | Tables Used | Current Connection | New Connection |
|------------|-------------|-------------------|----------------|
| `lessonPlansController.js` | lesson_plans, lesson_plan_reviews | mainDB | contentDB |
| `syllabusController.js` | syllabus, syllabus_tracker | mainDB | contentDB |
| `recitationsController.js` | recitations, recitation_replies, recitation_feedbacks | mainDB | contentDB |
| `lessonNotesController.js` | lesson_notes, lesson_plans | mainDB | contentDB |
| `subjectMappingController.js` | subjects, school_subject_mapping | mainDB | contentDB |
| `assignments.js` | assignments, assignment_questions | mainDB | contentDB |
| `virtualClassroom.js` | virtual_classrooms, virtual_classroom_* | mainDB | contentDB |
| `lesson_time_table.js` | lesson_time_table | mainDB | contentDB |
| `lessons.js` | lessons, lesson_comments | mainDB | contentDB |
| `school-setups.js` | syllabus, syllabus_tracker | mainDB | contentDB |
| `predefinedSubjects.js` | predefined_subjects | mainDB | contentDB |
| `teachers.js` | teacher_classes | mainDB | contentDB |
| `class_timing.js` | class_timing | mainDB | contentDB |

---

## 🔌 Implementation Steps

### Step 1: Create Database
```sql
CREATE DATABASE elite_content CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Export Schema
```bash
mysqldump -u root -p --no-data full_skcooly \
  lesson_plans lesson_notes lesson_plan_reviews lesson_comments \
  lesson_time_table lesson_time_table_backup lessons \
  syllabus syllabus_tracker syllabus_suggestions \
  subjects predefined_subjects student_subjects school_subject_mapping subject_streams \
  recitations recitation_replies recitation_feedbacks \
  knowledge_domains knowledge_domain_criteria knowledge_domains_simplified knowledge_domains_enhanced \
  assignments student_assignments assignment_questions assignment_responses assignment_question_options \
  virtual_classrooms virtual_classroom_participants virtual_classroom_attendance \
  virtual_classroom_chat_messages virtual_classroom_recordings virtual_classroom_notifications \
  teacher_classes class_timing \
  > elite_content_schema.sql

mysql -u root -p elite_content < elite_content_schema.sql
```

### Step 3: Export Stored Procedures
```bash
mysqldump -u root -p --routines --no-create-info --no-data --no-create-db full_skcooly \
  | grep -A 200 "PROCEDURE \`lessons\`\|PROCEDURE \`lesson_comments\`\|PROCEDURE \`lesson_time_table\`\|PROCEDURE \`syllabus\`\|PROCEDURE \`syllabusTracker\`\|PROCEDURE \`subjects\`\|PROCEDURE \`subject_management\`\|PROCEDURE \`assignments\`\|PROCEDURE \`assignment_questions\`\|PROCEDURE \`GetSubjectsByClass\`\|PROCEDURE \`GetStudentsByClassSubject\`" \
  > elite_content_procedures.sql

mysql -u root -p elite_content < elite_content_procedures.sql
```

### Step 4: Migrate Data (Phased)
```bash
# Phase 1: Empty tables (safe)
mysqldump -u root -p full_skcooly \
  lesson_notes lesson_plan_reviews lesson_comments \
  recitations recitation_replies recitation_feedbacks \
  knowledge_domains knowledge_domain_criteria knowledge_domains_simplified knowledge_domains_enhanced \
  student_assignments assignment_responses assignment_question_options \
  virtual_classroom_attendance virtual_classroom_chat_messages virtual_classroom_recordings \
  subject_streams \
  | mysql -u root -p elite_content

# Phase 2: Small tables (<100 rows)
mysqldump -u root -p full_skcooly \
  lesson_time_table lesson_time_table_backup predefined_subjects student_subjects \
  syllabus syllabus_tracker syllabus_suggestions lesson_plans lessons \
  school_subject_mapping assignments assignment_questions \
  virtual_classrooms virtual_classroom_participants virtual_classroom_notifications \
  class_timing \
  | mysql -u root -p elite_content

# Phase 3: Large tables (with verification)
mysqldump -u root -p full_skcooly subjects | mysql -u root -p elite_content
mysqldump -u root -p full_skcooly teacher_classes | mysql -u root -p elite_content

# Verify counts
mysql -u root -p -e "
SELECT 'full_skcooly' as db, COUNT(*) FROM full_skcooly.subjects
UNION ALL
SELECT 'elite_content' as db, COUNT(*) FROM elite_content.subjects;
"
```

### Step 5: Update .env
```bash
# Add to .env
CONTENT_DB_NAME=elite_content
CONTENT_DB_USERNAME=root
CONTENT_DB_PASSWORD=
CONTENT_DB_HOST=localhost
CONTENT_DB_PORT=3306
```

### Step 6: Update databases.js
```javascript
// /config/databases.js
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
  contentDB, // NEW
  testConnections
};
```

### Step 7: Create Model Directory
```bash
mkdir -p /elscholar-api/src/models/content
```

### Step 8: Create /models/content/index.js
```javascript
const { contentDB } = require('../../config/databases');

const LessonPlan = require('./LessonPlan')(contentDB, contentDB.Sequelize.DataTypes);
const LessonNote = require('./LessonNote')(contentDB, contentDB.Sequelize.DataTypes);
const LessonPlanReview = require('./LessonPlanReview')(contentDB, contentDB.Sequelize.DataTypes);
const Syllabus = require('./Syllabus')(contentDB, contentDB.Sequelize.DataTypes);
const Subject = require('./Subject')(contentDB, contentDB.Sequelize.DataTypes);
const PredefinedSubject = require('./PredefinedSubject')(contentDB, contentDB.Sequelize.DataTypes);
const Recitation = require('./Recitation')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationReply = require('./RecitationReply')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationFeedback = require('./RecitationFeedback')(contentDB, contentDB.Sequelize.DataTypes);
const KnowledgeDomain = require('./KnowledgeDomain')(contentDB, contentDB.Sequelize.DataTypes);
const Assignment = require('./Assignment')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroom = require('./VirtualClassroom')(contentDB, contentDB.Sequelize.DataTypes);
const TeacherClass = require('./TeacherClass')(contentDB, contentDB.Sequelize.DataTypes);

const models = {
  LessonPlan,
  LessonNote,
  LessonPlanReview,
  Syllabus,
  Subject,
  PredefinedSubject,
  Recitation,
  RecitationReply,
  RecitationFeedback,
  KnowledgeDomain,
  Assignment,
  VirtualClassroom,
  TeacherClass
};

// Define associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize: contentDB,
  ...models
};
```

### Step 9: Move Model Files
```bash
# Move content models
mv src/models/LessonPlan.js src/models/content/
mv src/models/LessonNote.js src/models/content/
mv src/models/Syllabus.js src/models/content/
mv src/models/Subject.js src/models/content/
mv src/models/Recitation.js src/models/content/
mv src/models/RecitationReply.js src/models/content/
mv src/models/RecitationFeedback.js src/models/content/
# ... (move all 35 model files)
```

### Step 10: Update Controller Imports

**Before:**
```javascript
const db = require('../models');
const { LessonPlan } = db;
```

**After:**
```javascript
const contentDB = require('../models/content');
const coreDB = require('../models'); // For cross-DB references
const { LessonPlan } = contentDB;
```

### Step 11: Update Stored Procedure Calls

**Before:**
```javascript
await db.sequelize.query(
  `CALL lessons(:query_type, ...)`,
  { replacements: {...} }
);
```

**After:**
```javascript
const { contentDB } = require('../config/databases');

await contentDB.query(
  `CALL lessons(:query_type, ...)`,
  { replacements: {...} }
);
```

### Step 12: Handle Cross-Database Queries

**Example: Lesson Plan with Teacher Info**
```javascript
const { contentDB } = require('../config/databases');
const { mainDB } = require('../config/databases');

// Get lesson plan from elite_content
const lessonPlan = await contentDB.query(`
  SELECT * FROM lesson_plans WHERE id = :id
`, { replacements: { id }, type: QueryTypes.SELECT });

// Get teacher from elite_core
const teacher = await mainDB.query(`
  SELECT * FROM staff WHERE id = :teacher_id
`, { replacements: { teacher_id: lessonPlan[0].teacher_id }, type: QueryTypes.SELECT });

// Combine results
const result = {
  ...lessonPlan[0],
  teacher: teacher[0]
};
```

---

## 🧪 Testing Checklist

### Pre-Migration
- [ ] Backup full_skcooly database
- [ ] Document all stored procedures
- [ ] List all controllers using content tables
- [ ] Test connection pool settings

### Post-Migration
- [ ] Verify row counts match
- [ ] Test lesson plans CRUD
- [ ] Test syllabus operations
- [ ] Test assignments
- [ ] Test virtual classroom
- [ ] Test recitations
- [ ] Test subject management
- [ ] Check application logs for errors
- [ ] Performance benchmark

### Controller Tests
```bash
# Test lesson plans
curl -X GET http://localhost:34567/api/lessons

# Test syllabus
curl -X GET http://localhost:34567/api/syllabus

# Test assignments
curl -X GET http://localhost:34567/api/assignments

# Test virtual classroom
curl -X GET http://localhost:34567/api/virtual-classroom

# Test subjects
curl -X GET http://localhost:34567/api/subjects
```

---

## 🚨 Rollback Plan

```bash
# Immediate rollback - revert .env
CONTENT_DB_NAME=full_skcooly

# Restart application
npm restart

# If needed, restore from backup
mysql -u root -p full_skcooly < full_skcooly_backup_20260212.sql
```

---

## 📋 Post-Migration Cleanup (After 30 days)

```sql
-- Drop migrated tables from full_skcooly
DROP TABLE lesson_plans, lesson_notes, lesson_plan_reviews;
DROP TABLE syllabus, syllabus_tracker, syllabus_suggestions;
DROP TABLE subjects, predefined_subjects, student_subjects;
DROP TABLE recitations, recitation_replies, recitation_feedbacks;
DROP TABLE assignments, student_assignments, assignment_questions;
DROP TABLE virtual_classrooms, virtual_classroom_participants;
DROP TABLE teacher_classes, class_timing;

-- Drop bloat tables
DROP TABLE _backup_payment_entries_20251215;
DROP TABLE students_credit_backup_20260120;
DROP TABLE rbac_menu_access_backup_20260119;
DROP TABLE rbac_menu_items_backup_20260119;
DROP TABLE student_ledger_backup_20260120;
```

---

*Ready for Implementation*  
*Created: 2026-02-12*
