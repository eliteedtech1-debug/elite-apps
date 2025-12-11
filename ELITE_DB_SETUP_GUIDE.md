# elite_db Setup Guide

## 🎯 What This Does

1. Creates new database `elite_db`
2. Imports production data from `kirmaskngov_skcooly_db.sql`
3. Runs all 48-hour migrations automatically
4. Creates backup before migrations
5. Verifies everything works

## 🚀 Quick Start

```bash
cd /Users/apple/Downloads/apps/elite
./SETUP_ELITE_DB.sh
```

**That's it!** Script handles everything.

## 📋 What Gets Migrated

### Phase 1: RBAC System
- ✅ rbac_school_packages table
- ✅ subscription_packages table
- ✅ features table
- ✅ users.allowed_features column

### Phase 2: Database Cleanup
- ✅ Drop ca_assessment_v2
- ✅ Drop ca_setup_v2
- ✅ Drop ca_weeks_v2
- ✅ Drop grade_boundaries_v2

### Phase 3: Academic Features
- ✅ GetSectionCASetup procedure
- ✅ Recitations class fields
- ✅ Lesson plans schema
- ✅ Late submission tracking

### Phase 4: Bug Fixes
- ✅ Teacher classes active filter
- ✅ Asset expected_life_years

## 🔧 After Setup

### 1. Update Backend .env
```bash
cd elscholar-api
nano .env
```

Change:
```
DB_NAME=elite_db
```

### 2. Restart Backend
```bash
npm restart
```

### 3. Update Frontend .env
```bash
cd elscholar-ui
nano .env
```

Verify API URL points to backend.

### 4. Restart Frontend
```bash
npm start
```

## ✅ Verify Setup

```bash
mysql -u root -p elite_db < TEST_MIGRATION_2025_12_07.sql
```

Should show all ✓ PASS.

## 📂 Backup Location

`./backups/elite_db_before_migration_YYYYMMDD_HHMMSS.sql`

## 🔄 Rollback (if needed)

```bash
mysql -u root -p elite_db < ROLLBACK_MIGRATION_2025_12_07.sql
```

Or restore from backup:
```bash
mysql -u root -p elite_db < backups/elite_db_before_migration_*.sql
```

## 🐛 Troubleshooting

### Error: Source file not found
Check path: `/Users/apple/Downloads/kirmaskngov_skcooly_db.sql`

### Error: Database connection failed
Verify MySQL is running and password is correct.

### Error: Migration failed
Script auto-stops. Check error message. Restore from backup if needed.

## 📊 Database Info

- **Name:** elite_db
- **Charset:** utf8mb4
- **Collation:** utf8mb4_unicode_ci
- **Source:** Production copy (kirmaskngov_skcooly_db)

## 🎉 Success Indicators

After running script, you should see:
```
✓ elite_db Setup Complete!
Database: elite_db
Backup: backups/elite_db_before_migration_*.sql
```

Then update .env and restart services.
