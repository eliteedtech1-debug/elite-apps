# Phase 3: Frontend Migration - Frontend Expert Tasks

> **Agent:** Frontend Expert
> **Estimated Duration:** 4-5 days
> **Dependencies:** Phase 2 (Backend Services) ✅ COMPLETED
> **Status:** ✅ COMPLETED

---

## Context from Phase 1 & 2

### Backend API Endpoints Available
```
GET  /api/rbac/permissions  → { features: { FEATURE_KEY: { view, create, edit, delete, export, approve } } }
GET  /api/rbac/menu         → [{ name, icon, items: [{ key, label, icon, route, permissions }] }]
GET  /api/rbac/staff-roles  → [{ role_code, role_name, default_feature_access }]
POST /api/rbac/staff/:id/role → Assign staff role
```

### Database Schema (Phase 1)
- `features` table has: `feature_key`, `menu_label`, `menu_icon`, `route_path`, `display_order`, `required_user_types`
- `staff_role_definitions` has 9 predefined roles: TEACHER, FORM_MASTER, EXAM_OFFICER, CASHIER, etc.
- Permission actions: `view`, `create`, `edit`, `delete`, `export`, `approve`

### Existing Frontend Code
- `usePermissions.ts` hook exists (uses different structure - needs adaptation)
- `PermissionWrapper.tsx` component exists (uses resource/action pattern)
- `sidebarData.tsx` has 800+ lines of hardcoded menu items
- Redux auth slice has `userPermissions` field

---

## Task 3.1: Create RBAC Context & Hook

**File:** `elscholar-ui/src/contexts/RBACContext.tsx`

```typescript
// Fetches from /api/rbac/permissions and /api/rbac/menu
// Provides: permissions, menu, hasFeature(key, action), loading
// Caches in localStorage with 5-min TTL
```

**File:** `elscholar-ui/src/hooks/useFeature.ts`

```typescript
// Simple hook wrapping context
export const useFeature = (featureKey: string) => {
  const { permissions } = useRBAC();
  const perms = permissions[featureKey] || {};
  return {
    canView: perms.view || false,
    canCreate: perms.create || false,
    canEdit: perms.edit || false,
    canDelete: perms.delete || false,
  };
};
```

---

## Task 3.2: Create FeatureGate Component

**File:** `elscholar-ui/src/components/FeatureGate.tsx`

```typescript
interface FeatureGateProps {
  feature: string;           // e.g., 'COLLECT_FEES'
  action?: 'view' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Usage:
<FeatureGate feature="COLLECT_FEES" action="create">
  <Button>Collect Payment</Button>
</FeatureGate>
```

---

## Task 3.3: Create Dynamic Sidebar

**File:** `elscholar-ui/src/core/common/sidebar/DynamicSidebar.tsx`

```typescript
// Fetches menu from /api/rbac/menu
// Renders menu items grouped by category
// Shows loading skeleton while fetching
// Falls back to static menu if API fails
```

**Modify:** `elscholar-ui/src/core/common/sidebar/index.tsx`
- Import and use DynamicSidebar
- Keep static sidebarData as fallback

---

## Task 3.4: Staff Role Assignment UI

**File:** `elscholar-ui/src/feature-module/peoples/teachers/StaffRoleAssignment.tsx`

```typescript
// Shows dropdown with staff roles from /api/rbac/staff-roles
// Displays current role and default permissions preview
// Calls POST /api/rbac/staff/:id/role to assign
```

**Integrate into:** `teacher-details.tsx` or staff edit form

---

## Task 3.5: Update Redux Auth Slice

**File:** `elscholar-ui/src/redux/reducers/auth.ts`

Add to state:
```typescript
rbacPermissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;
rbacMenu: MenuItem[];
rbacLoaded: boolean;
```

Add actions:
- `SET_RBAC_PERMISSIONS`
- `SET_RBAC_MENU`
- `CLEAR_RBAC`

---

## Task 3.6: Fetch Permissions on Login

**Modify:** `elscholar-ui/src/feature-module/auth/login/login.tsx`

After successful login:
```typescript
// Fetch RBAC data
const [permsRes, menuRes] = await Promise.all([
  api.get('/rbac/permissions'),
  api.get('/rbac/menu')
]);
dispatch({ type: 'SET_RBAC_PERMISSIONS', payload: permsRes.data.data.features });
dispatch({ type: 'SET_RBAC_MENU', payload: menuRes.data.data });
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/RBACContext.tsx` | Permission context provider |
| `src/hooks/useFeature.ts` | Simple feature permission hook |
| `src/components/FeatureGate.tsx` | Conditional render by feature |
| `src/core/common/sidebar/DynamicSidebar.tsx` | Menu from API |
| `src/feature-module/peoples/teachers/StaffRoleAssignment.tsx` | Staff role UI |

## Files to Modify

| File | Changes |
|------|---------|
| `src/redux/reducers/auth.ts` | Add RBAC state & actions |
| `src/feature-module/auth/login/login.tsx` | Fetch RBAC on login |
| `src/core/common/sidebar/index.tsx` | Use DynamicSidebar |
| `src/index.tsx` | Wrap app with RBACProvider |

---

## Migration Strategy

1. **Phase 3a:** Create new RBAC components (non-breaking)
2. **Phase 3b:** Add DynamicSidebar alongside static (feature flag)
3. **Phase 3c:** Gradually replace `requiredAccess` with `feature` prop
4. **Phase 3d:** Remove legacy sidebarData once stable

---

## ✅ CRITICAL FIXES APPLIED

### Issue 1: Replaced Axios with Helper Functions
- **RBACContext.tsx** - Now uses `_get()` instead of axios
- **StaffRoleAssignment.tsx** - Now uses `_get()` and `_post()` 
- **login.tsx** - Now uses `_get()` for RBAC data fetching
- **Reason**: Backend auth headers are strictly designed for Helper functions, axios fails with auth

### Issue 2: Multi-Table Auth Structure Support
- **rbacService.js** - Updated `getEffectivePermissions()` to handle:
  - **Teachers/Staff** → `teachers` table (with `user_id` linking to `users`)
  - **Students** → `students` table (with `admission_no` as identifier)  
  - **Admin/BranchAdmin/Developer/SuperAdmin** → `users` table directly
- **rbacController.js** - Updated to pass `user_type` and `admission_no`
- **assignStaffRole()** - Fixed to work with `teachers` table instead of non-existent `Staff` table

### Issue 3: Subscription-Based Fallback Permissions ✅ **NEW**
- **fallbackPermissions.js** - Created tier-based default permissions:
  - **Standard**: Basic permissions (view/create for core features)
  - **Premium**: Extended permissions (edit/delete for most features)  
  - **Elite**: Full permissions (all actions including export/approve)
- **rbacService.js** - Updated to use fallback when RBAC fails or returns empty
- **RBACContext.tsx** - Enhanced to handle fallback gracefully
- **Global Standard Practice**: Implements "graceful degradation" and "fail-safe defaults"

### Fallback Permission Structure
```javascript
// Example: Standard tier admin permissions
{
  STUDENT_MANAGEMENT: { view: true, create: true, edit: true, delete: false },
  COLLECT_FEES: { view: true, create: true, edit: false, delete: false },
  BASIC_REPORTS: { view: true, create: false, edit: false, delete: false }
}
```

### Backend Auth Flow Understanding
```
passport.js → verifyToken() → req.user contains:
- Teachers: user_id from teachers table
- Students: admission_no from students table  
- Admins: id from users table

RBAC Flow:
1. Try to get RBAC permissions from database
2. If RBAC fails/empty → Get subscription tier from school_subscriptions
3. Return tier-based fallback permissions
4. Frontend always has working permissions
```

## Deliverables Checklist

- [x] RBACContext.tsx created ✅ **FIXED: Uses Helper functions**
- [x] useFeature.ts hook created  
- [x] FeatureGate.tsx component created
- [x] DynamicSidebar.tsx component created
- [x] StaffRoleAssignment.tsx UI created ✅ **FIXED: Uses Helper functions**
- [x] Redux auth slice updated with RBAC state
- [x] Login fetches RBAC data ✅ **FIXED: Uses Helper functions**
- [x] Sidebar uses dynamic menu (with fallback)
- [x] **CRITICAL: Backend RBAC service updated for multi-table auth** ✅
- [x] **CRITICAL: Subscription-based fallback permissions implemented** ✅ **NEW**
- [x] **CRITICAL: SuperAdmin feature control system implemented** ✅ **NEW**
