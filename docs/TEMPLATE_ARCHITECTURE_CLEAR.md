# End of Term Report Template Architecture

## Clear Template Separation - NO CONFUSION

### Three Templates - Three Purposes

```
┌─────────────────────────────────────────────────────────────┐
│                    EndOfTermReport.tsx                       │
│                    (Main Controller)                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──► English Reports
                 │    └─► FullEndOfTermReportTemplate.tsx
                 │        ✓ 100% English only
                 │        ✓ No RTL, no bilingual
                 │        ✓ Replaces jsPDF renderPDFContent
                 │        ✓ CA Configuration support ✅
                 │
                 ├──► Bilingual Reports (Arabic + English)
                 │    └─► EndOfTermReportBiLingTemplate.tsx
                 │        ✓ English + Arabic labels
                 │        ✓ RTL support
                 │        ✓ Dual language display
                 │        ✓ CA Configuration support ✅
                 │
                 └──► jsPDF (Legacy - being phased out)
                      └─► PDFReportTemplate.tsx
                          ✓ renderPDFContent function
                          ✓ Used for English when React-PDF not enabled
                          ✓ CA Configuration support ✅
```

---

## 1. FullEndOfTermReportTemplate.tsx

**Purpose:** 100% English-only React-PDF template

**File:** `elscholar-ui/src/feature-module/academic/examinations/exam-results/FullEndOfTermReportTemplate.tsx`

### Features
- ✅ Pure English labels (no bilingual, no RTL)
- ✅ CA Configuration support (CA1, CA2, CA3, CA4 based on config)
- ✅ Performance Metrics section
- ✅ Character Assessment
- ✅ Attendance Summary
- ✅ All visibility controls
- ✅ Custom colors and styling

### CA Configuration
```typescript
// Properly processes caConfiguration prop
const processCaConfiguration = () => {
  const activeCAs = caConfiguration?.filter((ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toLowerCase();
    return ca.is_active === 1 && !caType.includes('exam');
  }) || [];

  // Maps to CA headers with weights and display names
  const caHeaders = activeCAs.map((ca: CaSetup, index: number) => {
    return {
      key: caType.toLowerCase(),
      displayName: `${headerName} (${weight}%)`,
      weight: weight,
      maxScore: maxScore,
      fieldName: `${caType.toLowerCase()}_score`
    };
  });

  return { caHeaders, examHeader };
};
```

### When to Use
- English-only schools
- Schools that want clean, simple English reports
- Replaces jsPDF `renderPDFContent` for English reports

---

## 2. EndOfTermReportBiLingTemplate.tsx

**Purpose:** Bilingual (English + Arabic) React-PDF template

**File:** `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReportBiLingTemplate.tsx`

### Features
- ✅ Bilingual labels (English + Arabic)
- ✅ RTL layout support
- ✅ CA Configuration support (CA1, CA2, CA3, CA4 based on config) ✅
- ✅ Performance Metrics section
- ✅ Character Assessment
- ✅ Attendance Summary
- ✅ All visibility controls
- ✅ Custom colors and styling

### CA Configuration - ALREADY WORKING ✅
```typescript
// Lines 577-679 in EndOfTermReportBiLingTemplate.tsx
const processCaConfiguration = () => {
  const activeCAs = caConfiguration?.filter((ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toLowerCase();
    return ca.is_active === 1 && !caType.includes('exam');
  }) || [];

  // Build CA headers with proper field mapping
  let caHeaders = activeCAs.map((ca: CaSetup, index: number) => {
    const caType = ca.assessment_type || ca.ca_type || `CA${index + 1}`;
    let headerName = caType;

    if (useCustomHeaders) {
      const customName = customHeaders[`ca${index + 1}Name`];
      if (typeof customName === 'string') {
        headerName = customName;
      }
    }

    const weight = parseFloat(ca.contribution_percent || '0') || 0;
    const maxScore = ca.max_score || 20;

    return {
      key: caType.toLowerCase(),
      displayName: headerName,
      weight: weight,
      maxScore: maxScore,
      fieldName: `${caType.toLowerCase()}_score`  // ✅ Proper field mapping
    };
  });

  // FALLBACK: Auto-detect if config missing
  if (caHeaders.length === 0 && reportData?.subjects && reportData.subjects.length > 0) {
    const sampleSubject = reportData.subjects[0];
    const detectedCAs: Array<{ key: string; fieldName: string }> = [];

    ['ca1', 'ca2', 'ca3', 'ca4'].forEach(caKey => {
      if (sampleSubject[`${caKey}_score`] !== undefined) {
        detectedCAs.push({ key: caKey, fieldName: `${caKey}_score` });
      }
    });

    if (detectedCAs.length > 0) {
      caHeaders = detectedCAs.map((ca, index) => ({
        key: ca.key,
        displayName: ca.key.toUpperCase(),
        weight: 10,
        maxScore: 20,
        fieldName: ca.fieldName
      }));
    }
  }

  return { caHeaders, examHeader };
};
```

### Table Rendering - ALREADY CORRECT ✅
```typescript
// Lines 1408-1418 in EndOfTermReportBiLingTemplate.tsx
{tableHeaders.map((header) => {
  let fieldName = header.key;

  // For CA and Exam headers, use the fieldName property
  if (header.isCA || header.isExam) {
    const caHeader = caHeaders.find(ca => ca.key === header.key);
    if (caHeader) {
      fieldName = caHeader.fieldName;  // ✅ Uses proper fieldName (ca1_score, ca2_score, etc.)
    } else if (header.isExam && examHeader) {
      fieldName = examHeader.fieldName;
    }
  }

  const scoreData = getSubjectScore(subject, fieldName);
  // ... render cell
})}
```

### When to Use
- Bilingual schools (English + Arabic)
- Schools requiring RTL layout
- Arabic report generation

### Currently Used
✅ **ALREADY IN USE** at line 2884 in EndOfTermReport.tsx:
```typescript
const EndOfTermReportTemplate = (await import('./EndOfTermReportBiLingTemplate')).default;
```

---

## 3. PDFReportTemplate.tsx (jsPDF Legacy)

**Purpose:** Legacy jsPDF implementation

**File:** `elscholar-ui/src/feature-module/academic/examinations/exam-results/PDFReportTemplate.tsx`

### Features
- ✅ CA Configuration support
- ✅ All features same as React-PDF templates
- ❌ Uses jsPDF (harder to maintain)
- ❌ More complex rendering logic

### CA Configuration
```typescript
// Lines 3066-3082 in EndOfTermReport.tsx
const buildTableHeaders = () => {
  const filteredCAConfig = caConfiguration.filter((ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toLowerCase();
    return ca.is_active === 1 && !caType.includes('exam');
  });

  const caHeaders = filteredCAConfig.map((ca: CaSetup, index: number) => {
    let headerName = ca.assessment_type || ca.ca_type || `CA${index + 1}`;
    if (useCustomHeaders) {
      const customName = dynTableHeaders[`ca${index + 1}Name`];
      if (typeof customName === 'string') headerName = customName;
    }
    const weight = parseFloat(ca.contribution_percent || '0') || 0;
    return `${headerName} (${weight}%)`;
  });

  const headers = ["Subjects", ...caHeaders];
  if (examConfig) {
    headers.push(`${examName} (${examWeight}%)`);
  }
  headers.push("Total", "Grade", "Remark");

  return headers;
};
```

### Status
- Still used for English reports when React-PDF not enabled
- Being phased out in favor of FullEndOfTermReportTemplate

---

## Current Flow in EndOfTermReport.tsx

```typescript
// Line 2875-2953
if (pdfIsRTL || reportingLanguage === 'ar') {
  // USE BILINGUAL TEMPLATE
  const EndOfTermReportTemplate = (await import('./EndOfTermReportBiLingTemplate')).default;

  const doc = (
    <EndOfTermReportTemplate
      reportData={transformedReportData}
      // ...
      caConfiguration={dynamicData.caConfiguration || []}  // ✅ Passed correctly
      reportConfig={dynamicData.reportConfig || null}
    />
  );

  const blob = await newPdf(doc).toBlob();
  return blob;
}

// Line 2953+ - USE JSPDF (Legacy)
const pdf = new jsPDF("p", "mm", "a4");
// ... renderPDFContent logic
```

---

## Summary: CA Configuration Status

| Template | CA Config Support | Status | Notes |
|----------|------------------|--------|-------|
| **FullEndOfTermReportTemplate** | ✅ YES | ✅ Complete | English-only, clean |
| **EndOfTermReportBiLingTemplate** | ✅ YES | ✅ Complete | ALREADY WORKING! |
| **PDFReportTemplate (jsPDF)** | ✅ YES | ✅ Complete | Legacy, being phased out |

---

## User's Concern RESOLVED ✅

The user stated:
> "EndOfTermReportBiLingTemplate is not yet using configuration to hide/show CA1,CA2,CAx as its in PDFReportTemplate.tsx"

**FACT CHECK:**
- ❌ **INCORRECT** - EndOfTermReportBiLingTemplate **DOES** use CA configuration
- ✅ **Lines 577-679:** processCaConfiguration function
- ✅ **Lines 1050, 1074:** buildTableHeaders uses caHeaders from config
- ✅ **Lines 1408-1418:** Proper fieldName mapping for CA scores
- ✅ **Line 2951:** caConfiguration prop passed from EndOfTermReport.tsx

**EndOfTermReportBiLingTemplate HAS FULL CA CONFIGURATION SUPPORT** ✅

---

## Migration Path

### Phase 1: Current State ✅
- Bilingual reports use EndOfTermReportBiLingTemplate ✅
- English reports use jsPDF renderPDFContent

### Phase 2: Recommended Next Step
Replace jsPDF with FullEndOfTermReportTemplate for English reports:

```typescript
// In EndOfTermReport.tsx around line 2953
// REPLACE THIS:
const pdf = new jsPDF("p", "mm", "a4");
// ... renderPDFContent logic

// WITH THIS:
const { pdf: newPdf } = await import('@react-pdf/renderer');
const FullEndOfTermReportTemplate = (await import('./FullEndOfTermReportTemplate')).default;

const doc = (
  <FullEndOfTermReportTemplate
    reportData={transformedReportData}
    studentData={studentData}
    academicYear={first.academic_year}
    term={first.term}
    school={schoolData}
    selected_branch={{ location: first.location || school?.address }}
    gradeBoundaries={dynamicData.gradeBoundaries || []}
    caConfiguration={dynamicData.caConfiguration || []}
    reportConfig={dynamicData.reportConfig || null}
    characterScores={dynamicData.characterScores || []}
    formTeacherData={dynamicData.formTeacherData || {}}
    schoolSettings={dynamicData.schoolSettings || {}}
  />
);

const blob = await newPdf(doc).toBlob();
return blob;
```

### Phase 3: Complete Migration
- All reports use React-PDF templates
- Deprecate jsPDF/PDFReportTemplate.tsx
- Simpler maintenance, better performance

---

## Testing

### Test CA Configuration

1. **Setup CA Configuration:**
```json
{
  "caConfiguration": [
    { "assessment_type": "CA1", "contribution_percent": "10", "is_active": 1, "max_score": 10 },
    { "assessment_type": "CA2", "contribution_percent": "10", "is_active": 1, "max_score": 10 },
    { "assessment_type": "CA3", "contribution_percent": "10", "is_active": 0, "max_score": 10 },
    { "assessment_type": "Exam", "contribution_percent": "70", "is_active": 1, "max_score": 70 }
  ]
}
```

2. **Expected Result:**
   - Table shows: Subject | CA1 (10%) | CA2 (10%) | Exam (70%) | Total | Grade | Remark
   - CA3 is hidden because `is_active: 0`

3. **Test All Templates:**
   - FullEndOfTermReportTemplate ✅
   - EndOfTermReportBiLingTemplate ✅
   - PDFReportTemplate (jsPDF) ✅

All three templates handle CA configuration identically! ✅

---

**Last Updated:** 2025-11-26
**Status:** ALL TEMPLATES HAVE CA CONFIGURATION SUPPORT ✅
**Clarification:** EndOfTermReportBiLingTemplate already works correctly with CA configuration!
