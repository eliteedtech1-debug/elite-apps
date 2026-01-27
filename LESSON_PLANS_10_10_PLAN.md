# Lesson Plans System - 10/10 Rating Plan

## Phase 1: Database Optimization & Normalization (Priority: HIGH)

### 1.1 Create Audit Log Table
```sql
CREATE TABLE lesson_plan_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_plan_id INT NOT NULL,
  reviewed_by INT NOT NULL,
  status ENUM('approved', 'rejected') NOT NULL,
  remark TEXT,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id),
  FOREIGN KEY (reviewed_by) REFERENCES staff(id),
  INDEX idx_lesson_plan_id (lesson_plan_id),
  INDEX idx_reviewed_by (reviewed_by),
  INDEX idx_reviewed_at (reviewed_at)
);
```

### 1.2 Update lesson_plans Table
- Remove `reviewed_by`, `reviewed_at`, `remark` columns
- Add `current_status` ENUM with constraints
- Add `last_reviewed_at` TIMESTAMP
- Add foreign key constraints

### 1.3 Add Missing Indexes
```sql
ALTER TABLE lesson_plans ADD INDEX idx_status (status);
ALTER TABLE lesson_plans ADD INDEX idx_teacher_id (teacher_id);
ALTER TABLE lesson_plans ADD INDEX idx_school_branch (school_id, branch_id);
ALTER TABLE lesson_plans ADD INDEX idx_lesson_date (lesson_date);
ALTER TABLE lesson_plans ADD UNIQUE INDEX idx_unique_plan (teacher_id, lesson_date, subject_code, class_code);
```

## Phase 2: Backend Optimization (Priority: HIGH)

### 2.1 Create Constants File
```javascript
// src/constants/lessonPlanStatus.js
export const LESSON_PLAN_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const REVIEW_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
};
```

### 2.2 Implement Query Optimization
- Select only needed fields in queries
- Use eager loading for relationships
- Implement query result caching (Redis)
- Add database connection pooling

### 2.3 Add Authorization Middleware
```javascript
// Verify user is admin/branch admin before review
const authorizeReview = (req, res, next) => {
  if (!['admin', 'branchadmin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  next();
};
```

### 2.4 Implement Transaction for Review
```javascript
// Atomic operation: update lesson_plan + create audit log
await sequelize.transaction(async (t) => {
  await LessonPlan.update(..., { transaction: t });
  await LessonPlanReview.create(..., { transaction: t });
});
```

### 2.5 Add Input Validation & Sanitization
- Validate remark length (max 500 chars)
- Sanitize HTML in remarks
- Validate status enum values
- Check lesson plan exists before review

## Phase 3: Frontend Optimization (Priority: MEDIUM)

### 3.1 Extract Constants
```typescript
// src/constants/lessonPlanStatus.ts
export const LESSON_PLAN_STATUS = { ... };
```

### 3.2 Implement Query Caching
- Use React Query for data fetching
- Cache lesson plans with stale time
- Invalidate cache on review action

### 3.3 Refactor Duplicate Code
- Extract review submission logic to reusable function
- Create custom hook for review form

### 3.4 Add Error Boundaries
```typescript
<ErrorBoundary>
  <AdminLessonPlansDashboard />
</ErrorBoundary>
```

### 3.5 Optimize Re-renders
- Use useMemo for filtered data
- Use useCallback for event handlers
- Memoize table columns

## Phase 4: Security & Compliance (Priority: HIGH)

### 4.1 Add Role-Based Access Control
- Only admins can review
- Teachers can only view own plans
- Branch admins see branch plans only

### 4.2 Implement Audit Trail
- Log all review actions
- Track who reviewed, when, and what changed
- Immutable audit log

### 4.3 Add Data Validation
- Server-side validation for all inputs
- Rate limiting on review endpoint
- CSRF protection

### 4.4 Soft Deletes
```sql
ALTER TABLE lesson_plans ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE lesson_plan_reviews ADD COLUMN deleted_at TIMESTAMP NULL;
```

## Phase 5: Code Quality (Priority: MEDIUM)

### 5.1 Add Error Handling
- Try-catch blocks with specific error messages
- Graceful degradation
- User-friendly error messages

### 5.2 Add Logging
- Log all review actions
- Log errors with context
- Structured logging (Winston/Pino)

### 5.3 Add Unit Tests
- Test review logic
- Test authorization
- Test data validation

### 5.4 Add Integration Tests
- Test full review workflow
- Test concurrent reviews
- Test error scenarios

## Phase 6: Performance Monitoring (Priority: MEDIUM)

### 6.1 Add Performance Metrics
- Track API response times
- Monitor database query performance
- Track frontend render times

### 6.2 Add Error Monitoring
- Sentry integration
- Error tracking and alerting
- Performance budgets

## Implementation Order

1. **Week 1**: Database optimization + audit log table
2. **Week 2**: Backend authorization + transactions + validation
3. **Week 3**: Frontend optimization + React Query
4. **Week 4**: Security hardening + soft deletes
5. **Week 5**: Testing + monitoring setup

## Success Criteria for 10/10

✓ Zero N+1 queries
✓ Sub-100ms API response times
✓ Full audit trail of all reviews
✓ Role-based access control enforced
✓ 95%+ test coverage
✓ Zero security vulnerabilities
✓ Normalized database schema
✓ Optimized frontend (no unnecessary re-renders)
✓ Comprehensive error handling
✓ Production-ready monitoring
