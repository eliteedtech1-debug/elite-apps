# Elite Content Migration - Quick Guide

## 📋 Pre-Migration Checklist

- [ ] Backup exists
- [ ] Test script runs successfully on source
- [ ] Application is stopped or in maintenance mode
- [ ] Database credentials are correct

## 🚀 Migration Steps

### 1. Test BEFORE migration
```bash
./test_elite_content.sh full_skcooly > before_migration.txt
```

### 2. Run migration
```bash
./migrate_elite_content.sh
```

**What it does:**
- Creates backup in `./backups/backup_TIMESTAMP.sql`
- Creates `elite_content` database
- Migrates 32 tables + stored procedures
- Verifies data integrity
- Generates rollback script

### 3. Test AFTER migration
```bash
./test_elite_content.sh elite_content > after_migration.txt
```

### 4. Compare results
```bash
diff before_migration.txt after_migration.txt
```
**Expected:** Only database name should differ, row counts must match

### 5. Update application config
```bash
# Add to elscholar-api/.env
echo "CONTENT_DB_NAME=elite_content" >> elscholar-api/.env
echo "CONTENT_DB_USERNAME=root" >> elscholar-api/.env
echo "CONTENT_DB_PASSWORD=" >> elscholar-api/.env
echo "CONTENT_DB_HOST=localhost" >> elscholar-api/.env
echo "CONTENT_DB_PORT=3306" >> elscholar-api/.env
```

### 6. Restart application
```bash
cd elscholar-api
npm restart
```

### 7. Test endpoints
```bash
# Test lesson plans
curl http://localhost:34567/api/lessons

# Test subjects
curl http://localhost:34567/api/subjects

# Test assignments
curl http://localhost:34567/api/assignments
```

## 🔄 Rollback (if needed)

```bash
# Automatic rollback script generated during migration
./backups/rollback_TIMESTAMP.sh
```

**What it does:**
- Drops `elite_content` database
- Restores `full_skcooly` from backup
- Reverts to pre-migration state

**Then:**
```bash
# Remove from .env
sed -i.bak '/CONTENT_DB/d' elscholar-api/.env

# Restart
cd elscholar-api
npm restart
```

## 📊 Verification Queries

### Check row counts match
```sql
SELECT 
  'full_skcooly' as db, COUNT(*) as count FROM full_skcooly.subjects
UNION ALL
SELECT 
  'elite_content' as db, COUNT(*) as count FROM elite_content.subjects;
```

### Check stored procedures
```sql
SELECT ROUTINE_NAME 
FROM information_schema.ROUTINES 
WHERE ROUTINE_SCHEMA = 'elite_content';
```

### Check foreign keys
```sql
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'elite_content'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## 🗂️ Files Generated

```
backups/
├── backup_TIMESTAMP.sql          # Full source database backup
├── schema_TIMESTAMP.sql          # Table schemas only
├── data_TIMESTAMP.sql            # Data only
├── procedures_TIMESTAMP.sql      # Stored procedures
├── verification_TIMESTAMP.txt    # Row count comparison
└── rollback_TIMESTAMP.sh         # Automatic rollback script
```

## ⚠️ Troubleshooting

### Migration fails at step X
```bash
# Check error in terminal output
# Run rollback
./backups/rollback_TIMESTAMP.sh
```

### Row counts don't match
```bash
# Check verification file
cat backups/verification_TIMESTAMP.txt

# If mismatch, rollback immediately
./backups/rollback_TIMESTAMP.sh
```

### Application can't connect
```bash
# Verify .env settings
cat elscholar-api/.env | grep CONTENT_DB

# Test database connection
mysql -uroot elite_content -e "SELECT 1"
```

### Stored procedures missing
```bash
# Check if they exist
mysql -uroot -e "SHOW PROCEDURE STATUS WHERE Db = 'elite_content'"

# Re-import if needed
mysql -uroot elite_content < backups/procedures_TIMESTAMP.sql
```

## 📝 Post-Migration Tasks

### After 7 days of stable operation:

1. **Drop migrated tables from source** (optional)
```sql
-- DO NOT RUN until 100% confident
-- Keep backup for 30 days minimum
USE full_skcooly;
DROP TABLE lesson_plans, lesson_notes, subjects, teacher_classes;
-- ... (all 32 tables)
```

2. **Archive backups**
```bash
tar -czf elite_content_migration_TIMESTAMP.tar.gz backups/
mv elite_content_migration_TIMESTAMP.tar.gz ~/archives/
```

## 🎯 Success Criteria

- ✅ All 32 tables migrated
- ✅ Row counts match exactly
- ✅ Stored procedures working
- ✅ Application endpoints respond correctly
- ✅ No errors in application logs
- ✅ Rollback script tested and ready

## 📞 Support

If migration fails:
1. Run rollback immediately
2. Check logs in `backups/verification_TIMESTAMP.txt`
3. Review error messages
4. Fix issues before retrying
