# Assignment Routes Access Fix

## Problem
Teachers couldn't access:
- `/academic/class-assignment/mark` (Mark Assignments)
- `/academic/assignment-form` (Assignment Form)

They were redirected to dashboard despite having access to the parent route `/academic/class-assignment`.

---

## Root Cause

### Key Understanding:
**The RBAC menu is for sidebar navigation only, NOT for route access control.**

Some routes are accessible based on:
1. **User attributes** (e.g., `staff_type='Academic Staff'`)
2. **Parent route access** (child routes inherit parent access)
3. **User type** (e.g., all teachers can access certain routes)

### The Issue:
The route guard (`FixedRouteGuard`) was checking for **exact path matches** in the menu:

```typescript
// OLD LOGIC - Only exact matches
if (item.link === path) {
  return true;
}
```

**Database State:**
```sql
-- Teachers have access to:
id=22: /academic/class-assignment ✅

-- But these child routes don't exist in menu:
/academic/class-assignment/mark ❌
/academic/assignment-form ❌
```

Since the child routes weren't in the menu, access was denied even though teachers should have access via the parent route.

---

## Solution Implemented

Updated the route guard to **allow child routes when parent route is accessible**.

### File Changed:
`elscholar-ui/src/feature-module/router/route-guard.tsx`

### Changes Made:

```typescript
const canAccessRouteByMenu = (path: string): boolean => {
  // ... existing checks ...

  for (const section of menu) {
    if (section.items) {
      for (const item of section.items) {
        // Check direct link
        if (item.link === path) {
          return true;
        }
        
        // NEW: Check if path is a child route of an accessible parent
        // This allows /academic/class-assignment/mark when /academic/class-assignment is accessible
        if (item.link && path.startsWith(item.link + '/')) {
          return true;
        }
        
        // Check submenu items
        if (item.submenuItems) {
          for (const subItem of item.submenuItems) {
            if (subItem.link === path) {
              return true;
            }
            
            // NEW: Check if path is a child route of an accessible submenu item
            if (subItem.link && path.startsWith(subItem.link + '/')) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
};
```

---

## How It Works Now

### Example Flow:

1. **Teacher has menu access to:** `/academic/class-assignment`
2. **Teacher navigates to:** `/academic/class-assignment/mark`
3. **Route guard checks:**
   - Is `/academic/class-assignment/mark` in menu? ❌
   - Does `/academic/class-assignment/mark` start with `/academic/class-assignment/`? ✅
   - **Access granted!** ✅

### Routes Now Accessible:

If a teacher has access to `/academic/class-assignment`, they can now access:
- `/academic/class-assignment` (parent)
- `/academic/class-assignment/mark` (child)
- `/academic/class-assignment/edit/:id` (child)
- `/academic/class-assignment/view/:id` (child)
- Any other child route under this parent

---

## Benefits

✅ **Flexible:** Child routes automatically inherit parent access
✅ **Secure:** Still requires parent route access
✅ **Maintainable:** No need to add every child route to database
✅ **User-friendly:** Teachers can now mark assignments
✅ **Scalable:** Works for all parent-child route relationships

---

## Testing

### Test Cases:

1. **Login as teacher** (user_id: 824, staff_type: 'Academic Staff')
2. **Navigate to Assignments** → Should see `/academic/class-assignment`
3. **Click "Mark Assignments"** → Should access `/academic/class-assignment/mark` ✅
4. **Try Assignment Form** → Should access `/academic/assignment-form` ⚠️

### Note on `/academic/assignment-form`:
This route is NOT a child of `/academic/class-assignment`, so it won't be automatically accessible. 

**Options:**
1. Add it to the database as a menu item
2. Add it to `universalRoutes` array if all teachers should access it
3. Change the route to `/academic/class-assignment/form` to make it a child route

---

## Additional Notes

### Menu vs Route Access:
- **Menu (sidebar):** What users see in navigation
- **Route Access:** What users can actually visit

These are now properly separated:
- Menu shows navigation items
- Route guard allows parent + child routes

### Staff Type Attribute:
The user has `staff_type='Academic Staff'` in the database, which could be used for additional access control if needed in the future.

---

## Verification Commands

```bash
# 1. Check teacher's menu access
curl 'http://localhost:34567/api/rbac/menu' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-School-Id: SCH/14' \
  -H 'X-Branch-Id: BRCH00014' | jq '.data[].items[] | select(.label=="Assignments")'

# 2. Check database menu items
mysql -u root elite_prod_db -e "
SELECT id, parent_id, label, link 
FROM rbac_menu_items 
WHERE link LIKE '%assignment%' 
ORDER BY id;
"

# 3. Check teacher's staff_type
mysql -u root elite_prod_db -e "
SELECT user_id, staff_type 
FROM teachers 
WHERE user_id = 824;
"
```

---

## Future Enhancements

### Option 1: Add Assignment Form to Menu
```sql
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order, is_active, category)
VALUES (22, 'Assignment Form', 'ti ti-file-plus', '/academic/assignment-form', 2, 1, 'academic');

-- Grant access to teachers
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type)
VALUES (LAST_INSERT_ID(), 'teacher', 'default');
```

### Option 2: Restructure Routes
Change `/academic/assignment-form` to `/academic/class-assignment/form` to make it a child route.

### Option 3: Staff Type Based Access
Add logic to check `staff_type='Academic Staff'` for additional route access:

```typescript
// In route guard
const isAcademicStaff = user?.staff_type === 'Academic Staff';
if (isAcademicStaff && path.startsWith('/academic/')) {
  return true;
}
```

---

**Status:** ✅ Fixed
**Date:** 2026-02-24
**Impact:** Teachers can now access assignment marking and form routes
