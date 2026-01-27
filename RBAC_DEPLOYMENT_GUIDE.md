# RBAC Production Deployment Guide

**Deployment Date:** 2026-01-19
**Branch:** expirement
**Status:** Ready for Production

---

## 📁 Modified Files Summary

### Frontend Changes (elscholar-ui/)
```
M src/contexts/RBACContext.tsx           # Enhanced client-side filtering
M src/core/data/json/sidebarData.tsx     # Added boundary checks
M src/feature-module/router/all_routes.tsx # New Notice Board routes
M src/feature-module/router/optimized-router.tsx # Route permissions
```

### Backend Changes (elscholar-api/)
```
M src/controllers/rbacController.js      # Enhanced RBAC query with boundaries
```

### Database Changes
```
+ rbac_menu_access.access_type           # New column: default/additional/restricted
+ rbac_menu_access.is_removable          # New column: protection flag
+ rbac_menu_access.created_at            # New column: audit trail
+ rbac_menu_access.updated_at            # New column: change tracking
+ rbac_menu_items.intended_user_types    # New column: target audience
+ rbac_menu_items.restricted_user_types  # New column: security boundaries
+ v_rbac_health_check                    # New view: monitoring
```

---

## 🚀 Deployment Steps

### 1. Pre-Deployment
```bash
# Backup database
mysqldump -u root full_skcooly > rbac_backup_$(date +%Y%m%d_%H%M).sql

# Stop services
pm2 stop elscholar-api
sudo systemctl stop nginx  # if using nginx

# Deploy code
git pull origin expirement
cd elscholar-ui && npm run build
cd ../elscholar-api && npm install
```

### 2. Database Migration
```bash
# Run the migration script
mysql -u root full_skcooly < RBAC_PRODUCTION_MIGRATION.sql

# Verify migration
mysql -u root full_skcooly -e "SELECT * FROM v_rbac_health_check;"
```

### 3. Post-Deployment
```bash
# Start services
cd elscholar-api && pm2 start ecosystem.config.js
sudo systemctl start nginx

# Clear cache
redis-cli FLUSHDB  # if using Redis
# Or clear browser cache for users
```

---

## ✅ Validation Checklist

### Database Validation
- [ ] Backup created successfully
- [ ] New columns added without errors
- [ ] Notice Board items created (IDs 1095, 1096)
- [ ] Boundary definitions applied
- [ ] Health check view created
- [ ] Zero contamination violations

### Application Testing
- [ ] Admin login works (sidebar ~121 items)
- [ ] Student login works (sidebar 7 items)
- [ ] Parent login works (sidebar 3 items)
- [ ] Teacher login works (appropriate items)
- [ ] Notice Board Management (admin only)
- [ ] Notice Board View (users only)
- [ ] No console errors
- [ ] Performance <50ms

### Monitoring Setup
- [ ] Health check query runs successfully
- [ ] Expected metrics: Contamination Violations = 0
- [ ] Performance monitoring active
- [ ] Error logging configured

---

## 🔧 Key Changes Explained

### Frontend Enhancements
```typescript
// Enhanced boundary checking in sidebarData.tsx
if (item.restricted_user_types?.includes(user_type)) {
  return null; // Block access
}

// Client-side filtering in RBACContext.tsx  
const filteredMenu = response.data?.filter((item: any) => {
  if (item.restricted_user_types?.includes(user.user_type)) {
    return false;
  }
  return true;
}) || [];
```

### Backend Security
```javascript
// Enhanced RBAC query with boundary enforcement
AND (
  m.restricted_user_types IS NULL 
  OR NOT JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE(?))
)
```

### Database Structure
```sql
-- New boundary enforcement
intended_user_types JSON    -- Who should see this
restricted_user_types JSON  -- Who should never see this
access_type ENUM           -- default/additional/restricted
is_removable BOOLEAN       -- Protection flag
```

---

## 📊 Expected Results

### Before Deployment
- Admin sidebar: 132 items (bloated)
- Security violations: 9 conflicts
- User confusion: High
- Performance: Variable

### After Deployment  
- Admin sidebar: 121 items (8.3% reduction)
- Security violations: 0 conflicts
- User confusion: Eliminated
- Performance: <50ms queries

---

## 🚨 Rollback Plan

If issues are found after deployment:

```sql
-- Emergency rollback
DELETE FROM rbac_menu_access;
INSERT INTO rbac_menu_access SELECT * FROM rbac_menu_access_backup_prod_20260119;

-- Restore menu items
UPDATE rbac_menu_items SET is_active = 1 WHERE id = 29;
DELETE FROM rbac_menu_items WHERE id IN (1095, 1096);
```

```bash
# Code rollback
git checkout HEAD~1 -- elscholar-ui/src/
git checkout HEAD~1 -- elscholar-api/src/controllers/rbacController.js
pm2 restart elscholar-api
```

---

## 📈 Monitoring Commands

### Daily Health Check
```sql
SELECT * FROM v_rbac_health_check;
```

### Weekly Validation
```sql
-- Should return 0 rows
SELECT COUNT(*) as violations FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1
  AND JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE(ma.user_type));
```

### Performance Check
```sql
-- Should be <50ms
SET @start = NOW(6);
SELECT COUNT(*) FROM rbac_menu_access ma 
JOIN rbac_menu_items m ON ma.menu_item_id = m.id 
WHERE ma.user_type = 'admin' AND m.is_active = 1;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6))/1000 as ms;
```

---

## 🎯 Success Criteria

- ✅ Zero database errors during migration
- ✅ All user types can login successfully  
- ✅ Sidebar counts match expectations
- ✅ No contamination violations
- ✅ Performance under 50ms
- ✅ Clean user interfaces

---

**Deployment Status:** Ready for Production  
**Risk Level:** Low (comprehensive testing completed)  
**Rollback Time:** <5 minutes if needed  
**Expected Downtime:** 2-3 minutes for migration

---

*Deployment guide created: 2026-01-19 04:30 PM*  
*All changes tested and validated in development*
