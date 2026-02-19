# Multi-Tenant Header Management

## X-Branch-Id Header Behavior

### Overview
The `X-Branch-Id` header is **optional** in V2 API. The system intelligently handles branch context based on user role and provided headers.

---

## How It Works

### Priority Order:
```javascript
branch_id = req.headers['x-branch-id'] || req.user.branch_id || null
```

1. **Header value** (if provided)
2. **User's assigned branch** (from JWT token)
3. **Null** (returns all branches for that school)

---

## Use Cases

### 1. Regular Users (Teacher, Parent, Student)
**Don't need to provide X-Branch-Id**

```bash
# Teacher accessing their lessons
curl -X GET 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'X-School-Id: SCH/20'
  # X-Branch-Id automatically uses teacher's branch
```

**Result:** Returns lessons for teacher's assigned branch only

---

### 2. Admin Users - Single Branch
**Can omit X-Branch-Id**

```bash
# Admin viewing their branch
curl -X GET 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'X-School-Id: SCH/20'
  # Uses admin's default branch
```

**Result:** Returns lessons for admin's branch

---

### 3. Admin Users - Specific Branch
**Provide X-Branch-Id to access different branch**

```bash
# Admin viewing Branch A
curl -X GET 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027'

# Admin viewing Branch B
curl -X GET 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00028'
```

**Result:** Returns lessons for specified branch

---

### 4. Super Admin - All Branches
**Omit X-Branch-Id to see all branches**

```bash
# Super admin viewing all branches
curl -X GET 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'X-School-Id: SCH/20'
  # No X-Branch-Id = all branches
```

**Result:** Returns lessons from all branches in that school

---

## Frontend Implementation

### React Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:34567/api/v2'
});

// Add auth and school context
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  
  config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-School-Id'] = user.school_id;
  
  // Only add X-Branch-Id if explicitly needed
  // For regular users, omit it (uses their assigned branch)
  // For admins, add it only when accessing specific branch
  
  return config;
});

// Regular user - no branch header needed
const getLessons = () => {
  return api.get('/lessons');
  // Automatically uses user's branch
};

// Admin - accessing specific branch
const getBranchLessons = (branchId) => {
  return api.get('/lessons', {
    headers: {
      'X-Branch-Id': branchId
    }
  });
};

// Admin - all branches
const getAllBranchesLessons = () => {
  return api.get('/lessons');
  // No X-Branch-Id = all branches
};
```

---

## Backend Implementation

### Controller Pattern

```javascript
const getAllLessons = async (req, res) => {
  const filters = {
    school_id: req.headers['x-school-id'] || req.user.school_id,
    branch_id: req.headers['x-branch-id'] || req.user.branch_id || null,
    // ... other filters
  };
  
  const lessons = await LessonService.getAll(filters);
  res.json({ success: true, data: lessons });
};
```

### Service Pattern

```javascript
async getAll(filters) {
  let query = 'SELECT * FROM lessons WHERE school_id = :school_id';
  const replacements = { school_id: filters.school_id };
  
  // Only filter by branch if provided
  if (filters.branch_id) {
    query += ' AND branch_id = :branch_id';
    replacements.branch_id = filters.branch_id;
  }
  
  return await contentDB.query(query, { replacements });
}
```

---

## OpenAPI Documentation

```yaml
parameters:
  BranchIdHeader:
    name: X-Branch-Id
    in: header
    required: false  # ← Optional
    schema:
      type: string
      example: BRCH00027
    description: |
      Branch identifier (optional).
      
      If not provided, uses authenticated user's branch.
      
      Use cases:
      - Omit: Regular users (auto-uses their branch)
      - Omit: Admins viewing all branches
      - Provide: Admins accessing specific branch
```

---

## Security Considerations

### 1. Authorization Check
```javascript
// Ensure user has permission to access requested branch
if (req.headers['x-branch-id'] && req.headers['x-branch-id'] !== req.user.branch_id) {
  // Check if user is admin or has cross-branch permission
  if (!req.user.is_admin && !req.user.cross_branch_access) {
    return res.status(403).json({ 
      success: false, 
      error: 'Not authorized to access this branch' 
    });
  }
}
```

### 2. Audit Logging
```javascript
// Log branch access for admins
if (req.headers['x-branch-id'] && req.headers['x-branch-id'] !== req.user.branch_id) {
  await auditLog({
    user_id: req.user.id,
    action: 'CROSS_BRANCH_ACCESS',
    branch_id: req.headers['x-branch-id'],
    resource: req.path
  });
}
```

---

## Testing

### Test Cases

```javascript
describe('Branch-Id Header', () => {
  it('should use user branch when header omitted', async () => {
    const response = await request(app)
      .get('/api/v2/lessons')
      .set('Authorization', 'Bearer TEACHER_TOKEN')
      .set('X-School-Id', 'SCH/20');
      // No X-Branch-Id
    
    expect(response.body.data).toMatchBranch('BRCH00027'); // Teacher's branch
  });
  
  it('should use header branch when provided', async () => {
    const response = await request(app)
      .get('/api/v2/lessons')
      .set('Authorization', 'Bearer ADMIN_TOKEN')
      .set('X-School-Id', 'SCH/20')
      .set('X-Branch-Id', 'BRCH00028');
    
    expect(response.body.data).toMatchBranch('BRCH00028');
  });
  
  it('should return all branches when admin omits header', async () => {
    const response = await request(app)
      .get('/api/v2/lessons')
      .set('Authorization', 'Bearer SUPERADMIN_TOKEN')
      .set('X-School-Id', 'SCH/20');
      // No X-Branch-Id
    
    expect(response.body.data).toHaveMultipleBranches();
  });
});
```

---

## Summary

| User Type | X-Branch-Id | Behavior |
|-----------|-------------|----------|
| Teacher | Omit | Uses teacher's branch |
| Teacher | Provide | ❌ Forbidden (unless cross-branch permission) |
| Admin | Omit | Uses admin's default branch |
| Admin | Provide | Uses specified branch |
| Super Admin | Omit | Returns all branches |
| Super Admin | Provide | Uses specified branch |

---

## Best Practices

### ✅ Do:
- Omit header for regular users
- Use header for admin cross-branch access
- Validate permissions before allowing cross-branch access
- Log cross-branch access for audit

### ❌ Don't:
- Require header for all users
- Allow unauthorized cross-branch access
- Forget to validate branch permissions
- Skip audit logging for admin actions

---

**Updated:** 2026-02-12  
**Status:** Implemented in V2 API  
**Documentation:** OpenAPI spec updated
