# Mock Exams Report Implementation Plan

## Overview
Add mock exams reporting functionality to the existing End of Term Report system. Mock exams will be similar to end-of-term reports but without CA (Continuous Assessment) columns, focusing only on exam scores with **standard 50-year grading system**.

---

## 1. Database Schema

### New Table: `mock_exam_scores` (Minimal - Store Only Raw Data)
```sql
CREATE TABLE mock_exam_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id VARCHAR(50) NOT NULL,
  branch_id VARCHAR(50),
  admission_no VARCHAR(50) NOT NULL,
  class_code VARCHAR(50) NOT NULL,
  section VARCHAR(50),
  subject VARCHAR(100) NOT NULL,
  subject_code VARCHAR(50),
  academic_year VARCHAR(20) NOT NULL,
  term VARCHAR(50) NOT NULL,
  mock_exam_type VARCHAR(20) DEFAULT 'MOCK', -- MOCK, MOCK1, MOCK2, etc.
  exam_score DECIMAL(5,2), -- Only raw score stored
  student_stream VARCHAR(50), -- Science, Arts, Commercial, etc.
  subject_type VARCHAR(50), -- Core, Selective, Science, Arts, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  
  UNIQUE KEY unique_score (school_id, admission_no, class_code, subject, academic_year, term, mock_exam_type),
  INDEX idx_student (admission_no, academic_year, term, mock_exam_type),
  INDEX idx_class (class_code, academic_year, term, mock_exam_type),
  INDEX idx_subject (subject, class_code, academic_year, term),
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);
```

**Removed Fields (Calculated Dynamically):**
- ❌ `max_score` - Always 100 for mock exams
- ❌ `percentage` - Same as exam_score (out of 100)
- ❌ `grade` - Calculated using standard grading (A1-F9)
- ❌ `remark` - Calculated using standard grading
- ❌ `subject_position` - Calculate by ranking scores per subject
- ❌ `total_students_in_subject` - Count from query results
- ❌ `subject_class_average` - Calculate: `AVG(exam_score)` per subject

---

## 2. Standard Mock Exam Grading (Hardcoded - 50 Years Standard)

| Grade | Range | Remark |
|-------|-------|--------|
| A1 | 75% - 100% | Excellent |
| B2 | 70% - 74% | Very Good |
| B3 | 65% - 69% | Good |
| C4 | 60% - 64% | Credit |
| C5 | 55% - 59% | Credit |
| C6 | 50% - 54% | Credit |
| D7 | 45% - 49% | Pass |
| E8 | 40% - 44% | Pass |
| F9 | 0% - 39% | Fail |

**This grading is hardcoded in the service layer - no database lookup needed.**

---

## 3. Backend API Changes (Service + Controller Architecture)

### Service Layer: `mockExamService.js`
**Location:** `elscholar-api/src/services/mockExamService.js`

```javascript
const db = require('../config/database');

// Standard Mock Exam Grading (50 years standard - hardcoded)
const MOCK_EXAM_GRADES = [
  { grade: 'A1', min: 75, max: 100, remark: 'Excellent' },
  { grade: 'B2', min: 70, max: 74, remark: 'Very Good' },
  { grade: 'B3', min: 65, max: 69, remark: 'Good' },
  { grade: 'C4', min: 60, max: 64, remark: 'Credit' },
  { grade: 'C5', min: 55, max: 59, remark: 'Credit' },
  { grade: 'C6', min: 50, max: 54, remark: 'Credit' },
  { grade: 'D7', min: 45, max: 49, remark: 'Pass' },
  { grade: 'E8', min: 40, max: 44, remark: 'Pass' },
  { grade: 'F9', min: 0, max: 39, remark: 'Fail' }
];

const getGradeFromPercentage = (percentage) => {
  const grade = MOCK_EXAM_GRADES.find(g => percentage >= g.min && percentage <= g.max);
  return grade || { grade: 'F9', remark: 'Fail' };
};

class MockExamService {
  async getMockExamReport({ school_id, class_code, academic_year, term, mock_exam_type, admission_no }) {
    const query = `
      SELECT 
        mes.*,
        s.student_name,
        s.class_name,
        ROUND(mes.exam_score, 2) as percentage,
        (SELECT ROUND(AVG(exam_score), 2) 
         FROM mock_exam_scores 
         WHERE subject = mes.subject 
           AND class_code = mes.class_code 
           AND academic_year = mes.academic_year 
           AND term = mes.term 
           AND mock_exam_type = mes.mock_exam_type) as subject_class_average,
        (SELECT COUNT(*) + 1
         FROM mock_exam_scores m2
         WHERE m2.subject = mes.subject
           AND m2.class_code = mes.class_code
           AND m2.academic_year = mes.academic_year
           AND m2.term = mes.term
           AND m2.mock_exam_type = mes.mock_exam_type
           AND m2.exam_score > mes.exam_score) as subject_position,
        (SELECT COUNT(DISTINCT admission_no)
         FROM mock_exam_scores
         WHERE subject = mes.subject
           AND class_code = mes.class_code
           AND academic_year = mes.academic_year
           AND term = mes.term
           AND mock_exam_type = mes.mock_exam_type) as total_students_in_subject
      FROM mock_exam_scores mes
      LEFT JOIN students s ON mes.admission_no = s.admission_no
      WHERE mes.school_id = ?
        AND mes.academic_year = ?
        AND mes.term = ?
        AND mes.mock_exam_type = ?
        ${class_code ? 'AND mes.class_code = ?' : ''}
        ${admission_no ? 'AND mes.admission_no = ?' : ''}
      ORDER BY s.student_name, mes.subject
    `;

    const params = [school_id, academic_year, term, mock_exam_type];
    if (class_code) params.push(class_code);
    if (admission_no) params.push(admission_no);

    const results = await db.query(query, params);

    // Calculate student positions
    const studentTotals = {};
    results.forEach(row => {
      if (!studentTotals[row.admission_no]) {
        studentTotals[row.admission_no] = { total_score: 0 };
      }
      studentTotals[row.admission_no].total_score += parseFloat(row.exam_score || 0);
    });

    const sortedStudents = Object.entries(studentTotals)
      .sort(([, a], [, b]) => b.total_score - a.total_score)
      .map(([admission_no], index) => ({ admission_no, position: index + 1 }));

    const positionMap = Object.fromEntries(sortedStudents.map(s => [s.admission_no, s.position]));

    // Apply standard grading
    const enrichedResults = results.map(row => {
      const { grade, remark } = getGradeFromPercentage(row.percentage);
      return {
        ...row,
        grade,
        remark,
        student_position: positionMap[row.admission_no],
        total_students: sortedStudents.length,
        total_score: row.exam_score,
        max_score: 100
      };
    });

    return {
      data: enrichedResults,
      section: results[0]?.section || '',
      caConfiguration: [{ assessment_type: 'EXAM', max_score: 100 }],
      gradeBoundaries: MOCK_EXAM_GRADES,
      studentRemarks: {}
    };
  }

  async submitMockExamScores({ school_id, branch_id, class_code, academic_year, term, mock_exam_type, scores, created_by }) {
    const insertQuery = `
      INSERT INTO mock_exam_scores 
        (school_id, branch_id, admission_no, class_code, section, subject, subject_code,
         academic_year, term, mock_exam_type, exam_score, student_stream, subject_type, created_by)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        exam_score = VALUES(exam_score),
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = scores.map(score => [
      school_id,
      branch_id,
      score.admission_no,
      class_code,
      score.section,
      score.subject,
      score.subject_code,
      academic_year,
      term,
      mock_exam_type,
      score.exam_score,
      score.student_stream,
      score.subject_type,
      created_by
    ]);

    await db.query(insertQuery, [values]);
    return { message: 'Mock exam scores submitted successfully' };
  }
}

module.exports = new MockExamService();
```

### Controller: `mockExamController.js`
**Location:** `elscholar-api/src/controllers/mockExamController.js`

```javascript
const mockExamService = require('../services/mockExamService');

exports.getMockExamReport = async (req, res) => {
  try {
    const { class_code, academic_year, term, mock_exam_type = 'MOCK', admission_no } = req.query;
    const school_id = req.user.school_id;

    const result = await mockExamService.getMockExamReport({
      school_id,
      class_code,
      academic_year,
      term,
      mock_exam_type,
      admission_no
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching mock exam report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.submitMockExamScores = async (req, res) => {
  try {
    const { class_code, academic_year, term, mock_exam_type = 'MOCK', scores } = req.body;
    const school_id = req.user.school_id;
    const branch_id = req.headers['x-branch-id'] || req.user.branch_id;
    const created_by = req.user.user_id;

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ success: false, error: 'Scores array is required' });
    }

    const result = await mockExamService.submitMockExamScores({
      school_id,
      branch_id,
      class_code,
      academic_year,
      term,
      mock_exam_type,
      scores,
      created_by
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error submitting mock exam scores:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Routes: `mockExamRoutes.js`
**Location:** `elscholar-api/src/routes/mockExamRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const mockExamController = require('../controllers/mockExamController');
const { authenticate } = require('../middleware/auth');

router.get('/report', authenticate, mockExamController.getMockExamReport);
router.post('/submit-scores', authenticate, mockExamController.submitMockExamScores);

module.exports = router;
```

### Register Routes in `app.js`
```javascript
const mockExamRoutes = require('./routes/mockExamRoutes');
app.use('/api/mock-exams', mockExamRoutes);
```

---

## 4. Frontend Changes

### Update `EndOfTermReport.tsx`

#### Add Mock Exam Type to Assessment Type Selector
```typescript
// In fetchClassData useEffect, add MOCK to availableAssessmentTypes
const activeTypes = [
  { ca_type: 'EXAM', label: 'End of Term Report' },
  { ca_type: 'MOCK', label: 'Mock Exam Report' },
  { ca_type: 'MOCK1', label: 'Mock Exam 1 Report' },
  { ca_type: 'MOCK2', label: 'Mock Exam 2 Report' },
  ...caConfigTypes
];
```

#### Update `fetchClassData` to handle MOCK
```typescript
const fetchClassData = useCallback(() => {
  if (!selectedClass) return;
  setDataLoading(true);

  let endpoint: string;
  let requestData: any;

  if (selectedAssessmentType === "EXAM") {
    endpoint = "reports/end_of_term_report";
    requestData = { queryType: "class", classCode: selectedClass, academicYear, term };
  } else if (selectedAssessmentType.startsWith("MOCK")) {
    // NEW: Mock exam endpoint
    endpoint = "mock-exams/report";
    requestData = { 
      class_code: selectedClass, 
      academic_year: academicYear, 
      term: term,
      mock_exam_type: selectedAssessmentType 
    };
  } else {
    // CA reports
    endpoint = "reports/class-ca";
    requestData = { query_type: "View Class CA Report", class_code: selectedClass, ca_type: selectedAssessmentType, academic_year: academicYear, term: term };
  }

  _post(endpoint, requestData, (response: any) => {
    const rows = response?.data ?? [];
    setClassRows(rows);
    // ... rest of the logic
  });
}, [selectedClass, academicYear, term, selectedAssessmentType]);
```

### Update `EndOfTermReportTemplate.tsx`

#### Modify Table Headers for Mock Exams
```typescript
const buildTableHeaders = () => {
  const headers: Array<{ key: string; label: string; width: string; weight?: number }> = [];

  // For MOCK exams, skip CA columns
  if (assessmentType.startsWith('MOCK')) {
    headers.push({ key: 'subjects', label: 'Subject', width: subjectWidth });
    headers.push({ key: 'exam', label: 'Exam Score', width: standardWidth });
    headers.push({ key: 'total_score', label: 'Total', width: standardWidth });
    headers.push({ key: 'grade', label: 'Grade', width: standardWidth });
    headers.push({ key: 'remark', label: 'Remark', width: standardWidth });
    if (visibility.showSubjectAverage) headers.push({ key: 'average', label: 'Average', width: standardWidth });
    if (visibility.showSubjectPosition) {
      headers.push({ key: 'position', label: 'Position', width: standardWidth });
      headers.push({ key: 'out_of', label: 'Out Of', width: standardWidth });
    }
    return headers;
  }

  // Original logic for EXAM and CA reports
  // ...
};
```

#### Update Report Title
```typescript
<Text style={styles.reportTitle}>
  {assessmentType.startsWith("MOCK") 
    ? `${assessmentType} EXAM REPORT`
    : assessmentType?.toUpperCase() === "EXAM" 
      ? "END OF TERM REPORT" 
      : `${assessmentType} PROGRESS REPORT`}
</Text>
```

---

## 5. Key Differences: Mock Exam vs End of Term

| Feature | End of Term Report | Mock Exam Report |
|---------|-------------------|------------------|
| **CA Columns** | ✅ CA1, CA2, CA3, CA4 | ❌ None |
| **Exam Column** | ✅ Yes | ✅ Yes (only score column) |
| **Total Score** | Sum of CAs + Exam | Exam score only (out of 100) |
| **Grade Calculation** | Based on total (CAs + Exam) | Based on exam score (standard A1-F9) |
| **Grading System** | School's `grade_boundaries` | **Hardcoded standard (50 years)** |
| **Character Assessment** | ✅ Yes | ❌ No |
| **Attendance** | ✅ Yes | ❌ No |
| **Remarks** | Teacher + Principal | Optional |
| **Data Source** | `end_of_term_scores` table | `mock_exam_scores` table |

---

## 6. Implementation Steps

### Phase 1: Database Setup (1 day)
1. Create `mock_exam_scores` table
2. Add indexes for performance
3. Test data insertion and retrieval

### Phase 2: Backend API (2 days)
1. Create `mockExamService.js` with hardcoded grading
2. Create `mockExamController.js`
3. Create `mockExamRoutes.js`
4. Register routes in `app.js`
5. Test with Postman/curl

### Phase 3: Frontend Integration (2 days)
1. Update `EndOfTermReport.tsx` to handle MOCK assessment type
2. Modify `fetchClassData` to call mock exam endpoint
3. Update `EndOfTermReportTemplate.tsx` to skip CA columns for MOCK
4. Test PDF generation for mock exams

### Phase 4: Testing & Refinement (1 day)
1. Test with real data
2. Verify PDF output matches requirements
3. Test multi-tenant isolation
4. Performance testing

---

## 7. Testing Checklist

- [ ] Mock exam scores can be entered via API
- [ ] Mock exam report displays correctly (no CA columns)
- [ ] PDF generation works for mock exams
- [ ] Grade calculation uses standard A1-F9 system
- [ ] Student positions calculated correctly
- [ ] Multi-tenant isolation works (school_id, branch_id)
- [ ] Stream-based subject filtering works
- [ ] Report config customization applies to mock exams
- [ ] Bulk PDF download works for mock exams
- [ ] WhatsApp sharing works for mock exams

---

## Summary

This plan provides a complete blueprint for adding mock exams reporting with:
- ✅ **Minimal database schema** (only raw scores)
- ✅ **Hardcoded standard grading** (A1-F9, 50 years standard)
- ✅ **Service/Controller architecture** (clean separation)
- ✅ **Reuses 80% of existing infrastructure**
- ✅ **No complexity** - simple and maintainable

**Estimated Total Time:** 5-6 days (including testing)
