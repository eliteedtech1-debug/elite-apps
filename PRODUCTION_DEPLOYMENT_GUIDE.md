# Production Deployment Guide

## File: PRODUCTION_MIGRATION_COMPLETE_2025_12_08.sql

This is your **COMPLETE** production-ready migration file.

---

## What's Included

### ✅ RBAC System (3 tables)
- `rbac_school_packages`
- `subscription_packages` (3 packages: Elite, Premium, Standard)
- `features` (13 features)

### ✅ Recitations Module (3 tables)
- `recitations`
- `recitation_replies`
- `recitation_feedbacks`

### ✅ Asset Management (3 tables)
- `assets`
- `asset_categories`
- `facility_rooms`

### ✅ Teacher Management (2 tables)
- `teachers`
- `teacher_classes`

### ✅ Supporting Tables (1 table)
- `school_setup`

### ✅ Collation Fix
- Sets database default to `utf8mb4_unicode_ci`
- All new tables use consistent collation
- **Safe:** Doesn't change existing tables

---

## Pre-Deployment Checklist

- [ ] **Backup production database**
  ```bash
  mysqldump -u root -p production_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Test on staging first**
  ```bash
  mysql -u root -p staging_db < PRODUCTION_MIGRATION_COMPLETE_2025_12_08.sql
  ```

- [ ] **Verify staging works**
  - Test RBAC endpoints
  - Test recitations
  - Test assets
  - Test teachers

- [ ] **Schedule maintenance window**
  - Low traffic period
  - 15-30 minutes downtime

---

## Deployment Steps

### 1. Backup Production
```bash
mysqldump -u root -p production_db > backup_before_migration.sql
```

### 2. Run Migration
```bash
mysql -u root -p production_db < PRODUCTION_MIGRATION_COMPLETE_2025_12_08.sql
```

**Expected time:** 10-30 seconds

### 3. Verify Migration
```bash
mysql -u root -p production_db -e "
SELECT COUNT(*) FROM subscription_packages;
SELECT COUNT(*) FROM features;
SELECT COUNT(*) FROM recitations;
SELECT COUNT(*) FROM assets;
SELECT COUNT(*) FROM teachers;
"
```

Should show:
- 3 packages
- 13 features
- 0 recitations (empty, ready for use)
- 0 assets (empty, ready for use)
- 0 teachers (empty, ready for use)

### 4. Update Backend .env
```bash
# No changes needed if DB_NAME is already correct
# Just restart
cd elscholar-api
npm restart
```

### 5. Test Endpoints
```bash
# RBAC
curl http://your-domain/api/packages/list

# Recitations
curl http://your-domain/api/recitations/list

# Assets
curl http://your-domain/api/assets/list

# Teachers
curl http://your-domain/api/teachers/list
```

---

## Rollback Plan

If anything goes wrong:

### Option 1: Restore from Backup
```bash
mysql -u root -p production_db < backup_before_migration.sql
```

### Option 2: Drop New Tables Only
```bash
mysql -u root -p production_db -e "
DROP TABLE IF EXISTS recitation_feedbacks;
DROP TABLE IF EXISTS recitation_replies;
DROP TABLE IF EXISTS recitations;
DROP TABLE IF EXISTS teacher_classes;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS facility_rooms;
DROP TABLE IF EXISTS asset_categories;
DROP TABLE IF EXISTS rbac_school_packages;
DROP TABLE IF EXISTS subscription_packages;
DROP TABLE IF EXISTS features;
DROP TABLE IF EXISTS school_setup;
"
```

---

## Safety Features

✅ **Idempotent:** Can run multiple times safely  
✅ **Non-destructive:** Only creates new tables  
✅ **Foreign key safe:** Disables checks during migration  
✅ **Collation safe:** Only affects new tables  
✅ **Data safe:** No DROP or DELETE statements  

---

## Post-Deployment Monitoring

### Check Logs
```bash
tail -f elscholar-api/logs/server.log
```

### Monitor Errors
```bash
tail -f elscholar-api/logs/error.log
```

### Check Database
```bash
mysql -u root -p production_db -e "SHOW TABLES;"
```

---

## Expected Results

After successful deployment:

- ✅ 13 new tables created
- ✅ 3 packages available
- ✅ 13 features configured
- ✅ All foreign keys created
- ✅ Consistent utf8mb4_unicode_ci collation
- ✅ Backend starts without errors
- ✅ All endpoints respond correctly

---

## Support

If issues occur:

1. Check error logs
2. Verify table creation
3. Test individual endpoints
4. Rollback if necessary
5. Contact support with error details

---

## Estimated Downtime

- **Small DB (<1000 schools):** 10-15 seconds
- **Medium DB (1000-10000 schools):** 15-30 seconds
- **Large DB (>10000 schools):** 30-60 seconds

---

## Success Criteria

✅ Migration completes without errors  
✅ All 13 tables created  
✅ Backend restarts successfully  
✅ All endpoints respond  
✅ No data loss  
✅ Existing features work normally  

---

## File Location

`/Users/apple/Downloads/apps/elite/PRODUCTION_MIGRATION_COMPLETE_2025_12_08.sql`

**This is your single production migration file. Use this for deployment.**
