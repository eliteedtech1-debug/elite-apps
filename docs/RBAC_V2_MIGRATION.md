# RBAC V2 Migration Guide

## 📁 New Files Created

### Services Layer:
1. **`elscholar-api/src/services/menuService.js`**
   - Menu operations (getUserMenu, updateRoleMenuAccess, etc.)
   - Handles all menu-related database queries
   - Manages menu cache invalidation

2. **`elscholar-api/src/services/roleService.js`**
   - Role operations (getUserRoles, assignRole, revokeRole, etc.)
   - Handles role inheritance logic
   - Manages user role assignments

### Controller Layer:
3. **`elscholar-api/src/controllers/rbacControllerV2.js`**
   - Thin controller layer
   - Request validation
   - Calls service methods
   - Response formatting

### Routes:
4. **`elscholar-api/src/routes/rbacV2.js`**
   - New route definitions
   - Uses rbacControllerV2

---

## 🔄 Migration Steps

### Phase 1: Testing (Current)
```bash
# Add to elscholar-api/src/app.js (or main server file)
const rbacV2Routes = require('./routes/rbacV2');
app.use('/api/rbac-v2', rbacV2Routes);

# Test endpoints:
# Old: /api/rbac/menu
# New: /api/rbac-v2/menu
```

### Phase 2: Verification
Test all endpoints with both old and new routes:

| Endpoint | Old Route | New Route | Status |
|----------|-----------|-----------|--------|
| Get Menu | `/api/rbac/menu` | `/api/rbac-v2/menu` | ⏳ Test |
| Get Menu Items by Roles | `/api/rbac/menu-items-by-roles` | `/api/rbac-v2/menu-items-by-roles` | ⏳ Test |
| Update Role Menu Access | `/api/rbac/update-role-menu-access` | `/api/rbac-v2/update-role-menu-access` | ⏳ Test |
| Get User Roles | `/api/rbac/user-roles/:id` | `/api/rbac-v2/user-roles/:id` | ⏳ Test |
| Assign Role | `/api/rbac/assign-role` | `/api/rbac-v2/assign-role` | ⏳ Test |
| Revoke Role | `/api/rbac/revoke-role` | `/api/rbac-v2/revoke-role` | ⏳ Test |

### Phase 3: Frontend Migration
Update frontend API calls:
```typescript
// Old
_get('api/rbac/menu', ...)

// New
_get('api/rbac-v2/menu', ...)
```

### Phase 4: Cutover
1. Update `elscholar-api/src/routes/rbac.js` to use `rbacControllerV2`
2. Remove `/api/rbac-v2` test routes
3. Delete `rbacController.js` (old file)

---

## 🎯 Benefits of New Architecture

### Separation of Concerns:
- **Services**: Business logic + database queries
- **Controllers**: Request/response handling
- **Routes**: Endpoint definitions

### Testability:
```javascript
// Can test services independently
const menuService = require('../services/menuService');
const items = await menuService.getUserMenu(userId, userType, schoolId, branchId, roles);
```

### Reusability:
```javascript
// Services can be used by multiple controllers
const roleService = require('../services/roleService');
const roles = await roleService.getUserRoles(userId, schoolId, branchId);
```

### Maintainability:
- Smaller, focused files
- Clear responsibility boundaries
- Easier to debug and extend

---

## 📊 Function Mapping

### menuService.js:
| Function | Description |
|----------|-------------|
| `getUserMenu()` | Get menu items for user with role inheritance |
| `getMenuItemsByRoles()` | Get menu item IDs for specific roles |
| `updateRoleMenuAccess()` | Add/remove menu items for role |
| `getMenuConfig()` | Get all menu items |
| `createMenuItem()` | Create new menu item |
| `updateMenuItem()` | Update menu item |
| `deleteMenuItem()` | Soft delete menu item |
| `bulkUpdateMenuAccess()` | Bulk update menu access |

### roleService.js:
| Function | Description |
|----------|-------------|
| `getUserRoles()` | Get user's assigned roles |
| `getRoleInheritance()` | Get parent roles for a role |
| `getAllRolesWithInheritance()` | Get all roles including inherited |
| `listStaffRoles()` | Get all staff role definitions |
| `assignRole()` | Assign role to user |
| `revokeRole()` | Revoke role from user |
| `listRoles()` | Get all roles for school |
| `createRole()` | Create new role |
| `updateRolePermissions()` | Update role permissions |

---

## ⚠️ Missing Functions (Not Yet Migrated)

These functions are still in `rbacController.js` and need migration:

1. `getUserPermissions` - Get user's effective permissions
2. `getSuperadminFeatures` - Get superadmin features
3. `grantSuperadminFeature` - Grant superadmin feature
4. `assignSchoolFeatures` - Assign features to school
5. `getAllFeatures` - Get all features
6. `getSchoolFeatures` - Get school features
7. `createPackage` - Create subscription package
8. `updatePackage` - Update subscription package
9. `deletePackage` - Delete subscription package
10. `getPermissionTemplates` - Get permission templates
11. `createPermissionTemplate` - Create permission template
12. `applyPermissionTemplate` - Apply permission template
13. `deletePermissionTemplate` - Delete permission template
14. `updatePermissionTemplate` - Update permission template
15. `updateMenuConfig` - Update menu configuration
16. `assignStaffRole` - Assign staff role

**Next Step:** Create `featureService.js` and `packageService.js` for these functions.

---

## 🧪 Testing Checklist

- [ ] Test `/api/rbac-v2/menu` with different user types
- [ ] Test role inheritance (exam_officer → teacher)
- [ ] Test manual menu additions (access_type='additional')
- [ ] Test manual menu removals (access_type='restricted')
- [ ] Test role assignment/revocation
- [ ] Test menu item CRUD operations
- [ ] Compare responses between old and new endpoints
- [ ] Performance testing (response times)
- [ ] Load testing (concurrent requests)

---

## 📝 Rollback Plan

If issues occur:
1. Remove `/api/rbac-v2` routes from app.js
2. Continue using `/api/rbac` (old routes)
3. Fix issues in V2 files
4. Re-test before retry

---

**Created:** 2026-02-27  
**Status:** Ready for Testing  
**Next Action:** Add rbacV2 routes to app.js and test
