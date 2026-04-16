# Elite Core Sidebar System Reference

> **CRITICAL**: This is the working sidebar configuration. DO NOT modify without backing up this reference.

## Current Architecture

### Main Components
- **Primary**: `src/core/common/sidebar/index.tsx` - Main sidebar wrapper
- **Dynamic**: `src/core/common/sidebar/DynamicSidebar.tsx` - RBAC-based menu renderer
- **Context**: `src/contexts/RBACContext.tsx` - Menu data provider
- **Legacy**: `src/core/data/json/sidebarData.tsx` - Fallback menu data

### Data Flow
```
RBACContext → _get('api/rbac/menu') → DynamicSidebar → Rendered Menu
     ↓ (if API fails)
Legacy Fallbacks → DynamicSidebar → Rendered Menu
```

## Working RBACContext.tsx Configuration

### API Call Structure
```typescript
_get('api/rbac/menu',
  (response) => {
    menuData = response?.data || [];
    
    // Teacher filtering for users without classes
    if ((user?.user_type === 'teacher' || user?.user_type === 'Teacher') && 
        (!authState?.classes || authState.classes.length === 0)) {
      menuData = menuData.map(category => ({
        ...category,
        items: category.items?.filter(item => 
          item.label !== 'Class Attendance' && item.label !== 'FormMaster Review'
        ) || []
      }));
      localStorage.removeItem(CACHE_KEY);
    }
    
    // Superadmin fallback
    if ((!menuData || menuData.length === 0) && user?.user_type === 'superadmin') {
      menuData = [{ name: "Super Admin", items: [...] }];
    }
    
    // Admin fallback  
    if ((!menuData || menuData.length === 0) && user?.user_type?.toLowerCase() === 'admin') {
      menuData = [{ name: "Administration", items: [...] }];
    }
    
    onComplete();
  },
  (error) => {
    // Error fallbacks for superadmin/admin
    onComplete();
  }
);
```

### Menu Data Format
```typescript
interface MenuData {
  name: string;           // Category name
  items: MenuItem[];      // Menu items
}

interface MenuItem {
  key: string;           // Unique identifier
  label: string;         // Display text
  icon?: string;         // Icon class
  link?: string;         // Route path
  submenu?: boolean;     // Has submenu
  submenuItems?: MenuItem[]; // Submenu items
}
```

## Admin Menu Structure (Working)

When RBAC API works, admin sees:
- Personal Data Mngr
- Students List
- Admission
- Parent List
- Staff List
- Attendance
- General Setups
- School Setup
- Exams & Records
- Examinations
- Express Finance
- Finance Report
- Bank Accounts
- School Fees
- Income & Expenses

## Teacher Filtering Logic

### Condition
```typescript
(user?.user_type === 'teacher' || user?.user_type === 'Teacher') && 
(!authState?.classes || authState.classes.length === 0)
```

### Filtered Items
- "Class Attendance" 
- "FormMaster Review"

### Implementation
```typescript
menuData = menuData.map(category => ({
  ...category,
  items: category.items?.filter(item => 
    item.label !== 'Class Attendance' && item.label !== 'FormMaster Review'
  ) || []
}));
```

## Fallback Menus

### Superadmin Fallback
```typescript
[{
  name: "Super Admin",
  items: [
    { key: "CREATE_SCHOOL", label: "Create School", link: "/school-setup/add-school" },
    { key: "SCHOOL_LIST", label: "School List", link: "/school-setup/school-list" },
    { key: "SUPPORT_DASHBOARD", label: "Support Dashboard", link: "/support/superadmin-dashboard" },
    { key: "QUEUE_DASHBOARD", label: "Queue Dashboard", link: "/superadmin/queues" }
  ]
}]
```

### Admin Fallback
```typescript
[{
  name: "Administration", 
  items: [
    { key: "ADMIN_DASHBOARD", label: "Admin Dashboard", link: "/admin-dashboard" },
    { key: "STUDENT_MANAGEMENT", label: "Student Management", link: "/students" },
    { key: "TEACHER_MANAGEMENT", label: "Teacher Management", link: "/teachers" },
    { key: "CLASS_MANAGEMENT", label: "Class Management", link: "/classes" },
    { key: "ACADEMIC_YEAR", label: "Academic Year", link: "/academic-year" },
    { key: "DATA_MANAGEMENT", label: "Data Management", link: "/data-management" },
    { key: "ATTENDANCE", label: "Attendance", link: "/attendance" },
    { key: "ASSESSMENTS", label: "Assessments", link: "/assessments" },
    { key: "FINANCE", label: "Finance", link: "/finance" },
    { key: "REPORTS", label: "Reports", link: "/reports" },
    { key: "SETTINGS", label: "Settings", link: "/settings" }
  ]
}]
```

## Cache Management

### Cache Key
```typescript
const CACHE_KEY = 'rbac_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Cache Structure
```typescript
{
  data: { permissions: {}, menu: [] },
  timestamp: Date.now(),
  userId: user.id
}
```

### Cache Clearing
- When teacher filtering applied: `localStorage.removeItem(CACHE_KEY)`
- On user change: Automatic via useEffect
- Manual refresh: `refreshPermissions()`

## Critical Notes

### DO NOT:
1. Remove the RBAC API call - it's working for admins
2. Change the fallback structure - it's the safety net
3. Modify the teacher filtering condition - it's precise
4. Remove cache management - it prevents API spam

### SAFE TO:
1. Add new menu items to fallbacks
2. Modify teacher filtering items list
3. Add new user type conditions
4. Adjust cache TTL

## Troubleshooting

### Admin Menu Missing
- Check if RBAC API is responding
- Verify fallback is triggered
- Check user.user_type value

### Teacher Filtering Not Working  
- Verify authState.classes is populated
- Check user.user_type matches condition
- Ensure cache is cleared

### Menu Not Loading
- Check _get function import
- Verify user object exists
- Check console for API errors

## Last Working State: 2025-12-23

This configuration successfully:
- ✅ Shows full admin menu via RBAC API
- ✅ Filters teacher menu based on class assignments  
- ✅ Provides fallbacks for all user types
- ✅ Maintains cache for performance
- ✅ Handles API errors gracefully
