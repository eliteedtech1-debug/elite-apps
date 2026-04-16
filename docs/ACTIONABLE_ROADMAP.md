# Elite Core V2 API - Next Actions & Roadmap

**Date:** 2026-02-12  
**Status:** V2 API Foundation Complete  
**Goal:** Scale to 1000+ schools

---

## 🎯 Immediate Next Actions

### **Priority 1: Test & Stabilize V2 API** (This Week)

#### Why First?
You have a working V2 API but haven't tested with real data/users yet.

#### Actions:
```bash
# 1. Test V2 endpoints with valid JWT
curl -X POST http://localhost:34567/api/v2/lessons \
  -H "Authorization: Bearer <REAL_TOKEN>" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Lesson",
    "content": "Testing V2 API",
    "class_code": "JSS1A",
    "subject_code": "MATH101",
    "lesson_date": "2026-02-13"
  }'

# 2. Verify in database
mysql -u root full_skcooly -e "SELECT * FROM lessons ORDER BY id DESC LIMIT 1;"

# 3. Test all CRUD operations
# - Create lesson ✓
# - Get lessons ✓
# - Update lesson ✓
# - Delete lesson ✓
# - Add comment ✓

# 4. Test attendance marking
curl -X POST http://localhost:34567/api/v2/attendance/mark \
  -H "Authorization: Bearer <REAL_TOKEN>" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 101,
    "class_code": "JSS1A",
    "date": "2026-02-12",
    "status": "Present"
  }'

# 5. Test bulk attendance
curl -X POST http://localhost:34567/api/v2/attendance/bulk \
  -H "Authorization: Bearer <REAL_TOKEN>" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {"student_id": 101, "class_code": "JSS1A", "date": "2026-02-12", "status": "Present"},
      {"student_id": 102, "class_code": "JSS1A", "date": "2026-02-12", "status": "Absent"}
    ]
  }'
```

#### Frontend Integration Test
```javascript
// Update 1-2 components to use V2 API
// Start with Lessons page (low risk)

// Before (old)
axios.post('/lessons', { query_type: 'read' })

// After (new V2)
axios.get('/api/v2/lessons', {
  params: { class_code: 'JSS1A' },
  headers: {
    'X-School-Id': schoolId,
    'X-Branch-Id': branchId
  }
})
```

#### Checklist:
- [ ] Test all V2 endpoints with real JWT
- [ ] Verify data persists correctly in database
- [ ] Update 1 frontend component (Lessons page)
- [ ] Compare old vs new API responses
- [ ] Share /api-docs with frontend team
- [ ] Collect feedback and fix issues
- [ ] Document any bugs found

**Time:** 3-5 days  
**Risk:** Low  
**Value:** Validate architecture works in production

---

## **Priority 2: Add Critical Missing Services** (Next Week)

### What's Missing?
V2 API only has 4 features (Lessons, Assignments, Attendance, Syllabus).  
Need core operational services.

### Services to Create:

#### 1. StudentService (CRITICAL)
```javascript
// elscholar-api/src/services/StudentService.js

class StudentService {
  async getAll(filters) {
    // Get students by school, branch, class
  }
  
  async getById(id) {
    // Get single student
  }
  
  async getByClass(classCode, schoolId) {
    // Get all students in a class
  }
  
  async create(data) {
    // Enroll new student
  }
  
  async update(id, data) {
    // Update student profile
  }
  
  async getBalance(studentId) {
    // Get payment balance
  }
}
```

**Endpoints:**
- `GET /api/v2/students`
- `GET /api/v2/students/:id`
- `GET /api/v2/students/class/:classCode`
- `POST /api/v2/students`
- `PUT /api/v2/students/:id`
- `GET /api/v2/students/:id/balance`

#### 2. PaymentService (CRITICAL)
```javascript
// elscholar-api/src/services/PaymentService.js

class PaymentService {
  async createPayment(data) {
    // Record payment
  }
  
  async getStudentPayments(studentId) {
    // Payment history
  }
  
  async getBalance(studentId) {
    // Outstanding balance
  }
  
  async getReceipt(paymentId) {
    // Generate receipt
  }
}
```

**Endpoints:**
- `POST /api/v2/payments`
- `GET /api/v2/payments/student/:studentId`
- `GET /api/v2/payments/:id/receipt`
- `GET /api/v2/students/:id/balance`

#### 3. ClassService
```javascript
// elscholar-api/src/services/ClassService.js

class ClassService {
  async getAll(filters) {
    // Get classes by school/branch
  }
  
  async getById(id) {
    // Get class details
  }
  
  async getStudents(classCode) {
    // Get students in class
  }
  
  async getTeachers(classCode) {
    // Get teachers for class
  }
}
```

**Endpoints:**
- `GET /api/v2/classes`
- `GET /api/v2/classes/:id`
- `GET /api/v2/classes/:classCode/students`
- `GET /api/v2/classes/:classCode/teachers`

#### 4. TeacherService
```javascript
// elscholar-api/src/services/TeacherService.js

class TeacherService {
  async getAll(filters) {
    // Get teachers
  }
  
  async getById(id) {
    // Get teacher details
  }
  
  async getClasses(teacherId) {
    // Get assigned classes
  }
  
  async getSchedule(teacherId) {
    // Get teaching schedule
  }
}
```

**Endpoints:**
- `GET /api/v2/teachers`
- `GET /api/v2/teachers/:id`
- `GET /api/v2/teachers/:id/classes`
- `GET /api/v2/teachers/:id/schedule`

### Implementation Checklist:
- [ ] Create StudentService + validator + controller + routes
- [ ] Create PaymentService + validator + controller + routes
- [ ] Create ClassService + validator + controller + routes
- [ ] Create TeacherService + validator + controller + routes
- [ ] Update OpenAPI documentation
- [ ] Write tests for each service
- [ ] Test all endpoints

**Time:** 1 week (1-2 services per day)  
**Risk:** Low (same pattern as existing services)  
**Value:** Complete core functionality

---

## **Priority 3: Performance Optimization** (Week 3)

### Why Now?
Before scaling to more schools, optimize what you have.

### 1. Add Redis Caching

```bash
# Install Redis
npm install ioredis

# Create cache service
# elscholar-api/src/services/cacheService.js
```

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

class CacheService {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async set(key, value, ttl = 300) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async del(key) {
    await redis.del(key);
  }
}
```

**Cache Strategy:**
```javascript
// LessonService.js
async getAll(filters) {
  const cacheKey = `lessons:${filters.school_id}:${filters.class_code}`;
  
  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;
  
  // Query database
  const lessons = await contentDB.query(...);
  
  // Cache for 5 minutes
  await cacheService.set(cacheKey, lessons, 300);
  
  return lessons;
}
```

**What to Cache:**
- Lesson lists (5 min TTL)
- Class lists (10 min TTL)
- Student lists (2 min TTL)
- Teacher schedules (10 min TTL)
- Syllabus (1 hour TTL)

### 2. Add Database Indexes

```sql
-- Lessons
CREATE INDEX idx_lessons_school_class_date 
ON lessons(school_id, class_code, lesson_date);

CREATE INDEX idx_lessons_teacher 
ON lessons(teacher_id, lesson_date);

-- Attendance
CREATE INDEX idx_attendance_school_date 
ON attendance(school_id, date, class_code);

CREATE INDEX idx_attendance_student 
ON attendance(student_id, date);

-- Assignments
CREATE INDEX idx_assignments_school_class 
ON assignments(school_id, class_code, due_date);

-- Students
CREATE INDEX idx_students_school_class 
ON students(school_id, class_code);

-- Payments
CREATE INDEX idx_payments_student_date 
ON payment_entries(student_id, payment_date);
```

### 3. Query Optimization

```javascript
// Add query logging
// elscholar-api/src/middleware/queryLogger.js

const logSlowQueries = (query, duration) => {
  if (duration > 100) {
    console.warn(`🐌 Slow query (${duration}ms):`, query);
  }
};

// Identify and optimize top 10 slowest queries
```

### Checklist:
- [ ] Install and configure Redis
- [ ] Implement caching in all services
- [ ] Add database indexes
- [ ] Enable query logging
- [ ] Identify slow queries
- [ ] Optimize top 10 slowest queries
- [ ] Measure performance improvement

**Time:** 3-5 days  
**Risk:** Low  
**Value:** 3-5x performance improvement

---

## **Priority 4: Database Strategy Decision** (Week 4)

### The Big Question:
Should you split `elite_content` now or later?

### My Recommendation: **LATER**

### Do This Instead:

#### 1. Add Read Replicas
```bash
# Setup MySQL read replica
# Point reports/dashboards to replica
# Keep transactions on primary

# config/databases.js
const mainDBPrimary = createConnection({...}, 'Primary');
const mainDBReplica = createConnection({...}, 'Replica');

// Use in services
const students = await mainDBReplica.query('SELECT...');  // Read
await mainDBPrimary.query('INSERT...');  // Write
```

#### 2. Archive Old Data
```sql
-- Create archive database
CREATE DATABASE elite_archive;

-- Move old attendance (>1 year)
INSERT INTO elite_archive.attendance_archive
SELECT * FROM full_skcooly.attendance 
WHERE date < DATE_SUB(NOW(), INTERVAL 1 YEAR);

DELETE FROM full_skcooly.attendance 
WHERE date < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Move old payments (>2 years)
INSERT INTO elite_archive.payment_archive
SELECT * FROM full_skcooly.payment_entries 
WHERE payment_date < DATE_SUB(NOW(), INTERVAL 2 YEAR);

-- Result: Reduce main DB size by 40%
```

#### 3. Multi-Tenancy Audit
```javascript
// Ensure ALL queries filter by school_id
// Add middleware to verify

const ensureSchoolContext = (req, res, next) => {
  if (!req.headers['x-school-id']) {
    return res.status(400).json({ 
      error: 'X-School-Id header required' 
    });
  }
  next();
};

// Add to all V2 routes
app.use('/api/v2', ensureSchoolContext);
```

### Checklist:
- [ ] Setup read replica
- [ ] Update services to use replica for reads
- [ ] Create elite_archive database
- [ ] Archive old attendance data
- [ ] Archive old payment data
- [ ] Verify multi-tenant isolation
- [ ] Add monitoring and alerts

**Time:** 1 week  
**Risk:** Medium  
**Value:** Better than splitting now

---

## ❌ DON'T Do (Yet)

### 1. Database Splitting
**Why not?**
- Only 4 services implemented
- Not tested at scale yet
- Adds complexity without proven need
- Can do later when actually needed

**When to do it:**
- After 100+ schools
- When you hit real performance bottlenecks
- When you have monitoring showing the need

### 2. Microservices
**Why not?**
- Premature optimization
- Monolith works fine for 100-200 schools
- Adds operational complexity
- Network latency issues

**When to do it:**
- After 500+ schools
- When teams are large enough
- When you need independent scaling

### 3. Complete Rewrite
**Why not?**
- Old system works
- V2 API coexists safely
- Gradual migration is safer
- No business value

---

## 📋 4-Week Detailed Roadmap

### Week 1: Validation & Testing
**Goal:** Ensure V2 API works in production

**Monday:**
- [ ] Test all V2 endpoints with real JWT tokens
- [ ] Verify data persists correctly in database
- [ ] Document any issues found

**Tuesday:**
- [ ] Update Lessons frontend component to use V2
- [ ] Test in development environment
- [ ] Compare old vs new responses

**Wednesday:**
- [ ] Deploy to staging
- [ ] Test with real school data
- [ ] Get feedback from 2-3 users

**Thursday:**
- [ ] Fix any bugs found
- [ ] Update documentation
- [ ] Prepare for production

**Friday:**
- [ ] Deploy to production (1 school only)
- [ ] Monitor for issues
- [ ] Document learnings

**Deliverables:**
- ✅ V2 API tested with real data
- ✅ 1 frontend component migrated
- ✅ Bug fixes implemented
- ✅ Production deployment validated

---

### Week 2: Core Services Implementation
**Goal:** Complete essential services

**Monday:**
- [ ] Create StudentService
- [ ] Create student validator
- [ ] Create student controller
- [ ] Create student routes
- [ ] Update OpenAPI docs

**Tuesday:**
- [ ] Test StudentService endpoints
- [ ] Create PaymentService
- [ ] Create payment validator
- [ ] Create payment controller

**Wednesday:**
- [ ] Create payment routes
- [ ] Test PaymentService endpoints
- [ ] Update OpenAPI docs
- [ ] Integration testing

**Thursday:**
- [ ] Create ClassService
- [ ] Create TeacherService
- [ ] Create validators and controllers
- [ ] Create routes

**Friday:**
- [ ] Test all new services
- [ ] Update OpenAPI documentation
- [ ] Code review
- [ ] Deploy to staging

**Deliverables:**
- ✅ StudentService complete
- ✅ PaymentService complete
- ✅ ClassService complete
- ✅ TeacherService complete
- ✅ 12+ new endpoints
- ✅ Documentation updated

---

### Week 3: Performance Optimization
**Goal:** Make it fast

**Monday:**
- [ ] Install Redis
- [ ] Create CacheService
- [ ] Implement caching in LessonService
- [ ] Test cache hit rates

**Tuesday:**
- [ ] Add caching to all services
- [ ] Configure TTL strategies
- [ ] Test cache invalidation
- [ ] Monitor cache performance

**Wednesday:**
- [ ] Add database indexes
- [ ] Enable query logging
- [ ] Identify slow queries
- [ ] Document findings

**Thursday:**
- [ ] Optimize top 10 slowest queries
- [ ] Rewrite inefficient queries
- [ ] Add query hints
- [ ] Test improvements

**Friday:**
- [ ] Load testing
- [ ] Performance benchmarking
- [ ] Document improvements
- [ ] Deploy optimizations

**Deliverables:**
- ✅ Redis caching implemented
- ✅ Database indexes added
- ✅ Slow queries optimized
- ✅ 3-5x performance improvement
- ✅ Load test results

---

### Week 4: Scaling Preparation
**Goal:** Ready for growth

**Monday:**
- [ ] Setup MySQL read replica
- [ ] Configure replication
- [ ] Test replica lag
- [ ] Update connection pooling

**Tuesday:**
- [ ] Update services to use replica for reads
- [ ] Test read/write splitting
- [ ] Monitor replica performance
- [ ] Document configuration

**Wednesday:**
- [ ] Create elite_archive database
- [ ] Write archival scripts
- [ ] Archive old attendance data
- [ ] Archive old payment data

**Thursday:**
- [ ] Verify archived data
- [ ] Test archive queries
- [ ] Document archival process
- [ ] Schedule automated archival

**Friday:**
- [ ] Multi-tenancy security audit
- [ ] Add monitoring and alerts
- [ ] Performance review
- [ ] Plan next phase

**Deliverables:**
- ✅ Read replica operational
- ✅ Old data archived
- ✅ Main DB size reduced 40%
- ✅ Monitoring in place
- ✅ Ready for 100+ schools

---

## 🎯 Success Metrics

### Week 1:
- [ ] V2 API tested with 100+ real requests
- [ ] 0 critical bugs found
- [ ] 1 frontend component migrated
- [ ] Team trained on V2 API

### Week 2:
- [ ] 4 new services implemented
- [ ] 12+ new endpoints available
- [ ] 100% OpenAPI documentation
- [ ] All tests passing

### Week 3:
- [ ] 80%+ cache hit rate
- [ ] 50%+ query performance improvement
- [ ] <100ms average response time
- [ ] 0 slow queries (>1s)

### Week 4:
- [ ] Read replica handling 70% of queries
- [ ] Main DB size reduced 40%
- [ ] Multi-tenant isolation verified
- [ ] Ready for 100+ schools

---

## 📊 Long-Term Roadmap

### Month 2-3: Frontend Migration
- Migrate all components to V2 API
- Deprecate old endpoints
- Remove old code

### Month 4-6: Advanced Features
- Real-time notifications
- Advanced analytics
- Mobile app API
- GraphQL layer

### Month 6-12: Scale to 100+ Schools
- Regional databases
- CDN for static content
- Advanced caching
- Microservices (if needed)

### Year 2: Scale to 1000+ Schools
- Database sharding
- Multi-region deployment
- Enterprise features
- Full microservices

---

## 🚨 Critical Success Factors

### Must Have:
1. ✅ Monitoring and alerting
2. ✅ Automated backups
3. ✅ Load testing
4. ✅ Security audits
5. ✅ Documentation

### Must Avoid:
1. ❌ Premature optimization
2. ❌ Over-engineering
3. ❌ Breaking old system
4. ❌ Skipping testing
5. ❌ Poor documentation

---

## 💡 Key Principles

1. **Test First** - Validate before building more
2. **Gradual Migration** - Don't break what works
3. **Measure Everything** - Data-driven decisions
4. **Optimize Later** - Solve real problems, not imagined ones
5. **Document Always** - Future you will thank you

---

## 📞 Support & Resources

### Documentation:
- OpenAPI Docs: http://localhost:34567/api-docs
- Architecture Guide: BETTER_ARCHITECTURE_GUIDE.md
- V2 Migration: V2_MIGRATION_COMPLETE.md
- Compatibility: COMPATIBILITY_ANALYSIS.md

### Files:
- OpenAPI Spec: `openapi-v2.yaml`
- Services: `src/services/`
- Controllers: `src/controllers/`
- Routes: `src/routes/`
- Tests: `src/tests/`

---

## ✅ Current Status

**Completed:**
- ✅ Service layer architecture
- ✅ 4 services (Lessons, Assignments, Attendance, Syllabus)
- ✅ 28 V2 endpoints
- ✅ Joi validation
- ✅ OpenAPI documentation
- ✅ Swagger UI
- ✅ Old routes protected
- ✅ Zero breaking changes

**Next:**
- 🎯 Test V2 API with real data
- 🎯 Build core services
- 🎯 Optimize performance
- 🎯 Prepare for scale

---

**Last Updated:** 2026-02-12  
**Status:** Ready for Week 1  
**Next Review:** 2026-02-19
