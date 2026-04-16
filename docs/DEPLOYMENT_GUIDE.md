# Role Inheritance Fix - Deployment Guide

## 🚀 Quick Deployment Steps

### **Step 1: Run SQL Migration**

**For Local (no password):**
```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api
mysql -u root elite_prod_db < src/migrations/fix_role_inheritance_direction.sql
```

**For Production (with password):**
```bash
cd /path/to/elscholar-api

# Check .env for DB credentials
cat .env | grep DB_

# Run migration with password
mysql -u root -p YOUR_DB_NAME < src/migrations/fix_role_inheritance_direction.sql
# Enter password when prompted

# Or use password from .env directly (if DB_PASSWORD is set)
DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)
mysql -u root -p"$DB_PASSWORD" YOUR_DB_NAME < src/migrations/fix_role_inheritance_direction.sql
```

**⚠️ IMPORTANT:** Always use the correct database credentials from `.env` file in production!

### **Step 2: Revert Code Changes**

**File:** `elscholar-api/src/controllers/rbacController.js`

**Find this code (around line 277-285):**
```javascript
// CRITICAL: For menu fetching, use PRIMARY role only (no inheritance)
const primaryRole = effectiveUserType;
const allRoles = [primaryRole];

console.log('🔍 RBAC Debug - Using PRIMARY role only for menu:', primaryRole);
```

**Replace with:**
```javascript
// Get inherited roles for all user roles
const allRolesWithInheritance = [...allUserRoles];

try {
  for (const role of allUserRoles) {
    console.log(`🔍 RBAC Debug - Checking inheritance for role: ${role}`);
    const inheritedRoles = await db.sequelize.query(
      `SELECT parent_role, child_role FROM role_inheritance WHERE child_role = ?`,
      { replacements: [role], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    if (inheritedRoles.length > 0) {
      const parentRoles = inheritedRoles.map(r => r.parent_role);
      console.log(`🔍 RBAC Debug - Role ${role} inherits from:`, parentRoles);
      allRolesWithInheritance.push(...parentRoles);
    } else {
      console.log(`🔍 RBAC Debug - Role ${role} has no parent roles`);
    }
  }
} catch (inheritanceError) {
  console.warn('⚠️ RBAC Warning - Role inheritance query failed:', inheritanceError.message);
}

const allRoles = [...new Set(allRolesWithInheritance)];

console.log('🔍 RBAC Debug - Final roles for menu query:', allRoles);
```

### **Step 3: Restart Backend**

```bash
# Stop the server (Ctrl+C if running)

# Restart
cd /Users/apple/Downloads/apps/elite/elscholar-api
npm run dev
```

### **Step 4: Clear Frontend Cache**

```bash
# In browser console (F12)
localStorage.clear();
location.reload();
```

### **Step 5: Test**

**Test with Exam Officer:**
```bash
# Login as exam_officer user
# Expected: See ~45 menu items
# Should NOT see: VP Academic specific menus
```

**Test with VP Academic:**
```bash
# Login as vp_academic user
# Expected: See ~80 menu items
# Should see: Exam officer menus + VP specific menus
```

---

## ✅ Verification Checklist

- [ ] SQL migration ran successfully
- [ ] Code reverted in rbacController.js
- [ ] Backend restarted
- [ ] Frontend cache cleared
- [ ] Exam officer sees correct menu (45 items)
- [ ] VP Academic sees correct menu (80 items)
- [ ] No errors in console

---

## 🔄 Rollback (If Needed)

**Local:**
```sql
mysql -u root elite_prod_db
```

**Production:**
```sql
mysql -u root -p YOUR_DB_NAME
```

**Then run:**
```sql
-- Restore old inheritance
DELETE FROM role_inheritance;
INSERT INTO role_inheritance 
SELECT * FROM role_inheritance_backup_20260227;
DROP TABLE role_inheritance_backup_20260227;
```

**⚠️ Note:** Production environments have real passwords. Always use credentials from `.env` file.

---

**Estimated Time:** 5 minutes  
**Risk Level:** Low (backup created automatically)
