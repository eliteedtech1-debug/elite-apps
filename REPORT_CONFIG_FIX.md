# Report Configuration Visibility Fix

## Problem
The report configuration API was returning visibility settings correctly, but they were being ignored in the PDF templates. Settings like `showStudentPhoto: false`, `showAttendancePerformance: false`, etc. were not being respected.

## Root Cause
The visibility checks in the templates were using `!== false` logic, which means:
- `reportConfig?.visibility?.showStudentPhoto !== false` evaluates to `true` even when the value is explicitly `false`
- This caused all sections to show regardless of the configuration

## Solution
Changed all visibility checks from `!== false` to `=== true` to properly respect explicit `false` values:

### Before
```typescript
{reportConfig?.visibility?.showStudentPhoto !== false && (
  // Show student photo
)}
```

### After
```typescript
{reportConfig?.visibility?.showStudentPhoto === true && (
  // Show student photo
)}
```

## Files Modified
1. `PDFReportTemplate.tsx` - Main PDF template
2. `PDFReportTemplate_RTL.tsx` - RTL version
3. `EndOfTermReport.tsx` - End of term report component
4. `EndOfTermReportBiLingTemplate.tsx` - Bilingual template
5. `UnifiedReportPDFTemplate.tsx` - Unified template
6. `ClassCAReportTemplate.tsx` - CA report template
7. `ClassCAReportTemplate_RTL.tsx` - CA report RTL template
8. `ClassCAReportPDF.tsx` - CA report PDF
9. `ClassCAReport.tsx` - CA report component

## Visibility Settings Fixed
- `showStudentPhoto` - Student photo display
- `showGradeDetails` - Grade boundary details
- `showCharacterAssessment` - Character/personal development section
- `showAttendancePerformance` - Attendance summary
- `showAttendanceDetails` - Detailed attendance breakdown
- `showTeacherRemarks` - Form teacher remarks section
- `showPrincipalRemarks` - Principal remarks section
- `showClassPosition` - Class position display
- `showSubjectPosition` - Subject-wise position
- `showSubjectAverage` - Subject average scores
- `showMotto` - School motto display
- `showNextTerm` - Next term date section

## Testing
After this fix, the API response visibility settings will be properly respected:
- When `showStudentPhoto: false`, the student photo will NOT be displayed
- When `showAttendancePerformance: false`, the attendance section will NOT be displayed
- All other visibility flags will work as expected

## Backup Files
All modified files have `.bak` backups created in the same directory.
