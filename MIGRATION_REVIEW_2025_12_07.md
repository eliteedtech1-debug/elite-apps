# Production Migration Review - December 7, 2025

## Migration File
`elscholar-api/src/migrations/PRODUCTION_MIGRATION_2025_12_07.sql`

## Status: ✅ SAFE TO DEPLOY

---

## Summary
RBAC Package System + School Creation Fixes + Asset Management Updates

**Impact Level:** LOW - No changes to existing student/teacher/academic data

---

## Issues Found & Recommendations

### ⚠️ ISSUE 1: Collation Mismatch
**Location:** Lines 13-24 (rbac_school_packages table)
**Problem:** Uses `utf8mb4_unicode_ci` while cumulative file uses `utf8mb4_general_ci`
**Impact:** Minor - May cause JOIN issues between tables
**Fix:** Standardize to `utf8mb4_unicode_ci` (better for international text)

### ⚠️ ISSUE 2: UNIQUE Constraint Missing
**Location:** Line 24 (rbac_school_packages)
**Problem:** Cumulative file has `UNIQUE KEY unique_active_school (school_id, is_active)`
**Impact:** Could allow multiple active packages per school
**Recommendation:** Add constraint or use application-level validation

### ⚠️ ISSUE 3: Foreign Key Conditional Logic
**Location:** Lines 27-42
**Problem:** Complex conditional FK creation may fail silently
**Impact:** FK might not be created if conditions aren't met
**Recommendation:** Verify FK exists after migration

### ⚠️ ISSUE 4: Features Table Structure Ambiguity
**Location:** Lines 73-78, 127-165
**Problem:** Handles two different table structures (feature_key vs feature_code)
**Impact:** May insert wrong columns if table structure differs
**Recommendation:** Check existing structure before running

### ✅ GOOD: Idempotent Design
- Uses `IF NOT EXISTS` for table creation
- Uses `INSERT IGNORE` for data insertion
- Safe to run multiple times

### ✅ GOOD: No Data Loss Risk
- Only creates new tables
- Only adds new columns
- No DROP or DELETE statements

---

## Pre-Migration Checklist

- [ ] **Database backup completed**
- [ ] **Check existing features table structure:**
  ```sql
  DESCRIBE features;
  ```
- [ ] **Verify subscription_packages doesn't exist:**
  ```sql
  SHOW TABLES LIKE 'subscription_packages';
  ```
- [ ] **Check current collation:**
  ```sql
  SELECT DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA 
  WHERE SCHEMA_NAME = DATABASE();
  ```

---

## Post-Migration Verification

```sql
-- 1. Verify tables created
SELECT COUNT(*) FROM rbac_school_packages;
SELECT COUNT(*) FROM subscription_packages;
SELECT COUNT(*) FROM features;

-- 2. Verify packages inserted
SELECT package_name, display_name, price_monthly FROM subscription_packages;

-- 3. Verify features inserted
SELECT feature_key, feature_name FROM features WHERE is_active = 1;

-- 4. Verify users.allowed_features column
SHOW COLUMNS FROM users LIKE 'allowed_features';

-- 5. Verify assets.expected_life_years column
SHOW COLUMNS FROM assets LIKE 'expected_life_years';

-- 6. Check foreign key
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'rbac_school_packages' 
AND CONSTRAINT_SCHEMA = DATABASE();
```

---

## Rollback Strategy

See `ROLLBACK_MIGRATION_2025_12_07.sql` for complete rollback script.

**Rollback Risk:** LOW - Only new tables/columns added

---

## Deployment Steps

1. **Backup database** (CRITICAL)
2. **Run migration during low-traffic period**
3. **Execute verification queries**
4. **Restart backend application**
5. **Test endpoints:**
   - GET `/api/packages/list`
   - GET `/api/features/list`
   - POST `/api/schools/create` (verify package assignment)
6. **Monitor logs for errors**

---

## Estimated Execution Time
- Small DB (<1000 schools): **< 5 seconds**
- Medium DB (1000-10000 schools): **< 30 seconds**
- Large DB (>10000 schools): **< 2 minutes**

---

## Breaking Changes
**NONE** - Backward compatible

---

## Dependencies
- Backend code must support new RBAC endpoints
- Frontend must handle package selection during school creation
- Developer user (id=1) should exist in users table

---

## Recommendation
✅ **APPROVED FOR PRODUCTION**

**Conditions:**
1. Run during maintenance window
2. Complete database backup first
3. Verify features table structure matches migration expectations
4. Test rollback script on staging first
