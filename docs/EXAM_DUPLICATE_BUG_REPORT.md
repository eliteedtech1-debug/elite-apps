# Root Cause Analysis: Duplicate "EXAMExam" Column Issue

## Problem Summary
The TransposedBroadSheet PDF was displaying duplicate EXAM columns: "CA1 CA2 EXAMExam" instead of "CA1 CA2 EXAM"

## Root Cause

The issue stemmed from **two separate sources adding EXAM columns**:

### Source 1: caConfiguration Loop
```javascript
caConfiguration.forEach((ca) => {
  const type = (ca.assessment_type || ca.ca_type || '').toUpperCase();
  if (type === 'EXAM') {
    headers.push({ key: 'exam_score', label: 'EXAM' }); // Added "EXAM"
  }
});
```

### Source 2: Unconditional Fallback
```javascript
// This ran AFTER the loop, regardless of whether EXAM was already added
headers.push({ key: 'exam_score', label: 'Exam' }); // Added "Exam"
```

**Result**: Both "EXAM" (from caConfiguration) and "Exam" (from fallback) were added.

## Why Deduplication Failed Initially

Several attempts to fix this failed because:

1. **Case sensitivity**: Checking `type !== 'EXAM'` but caConfiguration had variations like `assessment_type: "EXAM"` vs `ca_type: "Exam"`

2. **Field name inconsistency**: caConfiguration uses both `assessment_type` and `ca_type` depending on source:
   - API response: `assessment_type: "EXAM"`
   - Frontend state: `ca_type: "EXAM"`

3. **Deduplication by key vs label**: Using `Set` to track `key` values worked, but the unconditional fallback was outside the conditional block

4. **Logic placement**: The fallback `headers.push({ key: 'exam_score', label: 'Exam' })` was placed outside the if/else, causing it to always execute

## Data Flow

```
API Response (caConfiguration):
[
  { "assessment_type": "CA1", "contribution_percent": "15.00" },
  { "assessment_type": "CA2", "contribution_percent": "15.00" },
  { "assessment_type": "EXAM", "contribution_percent": "60.00" }
]
     ↓
EndOfTermReport.tsx passes to TransposedBroadSheetTemplate
     ↓
buildAssessmentHeaders() processes caConfiguration
     ↓
Loop adds: CA1, CA2, EXAM (from caConfiguration)
     ↓
Fallback adds: Exam (unconditionally) ← BUG
     ↓
Result: CA1, CA2, EXAM, Exam (duplicate!)
```

## Solution Applied

```javascript
const buildAssessmentHeaders = () => {
  const headers = [];
  const addedKeys = new Set(); // Track added keys
  
  if (caConfiguration?.length > 0) {
    // Sort: CAs first, EXAM last
    const sorted = [...caConfiguration].sort((a, b) => {
      const typeA = (a.assessment_type || a.ca_type || '').toUpperCase();
      const typeB = (b.assessment_type || b.ca_type || '').toUpperCase();
      if (typeA === 'EXAM') return 1;
      if (typeB === 'EXAM') return -1;
      return typeA.localeCompare(typeB);
    });
    
    sorted.forEach((ca) => {
      const type = (ca.assessment_type || ca.ca_type || '').toUpperCase();
      if (!type) return;
      
      const key = type === 'EXAM' ? 'exam_score' : `${type.toLowerCase()}_score`;
      if (addedKeys.has(key)) return; // Skip duplicates
      addedKeys.add(key);
      
      headers.push({ key, label: type === 'EXAM' ? 'EXAM' : type });
    });
  } else {
    // Fallback only when NO caConfiguration
    headers.push({ key: 'ca1_score', label: 'CA1' });
    headers.push({ key: 'ca2_score', label: 'CA2' });
    headers.push({ key: 'exam_score', label: 'EXAM' });
  }
  
  return headers; // No unconditional EXAM addition
};
```

## Key Fixes

| Issue | Fix |
|-------|-----|
| Duplicate EXAM | Removed unconditional fallback outside if/else |
| Case mismatch | Normalize to uppercase: `type.toUpperCase()` |
| Field name variance | Check both: `ca.assessment_type \|\| ca.ca_type` |
| Label consistency | Use 'EXAM' (uppercase) everywhere |
| Data includes unused CAs | Filter data transformation by caConfiguration |

## Files Modified

1. **TransposedBroadSheetTemplate.tsx** - Fixed `buildAssessmentHeaders()` logic
2. **EndOfTermReport.tsx** - Filter data to only include active CAs from caConfiguration

## Current Status
Issue persists - needs further investigation by reviewing the actual runtime values of caConfiguration being passed to the template.
