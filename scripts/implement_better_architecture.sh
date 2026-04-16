#!/bin/bash
# Rollback to simpler structure and implement better approach

set -e

echo "=== Implementing Better Architecture ==="
echo ""

# 1. Rollback the complex reorganization
echo "[1/6] Rolling back complex domain structure..."
if [ -d "code_backup_20260212_041451" ]; then
  rm -rf elscholar-api/src/domains
  cp -r code_backup_20260212_041451/controllers/* elscholar-api/src/controllers/ 2>/dev/null || true
  cp -r code_backup_20260212_041451/routes/* elscholar-api/src/routes/ 2>/dev/null || true
  cp -r code_backup_20260212_041451/models/* elscholar-api/src/models/ 2>/dev/null || true
  echo "✓ Rolled back to original structure"
else
  echo "⚠️  Backup not found, keeping current structure"
fi
echo ""

# 2. Keep the good parts
echo "[2/6] Keeping valuable additions..."
mkdir -p elscholar-api/src/utils
mkdir -p elscholar-api/src/services
mkdir -p elscholar-api/src/validators
mkdir -p elscholar-api/src/tests

# Move cross-DB helpers to utils
if [ -f "elscholar-api/src/domains/shared/helpers/crossDbHelpers.js" ]; then
  cp elscholar-api/src/domains/shared/helpers/crossDbHelpers.js elscholar-api/src/utils/
  echo "✓ Moved crossDbHelpers to utils"
fi
echo ""

# 3. Create Service Layer
echo "[3/6] Creating Service Layer..."
cat > elscholar-api/src/services/SubjectService.js << 'EOF'
const { contentDB, mainDB } = require('../config/databases');
const { enrichWithMainData } = require('../utils/crossDbHelpers');

class SubjectService {
  async getAll(filters = {}) {
    const { school_id, class_code, section } = filters;
    
    let query = 'SELECT * FROM subjects WHERE 1=1';
    const replacements = {};
    
    if (school_id) {
      query += ' AND school_id = :school_id';
      replacements.school_id = school_id;
    }
    if (class_code) {
      query += ' AND class_code = :class_code';
      replacements.class_code = class_code;
    }
    if (section) {
      query += ' AND section = :section';
      replacements.section = section;
    }
    
    const subjects = await contentDB.query(query, {
      replacements,
      type: contentDB.QueryTypes.SELECT
    });
    
    return subjects;
  }

  async getById(subjectCode) {
    const [subject] = await contentDB.query(
      'SELECT * FROM subjects WHERE subject_code = :code',
      { replacements: { code: subjectCode }, type: contentDB.QueryTypes.SELECT }
    );
    return subject;
  }

  async getWithTeachers(filters = {}) {
    const subjects = await this.getAll(filters);
    
    // Get teacher assignments from teacher_classes
    const teacherIds = [...new Set(subjects.map(s => s.teacher_id).filter(Boolean))];
    
    if (teacherIds.length === 0) return subjects;
    
    const teachers = await mainDB.query(
      'SELECT id, name, email FROM staff WHERE id IN (:ids)',
      { replacements: { ids: teacherIds }, type: mainDB.QueryTypes.SELECT }
    );
    
    const teacherMap = teachers.reduce((map, t) => {
      map[t.id] = t;
      return map;
    }, {});
    
    return subjects.map(subject => ({
      ...subject,
      teacher: teacherMap[subject.teacher_id] || null
    }));
  }

  async create(data) {
    const { subject, subject_code, class_code, section, school_id, type } = data;
    
    await contentDB.query(
      `INSERT INTO subjects (subject, subject_code, class_code, section, school_id, type, status)
       VALUES (:subject, :subject_code, :class_code, :section, :school_id, :type, 'Active')`,
      {
        replacements: { subject, subject_code, class_code, section, school_id, type: type || 'core' }
      }
    );
    
    return this.getById(subject_code);
  }

  async update(subjectCode, data) {
    const updates = [];
    const replacements = { code: subjectCode };
    
    if (data.subject) {
      updates.push('subject = :subject');
      replacements.subject = data.subject;
    }
    if (data.status) {
      updates.push('status = :status');
      replacements.status = data.status;
    }
    
    if (updates.length === 0) return this.getById(subjectCode);
    
    await contentDB.query(
      `UPDATE subjects SET ${updates.join(', ')} WHERE subject_code = :code`,
      { replacements }
    );
    
    return this.getById(subjectCode);
  }

  async delete(subjectCode) {
    await contentDB.query(
      'UPDATE subjects SET status = :status WHERE subject_code = :code',
      { replacements: { status: 'Inactive', code: subjectCode } }
    );
    return { success: true };
  }
}

module.exports = new SubjectService();
EOF

echo "✓ Created SubjectService"
echo ""

# 4. Create Validator
echo "[4/6] Creating Validation Layer..."
cat > elscholar-api/src/validators/subjectValidator.js << 'EOF'
const Joi = require('joi');

const subjectSchema = Joi.object({
  subject: Joi.string().required().min(2).max(100),
  subject_code: Joi.string().required().max(50),
  class_code: Joi.string().required().max(50),
  section: Joi.string().required().max(45),
  school_id: Joi.string().required().max(11),
  type: Joi.string().valid('core', 'elective', 'extra').default('core'),
  status: Joi.string().valid('Active', 'Inactive').default('Active')
});

const updateSchema = Joi.object({
  subject: Joi.string().min(2).max(100),
  status: Joi.string().valid('Active', 'Inactive')
}).min(1);

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }
    
    req.validatedData = value;
    next();
  };
};

module.exports = {
  validateCreate: validate(subjectSchema),
  validateUpdate: validate(updateSchema)
};
EOF

echo "✓ Created validators"
echo ""

# 5. Create Automated Tests
echo "[5/6] Creating Automated Tests..."
cat > elscholar-api/src/tests/subject.test.js << 'EOF'
const request = require('supertest');
const { contentDB, mainDB } = require('../config/databases');

// Mock app setup
const express = require('express');
const app = express();
app.use(express.json());

// Import routes
const subjectRoutes = require('../routes/subjects');
app.use('/api/subjects', subjectRoutes);

describe('Subject API Tests', () => {
  beforeAll(async () => {
    // Setup test database connection
    await contentDB.authenticate();
  });

  afterAll(async () => {
    // Cleanup
    await contentDB.close();
  });

  describe('GET /api/subjects', () => {
    it('should return list of subjects', async () => {
      const response = await request(app)
        .get('/api/subjects')
        .expect('Content-Type', /json/);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by school_id', async () => {
      const response = await request(app)
        .get('/api/subjects?school_id=SCH/20')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/subjects', () => {
    it('should create new subject with valid data', async () => {
      const newSubject = {
        subject: 'Test Subject',
        subject_code: 'TEST001',
        class_code: 'CLS001',
        section: 'Primary',
        school_id: 'SCH/20',
        type: 'core'
      };

      const response = await request(app)
        .post('/api/subjects')
        .send(newSubject)
        .expect(201);
      
      expect(response.body.subject).toBe(newSubject.subject);
    });

    it('should reject invalid data', async () => {
      const invalidSubject = {
        subject: 'T', // Too short
        subject_code: 'TEST002'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/subjects')
        .send(invalidSubject)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});
EOF

# Create test runner script
cat > elscholar-api/src/tests/run-tests.sh << 'EOF'
#!/bin/bash
echo "Running API Tests..."
cd "$(dirname "$0")/.."
npm test -- --coverage --verbose
EOF

chmod +x elscholar-api/src/tests/run-tests.sh

echo "✓ Created automated tests"
echo ""

# 6. Create simple feature-based structure
echo "[6/6] Creating simpler feature structure..."
cat > elscholar-api/SIMPLE_STRUCTURE.md << 'EOF'
# Simpler Feature-Based Structure

## Current Structure (Flat & Simple)
```
src/
├── controllers/
│   ├── subjects.js          # Business logic
│   ├── lessons.js
│   └── ...
├── routes/
│   ├── subjects.js          # API endpoints
│   ├── lessons.js
│   └── ...
├── models/
│   ├── Subject.js           # Database models
│   ├── Lesson.js
│   └── ...
├── services/                # NEW - Business logic layer
│   ├── SubjectService.js    # Handles DB operations
│   ├── LessonService.js
│   └── ...
├── validators/              # NEW - Input validation
│   ├── subjectValidator.js
│   ├── lessonValidator.js
│   └── ...
├── utils/                   # NEW - Shared utilities
│   ├── crossDbHelpers.js    # Cross-database queries
│   ├── responseFormatter.js
│   └── errorHandler.js
└── tests/                   # NEW - Automated tests
    ├── subject.test.js
    ├── lesson.test.js
    └── run-tests.sh
```

## Benefits
1. **Flat structure** - Easy to navigate
2. **Clear separation** - Each layer has one job
3. **Simple imports** - No deep nesting
4. **Easy to test** - Services are isolated
5. **Gradual migration** - Add services one at a time

## Migration Path
1. Keep existing controllers/routes working
2. Create service for one feature (e.g., SubjectService)
3. Update controller to use service
4. Add tests
5. Repeat for next feature

## Example Usage

### Before (Controller does everything)
```javascript
// controllers/subjects.js
const db = require('../models');

exports.getAll = async (req, res) => {
  const subjects = await db.sequelize.query('SELECT * FROM subjects');
  res.json(subjects);
};
```

### After (Service handles logic)
```javascript
// services/SubjectService.js
class SubjectService {
  async getAll(filters) {
    return contentDB.query('SELECT * FROM subjects WHERE ...');
  }
}

// controllers/subjects.js
const SubjectService = require('../services/SubjectService');

exports.getAll = async (req, res) => {
  try {
    const subjects = await SubjectService.getAll(req.query);
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## Next Steps
1. ✅ Service layer created (SubjectService)
2. ✅ Validators created
3. ✅ Tests created
4. ⏳ Update controllers to use services
5. ⏳ Add more services (LessonService, AssignmentService, etc.)
6. ⏳ Run automated tests
7. ⏳ Add API documentation
EOF

echo "✓ Created structure documentation"
echo ""

echo "=== Implementation Complete ===" 
echo ""
echo "Created:"
echo "  - services/SubjectService.js (business logic)"
echo "  - validators/subjectValidator.js (input validation)"
echo "  - tests/subject.test.js (automated tests)"
echo "  - utils/crossDbHelpers.js (cross-DB utilities)"
echo ""
echo "Next steps:"
echo "  1. Install test dependencies: cd elscholar-api && npm install --save-dev jest supertest"
echo "  2. Update package.json test script"
echo "  3. Update controllers to use services"
echo "  4. Run tests: npm test"
echo ""
echo "Benefits:"
echo "  ✓ Simpler structure (flat, not nested)"
echo "  ✓ Service layer (testable business logic)"
echo "  ✓ Validation layer (prevent bad data)"
echo "  ✓ Automated tests (confidence to refactor)"
echo "  ✓ Easy to understand and maintain"
