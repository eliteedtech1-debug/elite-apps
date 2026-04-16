# Consolidated Database Migration - README

## Overview

All unstaged SQL migration files have been consolidated into a single, safe, idempotent migration file:

**File:** `CONSOLIDATED_DATABASE_MIGRATION.sql`

## Key Features

✅ **100% Idempotent** - Can be run multiple times without errors
✅ **Safe for Production** - Uses `IF NOT EXISTS` and dynamic column checks
✅ **No Data Loss** - Only adds tables/columns, never drops existing data
✅ **Comprehensive** - Consolidates 7 separate migration files

## Source Files Consolidated

1. `database_migrations/ca_exam_submissions_fixes.sql`
2. `database_migrations/create_ca_exam_tables.sql`
3. `database_migrations/remove_payment_unique_constraint.sql`
4. `src/models/biometric_import_migration.sql`
5. `src/models/ca_exam_process_migration.sql`
6. `src/models/ca_setup_migration.sql`
7. `src/models/gps_attendance_migration.sql`

## What's Included

### SECTION 1: GPS-Based Staff Attendance System

**Tables Created:**
- `staff_attendance` - Daily attendance records with GPS tracking

**Columns Added:**
- `school_locations.latitude` - Branch GPS latitude
- `school_locations.longitude` - Branch GPS longitude
- `school_locations.gps_radius` - Allowed radius in meters (default: 80m)
- `school_setup.staff_login_system` - Enable GPS attendance (0=Normal, 1=GPS)
- `staff_attendance.device_id` - Biometric device identifier

**Views Created:**
- `staff_attendance_summary` - Attendance statistics by method

### SECTION 2: Biometric Import System

**Tables Created:**
- `biometric_import_history` - Track all biometric imports
- `biometric_import_log` - Legacy compatibility table

**Views Created:**
- `v_recent_import_summary` - Last 30 days import summary
- `v_device_type_statistics` - Statistics by device type

### SECTION 3: CA Setup System

**Tables Created:**
- `ca_setup` - Continuous Assessment and Exam configuration

**Columns Added:**
- `ca_setup.scheduled_date` - Auto-calculated from week_number
- `ca_setup.submission_deadline` - Question submission deadline
- `ca_setup.notification_sent` - Track if teachers notified
- `school_setup.cbt_enabled` - Enable Computer-Based Testing

### SECTION 4: CA/Exam Submissions System

**Tables Created:**
- `ca_exam_submissions` - Teacher question submissions
- `ca_exam_moderation_logs` - Audit log for moderation actions
- `ca_exam_notifications` - Notification system
- `ca_exam_print_logs` - Printing activity tracking

**Fixes Applied:**
- Changed `ca_exam_submissions.class_id` from INT to VARCHAR(50)
- Added `submitted_at` column
- Added `subject_code` support (VARCHAR instead of INT)

**Views Created:**
- `v_ca_exam_submission_summary` - Summary by status

### SECTION 5: Payment Entries

**Fixes Applied:**
- Removed `uk_payment_entries_student_fee` unique constraint
- Removed `unique_payment_entry` unique constraint
- Allows multiple payments per student (fixes payment system)

## How to Run

### Option 1: MySQL Command Line

```bash
mysql -u username -p database_name < CONSOLIDATED_DATABASE_MIGRATION.sql
```

### Option 2: MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. File → Open SQL Script
4. Select `CONSOLIDATED_DATABASE_MIGRATION.sql`
5. Execute (⚡ icon or Ctrl+Shift+Enter)

### Option 3: phpMyAdmin

1. Log in to phpMyAdmin
2. Select your database
3. Go to "SQL" tab
4. Click "Choose File" and select `CONSOLIDATED_DATABASE_MIGRATION.sql`
5. Click "Go"

## Verification

After running the migration, verify with:

```sql
-- Check new tables were created
SHOW TABLES LIKE 'staff_attendance';
SHOW TABLES LIKE 'ca_exam_submissions';
SHOW TABLES LIKE 'biometric_import_history';

-- Check new columns were added
DESCRIBE school_locations;  -- Should have latitude, longitude, gps_radius
DESCRIBE school_setup;       -- Should have staff_login_system, cbt_enabled
DESCRIBE ca_setup;           -- Should have scheduled_date, submission_deadline

-- Check views were created
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Verify final status message
-- Should show: "Consolidated database migration completed successfully!"
```

## Safety Features

### 1. Dynamic Column Checks

```sql
-- Example: Only adds column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'school_locations'
   AND COLUMN_NAME = 'latitude') > 0,
  'SELECT 1',  -- Column exists, do nothing
  'ALTER TABLE school_locations ADD COLUMN latitude...'  -- Add column
));
```

### 2. CREATE IF NOT EXISTS

All `CREATE TABLE` statements use `IF NOT EXISTS`:
```sql
CREATE TABLE IF NOT EXISTS `staff_attendance` (...);
```

### 3. CREATE OR REPLACE VIEW

All views use `CREATE OR REPLACE`:
```sql
CREATE OR REPLACE VIEW `staff_attendance_summary` AS ...;
```

### 4. Safe Index Drops

Checks if index exists before dropping:
```sql
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE INDEX_NAME = 'unique_payment_entry') > 0,
  'ALTER TABLE payment_entries DROP INDEX unique_payment_entry;',
  'SELECT 1'  -- Index doesn't exist, skip
));
```

## What Happens on Re-run?

✅ **Existing tables** - Skipped (no error)
✅ **Existing columns** - Skipped (no error)
✅ **Existing indexes** - Skipped (no error)
✅ **Views** - Replaced with latest version
✅ **New items only** - Only added if missing

**Result:** No errors, no data loss, only missing items are added.

## Rollback (If Needed)

⚠️ **Important:** This migration does NOT drop any existing data.

If you need to rollback:

1. **Tables** - Manually drop if needed:
   ```sql
   DROP TABLE IF EXISTS ca_exam_print_logs;
   DROP TABLE IF EXISTS ca_exam_notifications;
   DROP TABLE IF EXISTS ca_exam_moderation_logs;
   DROP TABLE IF EXISTS ca_exam_submissions;
   -- etc...
   ```

2. **Columns** - Manually remove if needed:
   ```sql
   ALTER TABLE school_locations DROP COLUMN IF EXISTS latitude;
   ALTER TABLE school_setup DROP COLUMN IF EXISTS staff_login_system;
   -- etc...
   ```

3. **Views** - Drop if needed:
   ```sql
   DROP VIEW IF EXISTS staff_attendance_summary;
   DROP VIEW IF EXISTS v_ca_exam_submission_summary;
   -- etc...
   ```

## Testing Checklist

After running the migration, test:

- [ ] GPS attendance login works
- [ ] Staff can check in with GPS
- [ ] Biometric import functionality
- [ ] CA setup creation
- [ ] CA/Exam question submission
- [ ] Multiple payments per student work
- [ ] No errors in application logs
- [ ] All views return data

## Production Deployment

### Before Running

1. **Backup Database**
   ```bash
   mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Review Migration File**
   - Check database name is correct
   - Verify no custom changes needed

3. **Test on Staging** (if available)
   - Run migration on staging first
   - Test all features
   - Check for errors

### Running on Production

1. **Maintenance Mode** (recommended)
   - Put application in maintenance mode
   - Or schedule during low-traffic period

2. **Run Migration**
   ```bash
   mysql -u username -p database_name < CONSOLIDATED_DATABASE_MIGRATION.sql
   ```

3. **Verify Success**
   - Check final status message
   - Run verification queries above
   - Test critical features

4. **Monitor**
   - Watch application logs
   - Check for database errors
   - Test user workflows

## Troubleshooting

### Issue: "Access denied for user"
**Solution:** Ensure MySQL user has proper permissions:
```sql
GRANT CREATE, ALTER, INDEX, CREATE VIEW ON database_name.* TO 'user'@'host';
FLUSH PRIVILEGES;
```

### Issue: "Table already exists"
**Solution:** This shouldn't happen with `IF NOT EXISTS`, but if it does, the migration will continue safely.

### Issue: "Column already exists"
**Solution:** The migration checks before adding columns. Safe to ignore if columns exist.

### Issue: Migration runs but features don't work
**Solution:**
1. Check application server restarted
2. Verify all columns actually added: `DESCRIBE table_name;`
3. Check application logs for errors
4. Ensure backend code matches database schema

## Files That Can Be Deleted

After successfully running the consolidated migration, you can safely delete these original files (or move to archive):

```
database_migrations/ca_exam_submissions_fixes.sql
database_migrations/create_ca_exam_tables.sql
database_migrations/remove_payment_unique_constraint.sql
src/models/biometric_import_migration.sql
src/models/ca_exam_process_migration.sql
src/models/ca_setup_migration.sql
src/models/gps_attendance_migration.sql
```

**Recommended:** Keep them in an archive folder for reference:
```bash
mkdir -p migrations/archive/$(date +%Y%m%d)
mv database_migrations/*.sql migrations/archive/$(date +%Y%m%d)/
mv src/models/*_migration.sql migrations/archive/$(date +%Y%m%d)/
```

## Summary

This consolidated migration safely combines all pending database changes into a single, production-ready file that can be run multiple times without errors. It uses best practices for database migrations including:

- IF NOT EXISTS checks
- Dynamic column detection
- Safe index management
- CREATE OR REPLACE for views
- Comprehensive error handling

**Total Changes:**
- 7 new tables
- 10+ new columns across existing tables
- 4 new views
- 2 constraint removals
- 100% backward compatible

## Support

If you encounter any issues:

1. Check the verification queries above
2. Review application logs: `logs/queries/`
3. Check MySQL error log
4. Verify database user permissions
5. Ensure database name is correct

For complex issues, provide:
- MySQL version: `SELECT VERSION();`
- Table structure: `DESCRIBE table_name;`
- Error message (full text)
- Application logs (if applicable)
