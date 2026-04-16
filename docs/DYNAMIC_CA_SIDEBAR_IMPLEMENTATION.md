# Dynamic CA Types in Sidebar - Implementation Guide

## 🎯 Objective

Show only the CA report types that are actually configured for the school in the sidebar menu.

**Example**:
- If school has CA1 and CA2 configured → Show only CA1 and CA2 in sidebar
- If school has CA1, CA2, CA3 configured → Show CA1, CA2, CA3 in sidebar
- End of Term Report is always shown

## 🔍 Current State

**Problem**: The sidebar currently shows all CA types (CA1, CA2, CA3) regardless of whether they're configured for the school.

**Current Sidebar** (`sidebarData.tsx`):
```typescript
{
  label: "Reports",
  submenuItems: [
    { label: "End of Term Report", link: "/academic/reports/Exam" },
    { label: "CA1 Progress Report", link: "/academic/reports/CA1" }, // Always shown
    { label: "CA2 Progress Report", link: "/academic/reports/CA2" }, // Always shown
    { label: "CA3 Progress Report", link: "/academic/reports/CA3" }, // Always shown
  ]
}
```

## ✅ Solution Approach

### Option 1: Dynamic Sidebar Data (Recommended)

Make `sidebarData` a function that accepts available CA types and generates menu dynamically.

#### Step 1: Update `sidebarData.tsx`

```typescript
// Add this helper function at the top
const generateReportSubmenuItems = (availableCATypes: string[] = []) => {
  const submenuItems: any[] = [];

  // Always include End of Term Report
  submenuItems.push({
    label: "End of Term Report",
    icon: "fa fa-award",
    link: "/academic/reports/Exam",
    requiredPermissions: [
      "Report Sheets Generator",
      "admin",
      "branchadmin",
      "exam_officer",
    ],
  });

  // Add CA reports based on what's available
  availableCATypes.forEach((caType) => {
    submenuItems.push({
      label: `${caType} Progress Report`,
      icon: "fa fa-clipboard-check",
      link: `/academic/reports/${caType}`,
      requiredPermissions: [
        "Report Sheets Generator",
        "admin",
        "branchadmin",
        "exam_officer",
      ],
    });
  });

  return submenuItems;
};

// Update the Reports menu item
{
  label: "Reports",
  icon: "fa fa-file-alt",
  submenu: true,
  submenuOpen: false,
  submenuHdr: "Assessment Reports",
  requiredPermissions: [
    "Report Sheets Generator",
    "admin",
    "branchadmin",
    "exam_officer",
  ],
  submenuItems: generateReportSubmenuItems(availableCATypes), // Dynamic!
}
```

#### Step 2: Update `sidebar/index.tsx`

```typescript
import { _get } from '../../../feature-module/Utils/Helper';

const Sidebar = () => {
  // ... existing code ...
  const [availableCATypes, setAvailableCATypes] = useState<string[]>([]);

  // Fetch available CA types on mount
  useEffect(() => {
    const fetchCATypes = async () => {
      try {
        const response = await new Promise<any>((resolve, reject) => {
          _get(
            'ca-setups/list-all',
            (res: any) => resolve(res),
            (err: any) => reject(err)
          );
        });

        if (response.success && Array.isArray(response.data)) {
          const uniqueCATypes = Array.from(
            new Set(response.data.map((item: any) => item.ca_type))
          ) as string[];
          setAvailableCATypes(uniqueCATypes.sort());
        }
      } catch (error) {
        console.error('Failed to fetch CA types:', error);
      }
    };

    if (user?.user_type) {
      fetchCATypes();
    }
  }, [user?.user_type]);

  // Pass availableCATypes to sidebarData
  const getSideBarData = user?.user_type?.length
    ? sidebarData(
        user?.teacher_roles?.length || 0,
        user.user_type.toLowerCase(),
        accessToArray,
        permissionArray,
        availableCATypes // Pass CA types
      )
    : [];
};
```

#### Step 3: Update `sidebarData` function signature

```typescript
const sidebarData = (
  teacherRolesLength: number,
  userType: string,
  accessToArray: string[],
  permissionArray: string[],
  availableCATypes: string[] = [] // New parameter
) => {
  // ... existing code ...
};
```

### Option 2: Client-Side Filtering (Simpler)

Filter menu items in the sidebar component after rendering.

#### Update `sidebar/index.tsx`

```typescript
const Sidebar = () => {
  // ... existing code ...
  const [availableCATypes, setAvailableCATypes] = useState<string[]>([]);

  // Fetch available CA types
  useEffect(() => {
    // ... fetch logic from Option 1 ...
  }, [user?.user_type]);

  // Filter sidebar data to only show available CA types
  const filteredSidebarData = useMemo(() => {
    return getSideBarData.map((section: any) => {
      return {
        ...section,
        submenuItems: section.submenuItems?.map((item: any) => {
          // If this is the Reports menu
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
                  const caType = match[1];
                  return availableCATypes.includes(caType);
                }
                
                return true;
              })
            };
          }
          return item;
        })
      };
    });
  }, [getSideBarData, availableCATypes]);

  // Use filteredSidebarData instead of getSideBarData in render
};
```

### Option 3: API Endpoint (Most Robust)

Create a backend endpoint that returns sidebar configuration based on school's CA setup.

#### Backend Endpoint

```javascript
// GET /api/sidebar/menu-config
router.get('/sidebar/menu-config', async (req, res) => {
  const schoolId = req.user.school_id;
  
  // Fetch available CA types for this school
  const caSetups = await CASetup.findAll({
    where: { school_id: schoolId },
    attributes: ['ca_type'],
    group: ['ca_type']
  });
  
  const availableCATypes = caSetups.map(setup => setup.ca_type);
  
  res.json({
    success: true,
    data: {
      availableCATypes,
      // ... other menu config
    }
  });
});
```

#### Frontend

```typescript
const Sidebar = () => {
  const [menuConfig, setMenuConfig] = useState<any>(null);

  useEffect(() => {
    _get(
      'sidebar/menu-config',
      (res) => {
        if (res.success) {
          setMenuConfig(res.data);
        }
      },
      (err) => console.error('Failed to fetch menu config:', err)
    );
  }, []);

  // Use menuConfig.availableCATypes to filter menu
};
```

## 📊 Comparison

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| **Option 1: Dynamic Sidebar Data** | Clean, maintainable | Requires updating sidebarData function | Medium |
| **Option 2: Client-Side Filtering** | Simple, no backend changes | Filtering logic in component | Low |
| **Option 3: API Endpoint** | Most robust, centralized | Requires backend changes | High |

## 🎯 Recommended Approach

**Option 2: Client-Side Filtering** is recommended because:
1. ✅ Simple to implement
2. ✅ No backend changes needed
3. ✅ Uses existing API (`ca-setups/list-all`)
4. ✅ Easy to test and debug
5. ✅ Can be implemented quickly

## 🚀 Implementation Steps (Option 2)

### Step 1: Add State for Available CA Types

```typescript
// In sidebar/index.tsx
const [availableCATypes, setAvailableCATypes] = useState<string[]>([]);
```

### Step 2: Fetch Available CA Types

```typescript
useEffect(() => {
  if (!user?.user_type) return;

  _get(
    'ca-setups/list-all',
    (res) => {
      if (res.success && Array.isArray(res.data)) {
        const uniqueCATypes = Array.from(
          new Set(res.data.map((item: any) => item.ca_type))
        ) as string[];
        setAvailableCATypes(uniqueCATypes.sort());
      }
    },
    (err) => console.error('Failed to fetch CA types:', err)
  );
}, [user?.user_type]);
```

### Step 3: Filter Sidebar Data

```typescript
const filteredSidebarData = useMemo(() => {
  if (!availableCATypes.length) return getSideBarData;

  return getSideBarData.map((section: any) => ({
    ...section,
    submenuItems: section.submenuItems?.map((item: any) => {
      if (item.label === "Reports" && item.submenuItems) {
        return {
          ...item,
          submenuItems: item.submenuItems.filter((subItem: any) => {
            // Always show End of Term Report
            if (subItem.label === "End of Term Report") return true;
            
            // For CA reports, check if available
            const match = subItem.label.match(/^(CA\d+)/);
            return match ? availableCATypes.includes(match[1]) : true;
          })
        };
      }
      return item;
    })
  }));
}, [getSideBarData, availableCATypes]);
```

### Step 4: Use Filtered Data in Render

```typescript
// Replace getSideBarData with filteredSidebarData
{filteredSidebarData?.map((mainLabel, index) => (
  // ... render logic ...
))}
```

## ✅ Expected Behavior

### Scenario 1: School has CA1 and CA2

**Sidebar shows**:
```
📄 Reports
  ├── 🏆 End of Term Report
  ├── ✅ CA1 Progress Report
  └── ✅ CA2 Progress Report
```

### Scenario 2: School has CA1, CA2, CA3

**Sidebar shows**:
```
📄 Reports
  ├── 🏆 End of Term Report
  ├── ✅ CA1 Progress Report
  ├── ✅ CA2 Progress Report
  └── ✅ CA3 Progress Report
```

### Scenario 3: School has only CA1

**Sidebar shows**:
```
📄 Reports
  ├── 🏆 End of Term Report
  └── ✅ CA1 Progress Report
```

### Scenario 4: School has no CA setup

**Sidebar shows**:
```
📄 Reports
  └── 🏆 End of Term Report
```

## 🧪 Testing

1. **Test with different CA configurations**
   - Create CA1 only → Verify only CA1 shows
   - Add CA2 → Verify CA2 appears
   - Delete CA1 → Verify CA1 disappears

2. **Test permissions**
   - Verify only users with correct permissions see Reports menu

3. **Test navigation**
   - Click each visible CA report → Should navigate correctly
   - Verify hidden CA reports are not accessible

## 📝 Next Steps

1. Choose implementation approach (recommend Option 2)
2. Implement the changes
3. Test with different CA configurations
4. Deploy and monitor

---

**Would you like me to implement Option 2 (Client-Side Filtering) now?**

This is the simplest and most practical solution that doesn't require backend changes.
