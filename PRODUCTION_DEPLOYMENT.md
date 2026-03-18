# Production Deployment - Role Inheritance Fix

## 🚀 Production Deployment Steps

### **Step 1: Push Code to Repository**

```bash
cd /Users/apple/Downloads/apps/elite

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Reverse role inheritance direction for correct RBAC permissions

- Fixed exam_officer inheriting from vp_academic (wrong direction)
- Now vp_academic inherits from exam_officer (correct - additive)
- Added SQL migration: fix_role_inheritance_direction.sql
- Reverted rbacController.js to use role inheritance
- VP Academic now gets exam officer permissions + VP permissions
- Exam Officer now sees only their menu items (45 items)
- VP Academic now sees combined menu items (80 items)

Refs: ROLE_INHERITANCE_FINAL_SOLUTION.md"

# Push to repository
git push origin expirement
```

---

### **Step 2: Pull on Production Server**

**SSH into production server:**
```bash
ssh user@your-production-server
```

**Navigate to project and pull:**
```bash
cd /path/to/elscholar-api

# Pull latest changes
git pull origin expirement

# Or if you're on a different branch
git fetch origin
git checkout expirement
git pull
```

---

### **Step 3: Run Migration on Production Database**

**Check database credentials:**
```bash
cd /path/to/elscholar-api
cat .env | grep DB_
```

**Run migration:**
```bash
# Option 1: With password prompt
mysql -u root -p YOUR_DB_NAME < src/migrations/fix_role_inheritance_direction.sql

# Option 2: Extract password from .env
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)

mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < src/migrations/fix_role_inheritance_direction.sql

# Verify migration success
echo "Migration completed. Check output above for any errors."
```

**Expected output:**
```
Backup created    10
Old inheritance cleared
Level 1 roles created (specialized teachers)
Level 2 roles created (senior academic staff)
Level 3 roles created (school leadership)
...
total_inheritance_rules: 6
```

---

### **Step 4: Restart Production Backend**

**Using PM2 (recommended):**
```bash
pm2 restart elscholar-api
pm2 logs elscholar-api --lines 50
```

**Using systemd:**
```bash
sudo systemctl restart elscholar-api
sudo systemctl status elscholar-api
```

**Manual restart:**
```bash
# Stop
pkill -f "node.*server"

# Start
cd /path/to/elscholar-api
npm start &
```

---

### **Step 5: Verify on Production**

**Check backend logs:**
```bash
# PM2
pm2 logs elscholar-api --lines 100

# Or check log files
tail -f logs/combined.log
```

**Test API endpoint:**
```bash
# Test menu endpoint
curl -X GET 'https://your-domain.com/api/rbac/menu' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'X-School-Id: SCH/14' \
  -H 'X-Branch-Id: BRCH00014'
```

**Expected response:**
```json
{
  "success": true,
  "data": [...],
  "debug": {
    "userRoles": ["exam_officer", "teacher"],  // ✅ Correct (no vp_academic)
    "totalMenuItems": 45
  }
}
```

---

### **Step 6: Clear User Caches**

**Option 1: API endpoint (if available):**
```bash
curl -X POST 'https://your-domain.com/api/rbac/cache/clear' \
  -H 'Authorization: Bearer ADMIN_TOKEN'
```

**Option 2: Notify users to clear browser cache:**
```
Press F12 → Console → Run:
localStorage.clear();
location.reload();
```

**Option 3: Force cache clear on next login (backend):**
```javascript
// Add to login endpoint temporarily
localStorage.removeItem('rbac_menu_cache_' + userId);
```

---

## ✅ Post-Deployment Verification

### **Test Cases:**

**1. Exam Officer User:**
```bash
# Login as exam_officer
# Expected: ~45 menu items
# Should see: Dashboard, Examinations, Assessment
# Should NOT see: VP Academic menus, School Head menus
```

**2. VP Academic User:**
```bash
# Login as vp_academic
# Expected: ~80 menu items
# Should see: All exam_officer menus + VP specific menus
```

**3. School Head User:**
```bash
# Login as school_head
# Expected: ~120 menu items
# Should see: Everything
```

---

## 🔄 Rollback Plan (If Issues Occur)

### **Step 1: Rollback Database**
```bash
mysql -u root -p YOUR_DB_NAME

# Run rollback
DELETE FROM role_inheritance;
INSERT INTO role_inheritance 
SELECT * FROM role_inheritance_backup_20260227;
DROP TABLE role_inheritance_backup_20260227;
```

### **Step 2: Rollback Code**
```bash
cd /path/to/elscholar-api

# Revert to previous commit
git log --oneline -5  # Find commit hash before the fix
git revert COMMIT_HASH

# Or reset to previous commit (destructive)
git reset --hard HEAD~1
git push origin expirement --force
```

### **Step 3: Restart Backend**
```bash
pm2 restart elscholar-api
```

---

## 📊 Monitoring

**Watch for these in logs:**
```bash
# Success indicators
"🔍 RBAC Debug - Role exam_officer inherits from: ['teacher']"
"🔍 RBAC Debug - Role vp_academic inherits from: ['exam_officer', 'form_master']"

# Error indicators
"⚠️ RBAC Warning - Role inheritance query failed"
"ERROR 1146 (42S02): Table 'role_inheritance' doesn't exist"
```

---

## 🆘 Troubleshooting

### **Issue: Migration fails**
```bash
# Check if table exists
mysql -u root -p YOUR_DB_NAME -e "SHOW TABLES LIKE 'role_inheritance';"

# Check current data
mysql -u root -p YOUR_DB_NAME -e "SELECT * FROM role_inheritance;"
```

### **Issue: Users still see wrong menus**
```bash
# Clear all menu caches
mysql -u root -p YOUR_DB_NAME -e "DELETE FROM rbac_menu_cache;"

# Or via API
curl -X POST 'https://your-domain.com/api/rbac/cache/clear-all'
```

### **Issue: Backend won't start**
```bash
# Check logs
pm2 logs elscholar-api --err

# Check syntax errors
cd /path/to/elscholar-api
npm run lint
```

---

## 📝 Deployment Checklist

- [ ] Code pushed to repository
- [ ] Pulled on production server
- [ ] Database credentials verified
- [ ] SQL migration executed successfully
- [ ] Backup created (role_inheritance_backup_20260227)
- [ ] Backend restarted
- [ ] Logs checked for errors
- [ ] Test with exam_officer user
- [ ] Test with vp_academic user
- [ ] User caches cleared
- [ ] Monitoring in place

---

**Deployment Date:** 2026-02-27  
**Estimated Downtime:** 2-3 minutes  
**Risk Level:** Low (automatic backup created)  
**Rollback Time:** < 5 minutes
