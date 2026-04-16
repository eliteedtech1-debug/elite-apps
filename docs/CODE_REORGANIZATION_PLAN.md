# Code Reorganization Plan - Domain-Based Structure

## 🎯 Goal
Organize models, controllers, and routes by domain (content, academic, finance, etc.) without changing API endpoints.

## 📁 Proposed Structure

```
elscholar-api/src/
├── domains/
│   ├── content/              # Educational content (elite_content DB)
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   ├── LessonPlan.js
│   │   │   ├── Subject.js
│   │   │   └── ...
│   │   ├── controllers/
│   │   │   ├── lessonPlanController.js
│   │   │   ├── subjectsController.js
│   │   │   ├── assignmentsController.js
│   │   │   └── ...
│   │   └── routes/
│   │       ├── index.js
│   │       ├── lessons.js
│   │       ├── subjects.js
│   │       └── ...
│   │
│   ├── academic/             # Assessment & grading (elite_assessment DB)
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   ├── CATemplate.js
│   │   │   └── ...
│   │   ├── controllers/
│   │   │   ├── caAssessmentController.js
│   │   │   └── ...
│   │   └── routes/
│   │       └── index.js
│   │
│   ├── finance/              # Payments & accounting (elite_finance DB)
│   │   ├── models/
│   │   ├── controllers/
│   │   └── routes/
│   │
│   ├── admin/                # School admin (full_skcooly)
│   │   ├── models/
│   │   ├── controllers/
│   │   └── routes/
│   │
│   ├── hr/                   # Staff & payroll (full_skcooly)
│   │   ├── models/
│   │   ├── controllers/
│   │   └── routes/
│   │
│   └── communication/        # Messaging & notifications (full_skcooly)
│       ├── models/
│       ├── controllers/
│       └── routes/
│
├── config/
│   ├── databases.js          # All DB connections
│   └── ...
│
└── app.js                    # Main app (routes stay same)
```

## 🔗 How Cross-Database Works

### Example: Lesson Plan with Teacher Info

**Scenario:** Lesson plans are in `elite_content`, but teacher info is in `full_skcooly`

```javascript
// domains/content/controllers/lessonPlanController.js

const { contentDB } = require('../../config/databases');
const { mainDB } = require('../../config/databases');

const getLessonPlanWithTeacher = async (req, res) => {
  try {
    // 1. Get lesson plan from elite_content
    const lessonPlan = await contentDB.query(`
      SELECT * FROM lesson_plans WHERE id = ?
    `, {
      replacements: [req.params.id],
      type: contentDB.QueryTypes.SELECT
    });

    if (!lessonPlan[0]) {
      return res.status(404).json({ message: 'Lesson plan not found' });
    }

    // 2. Get teacher from full_skcooly (main DB)
    const teacher = await mainDB.query(`
      SELECT id, name, email, phone FROM staff WHERE id = ?
    `, {
      replacements: [lessonPlan[0].teacher_id],
      type: mainDB.QueryTypes.SELECT
    });

    // 3. Combine results
    const result = {
      ...lessonPlan[0],
      teacher: teacher[0] || null
    };

    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

### Example: Subject with Class Info

```javascript
// domains/content/controllers/subjectsController.js

const { contentDB } = require('../../config/databases');
const { mainDB } = require('../../config/databases');

const getSubjectWithClass = async (req, res) => {
  try {
    // Get subject from elite_content
    const [subject] = await contentDB.query(
      'SELECT * FROM subjects WHERE id = ?',
      { replacements: [req.params.id], type: contentDB.QueryTypes.SELECT }
    );

    // Get class from full_skcooly
    const [classInfo] = await mainDB.query(
      'SELECT * FROM classes WHERE id = ?',
      { replacements: [subject.class_id], type: mainDB.QueryTypes.SELECT }
    );

    res.json({
      ...subject,
      class: classInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Example: Bulk Query with JOIN Alternative

**Problem:** Can't JOIN across databases directly

**Solution:** Fetch separately and merge in code

```javascript
const getSubjectsWithTeachers = async (req, res) => {
  try {
    // 1. Get all subjects from elite_content
    const subjects = await contentDB.query(
      'SELECT * FROM subjects WHERE class_id = ?',
      { replacements: [req.params.classId], type: contentDB.QueryTypes.SELECT }
    );

    // 2. Get unique teacher IDs
    const teacherIds = [...new Set(subjects.map(s => s.teacher_id))];

    // 3. Get all teachers in one query from full_skcooly
    const teachers = await mainDB.query(
      'SELECT id, name, email FROM staff WHERE id IN (?)',
      { replacements: [teacherIds], type: mainDB.QueryTypes.SELECT }
    );

    // 4. Create teacher lookup map
    const teacherMap = teachers.reduce((map, t) => {
      map[t.id] = t;
      return map;
    }, {});

    // 5. Merge data
    const result = subjects.map(subject => ({
      ...subject,
      teacher: teacherMap[subject.teacher_id] || null
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## 📋 Reorganization Steps

### Step 1: Create Domain Structure
```bash
cd elscholar-api/src
mkdir -p domains/{content,academic,finance,admin,hr,communication}/{models,controllers,routes}
```

### Step 2: Move Content Domain Files

#### Models
```bash
# Already created in models/content/
# Just move the directory
mv models/content domains/content/models
```

#### Controllers
```bash
# Move content-related controllers
mv controllers/lessonPlan.js domains/content/controllers/
mv controllers/LessonPlanController.js domains/content/controllers/
mv controllers/enhancedLessonPlanController.js domains/content/controllers/
mv controllers/subjects.js domains/content/controllers/
mv controllers/subjectsEnhanced.js domains/content/controllers/
mv controllers/assignments.js domains/content/controllers/
mv controllers/assignments-fixed.js domains/content/controllers/
mv controllers/syllabus.js domains/content/controllers/
mv controllers/syllabusController.js domains/content/controllers/
mv controllers/virtualClassroom.js domains/content/controllers/
mv controllers/recitationsController.js domains/content/controllers/
mv controllers/predefinedSubjects.js domains/content/controllers/
mv controllers/subjectMappingController.js domains/content/controllers/
mv controllers/class_timing.js domains/content/controllers/
```

#### Routes
```bash
# Move content routes
mv routes/lessons.js domains/content/routes/
mv routes/subjects.js domains/content/routes/
mv routes/assignments.js domains/content/routes/
mv routes/syllabus.js domains/content/routes/
mv routes/virtual-classroom.js domains/content/routes/
mv routes/recitations.js domains/content/routes/
```

### Step 3: Create Domain Route Index

```javascript
// domains/content/routes/index.js
const express = require('express');
const router = express.Router();

// Import all content routes
const lessonsRoutes = require('./lessons');
const subjectsRoutes = require('./subjects');
const assignmentsRoutes = require('./assignments');
const syllabusRoutes = require('./syllabus');
const virtualClassroomRoutes = require('./virtual-classroom');
const recitationsRoutes = require('./recitations');

// Mount routes (endpoints stay the same)
router.use('/lessons', lessonsRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/syllabus', syllabusRoutes);
router.use('/virtual-classroom', virtualClassroomRoutes);
router.use('/recitations', recitationsRoutes);

module.exports = router;
```

### Step 4: Update Main App Routes

```javascript
// app.js (or routes/index.js)

// OLD WAY
// app.use('/api/lessons', require('./routes/lessons'));
// app.use('/api/subjects', require('./routes/subjects'));
// ... 50+ individual routes

// NEW WAY - Domain-based
app.use('/api', require('./domains/content/routes'));
app.use('/api', require('./domains/academic/routes'));
app.use('/api', require('./domains/finance/routes'));
app.use('/api', require('./domains/admin/routes'));
app.use('/api', require('./domains/hr/routes'));
app.use('/api', require('./domains/communication/routes'));

// Endpoints remain exactly the same:
// /api/lessons
// /api/subjects
// /api/assignments
// etc.
```

### Step 5: Update Controller Imports

```javascript
// domains/content/routes/subjects.js

// OLD
// const controller = require('../controllers/subjects');

// NEW
const controller = require('../controllers/subjectsController');

// Routes stay the same
router.get('/', controller.getAllSubjects);
router.post('/', controller.createSubject);
// etc.
```

### Step 6: Update Model Imports in Controllers

```javascript
// domains/content/controllers/subjectsController.js

// OLD
// const db = require('../models');
// const { Subject } = db;

// NEW
const contentModels = require('../models');
const { Subject } = contentModels;

// Or direct import
const { contentDB } = require('../../config/databases');
```

## 🔧 Cross-Database Helper Functions

Create reusable helpers for common cross-DB patterns:

```javascript
// domains/shared/helpers/crossDbHelpers.js

const { contentDB, mainDB } = require('../../config/databases');

/**
 * Enrich content records with main DB data
 */
const enrichWithMainData = async (records, foreignKey, mainTable, mainFields = '*') => {
  if (!records.length) return records;

  const ids = [...new Set(records.map(r => r[foreignKey]))];
  
  const mainData = await mainDB.query(
    `SELECT ${mainFields} FROM ${mainTable} WHERE id IN (?)`,
    { replacements: [ids], type: mainDB.QueryTypes.SELECT }
  );

  const dataMap = mainData.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});

  return records.map(record => ({
    ...record,
    [mainTable.replace(/s$/, '')]: dataMap[record[foreignKey]] || null
  }));
};

/**
 * Get content with related main DB data
 */
const getContentWithRelation = async (contentTable, contentId, relationConfig) => {
  const [content] = await contentDB.query(
    `SELECT * FROM ${contentTable} WHERE id = ?`,
    { replacements: [contentId], type: contentDB.QueryTypes.SELECT }
  );

  if (!content) return null;

  for (const relation of relationConfig) {
    const [related] = await mainDB.query(
      `SELECT ${relation.fields} FROM ${relation.table} WHERE id = ?`,
      { replacements: [content[relation.foreignKey]], type: mainDB.QueryTypes.SELECT }
    );
    content[relation.as] = related || null;
  }

  return content;
};

module.exports = {
  enrichWithMainData,
  getContentWithRelation
};
```

**Usage:**
```javascript
const { enrichWithMainData } = require('../shared/helpers/crossDbHelpers');

// Get subjects and enrich with teacher data
const subjects = await contentDB.query('SELECT * FROM subjects WHERE class_id = ?', ...);
const enriched = await enrichWithMainData(subjects, 'teacher_id', 'staff', 'id, name, email');

res.json(enriched);
```

## 📊 Benefits

### Before (Current)
```
controllers/
├── 110+ files mixed together
routes/
├── 50+ files mixed together
models/
├── 110+ files mixed together
```

### After (Organized)
```
domains/
├── content/        (30 tables, 15 controllers, 10 routes)
├── academic/       (20 tables, 10 controllers, 8 routes)
├── finance/        (15 tables, 8 controllers, 6 routes)
├── admin/          (25 tables, 20 controllers, 15 routes)
├── hr/             (10 tables, 8 controllers, 5 routes)
└── communication/  (10 tables, 5 controllers, 4 routes)
```

**Advantages:**
- ✅ Clear domain boundaries
- ✅ Easy to find related files
- ✅ Database per domain
- ✅ Same API endpoints
- ✅ Better for team collaboration
- ✅ Easier testing per domain

## 🚀 Implementation Script

Want me to create a script that:
1. Creates domain structure
2. Moves files automatically
3. Updates imports
4. Tests endpoints still work?

Let me know and I'll generate it!
