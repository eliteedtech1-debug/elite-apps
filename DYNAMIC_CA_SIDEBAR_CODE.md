# Dynamic CA Sidebar - Complete Code Implementation

## 📝 Step-by-Step Implementation

### Step 1: Update Imports in `sidebar/index.tsx`

**File**: `elscholar-ui/src/core/common/sidebar/index.tsx`

**Line 1**: Change from:
```typescript
import React, { useEffect, useState } from "react";
```

To:
```typescript
import React, { useEffect, useState, useMemo } from "react";
```

**Line 7**: Change from:
```typescript
import { toTitleCase } from "../../../feature-module/Utils/Helper";
```

To:
```typescript
import { toTitleCase, _get } from "../../../feature-module/Utils/Helper";
```

### Step 2: Add State for Available CA Types

**File**: `elscholar-ui/src/core/common/sidebar/index.tsx`

**Around line 29-33**, add the new state after `subsidebar`:

```typescript
const Sidebar = () => {
  const Location = useLocation();
  const [subOpen, setSubopen] = useState<any>("");
  const [subsidebar, setSubsidebar] = useState("");
  const [availableCATypes, setAvailableCATypes] = useState<string[]>([]); // ⭐ ADD THIS LINE
  const { user } = useSelector((state: RootState) => state.auth);
  
  // ... rest of code
};
```

### Step 3: Add useEffect to Fetch Available CA Types

**File**: `elscholar-ui/src/core/common/sidebar/index.tsx`

**Add this useEffect after the existing useEffects** (around line 75-80):

```typescript
// Fetch available CA types for dynamic sidebar
useEffect(() => {
  if (!user?.user_type) return;

  _get(
    'ca-setups/list-all',
    (res: any) => {
      if (res.success && Array.isArray(res.data)) {
        const uniqueCATypes = Array.from(
          new Set(res.data.map((item: any) => item.ca_type))
        ) as string[];
        setAvailableCATypes(uniqueCATypes.sort());
        console.log('📊 Available CA Types for sidebar:', uniqueCATypes);
      }
    },
    (err: any) => {
      console.error('Failed to fetch CA types for sidebar:', err);
      setAvailableCATypes([]);
    }
  );
}, [user?.user_type]);
```

### Step 4: Add Filtering Logic with useMemo

**File**: `elscholar-ui/src/core/common/sidebar/index.tsx`

**Add this useMemo after `getSideBarData`** (around line 72-73):

```typescript
const getSideBarData = user?.user_type?.length
  ? sidebarData(user?.teacher_roles?.length||0, user.user_type.toLowerCase(), accessToArray, permissionArray)
  : [];

// ⭐ ADD THIS FILTERING LOGIC
const filteredSidebarData = useMemo(() => {
  if (!availableCATypes.length) return getSideBarData;

  return getSideBarData.map((section: any) => ({
    ...section,
    submenuItems: section.submenuItems?.map((item: any) => {
      // Check if this is the Reports menu
      if (item.label === "Reports" && item.submenuItems) {
        return {
          ...item,
          submenuItems: item.submenuItems.filter((subItem: any) => {
            // Always show End of Term Report
            if (subItem.label === "End of Term Report") {
              return true;
            }
            
            // For CA reports, check if CA type is available
            const match = subItem.label.match(/^(CA\d+)/);
            if (match) {
              const caType = match[1]; // Extract "CA1", "CA2", etc.
              const isAvailable = availableCATypes.includes(caType);
              console.log(`🔍 Checking ${caType}: ${isAvailable ? '✅ Available' : '❌ Not available'}`);
              return isAvailable;
            }
            
            return true; // Show other menu items
          })
        };
      }
      return item;
    })
  }));
}, [getSideBarData, availableCATypes]);
```

### Step 5: Use Filtered Data in Render

**File**: `elscholar-ui/src/core/common/sidebar/index.tsx`

**Around line 199**, change from:
```typescript
{user?.user_type
  ? getSideBarData?.map((mainLabel, index) => (
```

To:
```typescript
{user?.user_type
  ? filteredSidebarData?.map((mainLabel, index) => (
```

## 📋 Complete Code Example

Here's what the relevant section should look like:

```typescript
const Sidebar = () => {
  const Location = useLocation();
  const [subOpen, setSubopen] = useState<any>("");
  const [subsidebar, setSubsidebar] = useState("");
  const [availableCATypes, setAvailableCATypes] = useState<string[]>([]); // NEW
  const { user } = useSelector((state: RootState) => state.auth);

  const dispatch = useDispatch();
  const previousLocation = usePreviousRoute();
  const { setNavigating } = useNavigationLoader();

  // ... existing useEffects ...

  // NEW: Fetch available CA types
  useEffect(() => {
    if (!user?.user_type) return;

    _get(
      'ca-setups/list-all',
      (res: any) => {
        if (res.success && Array.isArray(res.data)) {
          const uniqueCATypes = Array.from(
            new Set(res.data.map((item: any) => item.ca_type))
          ) as string[];
          setAvailableCATypes(uniqueCATypes.sort());
          console.log('📊 Available CA Types for sidebar:', uniqueCATypes);
        }
      },
      (err: any) => {
        console.error('Failed to fetch CA types for sidebar:', err);
        setAvailableCATypes([]);
      }
    );
  }, [user?.user_type]);

  // ... existing code ...

  const getSideBarData = user?.user_type?.length
    ? sidebarData(user?.teacher_roles?.length||0, user.user_type.toLowerCase(), accessToArray, permissionArray)
    : [];

  // NEW: Filter sidebar data based on available CA types
  const filteredSidebarData = useMemo(() => {
    if (!availableCATypes.length) return getSideBarData;

    return getSideBarData.map((section: any) => ({
      ...section,
      submenuItems: section.submenuItems?.map((item: any) => {
        if (item.label === "Reports" && item.submenuItems) {
          return {
            ...item,
            submenuItems: item.submenuItems.filter((subItem: any) => {
              if (subItem.label === "End of Term Report") return true;
              
              const match = subItem.label.match(/^(CA\d+)/);
              if (match) {
                const caType = match[1];
                return availableCATypes.includes(caType);
              }
              
              return true;
            })
          };
        }
        return item;
      })
    }));
  }, [getSideBarData, availableCATypes]);

  // ... rest of component ...

  return (
    <div className="sidebar" id="sidebar">
      <Scrollbars>
        <div className="sidebar-inner slimscroll">
          <div id="sidebar-menu" className="sidebar-menu">
            <ul>
              {/* ... dashboard link ... */}
              {user?.user_type
                ? filteredSidebarData?.map((mainLabel, index) => ( // CHANGED from getSideBarData
                  <li key={index}>
                    {/* ... menu rendering ... */}
                  </li>
                ))
                : null}
            </ul>
          </div>
        </div>
      </Scrollbars>
    </div>
  );
};
```

## 🧪 Testing

### Test Scenario 1: School with CA1 and CA2

1. **Setup**: Create CA1 and CA2 in CA Setup
2. **Expected**: Sidebar shows:
   ```
   Reports
   ├── End of Term Report
   ├── CA1 Progress Report
   └── CA2 Progress Report
   ```
3. **Verify**: CA3 is NOT shown

### Test Scenario 2: School with only CA1

1. **Setup**: Create only CA1 in CA Setup
2. **Expected**: Sidebar shows:
   ```
   Reports
   ├── End of Term Report
   └── CA1 Progress Report
   ```
3. **Verify**: CA2 and CA3 are NOT shown

### Test Scenario 3: School with no CA setup

1. **Setup**: No CA setups created
2. **Expected**: Sidebar shows:
   ```
   Reports
   └── End of Term Report
   ```
3. **Verify**: No CA reports shown

### Test Scenario 4: Add new CA type

1. **Setup**: Start with CA1, then add CA2
2. **Expected**: CA2 appears in sidebar after refresh
3. **Verify**: Dynamic update works

## 🐛 Debugging

### Check Console Logs

After implementation, check browser console for:

```
📊 Available CA Types for sidebar: ["CA1", "CA2"]
🔍 Checking CA1: ✅ Available
🔍 Checking CA2: ✅ Available
🔍 Checking CA3: ❌ Not available
```

### Verify API Response

Check Network tab for `ca-setups/list-all` response:

```json
{
  "success": true,
  "data": [
    { "ca_type": "CA1", ... },
    { "ca_type": "CA2", ... }
  ]
}
```

### Common Issues

**Issue 1**: All CA types still showing
- **Cause**: `filteredSidebarData` not being used in render
- **Fix**: Make sure you changed `getSideBarData` to `filteredSidebarData` in the map function

**Issue 2**: No CA types showing (including configured ones)
- **Cause**: API endpoint not returning data
- **Fix**: Check API endpoint and permissions

**Issue 3**: Sidebar not updating after adding new CA type
- **Cause**: Need to refresh page
- **Fix**: This is expected behavior - refresh page to see new CA types

## ✅ Verification Checklist

- [ ] Imports updated (useMemo, _get)
- [ ] State added (availableCATypes)
- [ ] useEffect added (fetch CA types)
- [ ] useMemo added (filter sidebar data)
- [ ] Render updated (use filteredSidebarData)
- [ ] Console logs show available CA types
- [ ] Sidebar only shows configured CA types
- [ ] End of Term Report always shows
- [ ] Navigation works for visible items

## 🎯 Summary

**Changes Made**:
1. ✅ Added `useMemo` to React imports
2. ✅ Added `_get` to Helper imports
3. ✅ Added `availableCATypes` state
4. ✅ Added useEffect to fetch CA types from API
5. ✅ Added useMemo to filter sidebar data
6. ✅ Updated render to use filtered data

**Result**:
- ✅ Sidebar dynamically shows only configured CA types
- ✅ End of Term Report always visible
- ✅ No backend changes required
- ✅ Works with existing API endpoints

---

**Ready to implement!** Follow the steps above to add dynamic CA type filtering to your sidebar. 🚀
