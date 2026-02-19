#!/bin/bash
# Update Controllers to Use contentDB
# Run after successful migration and config update

set -e

CONTROLLERS_DIR="elscholar-api/src/controllers"
BACKUP_DIR="controllers_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== Update Controllers for contentDB ==="
echo ""

# Create backup
echo "[1/3] Creating backup..."
cp -r $CONTROLLERS_DIR $BACKUP_DIR
echo "✓ Backup: $BACKUP_DIR"
echo ""

# List controllers to update
echo "[2/3] Controllers requiring updates:"
cat pre_migration_analysis/06_controllers.txt
echo ""

# Generate update instructions
echo "[3/3] Generating update guide..."
cat > controller_update_guide.md << 'EOF'
# Controller Update Guide

## Pattern 1: Replace db.sequelize with contentDB

### Files to Update (from pre_migration_analysis/06_controllers.txt)

For each controller that uses content tables:

### Before:
```javascript
const db = require('../models');

// Query
await db.sequelize.query('SELECT * FROM subjects WHERE id = ?', {
  replacements: [id],
  type: db.sequelize.QueryTypes.SELECT
});

// Stored procedure
await db.sequelize.query('CALL subjects(:action, ...)', {
  replacements: { action, ... }
});
```

### After:
```javascript
const { contentDB } = require('../config/databases');
const { mainDB } = require('../config/databases'); // For cross-DB queries

// Query
await contentDB.query('SELECT * FROM subjects WHERE id = ?', {
  replacements: [id],
  type: contentDB.QueryTypes.SELECT
});

// Stored procedure
await contentDB.query('CALL subjects(:action, ...)', {
  replacements: { action, ... }
});
```

## Pattern 2: Cross-Database Queries

When content tables reference main DB tables (students, staff, classes):

```javascript
const { contentDB } = require('../config/databases');
const { mainDB } = require('../config/databases');

// Get subject from content DB
const subject = await contentDB.query(
  'SELECT * FROM subjects WHERE id = ?',
  { replacements: [subjectId], type: contentDB.QueryTypes.SELECT }
);

// Get teacher from main DB
const teacher = await mainDB.query(
  'SELECT * FROM staff WHERE id = ?',
  { replacements: [subject[0].teacher_id], type: mainDB.QueryTypes.SELECT }
);

// Combine
return {
  ...subject[0],
  teacher: teacher[0]
};
```

## Pattern 3: Model Usage

### Before:
```javascript
const db = require('../models');
const { Subject } = db;

const subjects = await Subject.findAll({ where: { class_id } });
```

### After:
```javascript
const contentDB = require('../models/content');
const { Subject } = contentDB;

const subjects = await Subject.findAll({ where: { class_id } });
```

## Controllers Priority Order

### High Priority (Active Usage)
1. subjects.js / subjectsEnhanced.js
2. assignments.js / assignments-fixed.js
3. lessonPlan.js / LessonPlanController.js / enhancedLessonPlanController.js
4. syllabus.js / syllabusController.js
5. virtualClassroom.js
6. teachers.js (for teacher_classes)
7. class_timing.js

### Medium Priority
8. recitationsController.js
9. predefinedSubjects.js
10. subjectMappingController.js
11. school-setups.js (syllabus references)

### Low Priority (Indirect References)
12. All other controllers in 06_controllers.txt

## Testing After Each Update

```bash
# Restart server
cd elscholar-api
npm restart

# Test endpoint
curl http://localhost:34567/api/subjects
curl http://localhost:34567/api/lessons
curl http://localhost:34567/api/assignments

# Check logs
tail -f logs/queries.log
```

## Rollback

If issues occur:
```bash
# Restore controllers
rm -rf elscholar-api/src/controllers
mv controllers_backup_TIMESTAMP elscholar-api/src/controllers

# Revert .env
CONTENT_DB_NAME=full_skcooly

# Restart
npm restart
```
EOF

cat controller_update_guide.md
echo ""
echo "✓ Guide saved: controller_update_guide.md"
echo ""
echo "Manual steps required:"
echo "1. Update config/databases.js (add contentDB)"
echo "2. Update .env (CONTENT_DB_NAME=elite_content)"
echo "3. Update each controller following the guide"
echo "4. Test after each controller update"
echo "5. Monitor logs for errors"
