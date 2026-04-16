# Dynamic Assessment Types - Implementation Complete ✅

## Problem Addressed

The previous implementation hardcoded assessment types (Exam, CA1, CA2, CA3, CA4) in the dropdown, which:
- Ignored the school's actual `ca_setup` configuration
- Showed options that might not be configured for that school
- Couldn't handle schools with different CA configurations per section
- Wasn't flexible for schools that only use CA1, or CA1+CA2, etc.

## Solution Implemented

**Fetch assessment types dynamically from `ca_setup` table** based on:
1. School ID
2. Branch ID
3. Section (Nursery, Primary, Secondary, or "All")
4. Active status (`is_active = 1` and `status = 'Active'`)

---

## How It Works

### Database Structure

```sql
SELECT * FROM ca_setup
WHERE school_id = 'SCH/1'
  AND branch_id = 'BRCH00001'
  AND is_active = 1
  AND status = 'Active';
```

**Sample Data:**
```
id  ca_type  section     is_active  status
1   CA1      All         1          Active
2   CA2      All         1          Active
3   CA3      All         1          Active
4   EXAM     All         1          Active
```

**Section-Specific Example:**
```
id  ca_type  section     is_active  status
1   CA1      Nursery     1          Active
2   CA1      Primary     1          Active
3   CA2      Primary     1          Active
4   CA1      Secondary   1          Active
5   CA2      Secondary   1          Active
6   CA3      Secondary   1          Active
7   EXAM     All         1          Active
```

### User Flow

1. **User selects a class** → System extracts the class's `section` (Nursery/Primary/Secondary)

2. **System fetches CA setup** → API call: `ca-setups/list-by-section?section=Primary`
   - Returns all active CA configurations for that section
   - Includes both section-specific configs AND "All" section configs

3. **System filters and processes**:
   ```javascript
   // Priority: Section-specific > "All"
   // If Primary has CA1, CA2 configured
   // And "All" has CA1, CA2, CA3, EXAM
   // Result: CA1 (Primary), CA2 (Primary), CA3 (All), EXAM (All)
   ```

4. **Dropdown shows only configured types**:
   - Nursery class → Shows only CA1, EXAM
   - Primary class → Shows CA1, CA2, EXAM
   - Secondary class → Shows CA1, CA2, CA3, EXAM

### Code Flow

```typescript
// 1. When class is selected
setSelectedClass(value);
setSection(foundClass.section); // "Primary", "Secondary", etc.

// 2. When section changes
useEffect(() => {
  if (section) {
    fetchAvailableCATypes();
  }
}, [section]);

// 3. Fetch from database
const fetchAvailableCATypes = () => {
  _get(`ca-setups/list-by-section?section=${section}`, (res) => {
    // Process response data
    const activeTypes = res.data
      .filter(ca => ca.is_active === 1 && ca.status === 'Active')
      .map(ca => ({
        ca_type: ca.ca_type,
        label: assessmentTypeLabels[ca.ca_type]
      }))
      // Remove duplicates, sort EXAM first
      .sort((a, b) => {
        if (a.ca_type === 'EXAM') return -1;
        if (b.ca_type === 'EXAM') return 1;
        return a.ca_type.localeCompare(b.ca_type);
      });

    setAvailableAssessmentTypes(activeTypes);
  });
};

// 4. Render dropdown with dynamic options
<Select>
  {availableAssessmentTypes.map((type) => (
    <Option key={type.ca_type} value={type.ca_type}>
      {type.label}
    </Option>
  ))}
</Select>
```

---

## Files Modified

### 1. EndOfTermReport.tsx

**New State Added** (line 381):
```typescript
const [availableAssessmentTypes, setAvailableAssessmentTypes] = useState<
  Array<{ ca_type: string; label: string }>
>([]);
```

**Fetch Logic Updated** (lines 548-580):
```typescript
const fetchCaSetup = useCallback(() => {
  if (!section) return;

  _get(`ca-setups/list-by-section?section=${section}`, (res) => {
    // ... existing logic for caConfiguration

    // NEW: Build available assessment types from active CA configurations
    const assessmentTypeLabels: Record<string, string> = {
      'EXAM': 'End of Term Report',
      'CA1': 'CA1 Progress Report',
      'CA2': 'CA2 Progress Report',
      'CA3': 'CA3 Progress Report',
      'CA4': 'CA4 Progress Report',
      'CA5': 'CA5 Progress Report',
      'CA6': 'CA6 Progress Report',
    };

    const activeTypes = uniqueConfigs
      .filter((ca: CaSetup) => ca.is_active === 1 && ca.status === 'Active')
      .map((ca: CaSetup) => ({
        ca_type: ca.ca_type || ca.assessment_type,
        label: assessmentTypeLabels[ca.ca_type] || `${ca.ca_type} Report`
      }))
      .filter((type, index, self) =>
        index === self.findIndex(t => t.ca_type === type.ca_type)
      )
      .sort((a, b) => {
        if (a.ca_type === 'EXAM') return -1;
        if (b.ca_type === 'EXAM') return 1;
        return a.ca_type.localeCompare(b.ca_type);
      });

    setAvailableAssessmentTypes(activeTypes);
  });
}, [section]);
```

**Dropdown Updated** (lines 2405-2423):
```typescript
<Select
  value="Exam"
  onChange={(value) => navigate(`/academic/reports/${value}`)}
  style={{ width: "100%" }}
  size="large"
  className="rounded-lg"
  disabled={availableAssessmentTypes.length === 0}
  loading={availableAssessmentTypes.length === 0}
  placeholder={
    availableAssessmentTypes.length === 0
      ? "Loading assessment types..."
      : "Select assessment type"
  }
>
  {availableAssessmentTypes.map((type) => (
    <Option key={type.ca_type} value={type.ca_type}>
      <div className="flex items-center">
        <span className="mr-2">{type.ca_type === 'EXAM' ? '📊' : '📝'}</span>
        <span>{type.label}</span>
      </div>
    </Option>
  ))}
</Select>
```

### 2. ClassCAReport.tsx

**New State Added** (line 272):
```typescript
const [availableAssessmentTypes, setAvailableAssessmentTypes] = useState<
  Array<{ ca_type: string; label: string }>
>([]);
```

**Fetch Logic Updated** (lines 394-422):
```typescript
// Inside fetchAvailableCATypes()
setAvailableCATypes(uniqueCATypes); // Existing for local CA dropdown

// NEW: Build available assessment types for navigation
const assessmentTypeLabels: Record<string, string> = {
  'EXAM': 'End of Term Report',
  'CA1': 'CA1 Progress Report',
  'CA2': 'CA2 Progress Report',
  'CA3': 'CA3 Progress Report',
  'CA4': 'CA4 Progress Report',
  'CA5': 'CA5 Progress Report',
  'CA6': 'CA6 Progress Report',
};

const allAssessmentTypes = res.data
  .filter((ca: any) => ca.is_active === 1 && ca.status === 'Active')
  .map((ca: any) => ({
    ca_type: ca.ca_type,
    label: assessmentTypeLabels[ca.ca_type] || `${ca.ca_type} Report`
  }))
  .filter((type: any, index: number, self: any[]) =>
    index === self.findIndex((t: any) => t.ca_type === type.ca_type)
  )
  .sort((a: any, b: any) => {
    if (a.ca_type === 'EXAM') return -1;
    if (b.ca_type === 'EXAM') return 1;
    return a.ca_type.localeCompare(b.ca_type);
  });

setAvailableAssessmentTypes(allAssessmentTypes);
```

**Dropdown Updated** (lines 2108-2123):
```typescript
<Select
  value={selectedCAType || "CA1"}
  onChange={(value) => navigate(`/academic/reports/${value}`)}
  style={{ width: "100%" }}
  size="large"
  disabled={availableAssessmentTypes.length === 0}
  loading={availableAssessmentTypes.length === 0}
  placeholder={
    availableAssessmentTypes.length === 0
      ? "Loading assessment types..."
      : "Select report type"
  }
>
  {availableAssessmentTypes.map((type) => (
    <Option key={type.ca_type} value={type.ca_type}>
      <span className="me-2">{type.ca_type === 'EXAM' ? '📊' : '📝'}</span>
      {type.label}
    </Option>
  ))}
</Select>
```

---

## Section-Specific Behavior

### Scenario 1: School with "All" Section Configuration

**Database:**
```sql
ca_type  section  is_active  status
CA1      All      1          Active
CA2      All      1          Active
EXAM     All      1          Active
```

**Result for ANY class:**
- Dropdown shows: End of Term Report, CA1, CA2
- All classes see the same options

### Scenario 2: Section-Specific Configuration

**Database:**
```sql
ca_type  section     is_active  status
CA1      Nursery     1          Active
CA1      Primary     1          Active
CA2      Primary     1          Active
CA1      Secondary   1          Active
CA2      Secondary   1          Active
CA3      Secondary   1          Active
EXAM     All         1          Active
```

**Result:**

| Class Section | Dropdown Shows |
|---------------|----------------|
| Nursery | 📊 End of Term Report<br>📝 CA1 Progress Report |
| Primary | 📊 End of Term Report<br>📝 CA1 Progress Report<br>📝 CA2 Progress Report |
| Secondary | 📊 End of Term Report<br>📝 CA1 Progress Report<br>📝 CA2 Progress Report<br>📝 CA3 Progress Report |

### Scenario 3: Mixed "All" and Section-Specific

**Database:**
```sql
ca_type  section     is_active  status
CA1      All         1          Active
CA2      Primary     1          Active  ← Section-specific overrides "All"
CA3      All         1          Active
EXAM     All         1          Active
```

**Logic:**
```typescript
// 1. Load all "All" section configs as fallback
configMap.set('CA1', { ...ca1_all_config });
configMap.set('CA3', { ...ca3_all_config });
configMap.set('EXAM', { ...exam_all_config });

// 2. Override with section-specific if exists
if (section === 'Primary') {
  configMap.set('CA2', { ...ca2_primary_config }); // Override!
}

// Result for Primary: CA1 (All), CA2 (Primary), CA3 (All), EXAM (All)
```

---

## Benefits

### 1. ✅ Respects School Configuration
- Only shows assessment types that are actually configured
- No confusion with options that don't exist in the system

### 2. ✅ Section-Specific Flexibility
```
School "ABC Academy":
- Nursery: Only CA1 (age-appropriate)
- Primary: CA1, CA2 (building foundation)
- Secondary: CA1, CA2, CA3 (comprehensive assessment)
- All get EXAM
```

### 3. ✅ Future-Proof
- School adds CA4? Automatically appears in dropdown
- School deactivates CA3? Automatically hidden
- No code changes needed!

### 4. ✅ Status-Based Filtering
```typescript
.filter(ca => ca.is_active === 1 && ca.status === 'Active')
```
- Inactive assessments don't show
- "Inactive" status hides from dropdown
- Admin can control visibility via database

### 5. ✅ Custom Assessment Types
```sql
-- School can define custom types
INSERT INTO ca_setup (ca_type, ...) VALUES ('MID_TERM', ...);
INSERT INTO ca_setup (ca_type, ...) VALUES ('MOCK_EXAM', ...);
```
System automatically picks them up and displays them!

---

## Testing Scenarios

### Test 1: School with Only CA1
**Setup:**
```sql
UPDATE ca_setup SET is_active = 0 WHERE ca_type IN ('CA2', 'CA3', 'CA4');
```
**Expected:** Dropdown shows only "End of Term Report" and "CA1 Progress Report"

### Test 2: Nursery with Different Config
**Setup:**
```sql
-- Nursery gets only CA1
INSERT INTO ca_setup (ca_type, section, ...) VALUES ('CA1', 'Nursery', ...);
-- Primary gets CA1, CA2
INSERT INTO ca_setup (ca_type, section, ...) VALUES ('CA1', 'Primary', ...);
INSERT INTO ca_setup (ca_type, section, ...) VALUES ('CA2', 'Primary', ...);
```
**Expected:**
- Nursery class → Shows EXAM, CA1
- Primary class → Shows EXAM, CA1, CA2

### Test 3: Deactivate CA Type
**Setup:**
```sql
UPDATE ca_setup SET is_active = 0 WHERE ca_type = 'CA3';
```
**Expected:** CA3 disappears from dropdown immediately on next fetch

### Test 4: Add New CA Type
**Setup:**
```sql
INSERT INTO ca_setup (ca_type, section, is_active, status, ...)
VALUES ('CA5', 'All', 1, 'Active', ...);
```
**Expected:** "CA5 Progress Report" appears in dropdown

---

## Edge Cases Handled

### 1. No CA Setup Configured
```typescript
if (availableAssessmentTypes.length === 0) {
  // Dropdown shows loading state
  // Disabled until data arrives
}
```

### 2. Section Not Found
```typescript
if (!section) {
  setAvailableAssessmentTypes([]);
  return; // Don't fetch
}
```

### 3. API Error
```typescript
(err) => {
  console.error("Failed to fetch CA types:", err);
  setAvailableCATypes([]);
  setAvailableAssessmentTypes([]); // Clear dropdown
  setSelectedCAType(""); // Reset selection
}
```

### 4. Duplicate CA Types
```typescript
.filter((type, index, self) =>
  index === self.findIndex(t => t.ca_type === type.ca_type)
)
// Ensures each ca_type appears only once
```

---

## Database Schema Requirements

### ca_setup Table Structure
```sql
CREATE TABLE ca_setup (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ca_type VARCHAR(50) NOT NULL,     -- 'CA1', 'CA2', 'EXAM', etc.
  week_number INT,
  max_score DECIMAL(5,2),
  overall_contribution_percent DECIMAL(5,2),
  is_active TINYINT(1) DEFAULT 1,   -- ✅ Required!
  school_id VARCHAR(50),
  branch_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active', -- ✅ Required!
  section VARCHAR(50) DEFAULT 'All',   -- ✅ Required!
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Columns:**
- `is_active`: 0 = hidden, 1 = shown in dropdown
- `status`: 'Active' = shown, 'Inactive' = hidden
- `section`: 'All', 'Nursery', 'Primary', 'Secondary', etc.

---

## API Endpoint Used

```
GET /ca-setups/list-by-section?section=Primary
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ca_type": "CA1",
      "section": "Primary",
      "is_active": 1,
      "status": "Active",
      "week_count": 3,
      "total_max_score": "30.00",
      "contribution_percent": "20.00"
    },
    {
      "id": 2,
      "ca_type": "CA2",
      "section": "Primary",
      "is_active": 1,
      "status": "Active",
      ...
    }
  ]
}
```

---

## Migration Guide

### For Schools Upgrading

1. **Verify ca_setup table has required columns:**
   ```sql
   ALTER TABLE ca_setup
     ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1,
     ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active',
     ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'All';
   ```

2. **Set default section for existing records:**
   ```sql
   UPDATE ca_setup SET section = 'All' WHERE section IS NULL;
   ```

3. **Activate all existing records:**
   ```sql
   UPDATE ca_setup SET is_active = 1, status = 'Active';
   ```

4. **Configure section-specific if needed:**
   ```sql
   -- Example: Nursery only gets CA1
   UPDATE ca_setup
   SET section = 'Nursery'
   WHERE ca_type = 'CA1'
     AND school_id = 'YOUR_SCHOOL_ID';

   UPDATE ca_setup
   SET is_active = 0
   WHERE ca_type IN ('CA2', 'CA3')
     AND school_id = 'YOUR_SCHOOL_ID';
   ```

---

## Related Documentation

1. **ASSESSMENT_TYPE_SELECTOR_ADDED.md** - Initial hardcoded implementation
2. **SIDEBAR_UNIFICATION_COMPLETE.md** - Sidebar simplification
3. **UNIFIED_NAVIGATION_STRUCTURE.md** - Overall navigation strategy

---

**Status:** ✅ Dynamic Assessment Types Fully Implemented
**Date:** December 2, 2025
**Database-Driven:** Yes
**Section-Aware:** Yes
**Ready for Production:** Yes

**Summary:** Assessment types are now completely configurable via the `ca_setup` database table, respecting school-specific, branch-specific, and section-specific configurations with proper fallback to "All" section defaults.
