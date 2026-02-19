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
