# Production Migration Guide - user_activity_log to elite_logs

## 🎯 Overview
Move `user_activity_log` from main database to `elite_logs` audit database in production.

---

## ⚠️ Pre-Migration Checklist

- [ ] **Backup databases** (both main DB and elite_logs)
- [ ] **Verify .env configuration** on production server
- [ ] **Test on staging** environment first (if available)
- [ ] **Schedule maintenance window** (migration takes ~1 minute)
- [ ] **Notify team** of brief downtime

---

## 📋 Step-by-Step Production Migration

### Step 1: Connect to Production Server
```bash
ssh user@production-server
cd /path/to/elscholar-api
```

### Step 2: Backup Databases
```bash
# Backup main database
mysqldump -u root -p kirmaskngov_skcooly_db user_activity_log > backup_user_activity_log_$(date +%Y%m%d_%H%M%S).sql

# Backup elite_logs (optional, for safety)
mysqldump -u root -p elite_logs > backup_elite_logs_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Verify .env Configuration
```bash
cat .env | grep -E "DB_NAME|AUDIT_DB_NAME"
```

**Expected output:**
```
DB_NAME=kirmaskngov_skcooly_db
AUDIT_DB_NAME=elite_logs
```

### Step 4: Stop API Server (Optional but Recommended)
```bash
# If using PM2
pm2 stop elscholar-api

# If using systemd
sudo systemctl stop elscholar-api

# If using screen/tmux, stop the process
```

### Step 5: Run Migration
```bash
cd src/migrations
chmod +x run_user_activity_log_migration.sh
./run_user_activity_log_migration.sh
```

**Expected output:**
```
📋 Migration Configuration:
   Main DB: kirmaskngov_skcooly_db
   Audit DB: elite_logs

🔄 Running migration...
source_db           record_count
kirmaskngov_skcooly_db    XXX
elite_logs               XXX

✅ Migration completed successfully!
```

### Step 6: Verify Migration
```bash
# Check record count in elite_logs
mysql -u root -p elite_logs -e "SELECT COUNT(*) as total FROM user_activity_log;"

# Check recent records
mysql -u root -p elite_logs -e "SELECT * FROM user_activity_log ORDER BY created_at DESC LIMIT 5;"

# Verify old table still exists (before dropping)
mysql -u root -p kirmaskngov_skcooly_db -e "SHOW TABLES LIKE 'user_activity_log';"
```

### Step 7: Deploy Updated Code
```bash
# Pull latest code with environment-based database names
git pull origin main

# Install dependencies (if needed)
npm install

# Or copy updated files manually:
# - src/config/dbNames.js
# - src/controllers/profileController.js
# - src/controllers/adminProfileController.js
# - src/middleware/profileAccessControl.js
# - src/routes/user.js
# - src/services/passwordService.js
```

### Step 8: Start API Server
```bash
# If using PM2
pm2 start elscholar-api
pm2 logs elscholar-api --lines 50

# If using systemd
sudo systemctl start elscholar-api
sudo journalctl -u elscholar-api -f

# Check for errors
tail -f logs/error.log
```

### Step 9: Test Activity Logging
```bash
# Test security settings update (triggers activity log)
curl -X PUT 'https://your-domain.com/users/security-settings' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"user_id": "TEST_USER", "user_type": "teacher", "sms_notifications": true}'

# Verify log was created in elite_logs
mysql -u root -p elite_logs -e "SELECT * FROM user_activity_log ORDER BY created_at DESC LIMIT 1;"
```

### Step 10: Drop Old Table (After Verification)
```bash
# Wait 24-48 hours to ensure everything works
# Then drop the old table
mysql -u root -p kirmaskngov_skcooly_db -e "DROP TABLE IF EXISTS user_activity_log;"
```

---

## 🔄 Rollback Plan (If Issues Occur)

### If migration fails or issues found:

```bash
# 1. Stop API server
pm2 stop elscholar-api

# 2. Restore from backup
mysql -u root -p kirmaskngov_skcooly_db < backup_user_activity_log_YYYYMMDD_HHMMSS.sql

# 3. Revert code changes
git checkout HEAD~1 -- src/config/dbNames.js
git checkout HEAD~1 -- src/controllers/profileController.js
git checkout HEAD~1 -- src/controllers/adminProfileController.js
git checkout HEAD~1 -- src/middleware/profileAccessControl.js
git checkout HEAD~1 -- src/routes/user.js
git checkout HEAD~1 -- src/services/passwordService.js

# 4. Restart API server
pm2 start elscholar-api
```

---

## 🚨 Troubleshooting

### Issue: "Table doesn't exist" error
**Solution:** Migration script handles this gracefully. If source table doesn't exist, it skips copy.

### Issue: "Duplicate entry" error
**Solution:** Migration uses `NOT EXISTS` check to prevent duplicates. Safe to re-run.

### Issue: API can't connect to elite_logs
**Solution:** 
```bash
# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'elite_logs';"

# Check user permissions
mysql -u root -p -e "SHOW GRANTS FOR 'your_db_user'@'localhost';"

# Grant permissions if needed
mysql -u root -p -e "GRANT ALL PRIVILEGES ON elite_logs.* TO 'your_db_user'@'localhost';"
```

### Issue: Activity logs not appearing
**Solution:**
```bash
# Check API logs
tail -f logs/error.log

# Test database connection
mysql -u root -p elite_logs -e "SELECT 1;"

# Verify AUDIT_DB_NAME in .env
cat .env | grep AUDIT_DB_NAME
```

---

## ✅ Post-Migration Verification

Run these checks 24 hours after migration:

```bash
# 1. Check activity log growth
mysql -u root -p elite_logs -e "
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as activities
  FROM user_activity_log 
  WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAYS)
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
"

# 2. Verify no errors in logs
grep -i "user_activity_log" logs/error.log

# 3. Check API health
curl https://your-domain.com/health

# 4. Monitor database size
mysql -u root -p -e "
  SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
  FROM information_schema.tables 
  WHERE table_schema IN ('kirmaskngov_skcooly_db', 'elite_logs')
  GROUP BY table_schema;
"
```

---

## 📊 Expected Results

**Before Migration:**
- `kirmaskngov_skcooly_db.user_activity_log` - XXX records
- `elite_logs.user_activity_log` - 0 records

**After Migration:**
- `kirmaskngov_skcooly_db.user_activity_log` - XXX records (unchanged)
- `elite_logs.user_activity_log` - XXX records (copied)

**After Cleanup (24-48 hours later):**
- `kirmaskngov_skcooly_db.user_activity_log` - dropped
- `elite_logs.user_activity_log` - XXX+ records (growing)

---

## 📞 Support

If issues occur during migration:
1. **Don't panic** - migration is reversible
2. **Check logs** - `logs/error.log` and `pm2 logs`
3. **Verify .env** - ensure AUDIT_DB_NAME is set
4. **Rollback if needed** - use backup files
5. **Contact team** - provide error messages and logs

---

## 🎉 Success Criteria

✅ Migration script completes without errors  
✅ Record counts match between source and destination  
✅ API starts successfully  
✅ New activity logs appear in elite_logs  
✅ No errors in application logs  
✅ Security settings updates work correctly  

---

**Estimated Downtime:** 2-5 minutes  
**Risk Level:** Low (fully reversible)  
**Tested:** ✅ Development environment  
**Safe for Production:** ✅ Yes
