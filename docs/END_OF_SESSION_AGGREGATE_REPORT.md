# End of Session Aggregate Report Implementation

## Overview
Implementation plan for adding "End of Session Aggregate Report" to the EndOfTermReport.tsx component. This report shows averaged CA and Exam scores across all 3 terms for the academic year.

## Key Requirements
- Only available when current term is "Third Term" or "3rd Term"
- Shows average of CA scores across all 3 terms
- Shows average of Exam scores across all 3 terms
- Filters by academic_year only (no term filter needed)

## Implementation Changes

### 1. Add Report Type Option (EndOfTermReport.tsx)
```typescript
// Around line 800-850, modify availableAssessmentTypes building:
if (term === "Third Term" || term === "3rd Term") {
  activeTypes.push({
    ca_type: 'END_OF_SESSION_AGGREGATE',
    label: 'End of Session Aggregate Report'
  });
}
```

### 2. Modify Data Fetching (EndOfTermReport.tsx)
```typescript
// In fetchClassData function, add this case:
} else if (selectedAssessmentType === "END_OF_SESSION_AGGREGATE") {
  endpoint = "reports/end_of_session_aggregate";
  requestData = {
    queryType: "class",
    classCode: selectedClass,
    academicYear, // Only academic_year, no term filter
  };
```

### 3. Backend Endpoint (New - Backend Team)
```sql
-- reports/end_of_session_aggregate endpoint should return:
SELECT 
  student_name,
  admission_no,
  class_name,
  subject,
  AVG(CASE WHEN assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4') THEN score END) as ca_score,
  AVG(CASE WHEN assessment_type = 'EXAM' THEN score END) as exam_score,
  (AVG(CASE WHEN assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4') THEN score END) * 0.4 + 
   AVG(CASE WHEN assessment_type = 'EXAM' THEN score END) * 0.6) as total_score
FROM student_assessments 
WHERE academic_year = ? AND class_code = ?
GROUP BY student_name, admission_no, subject;
```

### 4. Template Updates (EndOfTermReportTemplate.tsx)
```typescript
// In processCaConfiguration function:
if (assessmentType === "END_OF_SESSION_AGGREGATE") {
  return {
    caHeaders: [{ key: 'ca_average', displayName: 'CA Average', weight: 40, fieldName: 'ca_score' }],
    examHeader: { key: 'exam_average', displayName: 'Exam Average', weight: 60, fieldName: 'exam_score' }
  };
}

// Update report title:
{assessmentType === "END_OF_SESSION_AGGREGATE" ? "END OF SESSION AGGREGATE REPORT" : 
 assessmentType === "EXAM" ? "END OF TERM REPORT" : `${assessmentType} PROGRESS REPORT`}
```

## Files Modified
- `/elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx`
- `/elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReportTemplate.tsx`

## Backend Requirements
- New endpoint: `reports/end_of_session_aggregate`
- Should aggregate CA and Exam scores across all terms for the given academic year
- Return format should match existing `reports/end_of_term_report` structure

## Testing
1. Set current term to "Third Term"
2. Verify "End of Session Aggregate Report" appears in report type dropdown
3. Select the option and verify it calls the new endpoint
4. Verify report shows averaged scores across all terms

## Notes
- Only shows in 3rd term to prevent confusion
- Uses existing template infrastructure
- Minimal code changes to existing functionality
- Backend team needs to implement the aggregation endpoint
