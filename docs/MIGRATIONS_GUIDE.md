# Database Migrations Guide

## Overview

Database migrations track and apply schema changes in a controlled, versioned manner.

## Migration System

### Structure
```
elscholar-api/
├── migrations/                    # SQL migration files
│   ├── 000_create_migrations_table.sql
│   ├── 001_add_subject_code_to_lessons.sql
│   └── 002_your_migration.sql
├── scripts/
│   └── migrate.js                # Migration runner
└── src/utils/
    └── MigrationRunner.js        # Migration logic
```

### Tracking
- Migrations tracked in `schema_migrations` table
- Each migration runs once
- Applied migrations recorded with timestamp

## Commands

### Check Status
```bash
npm run migrate:status
```

Output:
```
=== Migration Status ===
Applied: 2
Pending: 0

Applied migrations:
  ✓ 000_create_migrations_table.sql
  ✓ 001_add_subject_code_to_lessons.sql
```

### Run Migrations
```bash
npm run migrate:run
```

Output:
```
Found 1 pending migration(s)
Running migration: 002_add_indexes.sql
✓ Migration completed: 002_add_indexes.sql

✓ Applied 1 migration(s)
```

## Creating Migrations

### Naming Convention
```
{number}_{description}.sql

Examples:
000_create_migrations_table.sql
001_add_subject_code_to_lessons.sql
002_add_indexes_for_performance.sql
003_create_notifications_table.sql
```

### Migration Template
```sql
-- Migration: Brief description
-- Date: YYYY-MM-DD
-- Description: Detailed explanation of changes

-- Check if change already exists (idempotent)
SET @exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'your_table' 
  AND COLUMN_NAME = 'your_column'
);

-- Apply change conditionally
SET @query = IF(
  @exists = 0,
  'ALTER TABLE your_table ADD COLUMN your_column VARCHAR(50)',
  'SELECT "Column already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_your_index ON your_table(your_column);
```

## Common Migration Patterns

### Add Column
```sql
-- Migration: Add email to students
-- Date: 2026-02-12

SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'students' 
  AND COLUMN_NAME = 'email'
);

SET @query = IF(
  @col_exists = 0,
  'ALTER TABLE students ADD COLUMN email VARCHAR(255) AFTER phone',
  'SELECT "Column email already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### Add Index
```sql
-- Migration: Add performance indexes
-- Date: 2026-02-12

CREATE INDEX IF NOT EXISTS idx_students_school_branch 
ON students(school_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_lessons_class_date 
ON lessons(class_code, lesson_date);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON attendance(student_id, date);
```

### Create Table
```sql
-- Migration: Create audit_logs table
-- Date: 2026-02-12

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(100),
  old_values JSON,
  new_values JSON,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_school_id (school_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Modify Column
```sql
-- Migration: Change admission_no to NOT NULL
-- Date: 2026-02-12

ALTER TABLE students 
MODIFY COLUMN admission_no VARCHAR(50) NOT NULL;
```

### Data Migration
```sql
-- Migration: Populate missing subject_codes
-- Date: 2026-02-12

UPDATE lessons 
SET subject_code = subject 
WHERE subject_code IS NULL AND subject IS NOT NULL;
```

### Add Foreign Key
```sql
-- Migration: Add foreign key for class_teacher
-- Date: 2026-02-12

SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'classes' 
  AND CONSTRAINT_NAME = 'fk_classes_teacher'
);

SET @query = IF(
  @fk_exists = 0,
  'ALTER TABLE classes ADD CONSTRAINT fk_classes_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers(teacher_id)',
  'SELECT "Foreign key already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

## Best Practices

### 1. Make Migrations Idempotent
```sql
-- ✅ GOOD - Can run multiple times safely
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_name ON users(name);

-- ❌ BAD - Fails on second run
CREATE TABLE users (...);
CREATE INDEX idx_name ON users(name);
```

### 2. One Logical Change Per Migration
```sql
-- ✅ GOOD
-- 001_add_email_to_students.sql
-- 002_add_phone_to_students.sql

-- ❌ BAD
-- 001_update_students_table.sql (multiple unrelated changes)
```

### 3. Test Before Committing
```bash
# Test on development database
npm run migrate:run

# Verify changes
mysql -u root full_skcooly -e "DESCRIBE students;"

# Check status
npm run migrate:status
```

### 4. Include Rollback Plan
```sql
-- Migration: Add email column
-- Rollback: ALTER TABLE students DROP COLUMN email;

ALTER TABLE students ADD COLUMN email VARCHAR(255);
```

### 5. Document Breaking Changes
```sql
-- Migration: Make admission_no NOT NULL
-- WARNING: This will fail if any records have NULL admission_no
-- Run this first: UPDATE students SET admission_no = CONCAT('TEMP', id) WHERE admission_no IS NULL;

ALTER TABLE students MODIFY COLUMN admission_no VARCHAR(50) NOT NULL;
```

## Workflow

### Development
1. Create migration file with next number
2. Write idempotent SQL
3. Test locally: `npm run migrate:run`
4. Verify changes
5. Commit migration file

### Staging
1. Pull latest code
2. Run: `npm run migrate:status`
3. Run: `npm run migrate:run`
4. Test application

### Production
1. Backup database
2. Run: `npm run migrate:status`
3. Run: `npm run migrate:run`
4. Verify application
5. Monitor for issues

## Troubleshooting

### Migration Failed
```bash
# Check error message
npm run migrate:run

# Fix SQL in migration file
# Drop from tracking table
mysql -u root full_skcooly -e "DELETE FROM schema_migrations WHERE migration_name = '002_failed_migration.sql';"

# Run again
npm run migrate:run
```

### Skip Migration
```bash
# Manually mark as applied (use with caution)
mysql -u root full_skcooly -e "INSERT INTO schema_migrations (migration_name) VALUES ('002_skip_this.sql');"
```

### Reset All Migrations (Development Only)
```bash
# ⚠️ WARNING: Destroys migration history
mysql -u root full_skcooly -e "DROP TABLE schema_migrations;"
npm run migrate:run
```

## Integration with Deployment

### package.json
```json
{
  "scripts": {
    "deploy": "npm run migrate:run && npm start",
    "predeploy": "npm run migrate:status"
  }
}
```

### Docker
```dockerfile
# Run migrations on container start
CMD ["sh", "-c", "npm run migrate:run && npm start"]
```

### CI/CD
```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: npm run migrate:run
  
- name: Start application
  run: npm start
```

---

**Last Updated:** 2026-02-12  
**Version:** 1.0
