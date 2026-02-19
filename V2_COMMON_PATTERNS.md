# V2 API Common Patterns

## Service Layer Pattern

### Structure
```
Request → Controller → Service → Database
         ↓           ↓          ↓
      HTTP Logic  Business   Data Access
```

### Example: Creating a Resource

**Service (Business Logic)**
```javascript
// services/StudentService.js
class StudentService {
  async create(data) {
    // Validate business rules
    if (await this.admissionNoExists(data.admission_no)) {
      throw new Error('Admission number already exists');
    }
    
    // Database operation
    const [result] = await mainDB.query(
      'INSERT INTO students (...) VALUES (...)',
      { replacements: data }
    );
    
    // Return created resource
    return this.getById(result);
  }
}
```

**Controller (HTTP Handler)**
```javascript
// controllers/students.js
const createStudent = async (req, res) => {
  try {
    // 1. Extract from request
    const data = {
      ...req.body,
      school_id: req.user.school_id,  // From JWT (security)
      branch_id: req.headers['x-branch-id'] || req.user.branch_id  // From header (flexibility)
    };
    
    // 2. Call service
    const student = await StudentService.create(data);
    
    // 3. Format response
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**Validator (Input Validation)**
```javascript
// validators/studentValidator.js
const studentCreateSchema = Joi.object({
  admission_no: Joi.string().required().max(50),
  first_name: Joi.string().required().max(100),
  // ... other fields
});

const validateCreate = (req, res, next) => {
  const { error } = studentCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      error: error.details[0].message 
    });
  }
  next();
};
```

**Route (Endpoint Definition)**
```javascript
// routes/students.js
const auth = passport.authenticate('jwt', { session: false });

app.post('/api/v2/students', 
  auth,                    // 1. Authenticate
  validateSchoolContext,   // 2. Validate school context
  validateCreate,          // 3. Validate input
  createStudent            // 4. Handle request
);
```

## Security Pattern

### Multi-Tenant Isolation

**ALWAYS use JWT token for school_id:**
```javascript
// ✅ CORRECT
const school_id = req.user.school_id;  // From JWT token

// ❌ WRONG
const school_id = req.body.school_id;  // User can tamper
const school_id = req.headers['x-school-id'];  // User can tamper
```

**Branch ID - Flexible for admins:**
```javascript
// ✅ CORRECT - Header priority for admin flexibility
const branch_id = req.headers['x-branch-id'] || req.user.branch_id || null;

// Allows admin to:
// 1. View data from any branch (send header)
// 2. Default to their branch (no header)
```

**Validation Middleware:**
```javascript
// middleware/validateSchoolContext.js
const validateSchoolContext = (req, res, next) => {
  // If header provided, must match token
  if (req.headers['x-school-id'] && 
      req.headers['x-school-id'] !== req.user.school_id) {
    return res.status(403).json({ 
      success: false,
      error: 'School ID mismatch: Cannot access different school data' 
    });
  }
  next();
};
```

## Query Pattern

### Filtering
```javascript
async getAll(filters = {}) {
  const { school_id, branch_id, status, search } = filters;
  
  let query = 'SELECT * FROM students WHERE school_id = :school_id';
  const replacements = { school_id };
  
  // Optional filters
  if (branch_id) {
    query += ' AND branch_id = :branch_id';
    replacements.branch_id = branch_id;
  }
  
  if (status) {
    query += ' AND status = :status';
    replacements.status = status;
  }
  
  if (search) {
    query += ' AND (first_name LIKE :search OR last_name LIKE :search)';
    replacements.search = `%${search}%`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  const [results] = await mainDB.query(query, { replacements });
  return results;
}
```

### Pagination (Future)
```javascript
async getAll(filters = {}, pagination = {}) {
  const { page = 1, limit = 50 } = pagination;
  const offset = (page - 1) * limit;
  
  // ... build query
  
  query += ' LIMIT :limit OFFSET :offset';
  replacements.limit = limit;
  replacements.offset = offset;
  
  const [results] = await mainDB.query(query, { replacements });
  const [countResult] = await mainDB.query(countQuery, { replacements });
  
  return {
    data: results,
    pagination: {
      page,
      limit,
      total: countResult[0].total,
      pages: Math.ceil(countResult[0].total / limit)
    }
  };
}
```

## Error Handling Pattern

### Service Layer
```javascript
// Throw descriptive errors
async create(data) {
  if (await this.exists(data.code)) {
    throw new Error('Resource already exists');
  }
  
  if (!await this.validateForeignKey(data.class_code)) {
    throw new Error('Invalid class code');
  }
  
  // ... create resource
}
```

### Controller Layer
```javascript
// Catch and format errors
const createResource = async (req, res) => {
  try {
    const resource = await ResourceService.create(data);
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    console.error('Create resource error:', error);
    
    // Specific error handling
    if (error.message.includes('already exists')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    // Generic error
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## Validation Pattern

### Joi Schema
```javascript
const createSchema = Joi.object({
  // Required fields
  name: Joi.string().required().max(100),
  code: Joi.string().required().max(50),
  
  // Optional fields
  description: Joi.string().allow(null, ''),
  
  // Enums
  status: Joi.string().valid('Active', 'Inactive'),
  
  // Numbers
  capacity: Joi.number().integer().min(1).max(1000),
  
  // Dates
  start_date: Joi.date().iso(),
  
  // Email
  email: Joi.string().email().allow(null, ''),
  
  // Nested objects
  metadata: Joi.object({
    key: Joi.string()
  }).allow(null)
});
```

### Middleware
```javascript
const validateCreate = (req, res, next) => {
  const { error } = createSchema.validate(req.body, {
    abortEarly: false  // Return all errors
  });
  
  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({ 
      success: false, 
      error: errors.join(', ')
    });
  }
  
  next();
};
```

## Response Pattern

### Success Response
```javascript
// Single resource
res.status(200).json({
  success: true,
  data: { id: 1, name: 'John' }
});

// List of resources
res.status(200).json({
  success: true,
  data: [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ]
});

// Created resource
res.status(201).json({
  success: true,
  data: { id: 3, name: 'New' }
});

// Deleted resource
res.status(200).json({
  success: true,
  message: 'Resource deleted successfully'
});
```

### Error Response
```javascript
// Validation error
res.status(400).json({
  success: false,
  error: 'Validation failed: name is required'
});

// Authentication error
res.status(401).json({
  success: false,
  error: 'Unauthorized: Invalid or expired token'
});

// Authorization error
res.status(403).json({
  success: false,
  error: 'Forbidden: Cannot access different school data'
});

// Not found
res.status(404).json({
  success: false,
  error: 'Resource not found'
});

// Server error
res.status(500).json({
  success: false,
  error: 'Internal server error'
});
```

## Testing Pattern

### Service Test
```javascript
// tests/services/StudentService.test.js
describe('StudentService', () => {
  test('getAll filters by school_id', async () => {
    const students = await StudentService.getAll({ 
      school_id: 'SCH/23' 
    });
    
    expect(students).toBeInstanceOf(Array);
    students.forEach(s => {
      expect(s.school_id).toBe('SCH/23');
    });
  });
  
  test('create throws error for duplicate admission_no', async () => {
    await expect(
      StudentService.create({ admission_no: 'EXISTING' })
    ).rejects.toThrow('already exists');
  });
});
```

### Controller Test (Integration)
```javascript
// tests/controllers/students.test.js
describe('POST /api/v2/students', () => {
  test('creates student with valid data', async () => {
    const response = await request(app)
      .post('/api/v2/students')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        admission_no: 'STD001',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'Male',
        class_code: 'JSS1A'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.admission_no).toBe('STD001');
  });
  
  test('rejects request without auth', async () => {
    const response = await request(app)
      .post('/api/v2/students')
      .send({ ... });
    
    expect(response.status).toBe(401);
  });
});
```

## Caching Pattern (Future)

### Redis Integration
```javascript
class StudentService {
  async getAll(filters) {
    const cacheKey = `students:${filters.school_id}:${filters.branch_id}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database
    const students = await mainDB.query(...);
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(students));
    
    return students;
  }
  
  async create(data) {
    const student = await mainDB.query(...);
    
    // Invalidate cache
    await redis.del(`students:${data.school_id}:*`);
    
    return student;
  }
}
```

---

**Last Updated:** 2026-02-12  
**Version:** 2.0
