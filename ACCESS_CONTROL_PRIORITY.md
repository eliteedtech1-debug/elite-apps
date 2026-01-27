# Access Control Priority System

**Date:** 2026-01-16  
**Critical:** Subscription Plan > Role Access

---

## Access Control Hierarchy (Priority Order)

### 1️⃣ **SUBSCRIPTION PLAN** (Highest Priority)
**Controls:** Which features/modules the school can access
**Enforcement:** At menu rendering and API endpoint level

```
Starter Plan → Basic features only
Standard Plan → Standard features
Premium Plan → Premium features
Elite Plan → All features
```

**Rule:** Even if a user's role has access to a feature, if the school's plan doesn't include it, access is DENIED.

---

### 2️⃣ **ROLE-BASED ACCESS** (Secondary Priority)
**Controls:** Which features within the school's plan a user can access
**Enforcement:** After plan check passes

```
Admin → All features in school's plan
Teacher → Teaching features in school's plan
Accountant → Financial features in school's plan
```

**Rule:** User can only access features that BOTH their plan includes AND their role permits.

---

### 3️⃣ **INDIVIDUAL PERMISSIONS** (Lowest Priority)
**Controls:** Additional specific menu items granted to individual users
**Enforcement:** After plan and role checks pass

**Rule:** Extra permissions can be granted, but still limited by plan.

---

## Access Decision Flow

```
User requests feature
    ↓
1. Check School's Subscription Plan
    ├─ Feature NOT in plan? → ❌ HIDE (don't show at all)
    └─ Feature in plan? → Continue
        ↓
2. Check User's Role Access
    ├─ Role doesn't have access? → ❌ HIDE (don't show at all)
    └─ Role has access? → Continue
        ↓
3. Check Individual Permissions (optional)
    ├─ Has individual grant? → ✅ SHOW
    └─ No individual grant? → Use role default
        ↓
    ✅ SHOW & ALLOW ACCESS
```

**Important:** Never show locked/disabled features. Only render menu items the user can actually use.

---

## Implementation Points

### Frontend (Menu Rendering)
```javascript
// Priority 1: Check plan - HIDE if not in plan
if (!schoolPlan.includes(menuItem.package_id)) {
  return null; // DON'T RENDER - user can't use it
}

// Priority 2: Check role - HIDE if role doesn't have access
if (!userRoles.some(role => menuItem.allowedRoles.includes(role))) {
  return null; // DON'T RENDER - user can't use it
}

// Priority 3: Check individual access (optional boost)
if (userIndividualAccess.includes(menuItem.id)) {
  return <MenuItem />; // SHOW - user has access
}

return <MenuItem />; // SHOW - user has access via role
```

**No locked icons, no disabled states, no "upgrade to unlock" badges in the menu.**
**Only show what they can touch.**

### Backend (API Endpoints)
```javascript
// Priority 1: Check plan
const schoolPlan = await getSchoolPlan(school_id);
if (!schoolPlan.features.includes(requiredFeature)) {
  return res.status(403).json({ 
    error: 'Feature not available in your plan',
    upgrade: true 
  });
}

// Priority 2: Check role
if (!userRoles.includes(requiredRole)) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}

// Allow access
next();
```

---

## Current Tables

### `rbac_school_packages`
- Links school to subscription plan
- **This is the PRIMARY access control**

### `rbac_menu_packages`
- Links menu items to required package tier
- Used to filter menu based on school's plan

### `rbac_menu_access`
- Links menu items to roles
- **Secondary filter** after plan check

### `user_menu_access`
- Individual menu grants
- **Tertiary boost** after plan and role checks

---

## Key Principle

**"You can't give what you don't have"**

- School on Starter plan? → Users can't access Premium features, regardless of role
- School on Premium plan? → Users can access Premium features IF their role permits
- Individual grants? → Can't grant access to features outside school's plan

---

## Migration Priority

When assigning role access (like we just did), remember:
1. ✅ Assign roles to menu items (what we did)
2. ✅ Assign menu items to package tiers (already done)
3. ✅ Schools subscribe to packages (already done)

**Result:** 
- Admin role has access to 133 items
- BUT if school is on Starter plan, they only see Starter-tier items
- Role access is the "maximum possible", plan is the "actual limit"

---

## Example Scenarios

### Scenario 1: Teacher on Elite Plan School
- School Plan: Elite (all features) ✅
- User Role: Teacher (54 items) ✅
- Result: Can access 54 teaching items

### Scenario 2: Admin on Starter Plan School
- School Plan: Starter (basic features only) ❌
- User Role: Admin (133 items) ✅
- Result: Can only access ~20 Starter-tier items (plan limits admin)

### Scenario 3: Accountant on Standard Plan School
- School Plan: Standard (standard features) ✅
- User Role: Accountant (23 financial items) ✅
- Result: Can access financial items included in Standard plan (~15 items)

---

## Action Items

### ✅ Already Implemented
1. Package-based menu filtering
2. Role-based access control
3. School-to-package linking

### 🔄 Needs Verification
1. Ensure frontend checks plan BEFORE role
2. Ensure API middleware checks plan BEFORE role
3. **Remove any "locked" or "disabled" UI states**
4. **Only render menu items user can actually access**
5. **Upgrade prompts only on settings/billing page, not in navigation**

### 📝 Documentation
1. Update API docs with access priority
2. Update frontend components with plan checks
3. Add upgrade flow for blocked features

---

**Critical Reminder:** 
🔒 **PLAN > ROLE > INDIVIDUAL**

Always check subscription plan first, then role, then individual permissions.
