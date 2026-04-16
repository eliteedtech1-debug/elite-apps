# Production Migration Guide - Assignment & Question Bank

## 🚀 Quick Start (5 minutes)

### Step 1: Backup Database
```bash
# Backup main database
mysqldump -u root -p elite_prod_db > backup_elite_prod_$(date +%Y%m%d_%H%M%S).sql

# Backup content database (if exists)
mysqldump -u root -p elite_content > backup_elite_content_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Upload Migration Files
```bash
# Upload to server
scp -r elscholar-api/migrations user@server:/path/to/elscholar-api/
scp elscholar-api/run-assignment-migrations.js user@server:/path/to/elscholar-api/
```

### Step 3: Run Migration
```bash
# SSH to server
ssh user@server

# Navigate to API directory
cd /path/to/elscholar-api

# Run migration (safe to run multiple times)
node run-assignment-migrations.js
```

### Step 4: Restart API
```bash
# Using PM2
pm2 restart elscholar-api

# Or using systemd
sudo systemctl restart elscholar-api

# Or manual
npm run start
```

### Step 5: Verify
```bash
# Check if procedures updated
mysql -u root -p elite_prod_db -e "SHOW PROCEDURE STATUS WHERE Name='assignments'"

# Check if columns added
mysql -u root -p elite_prod_db -e "DESCRIBE assignments" | grep difficulty

# Check if question bank exists
mysql -u root -p elite_content -e "SHOW TABLES LIKE 'question_bank'"
```

## ✅ Migration Checklist

- [ ] Database backup completed
- [ ] Migration files uploaded
- [ ] Migration script executed successfully
- [ ] No errors in output
- [ ] API restarted
- [ ] Test assignment creation works
- [ ] Test question bank access works
- [ ] Check logs for errors

## 🔧 Troubleshooting

### Issue: "Table doesn't exist"
```bash
# Create elite_content database if missing
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS elite_content"

# Re-run migration
node run-assignment-migrations.js
```

### Issue: "Column already exists"
**Solution:** This is fine! Migration is idempotent. It will skip existing columns.

### Issue: "Procedure syntax error"
**Solution:** Migration script automatically strips DELIMITER statements. If error persists:
```bash
# Check MySQL version
mysql --version

# Should be MySQL 5.7+ or MariaDB 10.2+
```

### Issue: "Permission denied"
```bash
# Grant permissions
mysql -u root -p -e "GRANT ALL PRIVILEGES ON elite_prod_db.* TO 'your_user'@'localhost'"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON elite_content.* TO 'your_user'@'localhost'"
mysql -u root -p -e "FLUSH PRIVILEGES"
```

## 🔄 Rollback (if needed)

### Option 1: Restore from backup
```bash
# Stop API
pm2 stop elscholar-api

# Restore database
mysql -u root -p elite_prod_db < backup_elite_prod_YYYYMMDD_HHMMSS.sql
mysql -u root -p elite_content < backup_elite_content_YYYYMMDD_HHMMSS.sql

# Restart API
pm2 start elscholar-api
```

### Option 2: Drop new columns (not recommended)
```sql
-- Only if absolutely necessary
ALTER TABLE assignments 
  DROP COLUMN difficulty,
  DROP COLUMN estimated_time,
  DROP COLUMN passing_score;
  -- etc...
```

## 📊 What Gets Migrated

### Database: elite_prod_db
1. **assignments** table - 10 new columns
2. **assignment_questions** table - 6 new columns
3. **assignment_responses** table - 4 new columns
4. **assignment_templates** table - Created
5. **assignment_statistics** table - Created
6. **question_performance** table - Created
7. **student_assignment_performance** table - Created
8. **grading_rubrics** table - Created
9. **assignments()** stored procedure - Updated
10. **assignment_questions()** stored procedure - Updated
11. **calculateAssignmentStatistics()** stored procedure - Created

### Database: elite_content
1. **question_bank** table - Created (if not exists)
2. **question_categories** table - Created (if not exists)
3. **question_category_map** table - Created (if not exists)

## ⚡ Zero-Downtime Migration

For production with active users:

```bash
# 1. Run migration (doesn't affect running API)
node run-assignment-migrations.js

# 2. Deploy new code (PM2 will reload gracefully)
git pull origin main
npm install
pm2 reload elscholar-api --update-env

# 3. Verify
curl http://localhost:34567/health
```

## 🧪 Test After Migration

```bash
# Test assignment creation
curl -X POST 'http://your-server/assignments' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"query_type":"create","title":"Test","difficulty":"medium",...}'

# Test question bank
curl 'http://your-server/api/question-bank/statistics' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Test templates
curl 'http://your-server/api/assignment-templates' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## 📝 Migration Output

**Success looks like:**
```
🚀 Running Assignment & Question Bank Migrations...

🔍 Checking current schema...
1️⃣  Updating assignments stored procedure...
✅ Assignments procedure updated

2️⃣  Updating assignment_questions stored procedure...
✅ Assignment questions procedure updated

3️⃣  Checking question bank tables...
✅ Question bank tables already exist

4️⃣  Checking enhanced assignment fields...
✅ Enhanced fields already exist

🎉 All migrations completed successfully!

📊 Summary:
   - Assignments procedure: ✅ Updated
   - Assignment questions procedure: ✅ Updated
   - Question bank tables: ✅ Ready
   - Enhanced fields: ✅ Ready
   - Templates: ✅ Ready
   - Categories: ✅ Ready

✨ Safe to run multiple times!

✅ Ready to use!
```

## 🔒 Safety Features

1. ✅ **Idempotent** - Safe to run multiple times
2. ✅ **Checks before creating** - Won't duplicate tables/columns
3. ✅ **Default values** - Existing data won't break
4. ✅ **NULL allowed** - Optional fields are nullable
5. ✅ **Backward compatible** - Old code still works
6. ✅ **No data loss** - Only adds, never removes

## 📞 Support

If migration fails:
1. Check error message in output
2. Verify database credentials
3. Check MySQL version compatibility
4. Review backup before rollback
5. Contact dev team with error logs

## ⏱️ Estimated Time

- Small DB (<1000 assignments): 30 seconds
- Medium DB (1000-10000): 1-2 minutes
- Large DB (>10000): 2-5 minutes

**Downtime:** 0 seconds (if using PM2 reload)

---

**Ready to migrate!** 🚀
