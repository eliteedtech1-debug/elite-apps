# Section-Specific vs General ("All") Configuration Pattern

## Overview
This document explains the pattern used in Elite Core for handling section-specific configurations with fallback to general "All" settings.

## Pattern Source
Based on: `elscholar-ui/src/feature-module/academic/examinations/exam-results/CASetupOptimized.jsx`

## How It Works

### 1. Default Section Value
```javascript
const initialSetupFormState = {
  ca_type: "",
  academic_year: "",
  term: "",
  section: "All",  // ← Default is "All"
  overall_contribution_percent: "",
  weeks: [],
  assessment_week: null,
};
```

### 2. Fetching Configuration
```javascript
const fetchCASetupDetails = useCallback(async (caType, sectionId) => {
  // API call with section parameter
  await _get(
    `ca-setup?caType=${caType}&query_type=ca_type&section=${sectionId}`,
    (res) => {
      if (res.success && res.data?.length) {
        // Use the returned configuration
        setSetupForm(prev => ({
          ...prev,
          overall_contribution_percent: parseFloat(res.data[0].overall_contribution_percent),
          // ... other fields
        }));
      }
    }
  );
}, []);
```

### 3. Backend Logic (Recommended)

The backend should implement this fallback pattern:

```javascript
// Example backend query
async function getCASetup(caType, section, academicYear, term) {
  // Try to find section-specific configuration first
  let config = await db.query(
    `SELECT * FROM ca_setup
     WHERE ca_type = ?
       AND section = ?
       AND academic_year = ?
       AND term = ?
     LIMIT 1`,
    [caType, section, academicYear, term]
  );

  // If no section-specific config found, fall back to "All"
  if (!config && section !== 'All') {
    config = await db.query(
      `SELECT * FROM ca_setup
       WHERE ca_type = ?
         AND section = 'All'
         AND academic_year = ?
         AND term = ?
       LIMIT 1`,
      [caType, academicYear, term]
    );
  }

  return config;
}
```

## Application Examples

### Example 1: CA Setup Configuration

**Scenario:**
- School has Primary, Secondary, and Nursery sections
- Wants default CA weights for all sections
- Wants custom CA weights for Secondary section only

**Configuration:**
```javascript
// General configuration (All sections)
{
  ca_type: "First CA",
  section: "All",
  overall_contribution_percent: 15,
  academic_year: "2024/2025",
  term: "First Term"
}

// Section-specific override for Secondary
{
  ca_type: "First CA",
  section: "Secondary",
  overall_contribution_percent: 20,  // Different weight for Secondary
  academic_year: "2024/2025",
  term: "First Term"
}
```

**Result:**
- Primary section students: Use 15% (from "All")
- Nursery section students: Use 15% (from "All")
- Secondary section students: Use 20% (from "Secondary" specific)

### Example 2: Grade Boundaries

**Scenario:**
- Different grading systems for Primary vs Secondary

**Configuration:**
```javascript
// General grading (All sections)
grade_boundaries: [
  { grade: "A", min: 70, max: 100, remark: "Excellent" },
  { grade: "B", min: 60, max: 69, remark: "Very Good" },
  // ...
]

// Secondary-specific grading (WAEC/NECO style)
grade_boundaries: [
  { grade: "A1", min: 75, max: 100, remark: "Excellent" },
  { grade: "B2", min: 70, max: 74, remark: "Very Good" },
  // ...
]
```

### Example 3: Attendance Setup

**Scenario:**
- Default attendance rules for all sections
- Stricter rules for Senior Secondary

**Configuration:**
```javascript
// All sections
{
  section: "All",
  allow_backdated_attendance: true,
  backdated_days: 7,
  minimum_attendance_percent: 75
}

// Senior Secondary specific
{
  section: "Senior Secondary",
  allow_backdated_attendance: false,  // No backdating
  backdated_days: 0,
  minimum_attendance_percent: 85      // Stricter requirement
}
```

## UI Pattern

### Section Selector
```jsx
<Select
  value={setupForm.section}
  onChange={(value) => handleSetupFormChange('section', value)}
  placeholder="Select Section"
>
  <Option value="All">All Sections (Default)</Option>
  {sections?.map((section) => (
    <Option key={section.section_name} value={section.section_name}>
      {section.section_name}
    </Option>
  ))}
</Select>
```

### Display Pattern
```jsx
<td>{setup.section || "All"}</td>
```

## Backend Query Pattern

### SQL Pattern with Fallback
```sql
-- Option 1: UNION approach
SELECT * FROM configuration
WHERE section = ? AND ca_type = ? AND academic_year = ? AND term = ?
UNION
SELECT * FROM configuration
WHERE section = 'All' AND ca_type = ? AND academic_year = ? AND term = ?
  AND NOT EXISTS (
    SELECT 1 FROM configuration
    WHERE section = ? AND ca_type = ? AND academic_year = ? AND term = ?
  )
LIMIT 1;
```

### JavaScript Pattern
```javascript
// Step 1: Try section-specific
let config = await getConfig({ section, ca_type, year, term });

// Step 2: Fallback to "All"
if (!config && section !== 'All') {
  config = await getConfig({ section: 'All', ca_type, year, term });
}

// Step 3: Return config or default
return config || defaultConfig;
```

## Best Practices

### 1. Always Provide "All" Configuration
- Set up general "All" section config first
- Then add section-specific overrides as needed

### 2. Clear UI Indication
```jsx
{setup.section === 'All' ? (
  <Tag color="blue">Default (All Sections)</Tag>
) : (
  <Tag color="green">{setup.section} Specific</Tag>
)}
```

### 3. Configuration Priority Display
```jsx
<Alert
  message="Configuration Priority"
  description={
    <>
      <p>1. Section-specific configuration (if exists)</p>
      <p>2. "All Sections" default configuration (fallback)</p>
    </>
  }
  type="info"
/>
```

### 4. Prevent Orphaned Configs
- Always maintain at least one "All" configuration
- Warn before deleting "All" config if section-specific configs exist

### 5. Audit Trail
```javascript
{
  config_source: config.section === 'All' ? 'Default' : 'Section-Specific',
  applied_section: selectedSection,
  config_section: config.section
}
```

## Common Use Cases

| Feature | Use Case | Pattern |
|---------|----------|---------|
| **CA Setup** | Different CA weights per section | Section-specific overrides |
| **Grade Boundaries** | Primary vs Secondary grading | Different grade systems |
| **Attendance** | Stricter rules for senior classes | Section-specific rules |
| **Fees Structure** | Different fee amounts per section | Section-specific pricing |
| **Timetable** | Different periods per section | Section-specific schedules |
| **Subject Allocation** | Core vs Electives per section | Section-specific subjects |

## Migration Strategy

### Converting Existing Single Config to Section Pattern

```javascript
// Before: Single configuration
const config = {
  ca_type: "First CA",
  overall_contribution_percent: 15
};

// After: Section-aware configuration
const configs = [
  {
    ca_type: "First CA",
    section: "All",  // Default for all sections
    overall_contribution_percent: 15
  },
  {
    ca_type: "First CA",
    section: "Secondary",  // Override for Secondary
    overall_contribution_percent: 20
  }
];
```

### Migration Script Example
```sql
-- Add section column if doesn't exist
ALTER TABLE ca_setup ADD COLUMN section VARCHAR(100) DEFAULT 'All';

-- Update existing records to use 'All'
UPDATE ca_setup SET section = 'All' WHERE section IS NULL OR section = '';

-- Add index for efficient queries
CREATE INDEX idx_ca_setup_section ON ca_setup(ca_type, section, academic_year, term);
```

## Testing Checklist

- [ ] "All" configuration works for all sections
- [ ] Section-specific config overrides "All"
- [ ] Sections without specific config use "All"
- [ ] Deleting section doesn't affect "All" config
- [ ] Deleting "All" shows appropriate warning
- [ ] UI clearly shows which config is being used
- [ ] Fallback logic works in all scenarios
- [ ] Database queries are optimized

## Summary

The section-specific vs "All" pattern provides:
1. ✅ **Flexibility**: Custom configs per section
2. ✅ **Simplicity**: Default config for all sections
3. ✅ **Efficiency**: Only create overrides when needed
4. ✅ **Maintainability**: Easy to manage and update
5. ✅ **Scalability**: Works with any number of sections

This pattern is the foundation for multi-section school management in Elite Core.
