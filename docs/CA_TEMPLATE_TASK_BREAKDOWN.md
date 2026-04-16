# CA Template Implementation - Task Breakdown & Dependencies
*Project Manager Coordination Document*
*Generated: 2025-12-22*

## 🎯 Project Overview
Implement dedicated CA template system for Monthly assessment schools with granular week breakdown while maintaining complete separation from End-of-Term reports.

## 📋 Task Breakdown by Agent

### 🎨 Frontend Expert Tasks

#### **Task FE-1: Create CAReportTemplate.tsx Component**
- **Priority**: High
- **Estimated Effort**: 3-4 days
- **Dependencies**: None (can start immediately)
- **Location**: `elscholar-ui/src/feature-module/academic/examinations/exam-results/CAReportTemplate.tsx`

**Deliverables**:
```typescript
interface CAReportTemplateProps {
  assessmentType: 'CA1' | 'CA2' | 'CA3' | 'CA4';
  schoolAssessmentType: 'Traditional' | 'Monthly';
  caConfiguration: Array<{
    week_number: number;
    max_score: number;
    assessment_type: string;
  }>;
  reportData: {
    subjects: Array<{
      name: string;
      weeks?: { [key: string]: { score: number; maxScore: number } };
      ca1?: number; ca2?: number; ca3?: number; ca4?: number;
      total: number;
      grade: string;
    }>;
  };
  // ... other props from EndOfTermReportTemplate
}
```

**Key Functions to Implement**:
- `processWeekConfiguration()` - Filter weeks by assessment type
- `buildCATableHeaders()` - Generate Week 1, Week 2, etc. columns
- `getCASubjectScore()` - Week-specific score lookup
- `calculateCAGrades()` - Grade calculation from CA totals only

**Acceptance Criteria**:
- [ ] Renders Monthly school format (Week 1, Week 2, Week 3, Week 4)
- [ ] Renders Traditional school format (CA1, CA2, CA3, CA4)
- [ ] Excludes all EXAM-related columns and sections
- [ ] Maintains styling consistency with EndOfTermReportTemplate
- [ ] Handles missing week data gracefully
- [ ] Supports both PDF and screen rendering

#### **Task FE-2: Update EndOfTermReport.tsx Form Component**
- **Priority**: High
- **Estimated Effort**: 2-3 days
- **Dependencies**: FE-1 (CAReportTemplate.tsx)
- **Location**: `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx`

**Template Selection Logic**:
```typescript
const getReportTemplate = (selectedAssessmentType: string, schoolAssessmentType: string) => {
  // CA Reports: Use new CAReportTemplate for Monthly schools
  if (['CA1', 'CA2', 'CA3', 'CA4'].includes(selectedAssessmentType)) {
    if (schoolAssessmentType === 'Monthly') {
      return CAReportTemplate; // NEW: Granular week breakdown
    }
    return EndOfTermReportTemplate; // Traditional: Consolidated CA columns
  }
  
  // End-of-Term Reports: Always use existing template (UNCHANGED)
  if (selectedAssessmentType === 'EXAM') {
    return EndOfTermReportTemplate; // PRESERVED: No changes to End-of-Term
  }
  
  return EndOfTermReportTemplate; // Default fallback
};
```

**Integration Points**:
- Detect school assessment type from CASetupOptimized configuration
- Add template selection logic in `handleDownloadSingle()`
- Add template selection logic in `handleDownloadAll()`
- Preserve all existing End-of-Term report functionality

**Acceptance Criteria**:
- [ ] CA reports use CAReportTemplate for Monthly schools
- [ ] CA reports use EndOfTermReportTemplate for Traditional schools
- [ ] End-of-Term reports (EXAM) always use EndOfTermReportTemplate
- [ ] No changes to existing End-of-Term report generation
- [ ] Graceful fallback to EndOfTermReportTemplate on errors

#### **Task FE-3: Assessment Type Detection System**
- **Priority**: Medium
- **Estimated Effort**: 1-2 days
- **Dependencies**: FE-2, BE-1
- **Location**: `elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx`

**School Assessment Type Detection**:
```typescript
const detectSchoolAssessmentType = (caConfiguration: CaSetup[]): 'Monthly' | 'Traditional' => {
  // Check if any CA setup has week_number configuration
  const hasWeekConfiguration = caConfiguration.some(ca => 
    ca.week_number !== undefined && ca.week_number !== null
  );
  
  // Check for granular week breakdown (Monthly schools)
  const weekCount = caConfiguration.filter(ca => 
    ca.ca_type === 'CA1' && ca.week_number
  ).length;
  
  return (hasWeekConfiguration && weekCount > 1) ? 'Monthly' : 'Traditional';
};
```

**Acceptance Criteria**:
- [ ] Automatically detects Monthly vs Traditional schools
- [ ] Caches assessment type per school/branch
- [ ] Handles missing or incomplete CA configuration
- [ ] Provides clear fallback to Traditional mode

---

### 🔧 Backend Expert Tasks

#### **Task BE-1: Extend CA Setup API for Week Configuration**
- **Priority**: High
- **Estimated Effort**: 2-3 days
- **Dependencies**: None (can start immediately)
- **Location**: `elscholar-api/src/controllers/CASetupController.js`

**API Enhancements**:
```javascript
// GET /api/ca-setup/week-configuration
// Returns week-level configuration for Monthly schools
{
  success: true,
  data: {
    assessmentType: 'Monthly', // or 'Traditional'
    caConfiguration: [
      {
        ca_type: 'CA1',
        weeks: [
          { week_number: 1, max_score: 10, contribution_percent: 5 },
          { week_number: 2, max_score: 10, contribution_percent: 5 },
          { week_number: 3, max_score: 10, contribution_percent: 5 },
          { week_number: 4, max_score: 20, contribution_percent: 10 }
        ]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] Returns week-level configuration for Monthly schools
- [ ] Returns consolidated configuration for Traditional schools
- [ ] Maintains backward compatibility with existing endpoints
- [ ] Includes proper error handling and validation

#### **Task BE-2: Update Report Data API for CA Reports**
- **Priority**: High
- **Estimated Effort**: 3-4 days
- **Dependencies**: BE-1
- **Location**: `elscholar-api/src/controllers/ReportsController.js`

**Data Structure for Monthly Schools**:
```javascript
// For CA Reports (Monthly Schools)
{
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
    grade: "A",
    remark: "Excellent"
  }]
}

// For CA Reports (Traditional Schools) - UNCHANGED
{
  subjects: [{
    name: "Mathematics",
    ca1: 20, ca2: 18, ca3: 15, ca4: 17,
    total: 70,
    grade: "A",
    remark: "Excellent"
  }]
}
```

**Acceptance Criteria**:
- [ ] Returns week-level data for Monthly schools
- [ ] Returns consolidated CA data for Traditional schools
- [ ] Maintains existing End-of-Term report data structure
- [ ] Includes proper grade calculation for both formats

#### **Task BE-3: School Assessment Type Caching**
- **Priority**: Medium
- **Estimated Effort**: 1-2 days
- **Dependencies**: BE-1, BE-2
- **Location**: `elscholar-api/src/services/SchoolConfigService.js`

**Caching Strategy**:
```javascript
const getSchoolAssessmentType = async (schoolId, branchId) => {
  const cacheKey = `assessment_type_${schoolId}_${branchId}`;
  
  // Check cache first
  let assessmentType = await redis.get(cacheKey);
  
  if (!assessmentType) {
    // Determine from CA configuration
    const caConfig = await CASetup.findAll({
      where: { school_id: schoolId, branch_id: branchId, status: 'Active' }
    });
    
    assessmentType = detectAssessmentType(caConfig);
    
    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, assessmentType);
  }
  
  return assessmentType;
};
```

**Acceptance Criteria**:
- [ ] Caches assessment type per school/branch
- [ ] Invalidates cache when CA configuration changes
- [ ] Provides fast lookup for template selection
- [ ] Handles cache failures gracefully

---

### 🗄️ DBA Expert Tasks

#### **Task DB-1: Analyze Existing CA Setup Schema**
- **Priority**: High
- **Estimated Effort**: 1 day
- **Dependencies**: None
- **Location**: Database analysis and documentation

**Analysis Requirements**:
- Document current `ca_setup` table structure
- Identify week-level configuration patterns
- Map relationship between CA types and weeks
- Document Monthly vs Traditional school patterns

**Deliverables**:
```sql
-- Current schema analysis
SELECT 
  ca_type,
  section,
  week_number,
  max_score,
  overall_contribution_percent,
  COUNT(*) as week_count
FROM ca_setup 
WHERE status = 'Active'
GROUP BY ca_type, section
ORDER BY ca_type, week_number;
```

**Acceptance Criteria**:
- [ ] Complete schema documentation
- [ ] Week configuration patterns identified
- [ ] Monthly vs Traditional school classification
- [ ] Performance optimization recommendations

#### **Task DB-2: Optimize Week-Level Queries**
- **Priority**: Medium
- **Estimated Effort**: 2 days
- **Dependencies**: DB-1, BE-2
- **Location**: Database optimization

**Query Optimization**:
```sql
-- Optimized query for week-level CA data
CREATE INDEX idx_ca_setup_week_lookup 
ON ca_setup (school_id, branch_id, ca_type, week_number, status);

-- Optimized stored procedure for Monthly schools
DELIMITER //
CREATE PROCEDURE GetWeeklyCAConfiguration(
  IN p_school_id VARCHAR(50),
  IN p_branch_id VARCHAR(50),
  IN p_ca_type VARCHAR(10)
)
BEGIN
  SELECT 
    week_number,
    max_score,
    contribution_percent,
    overall_contribution_percent
  FROM ca_setup
  WHERE school_id = p_school_id
    AND branch_id = p_branch_id
    AND ca_type = p_ca_type
    AND status = 'Active'
  ORDER BY week_number;
END //
DELIMITER ;
```

**Acceptance Criteria**:
- [ ] Query performance under 100ms for week-level data
- [ ] Proper indexing for CA configuration lookups
- [ ] Stored procedures for complex week calculations
- [ ] No impact on existing End-of-Term queries

---

### 🔒 Security Expert Tasks

#### **Task SE-1: Multi-Tenant Isolation for CA Templates**
- **Priority**: High
- **Estimated Effort**: 1-2 days
- **Dependencies**: BE-1, BE-2
- **Location**: Security middleware and validation

**Security Requirements**:
```javascript
// Ensure CA configuration access is properly isolated
const validateCAAccess = (req, res, next) => {
  const { school_id, branch_id } = req.user;
  const { caType, section } = req.params;
  
  // Validate user has access to this CA configuration
  if (!hasCAAccess(req.user, caType, section)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to CA configuration'
    });
  }
  
  next();
};
```

**Acceptance Criteria**:
- [ ] CA template access properly isolated by school/branch
- [ ] Week-level data access validated per user permissions
- [ ] Audit trail for CA template generation
- [ ] No cross-tenant data leakage in CA reports

#### **Task SE-2: Template Selection Security**
- **Priority**: Medium
- **Estimated Effort**: 1 day
- **Dependencies**: FE-2, BE-3
- **Location**: Frontend and backend validation

**Security Validation**:
- Validate assessment type matches school configuration
- Prevent template manipulation through client-side changes
- Ensure proper authentication for template selection
- Log template selection for audit purposes

**Acceptance Criteria**:
- [ ] Template selection validated server-side
- [ ] Assessment type tampering prevented
- [ ] Proper audit logging for template usage
- [ ] No unauthorized template access

---

### 🧪 QA Expert Tasks

#### **Task QA-1: CA Template Rendering Tests**
- **Priority**: High
- **Estimated Effort**: 2-3 days
- **Dependencies**: FE-1, FE-2
- **Location**: Frontend component tests

**Test Scenarios**:
```javascript
describe('CAReportTemplate', () => {
  it('renders Monthly school format with week columns', () => {
    // Test Week 1, Week 2, Week 3, Week 4 columns
  });
  
  it('renders Traditional school format with CA columns', () => {
    // Test CA1, CA2, CA3, CA4 columns
  });
  
  it('excludes EXAM columns for CA reports', () => {
    // Verify no EXAM-related content
  });
  
  it('handles missing week data gracefully', () => {
    // Test fallback behavior
  });
});
```

**Acceptance Criteria**:
- [ ] Unit tests for all CA template components
- [ ] Integration tests for template selection logic
- [ ] Visual regression tests for PDF output
- [ ] Performance tests for large class sizes

#### **Task QA-2: End-to-End CA Report Generation**
- **Priority**: High
- **Estimated Effort**: 2-3 days
- **Dependencies**: All frontend and backend tasks
- **Location**: E2E test suite

**Test Flows**:
1. **Monthly School CA Report**: Select CA1 → Generate → Verify week columns
2. **Traditional School CA Report**: Select CA1 → Generate → Verify CA columns
3. **End-of-Term Report**: Select EXAM → Generate → Verify unchanged behavior
4. **Template Fallback**: Simulate error → Verify graceful degradation

**Acceptance Criteria**:
- [ ] Complete E2E test coverage for CA reports
- [ ] Backward compatibility verification
- [ ] Cross-browser testing for PDF generation
- [ ] Performance benchmarking

#### **Task QA-3: Data Integrity Validation**
- **Priority**: Medium
- **Estimated Effort**: 1-2 days
- **Dependencies**: BE-2, DB-2
- **Location**: API and database tests

**Validation Tests**:
- Week-level score calculations
- Grade computation accuracy
- Data consistency between templates
- Multi-tenant data isolation

**Acceptance Criteria**:
- [ ] Score calculation accuracy verified
- [ ] Grade boundaries properly applied
- [ ] No data corruption between report types
- [ ] Multi-tenant isolation confirmed

---

### 🚀 DevOps Expert Tasks

#### **Task DO-1: Feature Flag Implementation**
- **Priority**: High
- **Estimated Effort**: 1 day
- **Dependencies**: None (can start early)
- **Location**: Environment configuration

**Feature Flag Configuration**:
```javascript
// Environment variables
ENABLE_CA_TEMPLATE_SEPARATION=false
CA_TEMPLATE_PILOT_SCHOOLS=school1,school2,school3

// Runtime feature flag check
const shouldUseCATemplate = (schoolId) => {
  if (!process.env.ENABLE_CA_TEMPLATE_SEPARATION) return false;
  
  const pilotSchools = process.env.CA_TEMPLATE_PILOT_SCHOOLS?.split(',') || [];
  return pilotSchools.includes(schoolId);
};
```

**Acceptance Criteria**:
- [ ] Feature flag controls CA template usage
- [ ] Pilot school configuration support
- [ ] Safe rollback mechanism
- [ ] Runtime flag updates without deployment

#### **Task DO-2: Performance Monitoring Setup**
- **Priority**: Medium
- **Estimated Effort**: 1-2 days
- **Dependencies**: All implementation tasks
- **Location**: Monitoring and logging

**Monitoring Metrics**:
- CA template rendering time
- PDF generation performance
- Template selection accuracy
- Error rates by template type

**Acceptance Criteria**:
- [ ] Performance dashboards for CA templates
- [ ] Alert thresholds for rendering failures
- [ ] Comparative metrics vs End-of-Term reports
- [ ] User experience monitoring

---

## 🔗 Integration Points & Dependencies

### **Critical Path Dependencies**:
1. **FE-1** (CAReportTemplate.tsx) → **FE-2** (Form integration) → **QA-1** (Testing)
2. **BE-1** (API extension) → **BE-2** (Data structure) → **QA-2** (E2E testing)
3. **DB-1** (Schema analysis) → **DB-2** (Optimization) → **QA-3** (Data validation)

### **Integration Checkpoints**:
- **Week 1 End**: CAReportTemplate.tsx component complete
- **Week 2 End**: Backend API extensions ready
- **Week 3 End**: Template selection logic integrated
- **Week 4 End**: Complete testing suite ready
- **Week 5 End**: Feature flag deployment ready

### **Risk Mitigation**:
- **Template Rendering Issues**: Fallback to EndOfTermReportTemplate
- **Performance Degradation**: Feature flag rollback capability
- **Data Inconsistency**: Comprehensive validation tests
- **Cross-Browser Issues**: Progressive enhancement approach

---

## 📊 Success Metrics

### **Technical Metrics**:
- [ ] Zero report generation failures
- [ ] <200ms additional load time for CA reports
- [ ] 100% backward compatibility maintained
- [ ] No performance impact on End-of-Term reports

### **Business Metrics**:
- [ ] >90% user satisfaction from Monthly schools
- [ ] Reduced support tickets for CA report clarity
- [ ] Improved academic analysis capabilities
- [ ] Successful pilot deployment to 5+ schools

---

## 🗓️ Timeline Summary

| Week | Phase | Key Deliverables | Dependencies |
|------|-------|------------------|--------------|
| 1 | Frontend Development | CAReportTemplate.tsx | None |
| 2 | Backend Development | API extensions, Data structure | FE-1 |
| 3 | Integration | Template selection, Assessment detection | FE-1, BE-1, BE-2 |
| 4 | Testing | Unit, Integration, E2E tests | All implementation |
| 5 | Deployment | Feature flags, Monitoring | All tasks |
| 6 | Pilot Rollout | Staged deployment, Monitoring | All tasks |

**Total Duration**: 6 weeks
**Critical Path**: FE-1 → FE-2 → QA-1 → DO-2
**Go-Live**: Week 6 with pilot schools

---

*Task Breakdown Created: 2025-12-22*
*Status: Ready for Agent Assignment*
*Next Action: Begin FE-1 (CAReportTemplate.tsx development)*