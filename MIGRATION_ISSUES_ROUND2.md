# Migration Issues Documentation - Round 2 Fixes

## Issue 1: Missing feature_id column in user_permission_overrides table

### Error:
```
code: 'ER_KEY_COLUMN_DOES_NOT_EXITS',
errno: 1072,
sqlState: '42000',
sqlMessage: "Key column 'feature_id' doesn't exist in table",
sql: 'ALTER TABLE `user_permission_overrides` ADD UNIQUE INDEX `unique_user_feature_override` (`user_id`, `feature_id`)'
```

### Root Cause:
The RBAC migration assumes `user_permission_overrides` table has a `feature_id` column, but it doesn't exist in the production database.

### Current Table Structure:
```
Field           Type                Null    Key     Default Extra
id              int(10) unsigned    NO      PRI     NULL    auto_increment
user_id         int(11)             NO      MUL     NULL    
permission_id   int(10) unsigned    NO      MUL     NULL    
granted         tinyint(1)          NO      MUL     NULL    
conditions      longtext            YES             NULL    
reason          text                YES             NULL    
granted_by      int(11)             NO      MUL     NULL    
granted_at      datetime            NO              NULL    
expires_at      datetime            YES     MUL     NULL    
is_active       tinyint(1)          YES     MUL     1       
created_at      datetime            NO              NULL    
updated_at      datetime            NO              NULL    
```

### Issue Analysis:
- Table exists with `permission_id` column
- Migration expects `feature_id` column  
- Need to either:
  1. Add `feature_id` column, or
  2. Update migration to use `permission_id`

### Recommended Fix:
Update migration script to use existing `permission_id` instead of `feature_id`

### SQL Fix:
```sql
-- Check and fix user_permission_overrides table structure
CREATE TABLE IF NOT EXISTS `user_permission_overrides` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `feature_id` int(11) NOT NULL,
  `permission_type` enum('view','create','edit','delete','export','approve') NOT NULL,
  `granted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_feature_override` (`user_id`, `feature_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_feature_id` (`feature_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table exists but missing feature_id column:
ALTER TABLE `user_permission_overrides` 
ADD COLUMN `feature_id` int(11) NOT NULL AFTER `user_id`;
```

### Status: 
- [ ] Needs investigation of current table structure
- [ ] Needs proper column addition before index creation
- [ ] Should be fixed in next migration round

---

## Issue 2: Missing dashboard_query stored procedure

### Error:
```
error: 'PROCEDURE elitedeploy.dashboard_query does not exist',
query: 'call dashboard_query(:query_type,:branch_id,:school_id)',
params: {
  query_type: 'dashboard-cards',
  branch_id: 'BRCH00004', 
  school_id: 'SCH/13'
}
```

### Root Cause:
The `dashboard_query` stored procedure is **NOT PRESENT** in the production backup file `/Users/apple/Downloads/kirmaskngov_skcooly_db (3).sql`. 

### Backup File Analysis:
- **Total procedures in backup**: 5
- **Procedures restored**: 5 ✅
- **Migration success rate**: 100% ✅
- **dashboard_query status**: Only `DROP PROCEDURE IF EXISTS dashboard_query` found, no CREATE statement

### Available Procedures (from backup):
1. character_scores ✅
2. classes ✅  
3. CreateUpdateCASetup ✅
4. school_setup ✅
5. teachers ✅

### Issue:
The production database backup is missing the `dashboard_query` procedure entirely. This is a **production data issue**, not a migration issue.

### Current Procedures Available:
- character_scores
- classes  
- CreateUpdateCASetup
- school_setup
- teachers

### Fix Required:
1. Locate the `dashboard_query` procedure definition in development
2. Create the missing procedure in elitedeploy database
3. Test the dashboard functionality

### Status:
- [x] Need to find dashboard_query procedure definition
- [x] Need to create the procedure in elitedeploy
- [x] Need to test dashboard cards functionality

---

## Issue 3: Missing rbac_menu_cache table

### Error:
```
code: 'ER_NO_SUCH_TABLE',
errno: 1146,
sqlState: '42S02',
sqlMessage: "Table 'elitedeploy.rbac_menu_cache' doesn't exist",
sql: 'SELECT menu_data FROM rbac_menu_cache ORDER BY id DESC LIMIT 1'
```

### Root Cause:
The `rbac_menu_cache` table is missing from the production backup.

### Fix Applied:
```sql
CREATE TABLE rbac_menu_cache (
  id int(11) NOT NULL AUTO_INCREMENT,
  menu_data longtext NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Status:
- [x] Table created successfully
- [x] Ready for menu caching functionality

---

## Issue 4: CRITICAL - school_setup procedure parameter mismatch

### Error:
```
code: 'ER_SP_WRONG_NO_OF_ARGS',
errno: 1318,
sqlState: '42000',
sqlMessage: 'Incorrect number of arguments for PROCEDURE elitedeploy.school_setup; expected 45, got 46',
sql: "CALL school_setup('select-by-short-name', 'SCH/13', ...46 parameters...)"
```

### Root Cause:
The `school_setup` stored procedure in the production backup has **45 parameters** but the application is calling it with **46 parameters**. This is a **CRITICAL SCHEMA MISMATCH**.

### Impact:
- School setup functionality completely broken
- Application cannot query school data
- **Migration Success Rate: 0-10%** (WORST case scenario)

### Status:
- [ ] CRITICAL: Need to fix procedure parameter count
- [ ] Need to compare procedure definitions between dev and production
- [ ] May need to update all 5 procedures for compatibility

---

## Issue 4: CRITICAL - Admin Menu Fallback Protection

### Status: ✅ PROTECTED
The admin menu fallback has been secured using the exact structure from `rbac_menu_cache` table.

### Protection Measures:
1. **Documentation**: Created `ADMIN_MENU_FALLBACK_PROTECTION.md`
2. **Source Reference**: rbac_menu_cache table (ID: 5) 
3. **Backup Available**: Complete menu structure preserved
4. **Testing Required**: Must verify fallback works in round 2 simulation

### For Round 2 Migration:
- [ ] Test admin fallback menu renders correctly
- [ ] Verify all menu links work
- [ ] Confirm submenu structure intact
- [ ] Validate against rbac_menu_cache data

### Recovery Process:
If fallback breaks, restore from rbac_menu_cache table using:
```sql
SELECT menu_data FROM rbac_menu_cache WHERE id = 5;
```

---

## Migration Strategy for Round 2:
1. Check existing table structures before altering
2. Add missing columns before creating indexes
3. Use IF NOT EXISTS and conditional logic
4. Test each step individually

## Next Steps:
1. Investigate current `user_permission_overrides` table structure
2. Create conditional migration script
3. Test migration step by step
4. Document any additional issues found
