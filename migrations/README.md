# RBAC Migration Files

## Quick Setup (Recommended)

### Option 1: Single Complete Migration File ⭐
```bash
# Run everything in one command
mysql -u root elite_db < migrations/RBAC_COMPLETE_MIGRATION.sql
```

This file contains:
- ✅ All table creation/upgrades
- ✅ All default roles (12 roles)
- ✅ All default permissions (60+)
- ✅ All role-permission mappings
- ✅ Data migration from old structure
- ✅ Verification and summary

**Use this for:**
- New installations
- Upgrading existing systems
- Complete setup in one go

---

## Alternative: Individual Migration Files

### Option 2: Step-by-Step Migration
```bash
# Step 1: Create tables
mysql -u root elite_db < migrations/001_create_rbac_tables.sql

# Step 2: Seed default data
mysql -u root elite_db < migrations/002_seed_rbac_default_data.sql

# Step 3: Upgrade existing tables
mysql -u root elite_db < migrations/003_upgrade_existing_rbac_tables.sql
```

**Use this for:**
- Testing individual steps
- Debugging migration issues
- Understanding the process

---

## File Descriptions

| File | Purpose | Size |
|------|---------|------|
| **RBAC_COMPLETE_MIGRATION.sql** | All-in-one setup | ~15KB |
| 001_create_rbac_tables.sql | Create new RBAC tables | ~3KB |
| 002_seed_rbac_default_data.sql | Seed roles & permissions | ~8KB |
| 003_upgrade_existing_rbac_tables.sql | Upgrade existing tables | ~4KB |

---

## Automated Setup (Easiest)

```bash
# From project root
./setup-rbac.sh
```

This script automatically:
- Uses RBAC_COMPLETE_MIGRATION.sql (if available)
- Falls back to individual files (if needed)
- Creates backup before migration
- Verifies installation
- Restarts server

---

## What Gets Created

### Tables
1. **roles** - Role definitions (12 default roles)
2. **permissions** - Permission definitions (60+ permissions)
3. **role_permissions** - Role-to-permission mappings
4. **user_roles** - User role assignments with audit
5. **permission_audit_log** - Complete audit trail

### Default Roles
- superadmin, developer
- admin, branchadmin
- teacher, form_master, subject_teacher, exam_officer
- accountant, cashier, bursar
- manager, storekeeper, librarian, nurse
- parent, student

### Permission Modules
- dashboard, students, staff, classes
- attendance, exams, finance, payroll
- inventory, communication, settings, reports

---

## Verification

After running migration:

```bash
# Check tables created
mysql -u root elite_db -e "SHOW TABLES LIKE '%role%'; SHOW TABLES LIKE '%permission%';"

# Check data seeded
mysql -u root elite_db -e "SELECT COUNT(*) FROM roles; SELECT COUNT(*) FROM permissions;"

# View roles
mysql -u root elite_db -e "SELECT name, display_name FROM roles ORDER BY id;"

# View permission count by module
mysql -u root elite_db -e "SELECT module, COUNT(*) as count FROM permissions GROUP BY module;"
```

---

## Rollback (If Needed)

```bash
# Drop RBAC tables
mysql -u root elite_db << EOF
DROP TABLE IF EXISTS permission_audit_log;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
EOF

# Restore from backup (if you created one)
mysql -u root elite_db < backup_rbac_YYYYMMDD_HHMMSS.sql
```

---

## Troubleshooting

### Issue: Foreign key constraint fails
**Solution:** Tables must be created in order. Use RBAC_COMPLETE_MIGRATION.sql which handles dependencies.

### Issue: Duplicate entry error
**Solution:** Migration uses `ON DUPLICATE KEY UPDATE` to handle existing data safely.

### Issue: Table doesn't exist error
**Solution:** Ensure you're running migration on the correct database. Check DB_NAME in .env file.

---

## Migration Safety

All migration files are safe to run multiple times:
- Uses `IF NOT EXISTS` for table creation
- Uses `ON DUPLICATE KEY UPDATE` for data insertion
- Preserves existing data
- Upgrades schema without data loss

---

## Next Steps After Migration

1. Restart backend server:
   ```bash
   pm2 restart elite
   ```

2. Test API endpoint:
   ```bash
   curl http://localhost:34567/api/rbac/roles -H "x-school-id: SCH/1"
   ```

3. Add RoleAssignmentModal to teacher list UI

4. Test role assignment workflow

---

**Recommended:** Use `RBAC_COMPLETE_MIGRATION.sql` for quickest setup! ⚡
