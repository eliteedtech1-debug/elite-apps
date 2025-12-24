# CRITICAL: Admin Menu Fallback Protection

## ⚠️ DO NOT MODIFY WITHOUT BACKUP ⚠️

This fallback menu structure was recovered from `rbac_menu_cache` table and represents the EXACT working admin menu structure. Any changes to this structure will break the admin interface.

## Protected Fallback Structure

```typescript
// PROTECTED: Admin fallback menu - matches rbac_menu_cache exactly
const PROTECTED_ADMIN_FALLBACK = [
  {
    name: "Personal Data Mngr",
    requiredAccess: ["admin", "branchadmin"],
    items: [
      {
        key: "STUDENTS",
        label: "Students", 
        icon: "ti ti-school",
        feature: "students",
        requiredAccess: ["admin", "branchadmin", "superadmin"],
        submenu: true,
        submenuItems: [
          { label: "Student List", link: "/student/student-list" },
          { label: "Add Student", link: "/student/add-student" }
        ]
      },
      {
        key: "STAFF",
        label: "Staff",
        icon: "ti ti-users", 
        feature: "teachers",
        requiredAccess: ["admin", "branchadmin", "superadmin"],
        submenu: true,
        submenuItems: [
          { label: "Staff", link: "/teacher/teacher-list" },
          { label: "Add Staff", link: "/teacher/add-teacher" }
        ]
      }
    ]
  },
  // ... rest of structure
];
```

## Protection Rules

1. **NEVER** modify this structure without testing
2. **ALWAYS** backup before changes
3. **VERIFY** against rbac_menu_cache table
4. **TEST** on production backup simulation

## Recovery Instructions

If this fallback is broken:
1. Check `rbac_menu_cache` table: `SELECT * FROM rbac_menu_cache;`
2. Extract menu_data JSON
3. Use as reference to restore fallback
4. Test thoroughly before deployment

## Last Verified: 2025-12-23
## Source: rbac_menu_cache table (ID: 5)
## Status: ✅ PROTECTED
