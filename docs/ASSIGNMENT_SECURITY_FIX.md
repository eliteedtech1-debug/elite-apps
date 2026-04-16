# Assignment Security Vulnerability Fix

## Issue Description

The class assignment system at `http://localhost:3000/academic/class-assignment` has a critical security vulnerability where assignments are fetched without properly checking who created them. This allows any authenticated teacher to view assignments created by other teachers.

## Root Cause Analysis

### 1. Stored Procedure Issue
**File:** `elscholar-api/src/models/EXISTING-PROCS.sql` (line ~493)

The `assignments` stored procedure has a hardcoded `teacher_id = 1` in the `select_teacher_assignment` query type:

```sql
ELSEIF in_query_type = 'select_teacher_assignment' THEN
    SELECT (SELECT SUM(aq.marks) FROM assignment_questions aq WHERE aq.assignment_id = a.id) as marks,
    a.* FROM assignments a
    WHERE a.teacher_id = 1  -- ❌ HARDCODED - SECURITY VULNERABILITY
    AND a.academic_year = in_academic_year 
    AND a.term = in_term ORDER BY a.assignment_date DESC;
```

This should use the `in_teacher_id` parameter instead.

### 2. Controller Issue
**File:** `elscholar-api/src/controllers/assignments.js`

The controller accepts `teacher_id` from the request parameters instead of using the authenticated user's ID:

```javascript
const {
  teacher_id = null,  // ❌ Accepts any teacher_id from request
  // ... other params
} = req.query;

// Uses the potentially malicious teacher_id
teacher_id,
```

This allows users to specify any teacher_id in their requests.

## Security Impact

- **Data Exposure:** Teachers can view assignments created by other teachers
- **Privacy Violation:** Sensitive assignment content and student responses exposed
- **Authorization Bypass:** Authentication is present but authorization is ineffective

## Fixes Applied

### 1. Database Fix
**File:** `fix-assignment-security.sql`

```sql
-- Fixed the hardcoded teacher_id
WHERE a.teacher_id = in_teacher_id  -- ✅ FIXED: Use parameter instead of hardcoded value
    AND a.academic_year = in_academic_year 
    AND a.term = in_term 
    AND a.school_id = in_school_id
    AND a.branch_id = in_branch_id
```

Also added security checks to update and delete operations:
```sql
-- Only allow updates by assignment creator
WHERE id = in_id AND teacher_id = in_teacher_id;

-- Only allow deletion by assignment creator  
DELETE FROM assignments WHERE id = in_id AND teacher_id = in_teacher_id;
```

### 2. Controller Fix
**File:** `elscholar-api/src/controllers/assignments-fixed.js`

```javascript
// SECURITY FIX: Use authenticated user's teacher_id instead of request parameter
const authenticatedTeacherId = req.user.teacher_id || req.user.id;

// Use authenticated user's ID in database call
teacher_id: authenticatedTeacherId, // ✅ SECURITY: Use authenticated user's ID
```

## Deployment Steps

### 1. Apply Database Fix
```bash
mysql -u root -p skcooly_db < fix-assignment-security.sql
```

### 2. Update Controller
```bash
cp elscholar-api/src/controllers/assignments-fixed.js elscholar-api/src/controllers/assignments.js
```

### 3. Restart API Server
```bash
cd elscholar-api
npm restart
```

## Verification

After applying the fixes:

1. **Test as Teacher A:** Login and create an assignment
2. **Test as Teacher B:** Login and verify you cannot see Teacher A's assignments
3. **Test API directly:** Attempt to pass different `teacher_id` values - should be ignored
4. **Test update/delete:** Verify teachers can only modify their own assignments

## Additional Security Recommendations

1. **Input Validation:** Add server-side validation for all assignment parameters
2. **Audit Logging:** Log all assignment access attempts with user details
3. **Rate Limiting:** Implement rate limiting on assignment endpoints
4. **RBAC Integration:** Integrate with the new RBAC system for fine-grained permissions
5. **Frontend Validation:** Ensure frontend doesn't expose assignment data inappropriately

## Files Modified

- `fix-assignment-security.sql` - Database stored procedure fix
- `elscholar-api/src/controllers/assignments-fixed.js` - Controller security fix

## Testing Checklist

- [ ] Teachers can only see their own assignments
- [ ] Assignment creation works correctly
- [ ] Assignment updates only work for creators
- [ ] Assignment deletion only works for creators
- [ ] Student assignment viewing still works
- [ ] API returns appropriate error messages for unauthorized access

---

**Priority:** Critical
**Impact:** High - Data exposure vulnerability
**Effort:** Low - Simple parameter fixes
**Status:** Ready for deployment
