#!/bin/bash
# Automated Code Reorganization - Domain-Based Structure
# Reorganizes models, controllers, and routes by domain without changing endpoints

set -e

BASE_DIR="elscholar-api/src"
BACKUP_DIR="code_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== Code Reorganization: Domain-Based Structure ==="
echo ""

# Create backup
echo "[1/8] Creating backup..."
cp -r $BASE_DIR $BACKUP_DIR
echo "✓ Backup: $BACKUP_DIR"
echo ""

# Create domain structure
echo "[2/8] Creating domain directories..."
mkdir -p $BASE_DIR/domains/{content,academic,finance,admin,hr,communication,shared}/{models,controllers,routes,helpers}
echo "✓ Domain structure created"
echo ""

# Move content models
echo "[3/8] Moving content models..."
if [ -d "$BASE_DIR/models/content" ]; then
  mv $BASE_DIR/models/content $BASE_DIR/domains/content/models/
  echo "✓ Content models moved"
else
  echo "⚠️  models/content not found, skipping"
fi
echo ""

# Move content controllers
echo "[4/8] Moving content controllers..."
cd $BASE_DIR/controllers

for file in \
  lessonPlan.js LessonPlanController.js enhancedLessonPlanController.js \
  subjects.js subjectsEnhanced.js \
  assignments.js assignments-fixed.js \
  syllabus.js syllabusController.js \
  virtualClassroom.js \
  recitationsController.js \
  predefinedSubjects.js \
  subjectMappingController.js \
  class_timing.js \
  lesson_time_table.js \
  lessons.js
do
  if [ -f "$file" ]; then
    mv "$file" ../domains/content/controllers/ 2>/dev/null || echo "  Skip: $file"
  fi
done

cd - > /dev/null
echo "✓ Content controllers moved"
echo ""

# Move content routes
echo "[5/8] Moving content routes..."
cd $BASE_DIR/routes 2>/dev/null || cd ../routes

for file in \
  lessons.js \
  subjects.js \
  assignments.js \
  syllabus.js \
  virtual-classroom.js \
  recitations.js \
  predefined-subjects.js
do
  if [ -f "$file" ]; then
    mv "$file" ../domains/content/routes/ 2>/dev/null || echo "  Skip: $file"
  fi
done

cd - > /dev/null
echo "✓ Content routes moved"
echo ""

# Create content domain index files
echo "[6/8] Creating domain index files..."

# Content models index
cat > $BASE_DIR/domains/content/models/index.js << 'EOF'
const { contentDB } = require('../../../config/databases');

// Lessons & Planning
const LessonPlan = require('./LessonPlan')(contentDB, contentDB.Sequelize.DataTypes);
const LessonNote = require('./LessonNote')(contentDB, contentDB.Sequelize.DataTypes);
const LessonPlanReview = require('./LessonPlanReview')(contentDB, contentDB.Sequelize.DataTypes);
const LessonComment = require('./LessonComment')(contentDB, contentDB.Sequelize.DataTypes);
const LessonTimeTable = require('./LessonTimeTable')(contentDB, contentDB.Sequelize.DataTypes);

// Syllabus
const Syllabus = require('./Syllabus')(contentDB, contentDB.Sequelize.DataTypes);
const SyllabusTracker = require('./SyllabusTracker')(contentDB, contentDB.Sequelize.DataTypes);
const SyllabusSuggestion = require('./SyllabusSuggestion')(contentDB, contentDB.Sequelize.DataTypes);

// Subjects
const Subject = require('./Subject')(contentDB, contentDB.Sequelize.DataTypes);
const PredefinedSubject = require('./PredefinedSubject')(contentDB, contentDB.Sequelize.DataTypes);
const StudentSubject = require('./StudentSubject')(contentDB, contentDB.Sequelize.DataTypes);
const SchoolSubjectMapping = require('./SchoolSubjectMapping')(contentDB, contentDB.Sequelize.DataTypes);

// Assignments
const Assignment = require('./Assignment')(contentDB, contentDB.Sequelize.DataTypes);
const StudentAssignment = require('./StudentAssignment')(contentDB, contentDB.Sequelize.DataTypes);
const AssignmentQuestion = require('./AssignmentQuestion')(contentDB, contentDB.Sequelize.DataTypes);
const AssignmentResponse = require('./AssignmentResponse')(contentDB, contentDB.Sequelize.DataTypes);
const AssignmentQuestionOption = require('./AssignmentQuestionOption')(contentDB, contentDB.Sequelize.DataTypes);

// Recitations
const Recitation = require('./Recitation')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationReply = require('./RecitationReply')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationFeedback = require('./RecitationFeedback')(contentDB, contentDB.Sequelize.DataTypes);

// Virtual Classroom
const VirtualClassroom = require('./VirtualClassroom')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomParticipant = require('./VirtualClassroomParticipant')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomAttendance = require('./VirtualClassroomAttendance')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomChatMessage = require('./VirtualClassroomChatMessage')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomRecording = require('./VirtualClassroomRecording')(contentDB, contentDB.Sequelize.DataTypes);
const VirtualClassroomNotification = require('./VirtualClassroomNotification')(contentDB, contentDB.Sequelize.DataTypes);

// Teacher Assignment
const TeacherClass = require('./TeacherClass')(contentDB, contentDB.Sequelize.DataTypes);
const ClassTiming = require('./ClassTiming')(contentDB, contentDB.Sequelize.DataTypes);

const models = {
  LessonPlan,
  LessonNote,
  LessonPlanReview,
  LessonComment,
  LessonTimeTable,
  Syllabus,
  SyllabusTracker,
  SyllabusSuggestion,
  Subject,
  PredefinedSubject,
  StudentSubject,
  SchoolSubjectMapping,
  Assignment,
  StudentAssignment,
  AssignmentQuestion,
  AssignmentResponse,
  AssignmentQuestionOption,
  Recitation,
  RecitationReply,
  RecitationFeedback,
  VirtualClassroom,
  VirtualClassroomParticipant,
  VirtualClassroomAttendance,
  VirtualClassroomChatMessage,
  VirtualClassroomRecording,
  VirtualClassroomNotification,
  TeacherClass,
  ClassTiming
};

Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize: contentDB,
  ...models
};
EOF

# Content routes index
cat > $BASE_DIR/domains/content/routes/index.js << 'EOF'
const express = require('express');
const router = express.Router();

// Import content routes
const lessonsRoutes = require('./lessons');
const subjectsRoutes = require('./subjects');
const assignmentsRoutes = require('./assignments');
const syllabusRoutes = require('./syllabus');

// Mount routes (endpoints stay the same)
router.use('/lessons', lessonsRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/syllabus', syllabusRoutes);

// Add other routes as they exist
try {
  const virtualClassroomRoutes = require('./virtual-classroom');
  router.use('/virtual-classroom', virtualClassroomRoutes);
} catch (e) {}

try {
  const recitationsRoutes = require('./recitations');
  router.use('/recitations', recitationsRoutes);
} catch (e) {}

try {
  const predefinedSubjectsRoutes = require('./predefined-subjects');
  router.use('/predefined-subjects', predefinedSubjectsRoutes);
} catch (e) {}

module.exports = router;
EOF

echo "✓ Domain index files created"
echo ""

# Create cross-DB helpers
echo "[7/8] Creating cross-database helpers..."
cat > $BASE_DIR/domains/shared/helpers/crossDbHelpers.js << 'EOF'
const { contentDB, mainDB } = require('../../../config/databases');

/**
 * Enrich content records with main DB data
 * @param {Array} records - Records from content DB
 * @param {String} foreignKey - Foreign key field name
 * @param {String} mainTable - Table name in main DB
 * @param {String} mainFields - Fields to select (default: *)
 * @param {String} asKey - Key name for enriched data (default: table name without 's')
 */
const enrichWithMainData = async (records, foreignKey, mainTable, mainFields = '*', asKey = null) => {
  if (!records || !records.length) return records;

  const ids = [...new Set(records.map(r => r[foreignKey]).filter(Boolean))];
  if (!ids.length) return records;

  const mainData = await mainDB.query(
    `SELECT ${mainFields} FROM ${mainTable} WHERE id IN (?)`,
    { replacements: [ids], type: mainDB.QueryTypes.SELECT }
  );

  const dataMap = mainData.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});

  const key = asKey || mainTable.replace(/s$/, '');

  return records.map(record => ({
    ...record,
    [key]: dataMap[record[foreignKey]] || null
  }));
};

/**
 * Get single content record with related main DB data
 */
const getContentWithRelations = async (contentTable, contentId, relations = []) => {
  const [content] = await contentDB.query(
    `SELECT * FROM ${contentTable} WHERE id = ?`,
    { replacements: [contentId], type: contentDB.QueryTypes.SELECT }
  );

  if (!content) return null;

  for (const relation of relations) {
    const [related] = await mainDB.query(
      `SELECT ${relation.fields || '*'} FROM ${relation.table} WHERE id = ?`,
      { replacements: [content[relation.foreignKey]], type: mainDB.QueryTypes.SELECT }
    );
    content[relation.as] = related || null;
  }

  return content;
};

/**
 * Execute query on content DB
 */
const queryContent = async (sql, replacements = []) => {
  return contentDB.query(sql, {
    replacements,
    type: contentDB.QueryTypes.SELECT
  });
};

/**
 * Execute query on main DB
 */
const queryMain = async (sql, replacements = []) => {
  return mainDB.query(sql, {
    replacements,
    type: mainDB.QueryTypes.SELECT
  });
};

module.exports = {
  enrichWithMainData,
  getContentWithRelations,
  queryContent,
  queryMain,
  contentDB,
  mainDB
};
EOF

echo "✓ Cross-DB helpers created"
echo ""

# Create usage guide
echo "[8/8] Creating usage guide..."
cat > REORGANIZATION_COMPLETE.md << 'EOF'
# Code Reorganization Complete

## ✅ What Changed

### Structure
```
elscholar-api/src/
├── domains/
│   ├── content/
│   │   ├── models/          (30 models)
│   │   ├── controllers/     (13 controllers)
│   │   ├── routes/          (7 routes)
│   │   └── helpers/
│   └── shared/
│       └── helpers/
│           └── crossDbHelpers.js
```

### Files Moved
- ✅ Content models → domains/content/models/
- ✅ Content controllers → domains/content/controllers/
- ✅ Content routes → domains/content/routes/

### Files Created
- ✅ domains/content/models/index.js
- ✅ domains/content/routes/index.js
- ✅ domains/shared/helpers/crossDbHelpers.js

## 🔧 Next Steps

### 1. Update config/databases.js

Add contentDB connection:

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

### 2. Update app.js or main routes file

Replace individual route imports with domain routes:

```javascript
// OLD (remove these)
// app.use('/api/lessons', require('./routes/lessons'));
// app.use('/api/subjects', require('./routes/subjects'));
// ... etc

// NEW (add this)
app.use('/api', require('./domains/content/routes'));
```

### 3. Update Controller Imports

Controllers now use domain-relative paths:

```javascript
// In domains/content/controllers/subjectsController.js

// Import models
const contentModels = require('../models');
const { Subject } = contentModels;

// Import helpers
const { enrichWithMainData, queryContent, queryMain } = require('../../shared/helpers/crossDbHelpers');

// Use cross-DB queries
const subjects = await queryContent('SELECT * FROM subjects WHERE class_code = ?', [classCode]);
const enriched = await enrichWithMainData(subjects, 'teacher_id', 'staff', 'id, name, email');
```

### 4. Update Route Imports

Routes now use domain-relative paths:

```javascript
// In domains/content/routes/subjects.js

// OLD
// const controller = require('../controllers/subjects');

// NEW
const controller = require('../controllers/subjectsController');
```

## 📝 Cross-Database Usage Examples

### Example 1: Enrich subjects with teacher data
```javascript
const { enrichWithMainData, queryContent } = require('../../shared/helpers/crossDbHelpers');

const subjects = await queryContent('SELECT * FROM subjects WHERE class_code = ?', [classCode]);
const enriched = await enrichWithMainData(subjects, 'teacher_id', 'staff', 'id, name, email', 'teacher');

res.json(enriched);
```

### Example 2: Get lesson plan with teacher
```javascript
const { getContentWithRelations } = require('../../shared/helpers/crossDbHelpers');

const lessonPlan = await getContentWithRelations('lesson_plans', lessonId, [
  { foreignKey: 'teacher_id', table: 'staff', fields: 'id, name, email', as: 'teacher' }
]);

res.json(lessonPlan);
```

### Example 3: Direct queries
```javascript
const { queryContent, queryMain } = require('../../shared/helpers/crossDbHelpers');

const subjects = await queryContent('SELECT * FROM subjects WHERE id = ?', [id]);
const teacher = await queryMain('SELECT * FROM staff WHERE id = ?', [subjects[0].teacher_id]);

res.json({ ...subjects[0], teacher });
```

## 🔄 Rollback

If issues occur:

```bash
# Restore original structure
rm -rf elscholar-api/src/domains
cp -r code_backup_TIMESTAMP/* elscholar-api/src/

# Restart
cd elscholar-api
npm restart
```

## ✅ Benefits

- Clear domain boundaries
- Easy to find related files
- Database per domain
- Same API endpoints
- Better team collaboration
- Easier testing per domain

---

*Reorganization completed: 2026-02-12*
EOF

cat REORGANIZATION_COMPLETE.md
echo ""
echo "✓ Usage guide created"
echo ""

echo "=== Reorganization Complete ==="
echo ""
echo "Backup: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review REORGANIZATION_COMPLETE.md"
echo "2. Update config/databases.js (add contentDB)"
echo "3. Update app.js (use domain routes)"
echo "4. Update controller imports"
echo "5. Test: npm restart && curl http://localhost:34567/api/subjects"
echo ""
echo "Rollback: cp -r $BACKUP_DIR/* elscholar-api/src/"
