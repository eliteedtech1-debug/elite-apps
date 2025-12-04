# Arabic Report Quick Start Guide
## Fast Implementation in 10 Steps

This is a simplified, step-by-step guide to implement Arabic report support quickly.

---

## 🚀 Quick Implementation (Minimum Viable Product)

### **Prerequisites**
- Backend API running
- Frontend running
- MySQL database access
- VS Code or your preferred editor

---

### **Step 1: Database Update** (2 minutes)

```sql
-- Add is_arabic column to schools table
ALTER TABLE schools
ADD COLUMN is_arabic TINYINT(1) DEFAULT 0
COMMENT 'Enable Arabic report support: 0=English only, 1=Arabic enabled';

-- Enable Arabic for specific schools (example)
UPDATE schools
SET is_arabic = 1
WHERE school_id = 'YOUR_ARABIC_SCHOOL_ID';

-- Verify
SELECT school_id, school_name, is_arabic FROM schools WHERE is_arabic = 1;
```

---

### **Step 2: Create Translation Files** (15 minutes)

Create folder: `elscholar-ui/src/locales/`

**File 1**: `elscholar-ui/src/locales/en.ts`
```typescript
export const en = {
  // Basic labels
  reportTitle: 'END OF TERM REPORT',
  studentName: 'Student Name',
  admissionNo: 'Admission No',
  class: 'Class',
  session: 'Session',
  term: 'Term',

  // Table headers
  subjects: 'Subjects',
  ca1: 'CA1',
  ca2: 'CA2',
  ca3: 'CA3',
  ca4: 'CA4',
  exam: 'Exam',
  total: 'Total',
  grade: 'Grade',
  position: 'Position',
  remark: 'Remark',

  // Stats
  noInClass: 'No. in Class',
  totalScore: 'Total Score',
  finalAverage: 'Final Average',
  classAverage: 'Class Average',
  classPosition: 'Class Position',

  // Terms
  firstTerm: 'First Term',
  secondTerm: 'Second Term',
  thirdTerm: 'Third Term',
};
```

**File 2**: `elscholar-ui/src/locales/ar.ts`
```typescript
export const ar = {
  // Basic labels
  reportTitle: 'تقرير نهاية الفصل الدراسي',
  studentName: 'اسم الطالب',
  admissionNo: 'رقم القبول',
  class: 'الصف',
  session: 'الدورة',
  term: 'الفصل',

  // Table headers
  subjects: 'المواد',
  ca1: 'التقييم 1',
  ca2: 'التقييم 2',
  ca3: 'التقييم 3',
  ca4: 'التقييم 4',
  exam: 'الامتحان',
  total: 'المجموع',
  grade: 'الدرجة',
  position: 'الترتيب',
  remark: 'الملاحظة',

  // Stats
  noInClass: 'عدد الطلاب',
  totalScore: 'الدرجة الإجمالية',
  finalAverage: 'المعدل النهائي',
  classAverage: 'معدل الصف',
  classPosition: 'الترتيب في الصف',

  // Terms
  firstTerm: 'الفصل الأول',
  secondTerm: 'الفصل الثاني',
  thirdTerm: 'الفصل الثالث',
};
```

**File 3**: `elscholar-ui/src/locales/index.ts`
```typescript
import { en } from './en';
import { ar } from './ar';

export type Language = 'en' | 'ar';
export type TranslationKey = keyof typeof en;

const translations = { en, ar };

export const t = (key: TranslationKey, lang: Language = 'en'): string => {
  return translations[lang][key] || translations.en[key] || key;
};

export { en, ar };
```

---

### **Step 3: Create Translation Hook** (5 minutes)

Create: `elscholar-ui/src/hooks/useReportLanguage.ts`

```typescript
import { useMemo } from 'react';
import { t, Language, TranslationKey } from '../locales';

export const useReportLanguage = (school: any) => {
  const language: Language = school?.is_arabic === 1 ? 'ar' : 'en';
  const isRTL = language === 'ar';

  const translate = useMemo(() => {
    return (key: string) => t(key as TranslationKey, language);
  }, [language]);

  return { language, isRTL, t: translate };
};
```

---

### **Step 4: Update EndOfTermReport.tsx** (20 minutes)

Open: `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx`

**4.1: Add imports at the top:**
```typescript
import { useReportLanguage } from '../../../hooks/useReportLanguage';
import type { Language } from '../../../locales';
```

**4.2: Add state and hook inside the component (around line 308):**
```typescript
// After: const cur_school = useSelector((s: RootState) => s.auth.school);
const { language: defaultLanguage, isRTL, t } = useReportLanguage(cur_school);
const [reportLanguage, setReportLanguage] = useState<Language>(defaultLanguage);
```

**4.3: Add language selector in the UI (around line 2070, after the Term selector):**
```typescript
{/* Language Selector - Only for Arabic schools */}
{cur_school?.is_arabic === 1 && (
  <Col xs={24} sm={12} md={4}>
    <div>
      <div className="flex items-center mb-3">
        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mr-2">
          <FileText className="text-purple-600" size={16} />
        </div>
        <label className="font-semibold text-gray-700 mb-0">Report Language</label>
      </div>
      <Select
        value={reportLanguage}
        onChange={(value) => setReportLanguage(value)}
        style={{ width: '100%', height: '46px' }}
        placeholder="Select Language"
      >
        <Option value="en">English</Option>
        <Option value="ar">العربية (Arabic)</Option>
      </Select>
    </div>
  </Col>
)}
```

**4.4: Pass language to PDF generation (find all occurrences of `dynamicData` object and add language):**

Search for: `const dynamicData = {`

Add these two lines to the dynamicData object:
```typescript
const dynamicData = {
  gradeBoundaries,
  characterScores,
  formTeacherData,
  schoolSettings,
  reportConfig,
  caConfiguration,
  tableHeaders: reportConfig?.tableHeaders,
  trueClassAverage,
  language: reportLanguage,  // ← ADD THIS
  isRTL: reportLanguage === 'ar',  // ← ADD THIS
};
```

Do this for ALL dynamicData objects (there are 3-4 occurrences).

---

### **Step 5: Update DynamicReportData Interface** (2 minutes)

In `EndOfTermReport.tsx`, find the `DynamicReportData` interface (around line 55) and add:

```typescript
interface DynamicReportData {
  gradeBoundaries: GradeBoundary[];
  characterScores: CharacterScore[];
  formTeacherData: FormTeacherData;
  schoolSettings: SchoolSetting;
  reportConfig: ReportConfig | null;
  caConfiguration: CaSetup[];
  tableHeaders: TableHeaders | undefined;
  language?: Language;  // ← ADD THIS
  isRTL?: boolean;  // ← ADD THIS
}
```

---

### **Step 6: Simple PDF Translation** (30 minutes)

Open: `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx`

Find the `generateStudentPDF` function (around line 2598) and update it:

**6.1: Extract language from dynamicData:**
```typescript
const {
  formTeacherData,
  characterScores = [],
  caConfiguration: dynCaConfiguration = [],
  tableHeaders: dynTableHeaders,
  gradeBoundaries = [],
  trueClassAverage,
  language = 'en',  // ← ADD THIS
  isRTL = false,  // ← ADD THIS
} = dynamicData;
```

**6.2: Add translation helper:**
```typescript
// After extracting language
import { t as translateFn } from '../../../locales';
const translate = (key: string) => translateFn(key as any, language);
```

**6.3: Update text rendering (example for student info section):**

Find where student info is rendered and wrap labels with translate():

```typescript
// Before:
pdf.text(`Name: ${first.student_name}`, x, y);
pdf.text(`Admission No: ${first.admission_no}`, x, y + 5);
pdf.text(`Class: ${first.class_name}`, x, y + 10);

// After:
pdf.text(`${translate('studentName')}: ${first.student_name}`, x, y);
pdf.text(`${translate('admissionNo')}: ${first.admission_no}`, x, y + 5);
pdf.text(`${translate('class')}: ${first.class_name}`, x, y + 10);
```

**6.4: Update table headers:**

Find the `buildTableHeaders` function and translate headers:

```typescript
const buildTableHeaders = () => {
  // ... existing code ...

  // After building headers array
  const translatedHeaders = headers.map(header => {
    const lower = header.toLowerCase();
    if (lower.includes('subject')) return translate('subjects');
    if (lower.includes('ca1')) return translate('ca1');
    if (lower.includes('ca2')) return translate('ca2');
    if (lower.includes('ca3')) return translate('ca3');
    if (lower.includes('ca4')) return translate('ca4');
    if (lower.includes('exam')) return translate('exam');
    if (lower.includes('total')) return translate('total');
    if (lower.includes('grade')) return translate('grade');
    if (lower.includes('position')) return translate('position');
    if (lower.includes('remark')) return translate('remark');
    return header;
  });

  return translatedHeaders;
};
```

---

### **Step 7: Basic RTL Support** (15 minutes)

**Option A: Simple Text Alignment** (Quick and Easy)

In the `generateStudentPDF` function, adjust text rendering based on RTL:

```typescript
// Helper function for text positioning
const renderText = (text: string, x: number, y: number, options = {}) => {
  if (isRTL) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.text(text, pageWidth - x, y, { align: 'right', ...options });
  } else {
    pdf.text(text, x, y, { ...options });
  }
};

// Use it throughout:
renderText(`${translate('studentName')}: ${first.student_name}`, margin, yPos);
renderText(`${translate('admissionNo')}: ${first.admission_no}`, margin, yPos + 5);
```

**Option B: Full RTL Layout** (Better but More Work)

Create a layout helper:

```typescript
const getLayout = () => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 4;

  if (isRTL) {
    return {
      startX: pageWidth - margin,
      textAlign: 'right',
      direction: -1, // for calculations
    };
  }

  return {
    startX: margin,
    textAlign: 'left',
    direction: 1,
  };
};

const layout = getLayout();
```

---

### **Step 8: Test Basic Functionality** (10 minutes)

1. **Restart both servers:**
   ```bash
   # Backend
   cd elscholar-api && npm run dev

   # Frontend
   cd elscholar-ui && npm start
   ```

2. **Test English School:**
   - Login with a school where `is_arabic = 0`
   - Go to End of Term Report
   - Should NOT see language selector
   - Generate PDF → Should be in English

3. **Test Arabic School:**
   - Login with a school where `is_arabic = 1`
   - Go to End of Term Report
   - Should SEE language selector
   - Select "English" → Generate PDF → Should be in English
   - Select "العربية" → Generate PDF → Should have Arabic labels

---

### **Step 9: Add Arabic Font (Optional but Recommended)** (30 minutes)

**Skip this step for MVP - English fonts work for testing**

For production with proper Arabic text rendering:

1. Download font: https://fonts.google.com/specimen/Amiri
2. Convert to Base64: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
3. Create `elscholar-ui/src/utils/arabicFont.ts`:

```typescript
export const AMIRI_NORMAL = 'base64_font_string_here';
export const AMIRI_BOLD = 'base64_font_string_here';

export const addArabicFont = (pdf: any) => {
  pdf.addFileToVFS('Amiri-Regular.ttf', AMIRI_NORMAL);
  pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

  pdf.addFileToVFS('Amiri-Bold.ttf', AMIRI_BOLD);
  pdf.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
};
```

4. Use in PDF generation:

```typescript
if (language === 'ar') {
  addArabicFont(pdf);
  pdf.setFont('Amiri', 'normal');
}
```

---

### **Step 10: Deploy** (5 minutes)

```bash
# 1. Commit changes
git add .
git commit -m "feat: Add Arabic report support with language toggle"

# 2. Push to staging
git push origin develop

# 3. Test on staging
# - Test both English and Arabic schools
# - Verify PDF downloads

# 4. Push to production
git push origin main
```

---

## 📊 What You Should See

### **English School (is_arabic = 0)**
- ✅ No language selector visible
- ✅ Report always in English
- ✅ No changes to existing behavior

### **Arabic School (is_arabic = 1)**
- ✅ Language selector visible (English | العربية)
- ✅ Can switch between languages
- ✅ English option: Report in English (default behavior)
- ✅ Arabic option: Report labels in Arabic

### **PDF Output (Arabic selected)**
- ✅ Headers translated: "Student Name" → "اسم الطالب"
- ✅ Table headers translated: "Subjects" → "المواد"
- ✅ Stats translated: "Total Score" → "الدرجة الإجمالية"
- ⚠️ Student names unchanged (as entered in database)
- ⚠️ Numbers in English numerals (until font is added)

---

## 🐛 Common Issues & Fixes

### Issue 1: Language selector not showing
**Problem**: School has `is_arabic = 1` but selector doesn't appear
**Solution**:
- Check Redux state: `console.log(cur_school?.is_arabic)`
- Verify database: `SELECT is_arabic FROM schools WHERE school_id = 'XXX'`
- Clear browser cache and refresh

### Issue 2: Translations not working
**Problem**: Labels still in English when Arabic selected
**Solution**:
- Check import: `import { t } from '../../../locales';`
- Verify language passed to dynamicData
- Check console for errors

### Issue 3: Arabic text shows as boxes
**Problem**: PDF shows squares instead of Arabic characters
**Solution**:
- This is expected without Arabic font
- For MVP: Use English labels
- For production: Add Arabic font (Step 9)

### Issue 4: RTL not working
**Problem**: Text still left-aligned in Arabic
**Solution**:
- Ensure `isRTL` is passed to dynamicData
- Check text rendering uses `isRTL` flag
- May need more work on layout (see full strategy)

---

## ⏱️ Time Estimates

- **MVP (English labels only)**: 1 hour
- **MVP + Basic Arabic labels**: 2 hours
- **MVP + Arabic + RTL**: 4 hours
- **Full Production (with font)**: 6-8 hours

---

## 📚 Next Steps

After MVP is working:
1. Add more translations (character assessment, remarks, etc.)
2. Implement proper RTL layout
3. Add Arabic font for better rendering
4. Test with real Arabic schools
5. Get user feedback
6. Iterate and improve

---

## 🎯 Success Criteria

**MVP is successful if:**
- ✅ English schools unchanged
- ✅ Arabic schools can see language toggle
- ✅ Can switch between English/Arabic
- ✅ Arabic version has translated labels
- ✅ No errors in console
- ✅ PDF downloads successfully

**Production-ready when:**
- ✅ All above +
- ✅ Proper Arabic font rendering
- ✅ Full RTL layout
- ✅ All sections translated
- ✅ Tested with 5+ Arabic schools
- ✅ Performance optimized

---

## 💬 Get Help

If stuck:
1. Check full strategy: `ARABIC_REPORT_IMPLEMENTATION_STRATEGY.md`
2. Review jsPDF docs: https://github.com/parallax/jsPDF
3. Test with console.log() to debug
4. Check browser console for errors

Good luck! 🚀
