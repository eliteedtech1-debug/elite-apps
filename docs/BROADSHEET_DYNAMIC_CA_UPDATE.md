# Broadsheet Dynamic CA Configuration - Implementation Complete

## Summary

Updated the Broadsheet feature to use dynamic CA (Continuous Assessment) columns based on the school's `ca-setup` configuration instead of hardcoded "1st CA, 2nd CA" columns.

## Problem Fixed

**Before:**
- ❌ Broadsheet had hardcoded columns: "1st CA", "2nd CA", "Exam", "Total"
- ❌ Did not respect school's actual CA setup
- ❌ Info text always said "4 columns per subject"
- ❌ Preview always showed "1st CA" and "2nd CA" labels

**After:**
- ✅ Columns are dynamically generated from `ca-setup` endpoint
- ✅ Respects each school's custom CA configuration
- ✅ Shows actual CA names (e.g., "First CA", "Second CA", "Practical Test")
- ✅ Displays contribution percentages (e.g., "First CA (20%)")
- ✅ Works for any number of CAs (1, 2, 3, 4, etc.)
- ✅ Info text dynamically describes the setup

---

## Implementation Details

### Files Modified

**Location:** `/Users/apple/Downloads/apps/elite/elscholar-ui/src/feature-module/academic/examinations/exam-results/BroadSheet.tsx`

### Changes Made

#### 1. Added CA Setup Interface & State

```typescript
interface CaSetup {
  ca_type: string;
  max_score: number;
  contribution_percent?: string;
  total_max_score?: string;
}

const [caConfiguration, setCaConfiguration] = useState<CaSetup[]>([]);
const [section, setSection] = useState<string>('');
```

#### 2. Added CA Setup Fetch Function

```typescript
const fetchCaSetup = useCallback(() => {
  if (!section) return;

  _get(
    `ca-setups/list-by-section?section=${section}`,
    (res: any) => {
      if (res.success && res.data && res.data.length) {
        // Filter to prioritize section-specific configurations over "All"
        const configMap = new Map<string, CaSetup>();

        // First, add all "All" section configurations as fallback
        res.data.filter((ca: any) => ca.section === "All").forEach((ca: any) => {
          configMap.set(ca.ca_type, ca);
        });

        // Then override with section-specific configurations
        res.data.filter((ca: any) => ca.section === section).forEach((ca: any) => {
          configMap.set(ca.ca_type, ca);
        });

        const uniqueConfigs = Array.from(configMap.values());
        setCaConfiguration(uniqueConfigs);
      } else {
        setCaConfiguration([]);
      }
    },
    (err: any) => {
      console.error("Error fetching CA setup:", err);
      setCaConfiguration([]);
    }
  );
}, [section]);
```

#### 3. Updated Class Change Handler

```typescript
const handleClassChange = (classCode: string) => {
  setSelectedClass(classCode);

  // Get class section to fetch CA setup
  const selectedClassData = classes.find((c) => c.class_code === classCode);
  if (selectedClassData?.section) {
    setSection(selectedClassData.section);
  }

  fetchSubjects(classCode);
  fetchStudents(classCode);
};
```

#### 4. Updated Full Template PDF Generation

**Before (Hardcoded):**
```typescript
subjects.forEach((subject) => {
  const subjectName = subject.subject || subject.subject_name || subject.subject_code;
  tableHeaders.push(
    { header: `${subjectName}\n1st CA`, dataKey: `${subject.subject_code}_ca1` },
    { header: `${subjectName}\n2nd CA`, dataKey: `${subject.subject_code}_ca2` },
    { header: `${subjectName}\nExam`, dataKey: `${subject.subject_code}_exam` },
    { header: `${subjectName}\nTotal`, dataKey: `${subject.subject_code}_total` }
  );
});
```

**After (Dynamic):**
```typescript
// Get CA configuration (filter out Exam)
const caColumns = caConfiguration.filter((ca) => !ca.ca_type.toLowerCase().includes('exam'));
const examConfig = caConfiguration.find((ca) => ca.ca_type.toLowerCase() === 'exam');

subjects.forEach((subject) => {
  const subjectName = subject.subject || subject.subject_name || subject.subject_code;

  // Add CA columns dynamically
  caColumns.forEach((ca, index) => {
    const weight = ca.contribution_percent ? ` (${ca.contribution_percent}%)` : '';
    tableHeaders.push({
      header: `${subjectName}\n${ca.ca_type}${weight}`,
      dataKey: `${subject.subject_code}_ca${index + 1}`
    });
  });

  // Add Exam column
  const examWeight = examConfig?.contribution_percent ? ` (${examConfig.contribution_percent}%)` : '';
  tableHeaders.push({
    header: `${subjectName}\nExam${examWeight}`,
    dataKey: `${subject.subject_code}_exam`
  });

  // Add Total column
  tableHeaders.push({
    header: `${subjectName}\nTotal`,
    dataKey: `${subject.subject_code}_total`
  });
});
```

#### 5. Updated Blank Template PDF Generation

**Before (Hardcoded):**
```typescript
for (let i = 1; i <= blankSubjectCount; i++) {
  tableHeaders.push(
    { header: '_________', dataKey: `subject${i}_name` },
    { header: '1st CA', dataKey: `subject${i}_ca1` },
    { header: '2nd CA', dataKey: `subject${i}_ca2` },
    { header: 'Exam', dataKey: `subject${i}_exam` },
    { header: 'Total', dataKey: `subject${i}_total` }
  );
}
```

**After (Dynamic):**
```typescript
const caColumns = caConfiguration.filter((ca) => !ca.ca_type.toLowerCase().includes('exam'));
const examConfig = caConfiguration.find((ca) => ca.ca_type.toLowerCase() === 'exam');

for (let i = 1; i <= blankSubjectCount; i++) {
  // Blank subject name
  tableHeaders.push({ header: '_________', dataKey: `subject${i}_name` });

  // Add CA columns dynamically from setup
  caColumns.forEach((ca, caIndex) => {
    const weight = ca.contribution_percent ? ` (${ca.contribution_percent}%)` : '';
    tableHeaders.push({
      header: `${ca.ca_type}${weight}`,
      dataKey: `subject${i}_ca${caIndex + 1}`
    });
  });

  // Add Exam column
  const examWeight = examConfig?.contribution_percent ? ` (${examConfig.contribution_percent}%)` : '';
  tableHeaders.push({
    header: `Exam${examWeight}`,
    dataKey: `subject${i}_exam`
  });

  // Add Total column
  tableHeaders.push({
    header: 'Total',
    dataKey: `subject${i}_total`
  });
}
```

#### 6. Updated Preview Table

Updated the preview to use dynamic CA columns for both full and blank templates, including the contribution percentages.

#### 7. Updated Info Text

**Before:**
```typescript
' Each subject has 4 columns: 1st CA, 2nd CA, Exam, and Total.'
```

**After:**
```typescript
(() => {
  const caCount = caConfiguration.filter((ca) => !ca.ca_type.toLowerCase().includes('exam')).length;
  const caNames = caConfiguration
    .filter((ca) => !ca.ca_type.toLowerCase().includes('exam'))
    .map((ca) => ca.ca_type)
    .join(', ');
  return ` Each subject has ${caCount + 2} columns: ${caNames}, Exam, and Total (based on your CA setup).`;
})()
```

#### 8. Updated Summary Stats

**Before:**
```typescript
Total Columns: {2 + (sheetType === 'full' ? subjects.length * 4 : blankSubjectCount * 5)}
```

**After:**
```typescript
Total Columns: {(() => {
  const caCount = caConfiguration.filter((ca) => !ca.ca_type.toLowerCase().includes('exam')).length;
  const columnsPerSubject = caCount + 2; // CAs + Exam + Total
  return 2 + (sheetType === 'full' ? subjects.length * columnsPerSubject : blankSubjectCount * (columnsPerSubject + 1));
})()}
```

---

## How It Works

### Data Flow

```
1. User selects Class
   ↓
2. System extracts section from class data
   ↓
3. Fetch CA Setup: GET /ca-setups/list-by-section?section={section}
   ↓
4. Response: [
     { ca_type: "First CA", max_score: 20, contribution_percent: "20" },
     { ca_type: "Second CA", max_score: 20, contribution_percent: "20" },
     { ca_type: "Exam", max_score: 60, contribution_percent: "60" }
   ]
   ↓
5. Filter CAs (exclude Exam): ["First CA", "Second CA"]
   ↓
6. Build PDF/Preview Columns Dynamically:
   - S/N
   - Student Name
   - {Subject Name} - First CA (20%)
   - {Subject Name} - Second CA (20%)
   - {Subject Name} - Exam (60%)
   - {Subject Name} - Total
```

### Example Scenarios

#### Scenario 1: School with 2 CAs

**CA Setup:**
- First CA (20%)
- Second CA (20%)
- Exam (60%)

**Broadsheet Columns:**
- S/N | Name | Math - First CA (20%) | Math - Second CA (20%) | Math - Exam (60%) | Math - Total

**Preview Info:**
"Each subject has 4 columns: First CA, Second CA, Exam, and Total (based on your CA setup)."

#### Scenario 2: School with 3 CAs

**CA Setup:**
- CA1 (15%)
- CA2 (15%)
- Practical Test (10%)
- Exam (60%)

**Broadsheet Columns:**
- S/N | Name | English - CA1 (15%) | English - CA2 (15%) | English - Practical Test (10%) | English - Exam (60%) | English - Total

**Preview Info:**
"Each subject has 5 columns: CA1, CA2, Practical Test, Exam, and Total (based on your CA setup)."

#### Scenario 3: School with 1 CA

**CA Setup:**
- Continuous Assessment (40%)
- Exam (60%)

**Broadsheet Columns:**
- S/N | Name | Science - Continuous Assessment (40%) | Science - Exam (60%) | Science - Total

**Preview Info:**
"Each subject has 3 columns: Continuous Assessment, Exam, and Total (based on your CA setup)."

---

## Testing Instructions

### Test Dynamic CA Configuration

1. **Setup CA Configuration:**
   - Go to: **Academic → CA Setup**
   - Configure CAs for a section (e.g., "SS" section):
     - First CA: 20%, Max Score: 20
     - Second CA: 20%, Max Score: 20
     - Exam: 60%, Max Score: 60

2. **Generate Broadsheet:**
   - Go to: **Academic → Examinations → Exam Results → BroadSheet**
   - Select a class from the configured section
   - Click "Preview Broadsheet"

3. **Verify:**
   - ✅ Preview shows "First CA (20%)", "Second CA (20%)", "Exam (60%)", "Total"
   - ✅ Info text says: "Each subject has 4 columns: First CA, Second CA, Exam, and Total (based on your CA setup)."
   - ✅ Summary stats show correct column count

4. **Download PDF:**
   - Click "Download Full Template"
   - ✅ PDF headers show: "{Subject} - First CA (20%)", "{Subject} - Second CA (20%)", etc.

5. **Test Blank Template:**
   - Switch to "Blank Template"
   - Enter 2 subjects
   - Click "Preview Broadsheet"
   - ✅ Preview shows: "_________", "First CA (20%)", "Second CA (20%)", "Exam (60%)", "Total"

### Test with Different CA Setups

**1 CA Setup:**
- Configure: CA (40%), Exam (60%)
- ✅ Broadsheet shows 3 columns per subject (CA, Exam, Total)

**3 CA Setup:**
- Configure: CA1 (15%), CA2 (15%), Practical (10%), Exam (60%)
- ✅ Broadsheet shows 5 columns per subject

**4 CA Setup:**
- Configure: CA1 (10%), CA2 (10%), CA3 (10%), CA4 (10%), Exam (60%)
- ✅ Broadsheet shows 6 columns per subject

---

## Benefits

### For Schools

✅ **Flexibility**: Each school can define their own CA structure
✅ **Accuracy**: Broadsheet matches actual grading system
✅ **Transparency**: Contribution percentages shown on broadsheet
✅ **Professional**: Dynamic generation based on actual setup

### For Teachers

✅ **Clear Guidance**: Column headers show exact CA names and weights
✅ **Less Confusion**: No mismatch between CA setup and broadsheet
✅ **Accurate Recording**: Correct columns for their school's grading system

### Technical

✅ **Dynamic**: No hardcoded values
✅ **Maintainable**: One source of truth (CA setup endpoint)
✅ **Scalable**: Works with any number of CAs
✅ **Consistent**: Same data source as End of Term Reports

---

## Compatibility

### Backward Compatibility

- ✅ **Existing schools**: Will use their configured CA setup
- ✅ **New schools**: Default CA setup will be used
- ✅ **No migration needed**: Works with existing data
- ✅ **Fallback**: If no CA setup, defaults to empty (requires setup)

### Data Requirements

**Required:**
- CA setup must be configured via `ca-setups/list-by-section` endpoint
- Section must be associated with the class

**Optional:**
- Contribution percentages (if not provided, shows CA name only)
- Max scores

---

## API Endpoint Used

```
GET /ca-setups/list-by-section?section={section}
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "ca_type": "First CA",
      "max_score": 20,
      "contribution_percent": "20",
      "total_max_score": "100",
      "section": "SS"
    },
    {
      "ca_type": "Second CA",
      "max_score": 20,
      "contribution_percent": "20",
      "total_max_score": "100",
      "section": "SS"
    },
    {
      "ca_type": "Exam",
      "max_score": 60,
      "contribution_percent": "60",
      "total_max_score": "100",
      "section": "SS"
    }
  ]
}
```

---

## Configuration Priority

The system uses a fallback mechanism for CA configuration:

1. **Section-specific configuration** (e.g., "SS" section)
2. **"All" sections configuration** (fallback)
3. **Empty array** (if no configuration found - requires setup)

This ensures that if a specific section doesn't have a CA setup, it will use the "All" sections fallback configuration.

---

## Related Features

This implementation is consistent with:
- **End of Term Reports** (uses same CA setup endpoint)
- **CA Groups Management**
- **Grade Boundaries**
- **Assessment System**

---

## 🎉 Implementation Complete!

The Broadsheet now:
- ✅ Uses dynamic CA configuration from `ca-setup` endpoint
- ✅ Shows actual CA names (not hardcoded "1st CA", "2nd CA")
- ✅ Displays contribution percentages
- ✅ Works with any number of CAs (1, 2, 3, 4+)
- ✅ Provides accurate preview and PDF generation
- ✅ Updates info text dynamically
- ✅ Calculates correct column counts

**No more hardcoded values!** The broadsheet is now fully dynamic and respects each school's CA configuration.
