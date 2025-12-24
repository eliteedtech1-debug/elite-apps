# CA Template Implementation Context
*Agent Context File for CA Template Separation*

## Project Context
You are implementing a dedicated **CAReportTemplate.tsx** for CA-only reports. This is **NOT for End-of-Term reports** - EndOfTermReportTemplate.tsx remains completely untouched.

## Key Files to Reference

### Primary Files
- `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReportTemplate.tsx` - **DO NOT MODIFY** - Reference only for patterns
- `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx` - Form component for template selection
- `elscholar-ui/src/feature-module/academic/examinations/exam-results/CASetupOptimized.tsx` - Week configuration system

### Implementation Files
- `CA_TEMPLATE_SEPARATION_PLAN.md` - Complete implementation plan
- `GRANULAR_WEEK_BREAKDOWN_IMPLEMENTATION.md` - Original requirements

## Critical Requirements

### CA Reports ONLY (No EXAM)
- **Traditional Schools**: CA1, CA2, CA3, CA4 columns (consolidated)
- **Monthly Schools**: Week 1, Week 2, Week 3, Week 4 columns (granular breakdown)
- **NO EXAM columns** - This is CA assessment only

### What Stays Completely Unchanged
- **EndOfTermReportTemplate.tsx**: Untouched - handles End-of-Term reports with CA + EXAM
- **End-of-Term Report Logic**: All existing functionality preserved
- **All Other Props**: Maintain compatibility patterns from EndOfTermReportTemplate

## Data Structures

### Traditional Schools CA Reports
```javascript
subjects: [{
  name: "Mathematics",
  ca1: 20, ca2: 18, ca3: 15, ca4: 17,
  total: 70, grade: "A"
}]
```

### Monthly Schools CA Reports (NEW)
```javascript
subjects: [{
  name: "Mathematics",
  weeks: {
    week1: { score: 8, maxScore: 10 },
    week2: { score: 9, maxScore: 10 },
    week3: { score: 7, maxScore: 10 },
    week4: { score: 16, maxScore: 20 }
  },
  total: 40,
  maxTotal: 50,
  grade: "A"
}]
```

## Week Configuration Reference
From conversation summary and CASetupOptimized.tsx:
- **CA1**: Weeks [1,2,3,4]
- **CA2**: Weeks [5,6,7,8] 
- **CA3**: Weeks [9,10]
- **CA4**: Week [10]

## Implementation Approach

### Template Selection Logic
```typescript
const getCAReportTemplate = (assessmentType: string, reportType: 'CA') => {
  // Only for CA reports - EndOfTermReportTemplate.tsx handles End-of-Term
  if (reportType === 'CA') {
    return CAReportTemplate; // New dedicated CA template
  }
  // EndOfTermReportTemplate.tsx remains untouched for End-of-Term reports
};
```

### Core Functions to Implement
1. **processCAConfiguration()** - Handle both Traditional (CA1,CA2,CA3,CA4) and Monthly (Week 1,2,3,4) formats
2. **buildCATableHeaders()** - Generate either CA columns or Week columns based on assessmentType
3. **getCASubjectScore()** - Score lookup for CA assessments only (no EXAM)
4. **calculateCAGrades()** - Based on CA totals only

### Report Structure
- **Traditional Schools**: Subject | CA1 | CA2 | CA3 | CA4 | Total | Grade
- **Monthly Schools**: Subject | Week 1 | Week 2 | Week 3 | Week 4 | Total | Grade
- **NO EXAM columns** in either case

## Props Interface
```typescript
interface CAReportTemplateProps {
  assessmentType: 'CA1' | 'CA2' | 'CA3' | 'CA4'; // CA assessment only
  schoolAssessmentType: 'Traditional' | 'Monthly'; // Determines column format
  caConfiguration?: Array<{
    week_number: number;
    max_score: number;
    assessment_type: string;
  }>; // Required only for Monthly schools
  // ... all other props similar to EndOfTermReportTemplate (minus EXAM-related)
}
```

## CA-Specific Sections
- **Include**: Student info, subject scores, CA totals, grades, performance metrics
- **Exclude**: EXAM columns, character assessment, attendance, next term dates
- **Focus**: Pure CA assessment reporting without End-of-Term elements

## Styling and Layout
- Maintain all styling patterns from EndOfTermReportTemplate
- Use same color schemes, fonts, spacing
- Preserve school branding and header layouts
- Keep performance metrics and grade scale sections

## Testing Requirements
- Unit tests for week configuration processing
- Integration tests for template selection
- Verify backward compatibility
- Test with Monthly and Traditional schools
- Validate PDF generation and rendering

## Security Considerations
- Maintain multi-tenant isolation (school_id, branch_id)
- Preserve authentication requirements
- Keep audit trail for report generation
- Validate assessment type permissions

## Performance Requirements
- <200ms additional load time vs EndOfTermReportTemplate
- Efficient week-based score calculations
- Optimized PDF rendering for week columns
- Memory-efficient data processing

## Error Handling
- Graceful fallback to EndOfTermReportTemplate on errors
- Validate caConfiguration data structure
- Handle missing week data gracefully
- Proper error messages for invalid assessment types

## Deployment Strategy
- Feature flag controlled rollout
- Pilot with select Monthly schools
- Monitor performance and error rates
- Staged expansion based on success metrics

---

*Context File Created: 2025-12-22*
*Use this context when implementing CA template separation*
