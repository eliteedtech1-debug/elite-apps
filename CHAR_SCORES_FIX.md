# Character Scores Display Fix

## Problem
Character scores (Personal Development section) were showing as dashes (-) instead of the actual grades (A, B, C, etc.) even though the data exists in the database.

## Root Cause
The PDF generation was passing `characterScores` (the template/traits list) instead of the student-specific scores with grades. The template defines WHAT to assess, but the student scores contain the actual GRADES.

## Solution
Added `fetchStudentCharacterScores()` helper function that fetches student-specific character scores before PDF generation.

### Changes Made:
1. Added helper function to fetch student character scores by admission number
2. Updated `generatePdfForStudent()` to fetch and pass student-specific scores
3. Updated `generatePdfBlobForStudent()` to fetch and pass student-specific scores  
4. Updated bulk generation in `handleShareAllWhatsApp()` to fetch scores per student in loop
5. Updated dependency arrays to include the new helper function

### API Endpoint Used:
```
GET /character-scores?admission_no={admission_no}&academic_year={year}&term={term}
```

### Data Flow:
**Before:**
```
characterScores (template) → PDF → Shows dashes (-)
```

**After:**
```
fetchStudentCharacterScores(admission_no) → studentScores (with grades) → PDF → Shows A, B, C, etc.
```

## Testing
Generate a report for student `YMA/1/0025` and verify:
- AFFECTIVE BEHAVIORS section shows actual grades (B for CLASS ATTENDANCE, etc.)
- SKILL SETS section shows actual grades (C for ART & CRAFT, A for HAND WRITING, etc.)
- No more dashes (-) for traits that have been graded

## Note
The `downloadAllStudentsPdf()` standalone function still needs updating for bulk downloads, but single student PDFs and WhatsApp sharing now work correctly.
