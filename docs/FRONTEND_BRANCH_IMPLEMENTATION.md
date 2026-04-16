# 📚 Current Frontend Implementation Analysis

## How Branch Management Works Now

### 1. **Helper.tsx - Header Creation**

```typescript
// Priority order for headers:
function createHeaders() {
  const headers = {};
  
  // 1. Get school context
  const schoolContext = getSchoolContext();
  
  // 2. School ID - ALWAYS from user
  headers["X-School-Id"] = schoolContext.school_id;
  
  // 3. Branch ID - Priority order:
  //    a) Redux selected_branch (admin choice)
  //    b) User's branch_id (regular users)
  //    c) Auto-select first branch (admin fallback)
  if (schoolContext.branch_id) {
    headers["X-Branch-Id"] = schoolContext.branch_id;
  }
  
  return headers;
}

function getSchoolContext() {
  const reduxState = window.__REDUX_STATE__;
  const user = reduxState?.auth?.user;
  const isAdmin = isSchoolGroupAdmin(user);
  
  // Branch ID priority:
  // 1. Redux selected_branch (admin's current choice)
  if (reduxState?.auth?.selected_branch?.branch_id) {
    return reduxState.auth.selected_branch.branch_id;
  }
  
  // 2. User's assigned branch (regular users)
  if (!isAdmin && user?.branch_id) {
    return user.branch_id;
  }
  
  // 3. localStorage fallback
  const storedBranchId = getBranchId();
  if (storedBranchId) return storedBranchId;
  
  // 4. Auto-select first branch for admin
  if (isAdmin && schoolLocations.length > 0) {
    const firstBranch = schoolLocations[0];
    localStorage.setItem('branch_id', firstBranch.branch_id);
    return firstBranch.branch_id;
  }
  
  return ""; // Empty for admin without branch
}
```

### 2. **BranchSelector Component**

```typescript
// Redux action
const handleBranchChange = (branchId) => {
  const selectedBranchData = branches.find(b => b.branch_id === branchId);
  
  // Update Redux state
  dispatch(setSelectedBranch(selectedBranchData));
  
  // Automatically fetches academic years for new branch
  // Headers automatically updated via getSchoolContext()
};

// On mount - restore saved branch
useEffect(() => {
  if (isAdmin && !selected_branch) {
    const savedBranch = localStorage.getItem('selected_branch');
    if (savedBranch) {
      dispatch(setSelectedBranch(JSON.parse(savedBranch)));
    }
  }
}, []);

// Auto-select first branch if admin has none
useEffect(() => {
  if (isAdmin && !selected_branch && branches.length > 0) {
    dispatch(setSelectedBranch(branches[0]));
  }
}, [branches]);
```

### 3. **Redux State Structure**

```typescript
auth: {
  user: {
    id: 1208,
    school_id: "SCH/23",
    branch_id: null,  // NULL for admin
    user_type: "branchadmin"
  },
  selected_branch: {
    branch_id: "BRCH/29",
    branch_name: "Main Campus",
    school_id: "SCH/23"
  },
  school_locations: [
    { branch_id: "BRCH/29", branch_name: "Main Campus" },
    { branch_id: "BRCH/30", branch_name: "Branch 2" }
  ]
}
```

---

## 🎯 How It Works

### For Regular Users (Teacher, Student, Parent):
1. `user.branch_id` is set (e.g., "BRCH/29")
2. Headers always use `user.branch_id`
3. Cannot change branch
4. BranchSelector shows read-only display

### For Admin Users:
1. `user.branch_id` is NULL
2. On login: Auto-selects first branch → `selected_branch`
3. BranchSelector dropdown shown
4. On change:
   - Updates `selected_branch` in Redux
   - Saves to localStorage
   - Headers automatically use new `selected_branch.branch_id`
   - **NO token refresh needed!**
5. All subsequent API calls use new branch

---

## 🔄 Branch Switching Flow

```
Admin logs in
    ↓
Token: { school_id: "SCH/23", branch_id: null }
    ↓
Frontend auto-selects first branch
    ↓
Redux: selected_branch = { branch_id: "BRCH/29" }
localStorage: selected_branch = "BRCH/29"
    ↓
API calls: X-Branch-Id: BRCH/29
    ↓
Admin switches to Branch 2
    ↓
Redux: selected_branch = { branch_id: "BRCH/30" }
localStorage: selected_branch = "BRCH/30"
    ↓
API calls: X-Branch-Id: BRCH/30
    ↓
NO token refresh! Just header change
```

---

## 🔐 Security Implementation

### Current Behavior:
```typescript
// Headers sent:
X-School-Id: SCH/20  // From request
Authorization: Bearer <token with SCH/23>  // From token

// Backend receives:
req.user.school_id = "SCH/23"  // From JWT
req.headers['x-school-id'] = "SCH/20"  // From header

// ⚠️ MISMATCH! Security issue!
```

### What Backend Should Do:
```javascript
// ALWAYS use token school_id
const school_id = req.user.school_id;  // SCH/23 (from JWT)

// Ignore header school_id (or validate it matches)
if (req.headers['x-school-id'] !== req.user.school_id) {
  return res.status(403).json({ 
    error: 'School ID mismatch' 
  });
}

// Branch ID - flexible (header > token)
const branch_id = req.headers['x-branch-id'] || req.user.branch_id;
```

---

## ✅ What's Working Well

1. **Branch Switching** - Instant, no re-login
2. **State Management** - Redux + localStorage sync
3. **Auto-Selection** - First branch for admin
4. **Persistence** - Survives page refresh
5. **Academic Year Sync** - Auto-fetches on branch change

---

## ⚠️ Current Issues

### 1. School ID Mismatch
```
Token says: SCH/23
Header says: SCH/20
Backend uses: ??? (inconsistent)
```

**Fix:** Backend should ALWAYS use `req.user.school_id`

### 2. Validation Error
```
POST /api/v2/lessons
Error: "school_id" is not allowed
```

**Cause:** Joi validator rejects `school_id` added by controller

**Fix:** Update validator to allow `school_id` or remove from validation

---

## 🎯 Recommended Backend Changes

### 1. Update All Controllers
```javascript
const filters = {
  school_id: req.user.school_id,  // ALWAYS from token
  branch_id: req.headers['x-branch-id'] || req.user.branch_id || null,
  // ...
};
```

### 2. Update Validators
```javascript
// Don't validate school_id/branch_id (added by controller)
const lessonCreateSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  // ... other fields
  // NO school_id or branch_id here
});
```

### 3. Add Security Middleware (Optional)
```javascript
const validateSchoolContext = (req, res, next) => {
  // Validate header matches token (if provided)
  if (req.headers['x-school-id'] && 
      req.headers['x-school-id'] !== req.user.school_id) {
    return res.status(403).json({ 
      error: 'Cannot access different school data' 
    });
  }
  next();
};
```

---

## 📊 Summary

### Frontend (Already Working):
- ✅ Branch switching via Redux
- ✅ Headers automatically updated
- ✅ No token refresh needed
- ✅ Persists across page refresh

### Backend (Needs Update):
- ❌ Use `req.user.school_id` (not header)
- ❌ Use `req.headers['x-branch-id']` (priority over token)
- ❌ Fix Joi validators
- ❌ Add security validation

---

**Next Step:** Update backend controllers and validators to match frontend implementation.
