# Role Inheritance - Correct Understanding

## ✅ Correct Behavior

### **Role Inheritance Purpose**

**Inheritance is for ROLE MANAGEMENT, not MENU ACCESS**

```javascript
// Role Inheritance Table
child_role: 'exam_officer'
parent_role: 'vp_academic'

// Purpose: When creating exam_officer role, copy permissions from vp_academic
// This minimizes clicks during role setup
```

### **Menu Fetching Logic**

**Use PRIMARY role ONLY, ignore inherited roles**

```javascript
// User assigned role
user_type: "exam_officer"

// Inherited roles (from role_inheritance table)
inherited_from: ["vp_academic", "teacher"]

// ❌ WRONG: Fetch menu for all roles
userRoles: ["exam_officer", "vp_academic", "teacher"]  // Shows too much!

// ✅ CORRECT: Fetch menu for PRIMARY role only
userRoles: ["exam_officer"]  // Shows only exam_officer menu
```

## 🎯 Implementation

### **Backend: rbacController.js**

```javascript
// OLD (Wrong - includes inherited roles)
const allRolesWithInheritance = [...allUserRoles];
for (const role of allUserRoles) {
  const inheritedRoles = await db.sequelize.query(
    `SELECT parent_role FROM role_inheritance WHERE child_role = ?`,
    { replacements: [role] }
  );
  allRolesWithInheritance.push(...inheritedRoles.map(r => r.parent_role));
}
const allRoles = [...new Set(allRolesWithInheritance)];

// NEW (Correct - primary role only)
const primaryRole = effectiveUserType; // User's actual assigned role
const allRoles = [primaryRole]; // Use ONLY primary role for menu query
```

### **When to Use Inheritance**

| Operation | Use Inheritance? | Why |
|-----------|------------------|-----|
| **Creating new role** | ✅ YES | Copy permissions from parent role (saves time) |
| **Editing role permissions** | ✅ YES | Inherit base permissions, add specific ones |
| **Fetching user menu** | ❌ NO | Show only what user's PRIMARY role allows |
| **Checking permissions** | ❌ NO | Check PRIMARY role only |
| **Role assignment** | ✅ YES | Understand role hierarchy |

## 📋 Example Scenarios

### **Scenario 1: Exam Officer**
```javascript
// User assigned
user_type: "exam_officer"

// Inheritance (for role management)
exam_officer inherits from: ["vp_academic", "teacher"]

// Menu query (PRIMARY role only)
SELECT * FROM rbac_menu_items 
WHERE user_type = 'exam_officer'  // ✅ Only exam_officer

// NOT this:
WHERE user_type IN ('exam_officer', 'vp_academic', 'teacher')  // ❌ Wrong!
```

### **Scenario 2: Form Master**
```javascript
// User assigned
user_type: "form_master"

// Inheritance (for role management)
form_master inherits from: ["teacher"]

// Menu query (PRIMARY role only)
SELECT * FROM rbac_menu_items 
WHERE user_type = 'form_master'  // ✅ Only form_master

// Result: Shows form master specific features only
// Does NOT show all teacher features
```

### **Scenario 3: Creating New Role**
```javascript
// Admin creates "senior_teacher" role
// Selects: "Inherit from: teacher"

// System copies all teacher permissions to senior_teacher
// Then admin adds senior-specific permissions

// When senior_teacher user logs in:
// Menu shows: senior_teacher permissions ONLY
// Does NOT show: teacher permissions
```

## 🔧 Code Changes

### **File: elscholar-api/src/controllers/rbacController.js**

**Line ~277-310: Remove role inheritance loop**

```javascript
// REMOVE THIS ENTIRE BLOCK
try {
  for (const role of allUserRoles) {
    const inheritedRoles = await db.sequelize.query(
      `SELECT parent_role FROM role_inheritance WHERE child_role = ?`,
      { replacements: [role] }
    );
    allRolesWithInheritance.push(...inheritedRoles.map(r => r.parent_role));
  }
} catch (inheritanceError) {
  console.warn('Role inheritance query failed');
}

// REPLACE WITH
const primaryRole = effectiveUserType;
const allRoles = [primaryRole];
console.log('🔍 Using PRIMARY role only for menu:', primaryRole);
```

## ✅ Expected Results

### **Before Fix:**
```json
{
  "user_type": "exam_officer",
  "userRoles": ["exam_officer", "vp_academic", "teacher"],
  "totalMenuItems": 150  // Too many!
}
```

### **After Fix:**
```json
{
  "user_type": "exam_officer",
  "userRoles": ["exam_officer"],
  "totalMenuItems": 45  // Correct amount
}
```

## 📝 Summary

**Role Inheritance:**
- ✅ Used for role creation/management (copy permissions)
- ✅ Minimizes clicks when setting up new roles
- ❌ NOT used for menu fetching
- ❌ NOT used for permission checks

**Menu Access:**
- ✅ Based on PRIMARY role only
- ✅ User sees only what their assigned role allows
- ❌ Does NOT include inherited role menus

---

**Updated:** 2026-02-27  
**Priority:** CRITICAL (affects all users)
