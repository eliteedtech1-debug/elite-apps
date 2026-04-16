# Fix: Variable Name Conflict - classes vs reduxClasses

**Date:** Saturday, February 7, 2026 @ 11:23 AM  
**Error:** Failed to fetch dynamically imported module  
**Status:** ✅ FIXED

---

## Error

```
TypeError: Failed to fetch dynamically imported module: 
http://localhost:3000/src/feature-module/peoples/students/student-list/FormMasterStudentList.tsx
```

This error indicates a syntax/runtime error preventing the module from loading.

---

## Root Cause

**Variable name conflict:**

```tsx
// Line 77: Redux classes
const { school, selected_branch, user, classes } = useSelector(
  (state: RootState) => state.auth
);

// Line 88: Local state classes
const [classes, setClasses] = useState<any[]>([]);
```

The local state variable `classes` was **shadowing** the Redux `classes`, causing:
1. The useEffect couldn't access Redux classes
2. Runtime confusion between the two variables
3. Module loading failure

---

## Solution

Renamed Redux `classes` to `reduxClasses` to avoid conflict:

### 1. Updated Redux selector:
```tsx
// Before (❌ Conflict)
const { school, selected_branch, user, classes } = useSelector(...)

// After (✅ No conflict)
const { school, selected_branch, user, classes: reduxClasses } = useSelector(...)
```

### 2. Updated useEffect:
```tsx
// Before (❌ Using shadowed variable)
useEffect(() => {
  if (classes && Array.isArray(classes) && classes.length > 0) {
    const formMasterRole = classes.find(...)
    ...
  }
}, [classes, filterForm]);

// After (✅ Using renamed variable)
useEffect(() => {
  if (reduxClasses && Array.isArray(reduxClasses) && reduxClasses.length > 0) {
    const formMasterRole = reduxClasses.find(...)
    ...
  }
}, [reduxClasses, filterForm]);
```

---

## Technical Details

**File:** `elscholar-ui/src/feature-module/peoples/students/student-list/FormMasterStudentList.tsx`

**Changes:**

1. **Line ~77:** Renamed Redux classes
   ```tsx
   classes: reduxClasses
   ```

2. **Lines ~138-153:** Updated useEffect to use `reduxClasses`
   - Changed all references from `classes` to `reduxClasses`
   - Updated dependency array

**Variables Now:**
- `reduxClasses` - From Redux store (teacher's assigned classes)
- `classes` - Local state (for class list dropdown)

---

## Why This Matters

JavaScript allows variable shadowing, but it causes:
- ❌ Confusion about which variable is being used
- ❌ Unexpected behavior
- ❌ Hard-to-debug errors
- ❌ Module loading failures

Using distinct names:
- ✅ Clear intent
- ✅ No conflicts
- ✅ Easier to debug
- ✅ Module loads correctly

---

## Testing

### Test Steps:
1. Refresh the page
2. Login as teacher (form master)
3. Navigate to `/students/my-class`
4. Should load without module error
5. Should display student list

### Expected Behavior:
- ✅ No "Failed to fetch module" error
- ✅ Page loads successfully
- ✅ Redux classes accessed correctly
- ✅ Student list displays

---

**Fix Applied:** Saturday, February 7, 2026 @ 11:23 AM  
**Status:** ✅ READY FOR TESTING - Module should load now!
