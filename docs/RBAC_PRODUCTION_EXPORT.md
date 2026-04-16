# RBAC Tables Export for Production

## Critical Tables to Export

### 1. Role Hierarchy
```bash
mysqldump -u root full_skcooly role_inheritance > role_inheritance.sql
```
**Contains:** Role hierarchy relationships (admin → branchadmin → teacher, etc.)

### 2. Staff Role Definitions
```bash
mysqldump -u root full_skcooly staff_role_definitions > staff_role_definitions.sql
```
**Contains:** Custom roles (exam_officer, vp_academic, principal, etc.)

### 3. Menu Access by Role
```bash
mysqldump -u root full_skcooly rbac_menu_access > rbac_menu_access.sql
```
**Contains:** Which roles have access to which menu items (auto-assigned by our script)

### 4. User Roles Table Structure
```bash
mysqldump -u root full_skcooly user_roles --no-data > user_roles_structure.sql
```
**Contains:** Table structure with new columns (created_at, updated_at)
**Note:** Don't export data, only structure (production has its own user assignments)

---

## Complete Export Command

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api

# Export all RBAC tables
mysqldump -u root full_skcooly \
  role_inheritance \
  staff_role_definitions \
  rbac_menu_access \
  > rbac_production_export.sql

# Export user_roles structure only
mysqldump -u root full_skcooly user_roles --no-data \
  >> rbac_production_export.sql

echo "✅ RBAC export complete: rbac_production_export.sql"
```

---

## Import to Production

```bash
# On production server
mysql -u root -p production_db < rbac_production_export.sql
```

---

## What Each Table Contains

### `role_inheritance` (11 rows)
- admin → branchadmin
- branchadmin → teacher
- form_master → teacher
- principal → teacher
- vp_academic → teacher
- vice_principal → teacher
- exam_officer → teacher
- head_of_dept → teacher
- accountant → cashier
- librarian → teacher
- (superadmin → admin if exists)

### `staff_role_definitions` (~9 rows)
- ACCOUNTANT
- CASHIER
- EXAM_OFFICER
- FORM_MASTER
- HEAD_OF_DEPT
- LIBRARIAN
- PRINCIPAL
- TEACHER
- VICE_PRINCIPAL

### `rbac_menu_access` (~500+ rows)
- admin: 133 menu items
- branchadmin: 117 menu items
- teacher: 54 menu items
- accountant: 23 menu items
- cashier: ~15 menu items
- exam_officer: ~30 menu items
- etc.

### `user_roles` (structure only)
- Added columns: created_at, updated_at
- Existing data in production stays intact

---

## Tables NOT to Export

❌ **user_roles** (data) - Production has its own user assignments
❌ **users** - Production has its own users
❌ **rbac_menu_items** - Already exists in production
❌ **rbac_school_packages** - School-specific data

---

## Verification After Import

```sql
-- Check role hierarchy
SELECT COUNT(*) FROM role_inheritance; -- Should be ~11

-- Check staff roles
SELECT COUNT(*) FROM staff_role_definitions; -- Should be ~9

-- Check menu access
SELECT user_type, COUNT(*) as menu_count 
FROM rbac_menu_access 
GROUP BY user_type;

-- Check user_roles structure
DESCRIBE user_roles; -- Should have created_at, updated_at
```

---

## Rollback Plan

```bash
# Before import, backup production tables
mysqldump -u root production_db \
  role_inheritance \
  staff_role_definitions \
  rbac_menu_access \
  > rbac_production_backup_$(date +%Y%m%d).sql
```

---

## Summary

**Export these 3 tables + 1 structure:**
1. ✅ `role_inheritance` - Hierarchy
2. ✅ `staff_role_definitions` - Custom roles
3. ✅ `rbac_menu_access` - Role-to-menu mappings
4. ✅ `user_roles` - Structure only (for new columns)

**Total size:** ~500KB (small, safe to export)
