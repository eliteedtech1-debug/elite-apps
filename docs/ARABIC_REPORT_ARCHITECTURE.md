# Arabic Report System Architecture
## Visual Guide & Data Flow

This document provides visual representations and detailed architecture of the Arabic report implementation.

---

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (EndOfTermReport.tsx)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │   School Check       │  │  Language Selector           │   │
│  │   is_arabic = ?      │  │  [English | العربية]         │   │
│  │                      │  │  (only if is_arabic = 1)     │   │
│  │  if 0: English only  │  │                              │   │
│  │  if 1: Show selector │  │  onChange: setReportLanguage │   │
│  └──────────────────────┘  └──────────────────────────────┘   │
│                                                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRANSLATION LAYER                           │
│                  (useReportLanguage Hook)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: school object                                           │
│  Output: { language, isRTL, t }                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  if school.is_arabic === 1:                            │   │
│  │    → language = 'ar'                                   │   │
│  │    → isRTL = true                                      │   │
│  │    → t = translate function with 'ar'                  │   │
│  │                                                        │   │
│  │  else:                                                 │   │
│  │    → language = 'en'                                   │   │
│  │    → isRTL = false                                     │   │
│  │    → t = translate function with 'en'                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSLATION FILES                             │
│                  (/src/locales/*.ts)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   en.ts          │              │   ar.ts          │        │
│  │  (English)       │              │   (Arabic)       │        │
│  ├──────────────────┤              ├──────────────────┤        │
│  │ reportTitle:     │              │ reportTitle:     │        │
│  │  "END OF TERM    │              │  "تقرير نهاية   │        │
│  │   REPORT"        │              │   الفصل"         │        │
│  │                  │              │                  │        │
│  │ studentName:     │              │ studentName:     │        │
│  │  "Student Name"  │              │  "اسم الطالب"   │        │
│  │                  │              │                  │        │
│  │ total: "Total"   │              │ total: "المجموع" │        │
│  └──────────────────┘              └──────────────────┘        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  index.ts                                              │   │
│  │  • Exports t(key, lang) function                       │   │
│  │  • Maps key to translation based on language           │   │
│  │  • Fallback to English if key not found                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PDF GENERATION                                │
│                  (generateStudentPDF)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: studentData, school, dynamicData { language, isRTL }   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  1. Extract language and isRTL from dynamicData        │   │
│  │  2. Create translate function: t(key) → translation    │   │
│  │  3. Load Arabic font if language === 'ar'              │   │
│  │  4. Set text direction based on isRTL                  │   │
│  │  5. Translate all labels using t(key)                  │   │
│  │  6. Adjust layout for RTL if needed                    │   │
│  │  7. Generate PDF with translated content               │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PDF OUTPUT                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  if language === 'en':                                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  END OF TERM REPORT                                    │   │
│  │  ────────────────────────────────                      │   │
│  │  Student Name: Ahmad Abdullah                          │   │
│  │  Admission No: 2024/001                                │   │
│  │  Class: SS 2                                           │   │
│  │                                                        │   │
│  │  Subjects | CA1 | CA2 | Exam | Total | Grade          │   │
│  │  ──────────────────────────────────────────            │   │
│  │  Math     | 18  | 16  | 65   | 99    | A              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  if language === 'ar':                                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                            تقرير نهاية الفصل الدراسي   │   │
│  │                      ──────────────────────────────────  │   │
│  │                          اسم الطالب: أحمد عبدالله      │   │
│  │                                 رقم القبول: 2024/001   │   │
│  │                                    الصف: SS 2          │   │
│  │                                                        │   │
│  │  الملاحظة | الدرجة | المجموع | الامتحان | ت2 | ت1 | المواد │
│  │  ──────────────────────────────────────────────────────  │   │
│  │      A    |   99   |   65   |  16  | 18 |  الرياضيات  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Sequence

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌─────────────────────────────────┐
│ 1. User accesses report page    │
│    Component: EndOfTermReport   │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 2. Redux fetches school data            │
│    cur_school = useSelector(...)        │
│    Contains: is_arabic field            │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 3. Hook determines language             │
│    useReportLanguage(cur_school)        │
│    Returns: { language, isRTL, t }      │
└────┬────────────────────────────────────┘
     │
     ├────────────────┬────────────────┐
     │                │                │
     ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌──────────┐
│ is_arabic│    │is_arabic │    │ is_arabic│
│   = 0   │    │   = 1    │    │   = 1   │
│         │    │          │    │          │
│ language│    │ language │    │ language │
│  = 'en' │    │  = 'en'  │    │  = 'ar' │
│         │    │ (default)│    │(selected)│
│ NO      │    │          │    │          │
│ SELECTOR│    │ SHOW     │    │ SHOW    │
│         │    │ SELECTOR │    │ SELECTOR │
└────┬────┘    └────┬─────┘    └────┬─────┘
     │              │               │
     │              │               │
     └──────┬───────┴───────┬───────┘
            │               │
            ▼               ▼
┌────────────────────────────────────────┐
│ 4. User clicks "Generate PDF"          │
│    Calls: handleDownloadSingle(row)    │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 5. Prepare dynamic data                │
│    dynamicData = {                     │
│      gradeBoundaries,                  │
│      characterScores,                  │
│      ...                               │
│      language: reportLanguage,    ← ✓  │
│      isRTL: reportLanguage==='ar' ← ✓  │
│    }                                   │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 6. Call PDF generation                 │
│    generateStudentPDF(                 │
│      studentRows,                      │
│      cur_school,                       │
│      dynamicData                       │
│    )                                   │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 7. Extract language in PDF function    │
│    const { language, isRTL } =         │
│      dynamicData;                      │
│    const translate = (key) =>          │
│      t(key, language);                 │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 8. Translate all text                  │
│    Example:                            │
│    • "Student Name" → translate('...') │
│    • "Total Score" → translate('...')  │
│    • "Class" → translate('class')      │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 9. Apply RTL layout (if isRTL)         │
│    • Reverse table columns             │
│    • Right-align text                  │
│    • Flip horizontal positions         │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 10. Render PDF with jsPDF              │
│     • Add Arabic font (if ar)          │
│     • Draw translated content          │
│     • Apply RTL transformations        │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ 11. Download PDF                       │
│     filename: StudentName_Term.pdf     │
└────┬───────────────────────────────────┘
     │
     ▼
┌──────────┐
│   END    │
└──────────┘
```

---

## 📁 File Structure

```
elscholar-ui/
├── src/
│   ├── locales/                          ← NEW
│   │   ├── index.ts                      ← Main translation interface
│   │   ├── en.ts                         ← English translations
│   │   └── ar.ts                         ← Arabic translations
│   │
│   ├── hooks/
│   │   └── useReportLanguage.ts          ← NEW: Language hook
│   │
│   ├── utils/
│   │   └── pdfFonts.ts                   ← NEW (optional): Arabic fonts
│   │
│   └── feature-module/
│       └── academic/
│           └── examinations/
│               └── exam-results/
│                   ├── EndOfTermReport.tsx      ← MODIFY: Add selector
│                   └── PDFReportTemplate.tsx    ← MODIFY: Add translation
│
elscholar-api/
└── database/
    └── migrations/
        └── add_is_arabic_to_schools.sql  ← NEW: Database update
```

---

## 🎨 Component Hierarchy

```
EndOfTermReport Component
│
├─ Redux State
│  └─ cur_school { is_arabic, school_name, ... }
│
├─ Local State
│  ├─ reportLanguage: 'en' | 'ar'
│  ├─ classRows: [...student data...]
│  ├─ gradeBoundaries: [...]
│  └─ ...other state
│
├─ Hooks
│  ├─ useReportLanguage(cur_school)
│  │  └─ Returns: { language, isRTL, t }
│  │
│  └─ useEffect (fetch data)
│
├─ UI Elements
│  │
│  ├─ Filter Section
│  │  ├─ Class Selector
│  │  ├─ Academic Year
│  │  ├─ Term
│  │  └─ Language Selector ← NEW (conditional)
│  │     └─ if (cur_school.is_arabic === 1)
│  │        render <Select>
│  │          <Option value="en">English</Option>
│  │          <Option value="ar">العربية</Option>
│  │        </Select>
│  │
│  ├─ Data Table
│  │  └─ Shows student list with scores
│  │
│  └─ Action Buttons
│     ├─ Download Single PDF
│     ├─ Download All PDFs
│     └─ Share WhatsApp
│
└─ PDF Generation Functions
   │
   ├─ handleDownloadSingle(row)
   │  └─ Calls generateStudentPDF()
   │     └─ Passes dynamicData with language & isRTL
   │
   ├─ handleDownloadAll()
   │  └─ Loops through students
   │     └─ Calls generateStudentPDF() for each
   │
   └─ generateStudentPDF(data, school, dynamicData)
      │
      ├─ Extract language from dynamicData
      ├─ Create translate function
      ├─ Load Arabic font (if needed)
      │
      ├─ Render Header
      │  ├─ School name
      │  ├─ Address
      │  └─ Report title ← translate('reportTitle')
      │
      ├─ Render Student Info
      │  ├─ Name ← translate('studentName')
      │  ├─ Admission No ← translate('admissionNo')
      │  ├─ Class ← translate('class')
      │  └─ Term ← translate('term')
      │
      ├─ Render Table
      │  ├─ Headers ← translate each header
      │  ├─ Rows ← student scores
      │  └─ Apply RTL if needed
      │
      ├─ Render Summary
      │  ├─ Total Score ← translate('totalScore')
      │  ├─ Class Average ← translate('classAverage')
      │  └─ Position ← translate('position')
      │
      └─ Return PDF object
```

---

## 🔧 Key Functions & Their Roles

### 1. **useReportLanguage Hook**
```typescript
Location: /src/hooks/useReportLanguage.ts
Purpose: Determine report language based on school settings
Input: school object { is_arabic, ... }
Output: { language: 'en'|'ar', isRTL: boolean, t: function }

Logic:
  if (school.is_arabic === 1)
    → language = 'ar'
    → isRTL = true
  else
    → language = 'en'
    → isRTL = false
```

### 2. **Translation Function (t)**
```typescript
Location: /src/locales/index.ts
Purpose: Get translated text for a given key
Input: (key: string, language: 'en'|'ar')
Output: translated string

Example:
  t('studentName', 'en') → "Student Name"
  t('studentName', 'ar') → "اسم الطالب"
  t('unknownKey', 'ar') → "unknownKey" (fallback)
```

### 3. **generateStudentPDF**
```typescript
Location: EndOfTermReport.tsx (line ~2598)
Purpose: Generate PDF report for a single student
Input:
  - studentRows: array of subject scores
  - school: school information
  - dynamicData: { language, isRTL, gradeBoundaries, ... }

Process:
  1. Extract language and isRTL
  2. Create translate helper: key → translated text
  3. Load Arabic font if language === 'ar'
  4. Render all sections with translated labels
  5. Apply RTL layout if isRTL === true
  6. Return jsPDF object

Output: PDF blob ready for download
```

### 4. **buildTableHeaders**
```typescript
Location: EndOfTermReport.tsx (line ~2719)
Purpose: Build table header array with translations
Input: caConfiguration, tableHeaders config
Output: Array of translated header strings

Example Output (English):
  ['Subjects', 'CA1 (20%)', 'CA2 (20%)', 'Exam (60%)', 'Total', 'Grade']

Example Output (Arabic):
  ['المواد', 'ت1 (20%)', 'ت2 (20%)', 'الامتحان (60%)', 'المجموع', 'الدرجة']
```

---

## 🗄️ Database Schema

```sql
-- schools table
CREATE TABLE schools (
  school_id VARCHAR(50) PRIMARY KEY,
  school_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  is_arabic TINYINT(1) DEFAULT 0, ← NEW COLUMN
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_is_arabic ON schools(is_arabic);
```

### Query Examples:
```sql
-- Get all Arabic schools
SELECT school_id, school_name, is_arabic
FROM schools
WHERE is_arabic = 1;

-- Enable Arabic for a school
UPDATE schools
SET is_arabic = 1
WHERE school_id = 'SCHOOL123';

-- Check school language setting
SELECT is_arabic FROM schools WHERE school_id = 'SCHOOL123';
```

---

## 🎯 Decision Points

```
User Opens Report Page
         │
         ▼
   ┌─────────────┐
   │ Load School │
   │    Data     │
   └──────┬──────┘
          │
          ▼
   ┌──────────────────┐
   │ Check is_arabic  │
   └──────┬───────────┘
          │
    ┌─────┴──────┐
    │            │
    ▼            ▼
is_arabic=0  is_arabic=1
    │            │
    │            ▼
    │     ┌─────────────┐
    │     │Show Language│
    │     │  Selector   │
    │     └──────┬──────┘
    │            │
    │      ┌─────┴──────┐
    │      │            │
    │      ▼            ▼
    │  Select En    Select Ar
    │      │            │
    └──────┴────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Generate PDF  │
        │with selected  │
        │  language     │
        └───────────────┘
```

---

## 🧩 Translation Coverage Map

### Current Coverage (MVP):
```
✅ Report Header
  ├─ Report Title
  ├─ School Info (labels only)
  └─ Student Info (labels only)

✅ Table Section
  ├─ Table Headers (CA1, CA2, etc.)
  └─ Column labels (Subjects, Total, Grade)

✅ Performance Summary
  ├─ Statistics labels
  └─ Position indicators

⚠️ Partial Coverage:
  ├─ Character Assessment (labels only)
  ├─ Teacher Remarks (labels only)
  └─ Next Term Info (labels only)

❌ Not Translated:
  ├─ Student names (keep as-is)
  ├─ Subject names (optional)
  ├─ Teacher names (keep as-is)
  └─ Remarks content (keep as-is)
```

### Future Expansion:
```
Phase 2:
  ├─ Grade remarks translation
  ├─ Subject name mapping
  ├─ Month/date translations
  └─ Full character assessment

Phase 3:
  ├─ Dynamic remarks translation
  ├─ Multi-language subject names
  └─ Customizable translations per school
```

---

## 📊 State Management

```
Redux Store (Global)
├─ auth
│  ├─ user { ... }
│  ├─ school {
│  │    school_id: "SCHOOL123",
│  │    school_name: "Al-Noor School",
│  │    is_arabic: 1,          ← KEY FIELD
│  │    ...
│  │  }
│  └─ academic_calendar [ ... ]
│
Local State (Component)
├─ reportLanguage: 'en' | 'ar'  ← User selection
├─ classRows: [ ... ]
├─ gradeBoundaries: [ ... ]
└─ ...

Derived State (Hook)
├─ language: 'en' | 'ar'        ← From school or selection
├─ isRTL: boolean               ← Calculated
└─ t: function                  ← Translation helper
```

---

## 🔀 Alternative Implementations

### Option A: Current (Recommended)
- Single component
- Translation layer
- Conditional rendering based on `is_arabic`
- **Pros**: Maintainable, extensible, clean
- **Cons**: Requires hook implementation

### Option B: Duplicate Component
- Separate `EndOfTermReportArabic.tsx`
- Route based on `is_arabic`
- **Pros**: Complete isolation
- **Cons**: Code duplication, hard to sync

### Option C: Template System
- Multiple PDF templates
- Switch template based on language
- **Pros**: Easy to customize per language
- **Cons**: More templates to maintain

---

## 🎨 UI Mockup

```
┌──────────────────────────────────────────────────────────────┐
│ End of Term Report                                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [Select Class ▼]  [Academic Year ▼]  [Term ▼]              │
│                                                               │
│  [Report Language ▼]  ← Only visible if is_arabic = 1        │
│   • English                                                   │
│   • العربية                                                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Student Name  │ Admission │ Total │ Avg │ Action   │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ Ahmad Ali     │ 2024/001  │ 450   │ 75% │ [📄] [📱]│    │
│  │ Fatima Omar   │ 2024/002  │ 480   │ 80% │ [📄] [📱]│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Download All PDFs]  [Share via WhatsApp]                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📚 References & Resources

- **jsPDF**: https://github.com/parallax/jsPDF
- **Font Converter**: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
- **Amiri Font**: https://fonts.google.com/specimen/Amiri
- **Noto Sans Arabic**: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
- **React i18n Patterns**: https://react.i18next.com/
- **RTL Styling**: https://rtlstyling.com/

---

This architecture document provides a comprehensive visual overview of how the Arabic report system works. Use it alongside the implementation guides for a complete understanding.
