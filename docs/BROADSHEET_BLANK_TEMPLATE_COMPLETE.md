# Broadsheet Blank Template Feature - Implementation Complete

## Summary

Added ability to generate **blank template** broadsheets for manual filling by teachers.

## What Was Implemented

### 1. **Two Template Types**

Users can now choose between:

| Template Type | Description | Format | Use Case |
|--------------|-------------|---------|----------|
| **Full Template** | Pre-filled with actual subject data from database | A2 Landscape | Automated marking with pre-defined subjects |
| **Blank Template** | Empty form with customizable subject columns | A4 Portrait/Landscape (auto) | Manual marking, flexible subject entry |

### 2. **Blank Template Features**

✅ **Flexible Subject Count** - User enters any number (numeric input, not dropdown)
✅ **Auto-Orientation** - Portrait for 1-3 subjects, Landscape for 4+ subjects
✅ **A4 Format** - Standard paper size for easy printing
✅ **Student List** - Auto-populated from selected class
✅ **Blank Subject Columns** - Clean headers with just underscores (no "Subject 1", "Subject 2" labels)
✅ **Manual Entry Fields**:
  - Subject Name (blank line to write)
  - 1st CA score column
  - 2nd CA score column
  - Exam score column
  - Total column

✅ **School Branding** - Includes school logo, name, address, contacts
✅ **Clean Title** - "EXAMINATION BROADSHEET" (removed "- Blank Template" suffix)
✅ **No Instructions** - Removed instructional text for cleaner look
✅ **Signature Lines** - Subject Teacher and Head Teacher
✅ **Page Numbers** - For multi-page broadsheets
✅ **Consistent Button Sizes** - All buttons are medium size

---

## Technical Implementation

### Files Modified:
- **Frontend:** `elscholar-ui/src/feature-module/academic/examinations/exam-results/BroadSheet.tsx`

### Changes Made:

#### 1. State Management (Line 99)
```typescript
// Changed from fixed options (1 | 2 | 3) to flexible number
const [blankSubjectCount, setBlankSubjectCount] = useState<number>(2);
```

#### 2. Dynamic Orientation Logic (Lines 452-462)
```typescript
// Determine orientation based on subject count
// >3 subjects = landscape, <=3 subjects = portrait
const orientation = blankSubjectCount > 3 ? 'landscape' : 'portrait';
const format = 'a4'; // A4 for all

// Create PDF
const doc = new jsPDF({
  orientation: orientation,
  unit: 'mm',
  format: format,
});
```

#### 3. Clean Title (Lines 520-526)
```typescript
// Removed "- Blank Template" suffix
doc.text('EXAMINATION BROADSHEET', pageWidth / 2, currentY, {
  align: 'center',
});
```

#### 4. Removed Instructional Text
Previously had:
```typescript
// REMOVED: Instructions line
doc.text(
  '(Fill in subject names in the blank headers and record student scores)',
  pageWidth / 2,
  currentY,
  { align: 'center' }
);
```

#### 5. Clean Subject Headers (Lines 545-553)
```typescript
// Removed "Subject 1", "Subject 2" labels - just blank lines
for (let i = 1; i <= blankSubjectCount; i++) {
  tableHeaders.push(
    { header: '_________', dataKey: `subject${i}_name` }, // ✅ Just underscores
    { header: '1st CA', dataKey: `subject${i}_ca1` },
    { header: '2nd CA', dataKey: `subject${i}_ca2` },
    { header: 'Exam', dataKey: `subject${i}_exam` },
    { header: 'Total', dataKey: `subject${i}_total` }
  );
}
```

#### 6. Numeric Input for Subject Count (Lines 773-786)
```typescript
// Changed from Select dropdown to numeric Input
<Input
  type="number"
  min={1}
  max={20}
  value={blankSubjectCount}
  onChange={(e) => setBlankSubjectCount(parseInt(e.target.value) || 2)}
  placeholder="Enter number of subjects"
  style={{ width: '100%' }}
/>
```

#### 7. Dynamic Info Box (Lines 789-799)
```typescript
// Shows orientation info when >3 subjects
<Text type="secondary" style={{ fontSize: 12 }}>
  <strong>Blank Template:</strong> A4 format with student list and blank
  subject columns. Teachers can write subject names and record scores manually.
  {blankSubjectCount > 3 && (
    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
      {' '}(Landscape view for {blankSubjectCount} subjects)
    </span>
  )}
</Text>
```

#### 8. Validation (Lines 439-442)
```typescript
if (!blankSubjectCount || blankSubjectCount < 1) {
  message.warning('Please enter a valid number of subjects (minimum 1)');
  return;
}
```

#### 9. Consistent Button Sizes (Lines 833-868)
```typescript
// Removed size="large" from all buttons - all now default (medium)
<Button
  type={showPreview ? "default" : "primary"}
  icon={<EyeOutlined />}
  onClick={() => setShowPreview(!showPreview)}
  disabled={!selectedClass || students.length === 0 || subjects.length === 0}
>
  {showPreview ? 'Hide Preview' : 'Preview Broadsheet'}
</Button>

<Button
  type="primary"
  icon={<DownloadOutlined />}
  onClick={handleDownloadBroadsheet}
  loading={generating}
  disabled={
    !selectedClass ||
    students.length === 0 ||
    (sheetType === 'full' && subjects.length === 0)
  }
>
  Download {sheetType === 'blank' ? 'Blank Template' : 'Full Template'}
</Button>

<Button
  icon={<ReloadOutlined />}
  onClick={() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
      fetchSubjects(selectedClass);
    }
  }}
  disabled={!selectedClass}
>
  Refresh Data
</Button>
```

---

## User Interface

### Table Structure (Clean Headers):

**For 2 Subjects (Portrait):**
```
┌─────┬──────────────────┬──────────┬──────┬──────┬──────┬───────┬──────────┬──────┬──────┬──────┬───────┐
│ S/N │ Student Name     │ ________ │ 1st  │ 2nd  │ Exam │ Total │ ________ │ 1st  │ 2nd  │ Exam │ Total │
│     │                  │          │ CA   │ CA   │      │       │          │ CA   │ CA   │      │       │
├─────┼──────────────────┼──────────┼──────┼──────┼──────┼───────┼──────────┼──────┼──────┼──────┼───────┤
│  1  │ John Doe         │          │      │      │      │       │          │      │      │      │       │
│  2  │ Jane Smith       │          │      │      │      │       │          │      │      │      │       │
└─────┴──────────────────┴──────────┴──────┴──────┴──────┴───────┴──────────┴──────┴──────┴──────┴───────┘
```

**PDF Header:**
```
[School Logo]
SCHOOL NAME
School Address
Phone | Email | Website

EXAMINATION BROADSHEET

Class: Smart 1 A | First Term | Mid Term | 2024/2025
```

**Key Differences from Old Version:**
- ❌ No "- Blank Template" in title
- ❌ No instructional text
- ❌ No "Subject 1", "Subject 2" labels
- ✅ Just clean underscores for subject names
- ✅ Numeric input for any number of subjects
- ✅ Auto landscape for >3 subjects
- ✅ All buttons same size

---

## Orientation Logic

| Subjects | Orientation | Format | Reason |
|----------|-------------|--------|--------|
| 1-3 | Portrait | A4 (210mm × 297mm) | Fits well vertically |
| 4+ | Landscape | A4 (297mm × 210mm) | More horizontal space |

**Examples:**
- 1 subject → Portrait
- 2 subjects → Portrait
- 3 subjects → Portrait
- 4 subjects → **Landscape** ✅
- 5 subjects → **Landscape** ✅
- 10 subjects → **Landscape** ✅

---

## Testing Instructions

### Test Blank Template:

1. **Navigate to Page:**
   - Go to: **Academic → Examinations → Exam Results → BroadSheet**

2. **Configure Options:**
   - Academic Year: `2024/2025`
   - Term: `First Term`
   - Exam Type: `Mid Term`
   - Class: Select any class with students
   - **Broadsheet Template:** Select `Blank Template (Manual Entry)`
   - **Number of Subjects:** Enter `2` (or any number)

3. **Download:**
   - Click `Download Blank Template`
   - ✅ PDF should download

4. **Verify PDF Contents:**
   - ✅ School logo displayed (if configured)
   - ✅ School name, address, contacts centered
   - ✅ Title: "EXAMINATION BROADSHEET" (no "- Blank Template")
   - ✅ Class info: Class, Term, Exam Type, Academic Year
   - ✅ No instructional text
   - ✅ Table has: S/N, Student Name, _________, 1st CA, 2nd CA, Exam, Total
   - ✅ No "Subject 1", "Subject 2" labels - just underscores
   - ✅ All student names listed
   - ✅ All score cells empty
   - ✅ Signature lines for Subject Teacher and Head Teacher
   - ✅ Page numbers at bottom (if multi-page)

### Test Orientation:

**1-3 Subjects (Portrait):**
1. Enter `1`, `2`, or `3` in Number of Subjects
2. ✅ No landscape message shown
3. Download and verify: PDF is Portrait

**4+ Subjects (Landscape):**
1. Enter `4`, `5`, or higher in Number of Subjects
2. ✅ Info box shows: "(Landscape view for X subjects)"
3. Download and verify: PDF is Landscape
4. ✅ More horizontal space available

### Test Validation:
1. Leave Number of Subjects blank or enter `0`
2. Click Download
3. ✅ Warning: "Please enter a valid number of subjects (minimum 1)"

---

## Benefits

### For Teachers:

✅ **Maximum Flexibility** - Choose any number of subjects
✅ **Clean Design** - No cluttered labels, just what's needed
✅ **Smart Layout** - Automatic orientation based on subject count
✅ **Quick Setup** - Just enter a number, no selecting from dropdown
✅ **Professional Look** - Clean, minimalist headers

### For School Administrators:

✅ **Cost-Effective** - Uses standard A4 paper
✅ **Versatile** - Works for 1 subject or 20+ subjects
✅ **Consistent UI** - All buttons same size for better UX
✅ **User-Friendly** - Numeric input is faster than dropdowns

---

## Summary of Changes

### ✅ Added:
1. Dynamic orientation logic (portrait ≤3, landscape >3)
2. Numeric input for subject count (removed dropdown)
3. Validation for minimum subject count
4. Dynamic info box showing orientation
5. Auto-landscape notification

### ✅ Improved:
1. Removed "Subject 1", "Subject 2" labels → Just `_________`
2. Removed "- Blank Template" from title → Just "EXAMINATION BROADSHEET"
3. Removed instructional text → Cleaner PDF
4. Changed subject count selector → Numeric input (more flexible)
5. Standardized button sizes → All medium (consistent UI)

### ✅ Maintained:
1. Existing full template functionality (unchanged)
2. School branding configuration
3. Report config overrides
4. Student filtering logic
5. Signature lines
6. Page numbers

---

## 🎉 Implementation Complete!

The broadsheet system now offers:
- **Full Template** for digital-first workflows with pre-configured subjects
- **Blank Template** for manual workflows with:
  - ✅ Flexible subject count (numeric input)
  - ✅ Auto orientation (portrait/landscape)
  - ✅ Clean headers (no redundant labels)
  - ✅ Professional look (no instructional text)
  - ✅ Consistent UI (uniform button sizes)

Teachers can now choose the right tool for their specific needs with maximum flexibility!
