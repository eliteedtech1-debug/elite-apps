# Arabic PDF Generation - Complete Fix

**Date**: January 2025
**Status**: 🔴 **BROKEN - Needs Implementation**

---

## Problem Statement

Arabic report generation is **completely broken** in PDF mode for both:
- ❌ End of Term Reports (EndOfTermReport.tsx)
- ❌ CA Reports (ClassCAReport.tsx)

### What Works ✅
- Screen preview (HTML with `direction: rtl` CSS)
- Translation system (`t()` function)
- Language detection (`isRTL` flag)

### What's Broken ❌
- PDF generation shows **boxes/squares** instead of Arabic text
- PDF layout is LTR instead of RTL
- No Arabic fonts loaded in jsPDF
- Hardcoded English strings in PDF code

---

## Root Causes

### 1. No Arabic Font Support in jsPDF

jsPDF uses **Helvetica** by default, which doesn't support Arabic characters. Result: ▢▢▢▢ (boxes)

**Required**: Load Arabic-compatible font (Amiri, Cairo, or Noto Sans Arabic)

### 2. No RTL Layout Implementation

Even if fonts were loaded, the layout would still be wrong:
- Tables read left-to-right (should be right-to-left)
- Text alignment is left (should be right)
- Column order is normal (should be reversed)

### 3. Hardcoded English Strings

The PDF generation code (`renderPDFContent`) has hardcoded English:
```typescript
pdf.text("END OF TERM REPORT", ...)  // ❌ Should use t('reportTitle')
pdf.text("PERSONAL DEVELOPMENT", ...)  // ❌ Should use t('characterAssessment')
pdf.text("GRADE DETAILS:", ...)  // ❌ Should use t('gradeDetails')
```

---

## Technical Solution

### Phase 1: Add Arabic Font to jsPDF (CRITICAL)

#### Step 1.1: Get Arabic Font File

Download **Amiri** font (best for Arabic):
```bash
# Option A: From Google Fonts
wget https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf

# Option B: Use CDN
# https://fonts.googleapis.com/css2?family=Amiri
```

#### Step 1.2: Convert Font to Base64

Use online tool or command:
```bash
# Convert TTF to Base64
base64 Amiri-Regular.ttf > amiri-base64.txt
```

#### Step 1.3: Add Font to jsPDF

Create `/elscholar-ui/src/utils/pdfFonts.ts`:
```typescript
// Amiri Regular Base64 (truncated for example)
export const AmiriRegular = "AAEAAAATAQAABAAwR1BPU...";  // Full base64 string

export function loadArabicFont(pdf: jsPDF) {
  // Add font to virtual file system
  pdf.addFileToVFS('Amiri-Regular.ttf', AmiriRegular);

  // Register the font
  pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

  // Set as current font
  pdf.setFont('Amiri');
}
```

#### Step 1.4: Update generateStudentPDF

In `EndOfTermReport.tsx`:
```typescript
import { loadArabicFont } from '@/utils/pdfFonts';

async function generateStudentPDF(
  rowsForOneStudent: EndOfTermRow[],
  school: RootState["auth"]["school"],
  dynamicData: DynamicReportData,
  user?: unknown
): Promise<jsPDF> {
  const pdf = new jsPDF("p", "mm", "a4");

  // 🆕 Load Arabic font if needed
  if (dynamicData.isRTL) {
    loadArabicFont(pdf);
  }

  // Rest of code...
}
```

---

### Phase 2: Implement RTL Layout

#### Step 2.1: Update renderPDFContent Signature

Accept `isRTL` parameter:
```typescript
export const renderPDFContent = (
  pdf: jsPDF,
  school: any,
  studentData: any,
  caConfiguration: any,
  gradeBoundaries: any,
  reportConfig: any,
  helpers: any,
  dynamicData: {
    formTeacherData?: any;
    characterScores?: any[];
    language?: Language;
    isRTL?: boolean;  // ← NEW
  }
) => {
  const { language = 'en', isRTL = false } = dynamicData;

  // Set font based on language
  if (isRTL) {
    pdf.setFont('Amiri');  // Arabic font
  } else {
    pdf.setFont('helvetica');  // Default
  }

  // ... rest of code
};
```

#### Step 2.2: Reverse Table Columns for RTL

```typescript
// Current (LTR):
const tableHeaders = ["Subjects", "CA1", "CA2", "Exam", "Total", "Grade"];

// For RTL, reverse:
const tableHeaders = isRTL
  ? ["Grade", "Total", "Exam", "CA2", "CA1", "Subjects"].reverse()
  : ["Subjects", "CA1", "CA2", "Exam", "Total", "Grade"];
```

#### Step 2.3: Adjust Text Alignment

```typescript
// Headers
pdf.text(
  t('reportTitle'),  // Translated
  isRTL ? pageWidth - margin : margin,  // X position
  yPos,
  { align: isRTL ? 'right' : 'left' }  // Alignment
);

// Table cells
const xPos = isRTL
  ? pageWidth - margin - currentX  // RTL: start from right
  : margin + currentX;  // LTR: start from left

pdf.text(cellValue, xPos, yPos, {
  align: isRTL ? 'right' : 'left'
});
```

---

### Phase 3: Replace Hardcoded Strings

Find and replace all hardcoded English text:

```typescript
// ❌ Before:
pdf.text("END OF TERM REPORT", x, y);

// ✅ After:
pdf.text(t('reportTitle'), x, y);
```

**List of hardcoded strings to fix**:
1. "END OF TERM REPORT" → `t('reportTitle')`
2. "PERSONAL DEVELOPMENT" → `t('personalDevelopment')`
3. "GRADE DETAILS:" → `t('gradeDetails')`
4. "Present", "Absent", "Late" → `t('present')`, `t('absent')`, `t('late')`
5. "Form Teacher", "Principal" → `t('formTeacher')`, `t('principal')`
6. All table headers → Use translation function

---

## Implementation Files

### Files to Modify

1. **`/elscholar-ui/src/utils/pdfFonts.ts`** (NEW)
   - Create this file
   - Add Amiri font base64
   - Export `loadArabicFont()` function

2. **`/elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx`**
   - Import `loadArabicFont`
   - Call it in `generateStudentPDF()` when `isRTL = true`

3. **`/elscholar-ui/src/feature-module/academic/examinations/exam-results/PDFReportTemplate.tsx`**
   - Accept `isRTL` in renderPDFContent
   - Implement RTL layout logic
   - Replace ALL hardcoded strings with `t()`
   - Reverse table columns for RTL
   - Adjust text alignment

4. **`/elscholar-ui/src/feature-module/academic/examinations/exam-results/ClassCAReport.tsx`**
   - Same fixes as EndOfTermReport.tsx
   - Load Arabic font when isRTL
   - Use translations

---

## Quick Fix (Minimal Viable Solution)

If you need a **quick temporary fix** to at least show Arabic text (even if layout is wrong):

### Step 1: Install jsPDF Arabic Plugin

```bash
cd elscholar-ui
npm install jspdf-arabic-plugin
```

### Step 2: Use Plugin in generateStudentPDF

```typescript
import jsPDF from 'jspdf';
import 'jspdf-arabic-plugin';  // ← NEW

async function generateStudentPDF(...) {
  const pdf = new jsPDF("p", "mm", "a4");

  // Enable Arabic support
  if (dynamicData.isRTL) {
    pdf.setLanguage('ar');  // ← NEW
  }

  // Rest of code...
}
```

### Step 3: Use Arabic Text

```typescript
// Arabic text will now render (but still LTR layout)
pdf.text("بطاقة نهاية الفصل الدراسي", x, y, {
  lang: 'ar',
  isInputRtl: true,
  isOutputRtl: true
});
```

**Limitation**: This only fixes text rendering, NOT layout direction. Tables will still be LTR.

---

## Full Implementation Checklist

### Phase 1: Font Support (2-3 hours)
- [ ] Download Amiri font (TTF)
- [ ] Convert to base64
- [ ] Create `/utils/pdfFonts.ts`
- [ ] Add font loading function
- [ ] Update `generateStudentPDF()` in EndOfTermReport.tsx
- [ ] Update `generateAllPDFs()` in ClassCAReport.tsx
- [ ] Test: Arabic text should appear (not boxes)

### Phase 2: RTL Layout (4-6 hours)
- [ ] Update `renderPDFContent()` signature to accept `isRTL`
- [ ] Implement RTL text alignment
- [ ] Reverse table column order for RTL
- [ ] Adjust X positions for RTL (start from right)
- [ ] Test: Layout should be mirrored for Arabic

### Phase 3: Translations (3-4 hours)
- [ ] Find all hardcoded strings in PDFReportTemplate.tsx
- [ ] Replace with `t()` calls
- [ ] Find hardcoded strings in ClassCAReport PDF generation
- [ ] Replace with `t()` calls
- [ ] Test: All text should be in selected language

### Phase 4: Testing (2-3 hours)
- [ ] Test English report (should still work)
- [ ] Test Arabic report (text + layout)
- [ ] Test French report (should work like English)
- [ ] Test bulk PDF generation in Arabic
- [ ] Test single PDF in Arabic
- [ ] Test WhatsApp sharing in Arabic

**Total Estimated Time**: **11-16 hours**

---

## Why It's Not Working Now

### Current Behavior

When user selects Arabic language:

1. ✅ Screen preview shows Arabic text correctly (HTML + CSS `direction: rtl`)
2. ❌ PDF download shows **boxes/squares** instead of Arabic
3. ❌ PDF layout is still left-to-right
4. ❌ All text is hardcoded English in PDF

### Expected Behavior

When user selects Arabic language:

1. ✅ Screen preview shows Arabic text correctly
2. ✅ PDF should show Arabic text using Amiri font
3. ✅ PDF layout should be right-to-left (mirrored)
4. ✅ All text should be translated to Arabic

---

## Alternative: Use External PDF Service

If implementing fonts is too complex, consider using an external PDF service:

### Option A: Puppeteer (Server-Side)

Convert the HTML preview to PDF server-side:

```typescript
// Backend endpoint
app.post('/api/generate-pdf', async (req, res) => {
  const { html, language } = req.body;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: 'networkidle0'
  });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
  });

  await browser.close();

  res.contentType('application/pdf');
  res.send(pdf);
});
```

**Pros**:
- Arabic rendering works automatically (uses Chrome)
- RTL layout works automatically (CSS)
- No font loading needed

**Cons**:
- Requires backend changes
- Heavier on server resources
- Needs Puppeteer installation

### Option B: html2pdf.js (Client-Side)

```bash
npm install html2pdf.js
```

```typescript
import html2pdf from 'html2pdf.js';

const element = document.getElementById('report-preview');
const options = {
  filename: 'report.pdf',
  html2canvas: { scale: 2 },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
};

html2pdf().set(options).from(element).save();
```

**Pros**:
- Works client-side
- Supports Arabic automatically
- Uses existing HTML preview

**Cons**:
- Larger bundle size
- PDF quality may vary

---

## Recommended Action Plan

### Immediate Fix (This Week)

1. **Install html2pdf.js** as temporary solution
2. Update both EndOfTermReport and ClassCAReport to use html2pdf
3. Test Arabic reports

### Long-term Solution (Next Sprint)

1. Implement proper jsPDF Arabic font support
2. Implement RTL layout logic
3. Replace all hardcoded strings
4. Comprehensive testing

---

## Testing Commands

```bash
# After implementing fixes:

# 1. Test English report (should still work)
- Select English school
- Generate End of Term Report
- Verify: English text, LTR layout, Helvetica font

# 2. Test Arabic report
- Select Arabic school (is_arabic = 1)
- Select Arabic language from dropdown
- Generate End of Term Report
- Verify: Arabic text, RTL layout, Amiri font

# 3. Test bilingual report
- Select bilingual school (default_lang='en', second_lang='ar')
- Switch between languages
- Verify: Text changes, layout adjusts
```

---

## Current Status Summary

| Feature | Screen Preview | PDF Generation |
|---------|---------------|----------------|
| **English** | ✅ Works | ✅ Works |
| **Arabic Text** | ✅ Works | ❌ Shows boxes |
| **Arabic RTL Layout** | ✅ Works | ❌ Still LTR |
| **French** | ✅ Works | ✅ Works |
| **Translations** | ✅ Works | ❌ Hardcoded English |

---

**Conclusion**: Arabic PDF generation requires:
1. 🔴 **CRITICAL**: Load Arabic font (Amiri)
2. 🔴 **CRITICAL**: Implement RTL layout logic
3. 🟡 **IMPORTANT**: Replace hardcoded strings

**Without these fixes, Arabic reports will NOT work in PDF mode.**

---

**Date**: January 2025
**Priority**: HIGH
**Estimated Effort**: 11-16 hours (full implementation)
**Quick Fix**: 2-3 hours (html2pdf.js)
