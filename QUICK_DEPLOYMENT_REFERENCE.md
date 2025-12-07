# Quick Deployment Reference Card

## 🚀 5-Minute Production Deployment

### Prerequisites
- [ ] Database backup completed
- [ ] Code pulled from repository
- [ ] PM2 or systemd access

---

## Step 1: Backup (2 min)
```bash
cd /path/to/elite
mysqldump -u root -p elite_pts > backup_$(date +%Y%m%d_%H%M%S).sql
ls -lh backup_*.sql  # Verify backup exists
```

## Step 2: Migrate (1 min)
```bash
cd elscholar-api
mysql -u root -p elite_pts < src/migrations/PRODUCTION_MIGRATION_2025_12_07.sql
# Look for "MIGRATION COMPLETED SUCCESSFULLY"
```

## Step 3: Verify (1 min)
```bash
mysql -u root -p elite_pts < src/migrations/VERIFY_MIGRATION.sql
# Look for "✅ MIGRATION SUCCESSFUL"
```

## Step 4: Deploy & Restart (1 min)
```bash
# Backend
cd elscholar-api
git pull origin main
npm install  # Only if package.json changed
pm2 restart elite

# Frontend
cd ../elscholar-ui
git pull origin main
npm install  # Only if package.json changed
npm run build
pm2 restart elite-ui  # Or copy to web server
```

## Step 5: Test (30 sec)
```bash
# Health check
curl http://localhost:34567/api/health

# Check logs
pm2 logs elite --lines 50 | grep -i error
```

---

## ✅ Success Indicators
- Migration shows "COMPLETED SUCCESSFULLY"
- Verification shows "✅ MIGRATION SUCCESSFUL"
- Application starts without errors
- Health check returns 200 OK
- No errors in logs

---

## ❌ Rollback (if needed)
```bash
pm2 stop elite
mysql -u root -p elite_pts < backup_YYYYMMDD_HHMMSS.sql
git checkout previous_commit
pm2 restart elite
```

---

## 📊 What Changed
- ✅ Added: `rbac_school_packages` table
- ✅ Added: `subscription_packages` table  
- ✅ Modified: `users` table (added `allowed_features` column)
- ✅ Preserved: ALL existing data (students, teachers, classes, etc.)

---

## 🔍 Quick Verification Queries
```sql
-- Check new tables exist
SELECT COUNT(*) FROM rbac_school_packages;
SELECT COUNT(*) FROM subscription_packages;

-- Check old tables intact
SELECT COUNT(*) FROM school_subscriptions;
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM teachers;
```

---

## 📞 Emergency Contacts
- Database Issues: Check `PRODUCTION_DEPLOYMENT_GUIDE.md`
- Application Errors: Check PM2 logs
- Rollback: Follow rollback procedure above

---

## 🎯 Post-Deployment Tests
1. Login as admin
2. Create test school
3. Check student/teacher access
4. Verify existing features work

---

**Total Time**: ~5 minutes  
**Risk**: LOW  
**Impact**: Zero on existing data
