# Implementation Guide: Granular Week Breakdown for Monthly CA Reports

## Objective

Transform the **CA Report display only** for schools with `assessmentType = "Monthly"` from consolidated CA columns to granular week-by-week breakdown.

**IMPORTANT**: This modification applies **ONLY to CA Reports**, not End-of-Term reports. Final reports remain unchanged.

**Current CA Report Display:**
```
| Subject | CA1 (25%) | CA2 (25%) | Total |
```

**Target CA Report Display:**
```
| Subject | Week 1 (10) | Week 2 (10) | Week 3 (10) | Week 4 (20) | CA1 Total (50) | Week 5 (10) | Week 6 (10) | Week 7 (10) | Week 8 (20) | CA2 Total (50) | Total |
```

**End-of-Term Reports**: Remain unchanged with consolidated CA columns + Exam

## Architecture Changes Required

### 1. Data Structure Enhancement

#### Current CaSetup Interface
```typescript
interface CaSetup {
  assessment_type: string;
  contribution_percent: string;
  is_active: number;
  ca_type?: string;
  max_score?: number;
  total_max_score?: string;
}
```

#### Enhanced CaSetup Interface
```typescript
interface CaSetup {
  assessment_type: string;
  contribution_percent: string;
  is_active: number;
  ca_type?: string;
  max_score?: number;
  total_max_score?: string;
  // NEW: Week breakdown information
  week_number?: number;
  week_breakdown?: string; // e.g., "W1:10,W2:10,W3:10,W4:20"
  weeks?: WeekDetail[];
}

interface WeekDetail {
  week_number: number;
  max_score: number;
  contribution_percent: number;
}
```

### 2. Backend API Enhancement

#### Current API Response
```json
{
  "caConfiguration": [
    {
      "assessment_type": "CA1",
      "contribution_percent": "25",
      "max_score": 50,
      "is_active": 1
    }
  ]
}
```

#### Enhanced API Response for Monthly Schools
```json
{
  "caConfiguration": [
    {
      "assessment_type": "CA1",
      "ca_type": "CA1",
      "contribution_percent": "25",
      "total_max_score": "50",
      "is_active": 1,
      "weeks": [
        { "week_number": 1, "max_score": 10, "contribution_percent": 5 },
        { "week_number": 2, "max_score": 10, "contribution_percent": 5 },
        { "week_number": 3, "max_score": 10, "contribution_percent": 5 },
        { "week_number": 4, "max_score": 20, "contribution_percent": 10 }
      ]
    }
  ]
}
```

### 3. Report Template Modifications

#### File: `EndOfTermReportTemplate.tsx` or `CAReportTemplate.tsx`

**CRITICAL**: Only modify CA report templates, not End-of-Term report templates.

#### Step 1: Detect Report Type and School Assessment Type

Add report type and school assessment type detection:

```typescript
interface ReportData {
  // ... existing fields
  school_assessment_type?: string; // NEW: "Monthly" or "Traditional"
  report_type?: string; // NEW: "CA" or "EndOfTerm"
}

// In component
const isMonthlyAssessment = reportData?.school_assessment_type === "Monthly" || 
                           school?.assessmentType === "Monthly";
const isCAReport = reportData?.report_type === "CA" || 
                   assessmentType !== "EXAM"; // Detect CA-only reports

// Only apply granular breakdown for Monthly CA reports
const useGranularBreakdown = isMonthlyAssessment && isCAReport;
```

#### Step 2: Modify processCaConfiguration Function

Replace the current grouping logic with conditional processing:

```typescript
const processCaConfiguration = () => {
  // ... existing validation code

  if (useGranularBreakdown) {
    return processMonthlyCAReportHeaders();
  } else {
    return processTraditionalCAReportHeaders();
  }
};

const processMonthlyCAReportHeaders = () => {
  const activeCAs = caConfiguration?.filter((ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toLowerCase();
    const isActive = ca.is_active === 1 || ca.is_active === true;
    const isNotExam = !caType.includes('exam');
    return isActive && isNotExam; // Only CA types, no EXAM for CA reports
  }) || [];

  // Group by CA type to organize weeks
  const caGroups = activeCAs.reduce((acc: any, ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toUpperCase();
    if (!acc[caType]) {
      acc[caType] = {
        caType: caType,
        weeks: [],
        totalContribution: 0,
        totalMaxScore: 0
      };
    }
    
    // Add week details
    if (ca.weeks && ca.weeks.length > 0) {
      acc[caType].weeks.push(...ca.weeks);
    } else if (ca.week_number) {
      acc[caType].weeks.push({
        week_number: ca.week_number,
        max_score: ca.max_score || 0,
        contribution_percent: parseFloat(ca.contribution_percent || '0')
      });
    }
    
    acc[caType].totalContribution += parseFloat(ca.contribution_percent || '0');
    acc[caType].totalMaxScore += parseFloat(ca.max_score || '0');
    
    return acc;
  }, {});

  // Generate headers with week breakdown
  const caHeaders: any[] = [];
  
  Object.values(caGroups).forEach((group: any) => {
    // Sort weeks by week_number
    const sortedWeeks = group.weeks.sort((a: any, b: any) => 
      a.week_number - b.week_number
    );
    
    // Add individual week headers
    sortedWeeks.forEach((week: any) => {
      caHeaders.push({
        key: `${group.caType.toLowerCase()}_week_${week.week_number}`,
        displayName: `Week ${week.week_number}`,
        subHeader: `(${week.max_score})`,
        weight: week.contribution_percent,
        maxScore: week.max_score,
        fieldName: `${group.caType.toLowerCase()}_week_${week.week_number}_score`,
        caType: group.caType,
        weekNumber: week.week_number,
        isWeekColumn: true
      });
    });
    
    // Add CA total column
    caHeaders.push({
      key: `${group.caType.toLowerCase()}_total`,
      displayName: `${group.caType} Total`,
      subHeader: `(${group.totalMaxScore})`,
      weight: group.totalContribution,
      maxScore: group.totalMaxScore,
      fieldName: `${group.caType.toLowerCase()}_score`,
      caType: group.caType,
      isTotalColumn: true
    });
  });

  // NO EXAM HEADER for CA reports
  return { caHeaders, examHeader: null };
};

const processTraditionalCAReportHeaders = () => {
  // Keep existing logic for traditional schools CA reports
  const activeCAs = caConfiguration?.filter((ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toLowerCase();
    const isActive = ca.is_active === 1 || ca.is_active === true;
    const isNotExam = !caType.includes('exam');
    return isActive && isNotExam; // Only CA types, no EXAM
  }) || [];

  const uniqueCAs = activeCAs.reduce((acc: CaSetup[], ca: CaSetup) => {
    const caType = (ca.assessment_type || ca.ca_type || '').toLowerCase();
    const exists = acc.find(c => (c.assessment_type || c.ca_type || '').toLowerCase() === caType);
    if (!exists) {
      acc.push(ca);
    } else {
      exists.contribution_percent = String(
        parseFloat(exists.contribution_percent || '0') + 
        parseFloat(ca.contribution_percent || '0')
      );
    }
    return acc;
  }, []);

  const caHeaders = uniqueCAs.map((ca: CaSetup, index: number) => {
    const caType = ca.assessment_type || ca.ca_type || `CA${index + 1}`;
    const weight = parseFloat(ca.contribution_percent || '0') || 0;
    const maxScore = ca.max_score || 20;

    return {
      key: caType.toLowerCase(),
      displayName: caType,
      subHeader: `(${maxScore})`, // Show max score instead of percentage for CA reports
      weight: weight,
      maxScore: maxScore,
      fieldName: `${caType.toLowerCase()}_score`
    };
  });

  // NO EXAM HEADER for CA reports
  return { caHeaders, examHeader: null };
};
```

#### Step 3: Update Table Header Rendering

Modify the table header rendering to support two-line headers for monthly CA reports:

```typescript
// In the PDF table header section for CA Reports only
<View style={styles.tableHeaderRow}>
  <View style={[styles.tableHeader, { width: '5%' }]}>
    <Text style={styles.tableHeaderText}>S/N</Text>
  </View>
  <View style={[styles.tableHeader, { width: '30%' }]}>
    <Text style={styles.tableHeaderText}>Subject</Text>
  </View>
  
  {/* CA Headers with week breakdown - NO EXAM COLUMN */}
  {caHeaders.map((header, index) => {
    const width = useGranularBreakdown && header.isWeekColumn ? '8%' : '12%';
    
    return (
      <View key={header.key} style={[styles.tableHeader, { width }]}>
        <Text style={styles.tableHeaderText}>{header.displayName}</Text>
        {header.subHeader && (
          <Text style={[styles.tableHeaderText, { fontSize: 8 }]}>
            {header.subHeader}
          </Text>
        )}
      </View>
    );
  })}
  
  {/* Total Column */}
  <View style={[styles.tableHeader, { width: '12%' }]}>
    <Text style={styles.tableHeaderText}>Total</Text>
  </View>
  <View style={[styles.tableHeader, { width: '8%' }]}>
    <Text style={styles.tableHeaderText}>Grade</Text>
  </View>
  <View style={[styles.tableHeader, { width: '12%' }]}>
    <Text style={styles.tableHeaderText}>Remark</Text>
  </View>
</View>
```

#### Step 4: Update Table Data Rendering

Modify subject row rendering to display week scores for CA reports only:

```typescript
{reportData.subjects?.map((subject: Subject, index: number) => (
  <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
    <View style={[styles.tableCell, { width: '5%' }]}>
      <Text style={styles.tableCellText}>{index + 1}</Text>
    </View>
    <View style={[styles.tableCell, { width: '30%' }]}>
      <Text style={styles.tableCellText}>{subject.subject}</Text>
    </View>
    
    {/* CA Scores with week breakdown - NO EXAM SCORES */}
    {caHeaders.map((header) => {
      const width = useGranularBreakdown && header.isWeekColumn ? '8%' : '12%';
      let score = subject[header.fieldName];
      
      // For total columns in monthly assessment, calculate sum of weeks
      if (useGranularBreakdown && header.isTotalColumn) {
        const weekScores = caHeaders
          .filter(h => h.caType === header.caType && h.isWeekColumn)
          .map(h => parseFloat(subject[h.fieldName] || '0'));
        score = weekScores.reduce((sum, s) => sum + s, 0);
      }
      
      return (
        <View key={header.key} style={[styles.tableCell, { width }]}>
          <Text style={styles.tableCellText}>
            {score !== null && score !== undefined ? 
              (typeof score === 'number' ? score.toFixed(1) : score) : 
              '-'}
          </Text>
        </View>
      );
    })}
    
    {/* Total (CA scores only), Grade, Remark */}
    <View style={[styles.tableCell, { width: '12%' }]}>
      <Text style={styles.tableCellText}>
        {subject.ca_total !== null && subject.ca_total !== undefined ? 
          (typeof subject.ca_total === 'number' ? 
            subject.ca_total.toFixed(1) : 
            subject.ca_total) : 
          '-'}
      </Text>
    </View>
    <View style={[styles.tableCell, { width: '8%' }]}>
      <Text style={styles.tableCellText}>{subject.ca_grade || '-'}</Text>
    </View>
    <View style={[styles.tableCell, { width: '12%' }]}>
      <Text style={styles.tableCellText}>{subject.ca_remark || '-'}</Text>
    </View>
  </View>
))}
```

### 4. Backend API Modifications

#### File: `elscholar-api/src/controllers/ReportController.js` (or equivalent)

Modify the CA configuration query to include week details for Monthly schools **CA reports only**:

```javascript
const getCAConfiguration = async (schoolId, academicYear, term, section, reportType = 'CA') => {
  const school = await School.findByPk(schoolId);
  const isMonthly = school?.assessmentType === 'Monthly';
  const isCAReport = reportType === 'CA';
  
  if (isMonthly && isCAReport) {
    // Fetch with week breakdown for CA reports only
    const caSetups = await db.sequelize.query(`
      SELECT 
        ca_type as assessment_type,
        ca_type,
        week_number,
        max_score,
        overall_contribution_percent as contribution_percent,
        status as is_active
      FROM ca_setup
      WHERE school_id = :schoolId
        AND academic_year = :academicYear
        AND term = :term
        AND section IN (:section, 'All')
        AND status = 'Active'
        AND ca_type != 'EXAM'  -- Exclude EXAM for CA reports
      ORDER BY ca_type, week_number
    `, {
      replacements: { schoolId, academicYear, term, section },
      type: QueryTypes.SELECT
    });
    
    // Group by CA type with week details
    const grouped = caSetups.reduce((acc, setup) => {
      const caType = setup.ca_type;
      if (!acc[caType]) {
        acc[caType] = {
          assessment_type: caType,
          ca_type: caType,
          contribution_percent: '0',
          total_max_score: '0',
          is_active: setup.is_active,
          weeks: []
        };
      }
      
      acc[caType].weeks.push({
        week_number: setup.week_number,
        max_score: parseFloat(setup.max_score || 0),
        contribution_percent: parseFloat(setup.contribution_percent || 0)
      });
      
      acc[caType].contribution_percent = String(
        parseFloat(acc[caType].contribution_percent) + 
        parseFloat(setup.contribution_percent || 0)
      );
      
      acc[caType].total_max_score = String(
        parseFloat(acc[caType].total_max_score) + 
        parseFloat(setup.max_score || 0)
      );
      
      return acc;
    }, {});
    
    return Object.values(grouped);
  } else {
    // Traditional query OR End-of-Term reports (existing logic)
    const examFilter = isCAReport ? "AND ca_type != 'EXAM'" : ""; // Exclude EXAM for CA reports
    
    return await db.sequelize.query(`
      SELECT 
        ca_type as assessment_type,
        SUM(overall_contribution_percent) as contribution_percent,
        MAX(max_score) as max_score,
        status as is_active
      FROM ca_setup
      WHERE school_id = :schoolId
        AND academic_year = :academicYear
        AND term = :term
        AND section IN (:section, 'All')
        AND status = 'Active'
        ${examFilter}
      GROUP BY ca_type
    `, {
      replacements: { schoolId, academicYear, term, section },
      type: QueryTypes.SELECT
    });
  }
};
```

### 5. Student Score Data Structure

Ensure student scores include week-level data **for CA reports only**:

```javascript
// For Monthly schools CA reports, fetch individual week scores
const getStudentScores = async (studentId, academicYear, term, reportType = 'CA') => {
  const school = await getStudentSchool(studentId);
  const isMonthly = school?.assessmentType === 'Monthly';
  const isCAReport = reportType === 'CA';
  
  if (isMonthly && isCAReport) {
    // Fetch week-level scores for CA reports only
    const scores = await db.sequelize.query(`
      SELECT 
        s.subject_name,
        cs.ca_type,
        cs.week_number,
        ss.score,
        cs.max_score
      FROM student_scores ss
      JOIN ca_setup cs ON ss.ca_setup_id = cs.id
      JOIN subjects s ON ss.subject_id = s.id
      WHERE ss.student_id = :studentId
        AND ss.academic_year = :academicYear
        AND ss.term = :term
        AND cs.ca_type != 'EXAM'  -- Exclude EXAM for CA reports
      ORDER BY s.subject_name, cs.ca_type, cs.week_number
    `, {
      replacements: { studentId, academicYear, term },
      type: QueryTypes.SELECT
    });
    
    // Transform to include week-specific fields
    return scores.reduce((acc, score) => {
      const subject = score.subject_name;
      if (!acc[subject]) {
        acc[subject] = { subject: subject };
      }
      
      const fieldName = `${score.ca_type.toLowerCase()}_week_${score.week_number}_score`;
      acc[subject][fieldName] = score.score;
      
      return acc;
    }, {});
  } else {
    // Traditional score fetching OR End-of-Term reports (existing logic)
    // Include EXAM scores for End-of-Term reports
    const examFilter = isCAReport ? "AND cs.ca_type != 'EXAM'" : "";
    
    return await db.sequelize.query(`
      SELECT 
        s.subject_name,
        cs.ca_type,
        SUM(ss.score) as total_score,
        MAX(cs.max_score) as max_score
      FROM student_scores ss
      JOIN ca_setup cs ON ss.ca_setup_id = cs.id
      JOIN subjects s ON ss.subject_id = s.id
      WHERE ss.student_id = :studentId
        AND ss.academic_year = :academicYear
        AND ss.term = :term
        ${examFilter}
      GROUP BY s.subject_name, cs.ca_type
      ORDER BY s.subject_name, cs.ca_type
    `, {
      replacements: { studentId, academicYear, term },
      type: QueryTypes.SELECT
    });
  }
};
```

## Implementation Checklist

### Phase 1: Backend Changes
- [ ] Modify CA configuration API to return week details for Monthly schools **CA reports only**
- [ ] Update student score queries to include week-level data **CA reports only**
- [ ] Add `report_type` parameter to distinguish CA vs End-of-Term reports
- [ ] Exclude EXAM data from CA report APIs
- [ ] Test API responses for both Monthly and Traditional schools

### Phase 2: Frontend Changes
- [ ] Add `useGranularBreakdown` detection (Monthly + CA report)
- [ ] Implement `processMonthlyCAReportHeaders()` function
- [ ] Update table header rendering for two-line headers **CA reports only**
- [ ] Modify table data rendering to display week scores **CA reports only**
- [ ] Add CA total column calculation logic (no EXAM)
- [ ] Ensure End-of-Term reports remain unchanged
- [ ] Test with sample data

### Phase 3: Testing
- [ ] Test CA reports with CA1 (4 weeks), CA2 (4 weeks), CA3 (2 weeks)
- [ ] Verify End-of-Term reports are unaffected
- [ ] Test column widths and layout for CA reports
- [ ] Test with different screen sizes
- [ ] Verify CA score calculations and totals (no EXAM)
- [ ] Test with missing week scores
- [ ] Compare Traditional vs Monthly CA report outputs

### Phase 4: Edge Cases
- [ ] Handle missing week configurations in CA reports
- [ ] Handle partial week scores in CA reports
- [ ] Ensure backward compatibility with Traditional schools
- [ ] Test with custom CA names
- [ ] Verify PDF rendering quality for CA reports
- [ ] Confirm End-of-Term reports maintain EXAM columns

## Expected Output Example

### Monthly Assessment CA Report Table (NO EXAM)

```
┌────┬──────────┬────────┬────────┬────────┬────────┬──────────┬────────┬────────┬────────┬────────┬──────────┬───────┬────────┐
│ S/N│ Subject  │ Week 1 │ Week 2 │ Week 3 │ Week 4 │ CA1 Total│ Week 5 │ Week 6 │ Week 7 │ Week 8 │ CA2 Total│ Total │ Grade  │
│    │          │  (10)  │  (10)  │  (10)  │  (20)  │   (50)   │  (10)  │  (10)  │  (10)  │  (20)  │   (50)   │ (100) │        │
├────┼──────────┼────────┼────────┼────────┼────────┼──────────┼────────┼────────┼────────┼────────┼──────────┼───────┼────────┤
│ 1  │ Math     │  8.5   │  9.0   │  7.5   │  18.0  │   43.0   │  9.0   │  8.5   │  9.5   │  19.0  │   46.0   │ 89.0  │   A    │
│ 2  │ English  │  9.0   │  8.5   │  8.0   │  17.5  │   43.0   │  8.0   │  9.0   │  8.5   │  18.0  │   43.5   │ 86.5  │   A    │
└────┴──────────┴────────┴────────┴────────┴────────┴──────────┴────────┴────────┴────────┴────────┴──────────┴───────┴────────┘
```

### End-of-Term Report Table (UNCHANGED)

```
┌────┬──────────┬────────┬────────┬──────┬───────┬────────┐
│ S/N│ Subject  │  CA1   │  CA2   │ Exam │ Total │ Grade  │
│    │          │ (25%)  │ (25%)  │(50%) │ (100) │        │
├────┼──────────┼────────┼────────┼──────┼───────┼────────┤
│ 1  │ Math     │  43.0  │  46.0  │ 54.0 │ 89.0  │   A    │
│ 2  │ English  │  43.0  │  43.5  │ 52.0 │ 86.5  │   A    │
└────┴──────────┴────────┴────────┴──────┴───────┴────────┘
```

## Benefits

1. **Transparency**: Parents see individual week performance
2. **Progress Tracking**: Identify trends across weeks
3. **Accountability**: Teachers can track weekly assessment completion
4. **Flexibility**: Maintains compatibility with Traditional schools
5. **Granularity**: Better understanding of student performance patterns

## Conclusion

This implementation provides granular week-by-week visibility for Monthly assessment schools while maintaining backward compatibility with Traditional assessment schools. The key is conditional processing based on `assessmentType` and proper data structure enhancement at both backend and frontend levels.

## Key Benefits of CA Report Granular Breakdown

### 1. **Weekly Progress Visibility**
- Teachers can track individual week performance
- Parents see detailed CA progress without EXAM interference
- Better identification of learning gaps within CA periods

### 2. **CA-Focused Assessment**
- Pure CA performance analysis without EXAM scores
- Week-by-week CA trend analysis
- Targeted intervention based on weekly CA performance

### 3. **Maintains Report Separation**
- CA reports show granular weekly breakdown
- End-of-Term reports maintain consolidated view with EXAM
- Clear distinction between assessment types

### 4. **Seamless Integration**
- Monthly assessments show detailed weeks in CA reports
- Traditional schools maintain existing CA report format
- End-of-Term reports unchanged for all school types

## Conclusion

This implementation provides granular week-by-week visibility for Monthly assessment schools **in CA reports only** while maintaining compatibility with existing systems. The key innovation lies in conditional processing based on both `assessmentType` and `reportType`, ensuring that:

1. **CA Reports**: Show detailed week breakdown for Monthly schools
2. **End-of-Term Reports**: Remain unchanged with consolidated CA + EXAM columns  
3. **Traditional Schools**: Maintain existing report formats for both report types

This architecture allows schools to adopt more flexible CA assessment schedules with detailed weekly visibility without affecting their final report generation, making it a seamless enhancement to the CA reporting system.
