# Teacher Remark & Character Scores Issues

## Issue 1: Teacher Remark Not Showing

### Problem
The "Teacher's Remark" section is not appearing in the generated PDF.

### Root Cause
The template expects `reportData.teacher_remark` but the data structure has `form_master_comment` in each subject row.

### Current Data Flow
1. `formMasterComments` fetched (admission_no → remark mapping)
2. Added to each row as `form_master_comment` (line 1320, 1460)
3. Template expects `reportData.teacher_remark` (line 1294)
4. **Mismatch:** Data has `form_master_comment`, template expects `teacher_remark`

### Solution
The template needs to extract `teacher_remark` from the first subject's `form_master_comment`:

**In EndOfTermReportTemplate.tsx**, the reportData should include:
```typescript
const reportData = {
  ...data[0],
  teacher_remark: data[0]?.form_master_comment || '',
  principal_remark: data[0]?.principal_remark || '',
  // ... other fields
};
```

This is already handled in the template at line 1294 where it checks:
```typescript
{(reportData.teacher_remark || reportData.principal_remark) && (
```

The issue is that `reportData` is built from `data[0]` which has `form_master_comment`, not `teacher_remark`.

### Quick Fix
The template should use `form_master_comment` instead of `teacher_remark`:

**Change line 1294-1300 in EndOfTermReportTemplate.tsx:**
```typescript
// Before
{(reportData.teacher_remark || reportData.principal_remark) && (
  <View style={styles.remarksSection}>
    {reportData.teacher_remark && (
      <View style={styles.remarksRow}>
        <Text style={styles.remarksLabel}>Teacher's Remark:</Text>
        <Text style={styles.remarksValue}>{reportData.teacher_remark}</Text>

// After
{(reportData.form_master_comment || reportData.principal_remark) && (
  <View style={styles.remarksSection}>
    {reportData.form_master_comment && (
      <View style={styles.remarksRow}>
        <Text style={styles.remarksLabel}>Teacher's Remark:</Text>
        <Text style={styles.remarksValue}>{reportData.form_master_comment}</Text>
```

---

## Issue 2: Personal Development Shows "-"

### Problem
All character traits show "-" instead of actual grades (A, B, C, etc.)

### Root Cause
No character scores have been recorded for the students yet.

### Current Status
- ✅ Character traits exist (11 traits in "All" section)
- ✅ Traits are fetched correctly
- ❌ No student assessments recorded

### What's Missing
Teachers need to assess students on these traits. The data should be in `character_scores` table:

```sql
SELECT * FROM character_scores 
WHERE school_id = 'SCH/20' 
  AND academic_year = '2025/2026' 
  AND term = 'First Term';
```

Expected: Records with `admission_no`, `trait_id`, `grade`, etc.  
Actual: Likely empty or no records for this term

### Solution
Teachers need to use the Character Assessment feature to grade students:

1. Navigate to: http://localhost:3000/academic/headmaster-score-sheet
2. Select class: JSS3 B
3. Click on each student
4. Fill in Character Assessment modal with grades (A-F) for each trait
5. Save

Once assessments are recorded, the report will show actual grades instead of "-".

---

## Testing

### Test Teacher Remark
1. Add a teacher remark for a student:
   - Go to End of Term Report page
   - Enter remark in the form
   - Save
2. Generate PDF
3. Verify "Teacher's Remark" section appears with the comment

### Test Character Scores
1. Add character assessments:
   - Go to Headmaster Score Sheet
   - Select JSS3 B
   - Click student "Usman Mukhtar Jae"
   - Fill grades for all 11 traits
   - Save
2. Generate PDF
3. Verify traits show grades (A, B, C) instead of "-"

---

**Status:** Identified - Needs Fix  
**Priority:** Medium  
**Impact:** Teacher remarks and character assessments not visible in reports
