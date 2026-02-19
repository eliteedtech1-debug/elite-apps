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
