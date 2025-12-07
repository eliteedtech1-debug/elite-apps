# Production Deployment Guide - December 7, 2025

## 📋 Overview

This guide covers deploying RBAC package system and school creation fixes to production.

**Impact**: Zero impact on students, teachers, or academic data  
**Downtime**: ~5 minutes (backend restart only)  
**Rollback**: Simple (restore backup if needed)

---

## ⚠️ PRE-DEPLOYMENT CHECKLIST

### 1. Backup Database
```bash
# Create full database backup
mysqldump -u root -p elite_pts > backup_elite_pts_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has content
ls -lh backup_elite_pts_*.sql
```

### 2. Verify Current State
```bash
# Check if critical tables exist
mysql -u root -p elite_pts -e "
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'elite_pts' 
AND table_name IN ('school_subscriptions', 'subscription_invoices', 'users');"
```

### 3. Test on Staging (if available)
- Run migration on staging database first
- Test school creation
- Test RBAC features
- Verify no errors

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Stop Application (Optional - for safety)
```bash
# Stop backend to prevent concurrent writes during migration
pm2 stop elite

# Or if using systemd
sudo systemctl stop elite-api
```

### Step 2: Run Database Migration
```bash
# Navigate to project directory
cd /path/to/elite/elscholar-api

# Run migration script
mysql -u root -p elite_pts < src/migrations/PRODUCTION_MIGRATION_2025_12_07.sql

# Check for errors in output
# Should see "MIGRATION COMPLETED SUCCESSFULLY"
```

### Step 3: Verify Migration Success
```bash
# Verify new tables were created
mysql -u root -p elite_pts -e "
SELECT 'rbac_school_packages' as table_name, COUNT(*) as exists 
FROM information_schema.tables 
WHERE table_schema = 'elite_pts' AND table_name = 'rbac_school_packages'
UNION ALL
SELECT 'subscription_packages', COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'elite_pts' AND table_name = 'subscription_packages'
UNION ALL
SELECT 'features', COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'elite_pts' AND table_name = 'features';"

# Should show 1 for each table
```

### Step 4: Deploy Backend Code
```bash
# Pull latest code
cd /path/to/elite/elscholar-api
git pull origin main  # or your branch name

# Install dependencies (if package.json changed)
npm install

# Restart application
pm2 restart elite

# Or if using systemd
sudo systemctl start elite-api

# Check logs for errors
pm2 logs elite --lines 50
```

### Step 5: Deploy Frontend Code
```bash
# Pull latest code
cd /path/to/elite/elscholar-ui
git pull origin main  # or your branch name

# Install dependencies (if package.json changed)
npm install

# Rebuild
npm run build

# Restart frontend (if using pm2)
pm2 restart elite-ui

# Or copy build to web server
# cp -r dist/* /var/www/html/elite/
```

### Step 6: Verify Application Health
```bash
# Check backend is running
curl http://localhost:34567/api/health

# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs elite --lines 100 | grep -i error
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Test School Creation
```bash
# Create a test school via API or UI
# Verify subscription and invoice are created

# Check database
mysql -u root -p elite_pts -e "
SELECT school_id, pricing_plan_id, subscription_type, status 
FROM school_subscriptions 
ORDER BY created_at DESC LIMIT 5;"
```

### 2. Test RBAC System
```bash
# Login as Developer or SuperAdmin
# Navigate to /developer-dashboard or /superAdmin-dashboard
# Verify pages load without errors

# Check rbac_school_packages table
mysql -u root -p elite_pts -e "
SELECT * FROM rbac_school_packages LIMIT 5;"
```

### 3. Test Existing Functionality
- [ ] Student login works
- [ ] Teacher login works
- [ ] Admin dashboard loads
- [ ] Class management works
- [ ] Exam module works
- [ ] Fee collection works

### 4. Check Error Logs
```bash
# Backend logs
pm2 logs elite --lines 200 | grep -i error

# Database error log
sudo tail -100 /var/log/mysql/error.log

# Application error log
tail -100 /path/to/elite/elscholar-api/logs/error.log
```

---

## 🔄 ROLLBACK PROCEDURE (if needed)

### If Migration Fails
```bash
# 1. Stop application
pm2 stop elite

# 2. Restore database backup
mysql -u root -p elite_pts < backup_elite_pts_YYYYMMDD_HHMMSS.sql

# 3. Revert code changes
cd /path/to/elite/elscholar-api
git checkout previous_commit_hash

# 4. Restart application
pm2 restart elite

# 5. Verify old system works
curl http://localhost:34567/api/health
```

### If Application Errors Occur
```bash
# 1. Check logs for specific error
pm2 logs elite --lines 500

# 2. If RBAC-related, disable RBAC routes temporarily
# Comment out RBAC routes in src/index.js
# app.use('/api', require('./routes/rbac'));

# 3. Restart
pm2 restart elite
```

---

## 📊 MIGRATION DETAILS

### Tables Created
1. **rbac_school_packages** - RBAC feature package assignments
2. **subscription_packages** - Package definitions (Elite, Premium, Standard)
3. **features** - Available system features

### Tables Modified
1. **users** - Added `allowed_features` column (for SuperAdmin restrictions)

### Tables Preserved (No Changes)
1. **school_subscriptions** - Old pricing system (INTACT)
2. **subscription_invoices** - Invoice records (INTACT)
3. **students** - Student data (INTACT)
4. **teachers** - Teacher data (INTACT)
5. **classes** - Class data (INTACT)
6. All other academic tables (INTACT)

### Code Changes
1. **school_creation.js** - Fixed table names for subscription/invoice creation
2. **rbac.js** - All endpoints use `rbac_school_packages`
3. **checkFeatureAccess.js** - Feature validation uses `rbac_school_packages`
4. **SchoolSubscription.js** - Model uses `rbac_school_packages`
5. **DeveloperSuperAdminManager.tsx** - Uses Helper.tsx functions
6. **sidebarData.tsx** - Added Developer dashboard link
7. **optimized-router.tsx** - Added Developer route

---

## 🔒 SECURITY NOTES

### New User Types
- **Developer**: Can create/manage SuperAdmins, access all schools
- **SuperAdmin**: Can manage schools they created, assign packages

### Access Control
- Developer dashboard: `/developer-dashboard` (Developer only)
- SuperAdmin dashboard: `/superAdmin-dashboard` (SuperAdmin only)
- RBAC endpoints: `/api/developer/*` and `/api/super-admin/*`

### Setting Up Developer Account
```sql
-- Promote existing user to Developer
UPDATE users 
SET user_type = 'Developer' 
WHERE email = 'your-developer-email@example.com';
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue**: Migration fails with "Table already exists"
```bash
# Solution: Tables already created, safe to continue
# Verify tables exist:
mysql -u root -p elite_pts -e "SHOW TABLES LIKE '%rbac%';"
```

**Issue**: Foreign key constraint fails
```bash
# Solution: subscription_packages must exist first
# Check if it exists:
mysql -u root -p elite_pts -e "SHOW TABLES LIKE 'subscription_packages';"
```

**Issue**: School creation fails
```bash
# Check logs:
pm2 logs elite | grep -i "school_creation"

# Verify tables:
mysql -u root -p elite_pts -e "DESCRIBE school_subscriptions;"
mysql -u root -p elite_pts -e "DESCRIBE subscription_invoices;"
```

**Issue**: RBAC endpoints return 500 error
```bash
# Check if rbac_school_packages exists:
mysql -u root -p elite_pts -e "SHOW TABLES LIKE 'rbac_school_packages';"

# Check backend logs:
pm2 logs elite --lines 100
```

---

## 📝 MAINTENANCE NOTES

### Regular Checks
- Monitor `rbac_school_packages` table growth
- Check for expired packages (end_date < NOW())
- Verify feature access logs

### Cleanup (Optional)
```sql
-- Remove expired RBAC packages (after grace period)
UPDATE rbac_school_packages 
SET is_active = FALSE 
WHERE end_date < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Database backup completed
- [ ] Staging tested (if available)
- [ ] Migration script reviewed
- [ ] Application stopped (optional)
- [ ] Migration executed successfully
- [ ] Backend code deployed
- [ ] Frontend code deployed
- [ ] Application restarted
- [ ] Health check passed
- [ ] School creation tested
- [ ] RBAC system tested
- [ ] Existing features verified
- [ ] Error logs checked
- [ ] Team notified of deployment

---

## 📅 DEPLOYMENT TIMELINE

**Estimated Duration**: 15-30 minutes

1. Backup: 5 minutes
2. Migration: 2 minutes
3. Code deployment: 5 minutes
4. Restart: 1 minute
5. Verification: 10 minutes
6. Monitoring: 15 minutes

**Recommended Time**: Off-peak hours (e.g., 2 AM - 4 AM)

---

## 🎯 SUCCESS CRITERIA

✅ Migration completes without errors  
✅ All tables created successfully  
✅ Application starts without errors  
✅ School creation works  
✅ RBAC system accessible  
✅ Existing features work  
✅ No data loss  
✅ Performance unchanged  

---

**Deployment prepared by**: Development Team  
**Date**: December 7, 2025  
**Version**: 1.0.0  
**Status**: Ready for Production
