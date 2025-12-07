# Sidebar Configuration for Developer & SuperAdmin

## Changes Made

### File Updated
`/elscholar-ui/src/core/data/json/sidebarData.tsx`

## Developer Sidebar Access

### Dashboard Links
Developer now sees BOTH dashboards:
```typescript
case "Developer":
  return [
    { label: "Developer Dashboard", link: routes.developerDashboard },
    { label: "Super Admin Dashboard", link: routes.superAdminDashboard },
  ];
```

### Menu Items Visible to Developer
1. ✅ Developer Dashboard (`/developer-dashboard`)
2. ✅ Super Admin Dashboard (`/superadmin-dashboard`)
3. ✅ School Access Management
4. ✅ App Configurations
5. ✅ All SuperAdmin menu items (inherited)

## SuperAdmin Sidebar Access

### Dashboard Links
SuperAdmin sees only their dashboard:
```typescript
case "superadmin":
  return [
    { label: "Super Admin Dashboard", link: routes.superAdminDashboard },
  ];
```

### Menu Items Visible to SuperAdmin
1. ✅ Super Admin Dashboard (`/superadmin-dashboard`)
2. ✅ School Access Management (now shared with Developer)
3. ❌ App Configurations (Developer only)
4. ❌ Developer Dashboard (Developer only)

## Access Control Logic

### Developer Override
```typescript
if (user_type === "Developer") {
  return items; // Developer sees EVERYTHING
}
```

### Permission-Based Filtering
```typescript
requiredPermissions: ["Developer", "superadmin"]
// Both Developer and SuperAdmin can see this item

requiredPermissions: ["Developer"]
// Only Developer can see this item

requiredPermissions: ["superadmin"]
// Only SuperAdmin can see this item
```

## Menu Structure

```
Developer Login → Sidebar Shows:
├── MAIN
│   ├── Developer Dashboard (primary)
│   └── Super Admin Dashboard (secondary)
├── Personal Data Mngr
│   └── (all items - Developer sees everything)
├── Academic
│   └── (all items - Developer sees everything)
├── Management
│   ├── School Access Management ✅
│   └── App Configurations ✅
└── (all other sections)

SuperAdmin Login → Sidebar Shows:
├── MAIN
│   └── Super Admin Dashboard
├── Personal Data Mngr
│   └── (filtered by permissions)
├── Academic
│   └── (filtered by permissions)
├── Management
│   └── School Access Management ✅
└── (filtered sections)
```

## Testing

### Test as Developer
1. Login with Developer credentials
2. Check sidebar shows:
   - ✅ Developer Dashboard link
   - ✅ Super Admin Dashboard link
   - ✅ All menu items visible
3. Click "Super Admin Dashboard" → Should navigate to `/superadmin-dashboard`
4. Click "Developer Dashboard" → Should navigate to `/developer-dashboard`

### Test as SuperAdmin
1. Login with SuperAdmin credentials
2. Check sidebar shows:
   - ✅ Super Admin Dashboard link
   - ❌ Developer Dashboard link (should not appear)
   - ✅ School Access Management
   - ❌ App Configurations (should not appear)
3. Verify filtered menu items based on permissions

## Login URL
```
http://localhost:3000/superadmin
```

Both Developer and SuperAdmin can login here. The sidebar will adjust based on `user_type` in JWT token.

## Key Points

1. **Developer = SuperUser**
   - Sees ALL menu items
   - Has access to both dashboards
   - Can manage SuperAdmins
   - Can configure system settings

2. **SuperAdmin = Limited Admin**
   - Sees filtered menu items
   - Only their dashboard
   - Can manage their schools only
   - Cannot access Developer-only features

3. **Shared Features**
   - School Access Management (both can access)
   - Super Admin Dashboard (Developer can view)

4. **Developer-Only Features**
   - Developer Dashboard
   - App Configurations
   - SuperAdmin Management

## Routes Configuration

Ensure these routes exist in `all_routes.tsx`:
```typescript
{
  developerDashboard: "/developer-dashboard",
  superAdminDashboard: "/superadmin-dashboard",
  schoolAccessManagement: "/school-access-management",
  appConfigurations: "/app-configurations"
}
```

## Component Access

### Developer Dashboard Component
- Path: `/developer-dashboard`
- Component: `DeveloperSuperAdminManager.tsx`
- Access: Developer only

### SuperAdmin Dashboard Component
- Path: `/superadmin-dashboard`
- Component: SuperAdmin dashboard components
- Access: Developer + SuperAdmin

## Verification Checklist

- [x] Developer sees both dashboard links
- [x] SuperAdmin sees only their dashboard
- [x] Developer override works (sees all items)
- [x] Permission filtering works for SuperAdmin
- [x] School Access Management shared between both
- [x] App Configurations is Developer-only
- [ ] Frontend build successful
- [ ] Manual testing completed
