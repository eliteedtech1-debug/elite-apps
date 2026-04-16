# 🏗️ Codebase Modularization Plan

**Objective:** Restructure controllers, routes, and models to align with 8-database architecture  
**Timeline:** 7 weeks (parallel with database separation)  
**Approach:** Domain-driven design with clear boundaries

---

## 📁 Target Directory Structure

```
elscholar-api/src/
├── config/
│   ├── database.js (legacy - to be removed)
│   └── databases.js (multi-DB config)
│
├── models/
│   ├── index.js (core/shared models)
│   ├── audit/
│   │   ├── index.js
│   │   ├── AuditTrail.js
│   │   └── EliteLog.js
│   ├── bot/
│   │   ├── index.js
│   │   ├── ChatbotConversation.js
│   │   ├── ChatbotIntent.js
│   │   └── ChatbotKnowledgeBase.js
│   ├── hr/
│   │   ├── index.js
│   │   ├── Staff.js
│   │   ├── PayrollLine.js
│   │   ├── Attendance.js
│   │   ├── LeaveRequest.js
│   │   ├── Department.js
│   │   └── Designation.js
│   ├── finance/
│   │   ├── index.js
│   │   ├── PaymentEntry.js
│   │   ├── JournalEntry.js
│   │   ├── FeeStructure.js
│   │   ├── Invoice.js
│   │   ├── Receipt.js
│   │   └── ChartOfAccounts.js
│   ├── academic/
│   │   ├── index.js
│   │   ├── Student.js
│   │   ├── Class.js
│   │   ├── Subject.js
│   │   ├── Enrollment.js
│   │   ├── Timetable.js
│   │   └── Attendance.js
│   ├── content/
│   │   ├── index.js
│   │   ├── LessonPlan.js
│   │   ├── LessonNote.js
│   │   ├── Syllabus.js
│   │   ├── Curriculum.js
│   │   ├── CmsPage.js
│   │   ├── CmsPost.js
│   │   └── MediaLibrary.js
│   └── cbt/
│       ├── index.js
│       ├── Exam.js
│       ├── ExamSchedule.js
│       ├── Question.js
│       ├── QuestionBank.js
│       ├── Assessment.js
│       ├── Grade.js
│       ├── Result.js
│       └── Certificate.js
│
├── controllers/
│   ├── core/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── schoolController.js
│   ├── audit/
│   │   ├── auditController.js
│   │   └── notificationController.js
│   ├── bot/
│   │   └── chatbotController.js
│   ├── hr/
│   │   ├── staffController.js
│   │   ├── payrollController.js
│   │   ├── attendanceController.js
│   │   └── leaveController.js
│   ├── finance/
│   │   ├── paymentController.js
│   │   ├── accountingController.js
│   │   ├── feeController.js
│   │   └── invoiceController.js
│   ├── academic/
│   │   ├── studentController.js
│   │   ├── classController.js
│   │   ├── enrollmentController.js
│   │   └── timetableController.js
│   ├── content/
│   │   ├── lessonPlanController.js
│   │   ├── syllabusController.js
│   │   ├── cmsController.js
│   │   └── mediaController.js
│   └── cbt/
│       ├── examController.js
│       ├── questionController.js
│       ├── assessmentController.js
│       └── gradeController.js
│
├── routes/
│   ├── index.js (route aggregator)
│   ├── core/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── schools.js
│   ├── audit/
│   │   ├── audit.js
│   │   └── notifications.js
│   ├── bot/
│   │   └── chatbot.js
│   ├── hr/
│   │   ├── staff.js
│   │   ├── payroll.js
│   │   ├── attendance.js
│   │   └── leave.js
│   ├── finance/
│   │   ├── payments.js
│   │   ├── accounting.js
│   │   ├── fees.js
│   │   └── invoices.js
│   ├── academic/
│   │   ├── students.js
│   │   ├── classes.js
│   │   ├── enrollments.js
│   │   └── timetables.js
│   ├── content/
│   │   ├── lessonPlans.js
│   │   ├── syllabus.js
│   │   ├── cms.js
│   │   └── media.js
│   └── cbt/
│       ├── exams.js
│       ├── questions.js
│       ├── assessments.js
│       └── grades.js
│
└── services/
    ├── core/
    │   ├── authService.js
    │   └── userService.js
    ├── audit/
    │   ├── auditService.js
    │   └── notificationService.js
    ├── bot/
    │   └── chatbotService.js
    ├── hr/
    │   ├── staffService.js
    │   └── payrollService.js
    ├── finance/
    │   ├── paymentService.js
    │   └── accountingService.js
    ├── academic/
    │   ├── studentService.js
    │   └── enrollmentService.js
    ├── content/
    │   ├── lessonPlanService.js
    │   └── cmsService.js
    └── cbt/
        ├── examService.js
        └── gradeService.js
```

---

## 🔄 Migration Strategy

### Phase 0: Preparation (Week 1)

**Tasks:**
1. Create directory structure
2. Set up database connections
3. Create base classes/utilities
4. Document patterns

**Deliverables:**
- Empty directory structure
- `databases.js` configuration
- Base controller/service classes
- Migration guide

---

### Phase 1: Core Models (Week 1)

**Current Location:** `src/models/`  
**Target:** `src/models/index.js` (core only)

**Models to Keep in Core:**
- User.js
- School.js
- Branch.js
- Role.js
- Permission.js
- Setting.js

**Actions:**
1. Move domain models to respective folders
2. Update `models/index.js` to export only core models
3. Create domain-specific `index.js` files
4. Update imports across codebase

**Example:**
```javascript
// OLD: src/models/index.js
module.exports = {
  User,
  School,
  Staff,      // Move to hr/
  Student,    // Move to academic/
  Payment,    // Move to finance/
  // ... 274 models
};

// NEW: src/models/index.js (core only)
const { mainDB } = require('../config/databases');

const User = require('./User')(mainDB);
const School = require('./School')(mainDB);
const Branch = require('./Branch')(mainDB);

module.exports = { User, School, Branch };

// NEW: src/models/hr/index.js
const { hrDB } = require('../../config/databases');

const Staff = require('./Staff')(hrDB);
const PayrollLine = require('./PayrollLine')(hrDB);

module.exports = { Staff, PayrollLine };
```

---

### Phase 2: HR Module (Week 2)

**Scope:** Staff, payroll, attendance, leave management

#### 2.1 Models
**Move from:** `src/models/`  
**Move to:** `src/models/hr/`

**Files:**
- Staff.js
- PayrollLine.js
- Attendance.js (staff)
- LeaveRequest.js
- LeaveType.js
- Department.js
- Designation.js
- GradeLevel.js
- SalaryStructure.js

**Update:**
```javascript
// src/models/hr/Staff.js
module.exports = (sequelize) => {
  const Staff = sequelize.define('staff', {
    // ... fields
  });
  return Staff;
};

// src/models/hr/index.js
const { hrDB } = require('../../config/databases');

const Staff = require('./Staff')(hrDB);
const PayrollLine = require('./PayrollLine')(hrDB);
// ... other models

module.exports = { Staff, PayrollLine, /* ... */ };
```

#### 2.2 Controllers
**Move from:** `src/controllers/`  
**Move to:** `src/controllers/hr/`

**Files:**
- staffController.js
- payrollController.js
- attendanceController.js
- leaveController.js

**Update imports:**
```javascript
// OLD
const { Staff } = require('../models');

// NEW
const { Staff } = require('../models/hr');
```

#### 2.3 Routes
**Move from:** `src/routes/`  
**Move to:** `src/routes/hr/`

**Files:**
- staff.js
- payroll.js
- attendance.js
- leave.js

**Update:**
```javascript
// src/routes/hr/staff.js
const router = require('express').Router();
const staffController = require('../../controllers/hr/staffController');

router.get('/', staffController.getAll);
router.post('/', staffController.create);

module.exports = router;

// src/routes/index.js
const hrRoutes = {
  staff: require('./hr/staff'),
  payroll: require('./hr/payroll'),
  attendance: require('./hr/attendance'),
  leave: require('./hr/leave')
};

app.use('/api/hr/staff', hrRoutes.staff);
app.use('/api/hr/payroll', hrRoutes.payroll);
```

#### 2.4 Services
**Move from:** `src/services/`  
**Move to:** `src/services/hr/`

**Files:**
- staffService.js
- payrollService.js

---

### Phase 3: Finance Module (Week 3)

**Scope:** Payments, accounting, billing, invoicing

#### 3.1 Models → `src/models/finance/`
- PaymentEntry.js
- JournalEntry.js
- FeeStructure.js
- FeeItem.js
- Invoice.js
- Receipt.js
- ChartOfAccounts.js
- AccountCategory.js
- Budget.js
- BudgetLine.js
- Expense.js
- BankAccount.js

#### 3.2 Controllers → `src/controllers/finance/`
- paymentController.js
- accountingController.js
- feeController.js
- invoiceController.js
- budgetController.js

#### 3.3 Routes → `src/routes/finance/`
- payments.js
- accounting.js
- fees.js
- invoices.js
- budgets.js

#### 3.4 Services → `src/services/finance/`
- paymentService.js
- accountingService.js
- billingService.js

**Cross-DB Pattern:**
```javascript
// src/services/finance/paymentService.js
const { PaymentEntry } = require('../../models/finance');
const { Student } = require('../../models/academic');
const { User } = require('../../models');

async function createPayment(data) {
  // Finance DB operation
  const payment = await PaymentEntry.create(data);
  
  // Academic DB query (cross-DB)
  const student = await Student.findByPk(data.student_id);
  
  // Core DB query
  const user = await User.findByPk(student.user_id);
  
  return { payment, student, user };
}
```

---

### Phase 4: Academic Module (Week 4)

**Scope:** Students, classes, enrollment, timetables

#### 4.1 Models → `src/models/academic/`
- Student.js
- Class.js
- Subject.js
- Enrollment.js
- Promotion.js
- Graduation.js
- Timetable.js
- ClassSchedule.js
- Attendance.js (student)
- Admission.js
- Section.js
- Stream.js

#### 4.2 Controllers → `src/controllers/academic/`
- studentController.js
- classController.js
- subjectController.js
- enrollmentController.js
- timetableController.js
- attendanceController.js

#### 4.3 Routes → `src/routes/academic/`
- students.js
- classes.js
- subjects.js
- enrollments.js
- timetables.js
- attendance.js

#### 4.4 Services → `src/services/academic/`
- studentService.js
- enrollmentService.js
- promotionService.js

---

### Phase 5: Content Module (Week 5)

**Scope:** Lesson plans, syllabus, CMS, media

#### 5.1 Models → `src/models/content/`
- LessonPlan.js
- LessonNote.js
- Syllabus.js
- Curriculum.js
- CurriculumScraping.js
- TeacherLessonPlan.js
- CmsPage.js
- CmsPost.js
- CmsMenu.js
- CmsWidget.js
- MediaLibrary.js
- Document.js
- Announcement.js
- Newsletter.js

#### 5.2 Controllers → `src/controllers/content/`
- lessonPlanController.js
- syllabusController.js
- curriculumController.js
- cmsController.js
- mediaController.js
- announcementController.js

#### 5.3 Routes → `src/routes/content/`
- lessonPlans.js
- syllabus.js
- curriculum.js
- cms.js
- media.js
- announcements.js

#### 5.4 Services → `src/services/content/`
- lessonPlanService.js
- cmsService.js
- mediaService.js

---

### Phase 6: CBT Module (Week 6)

**Scope:** Exams, assessments, grades, certificates

#### 6.1 Models → `src/models/cbt/`
- Exam.js
- ExamSchedule.js
- Question.js
- QuestionBank.js
- Assessment.js
- ContinuousAssessment.js
- Grade.js
- Result.js
- GradeItem.js
- GradeCategory.js
- ReportCard.js
- Certificate.js
- Transcript.js
- ExamSubmission.js
- OnlineTest.js
- QuizResult.js

#### 6.2 Controllers → `src/controllers/cbt/`
- examController.js
- questionController.js
- assessmentController.js
- gradeController.js
- resultController.js
- certificateController.js

#### 6.3 Routes → `src/routes/cbt/`
- exams.js
- questions.js
- assessments.js
- grades.js
- results.js
- certificates.js

#### 6.4 Services → `src/services/cbt/`
- examService.js
- questionService.js
- gradeService.js
- resultService.js

---

## 🔧 Implementation Patterns

### 1. Model Definition Pattern

```javascript
// src/models/hr/Staff.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('staff', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    staff_id: {
      type: DataTypes.STRING(50),
      unique: true
    },
    // ... other fields
  }, {
    tableName: 'staff',
    timestamps: true
  });

  return Staff;
};
```

### 2. Model Index Pattern

```javascript
// src/models/hr/index.js
const { hrDB } = require('../../config/databases');

// Initialize models
const Staff = require('./Staff')(hrDB);
const PayrollLine = require('./PayrollLine')(hrDB);
const Attendance = require('./Attendance')(hrDB);

// Define associations
Staff.hasMany(PayrollLine, { foreignKey: 'staff_id' });
PayrollLine.belongsTo(Staff, { foreignKey: 'staff_id' });

// Export
module.exports = {
  Staff,
  PayrollLine,
  Attendance,
  sequelize: hrDB
};
```

### 3. Controller Pattern

```javascript
// src/controllers/hr/staffController.js
const { Staff } = require('../../models/hr');
const { User } = require('../../models'); // Cross-DB
const auditService = require('../../services/audit/auditService');

exports.create = async (req, res) => {
  try {
    const staff = await Staff.create(req.body);
    
    // Cross-DB: Create user account
    const user = await User.create({
      email: req.body.email,
      role: 'staff'
    });
    
    // Audit log
    await auditService.log({
      action: 'staff_created',
      userId: req.user.id,
      details: { staff_id: staff.id }
    });
    
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 4. Service Pattern

```javascript
// src/services/hr/staffService.js
const { Staff, PayrollLine } = require('../../models/hr');
const { User } = require('../../models');

class StaffService {
  async createStaff(data) {
    // HR DB operation
    const staff = await Staff.create(data);
    
    // Core DB operation (cross-DB)
    const user = await User.create({
      email: data.email,
      role: 'staff'
    });
    
    return { staff, user };
  }
  
  async getStaffWithPayroll(staffId) {
    const staff = await Staff.findByPk(staffId, {
      include: [PayrollLine]
    });
    return staff;
  }
}

module.exports = new StaffService();
```

### 5. Route Pattern

```javascript
// src/routes/hr/staff.js
const router = require('express').Router();
const staffController = require('../../controllers/hr/staffController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize(['admin', 'hr']), staffController.getAll);
router.post('/', authorize(['admin', 'hr']), staffController.create);
router.get('/:id', staffController.getById);
router.put('/:id', authorize(['admin', 'hr']), staffController.update);
router.delete('/:id', authorize(['admin']), staffController.delete);

module.exports = router;
```

### 6. Route Aggregator Pattern

```javascript
// src/routes/index.js
const express = require('express');

// Core routes
const authRoutes = require('./core/auth');
const userRoutes = require('./core/users');

// Domain routes
const hrRoutes = {
  staff: require('./hr/staff'),
  payroll: require('./hr/payroll'),
  attendance: require('./hr/attendance')
};

const financeRoutes = {
  payments: require('./finance/payments'),
  accounting: require('./finance/accounting'),
  fees: require('./finance/fees')
};

const academicRoutes = {
  students: require('./academic/students'),
  classes: require('./academic/classes'),
  enrollments: require('./academic/enrollments')
};

const contentRoutes = {
  lessonPlans: require('./content/lessonPlans'),
  syllabus: require('./content/syllabus'),
  cms: require('./content/cms')
};

const cbtRoutes = {
  exams: require('./cbt/exams'),
  questions: require('./cbt/questions'),
  grades: require('./cbt/grades')
};

module.exports = (app) => {
  // Core
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  
  // HR
  app.use('/api/hr/staff', hrRoutes.staff);
  app.use('/api/hr/payroll', hrRoutes.payroll);
  app.use('/api/hr/attendance', hrRoutes.attendance);
  
  // Finance
  app.use('/api/finance/payments', financeRoutes.payments);
  app.use('/api/finance/accounting', financeRoutes.accounting);
  app.use('/api/finance/fees', financeRoutes.fees);
  
  // Academic
  app.use('/api/academic/students', academicRoutes.students);
  app.use('/api/academic/classes', academicRoutes.classes);
  app.use('/api/academic/enrollments', academicRoutes.enrollments);
  
  // Content
  app.use('/api/content/lesson-plans', contentRoutes.lessonPlans);
  app.use('/api/content/syllabus', contentRoutes.syllabus);
  app.use('/api/content/cms', contentRoutes.cms);
  
  // CBT
  app.use('/api/cbt/exams', cbtRoutes.exams);
  app.use('/api/cbt/questions', cbtRoutes.questions);
  app.use('/api/cbt/grades', cbtRoutes.grades);
};
```

### 7. Cross-Database Query Pattern

```javascript
// Pattern 1: Separate queries (recommended)
const { PaymentEntry } = require('../../models/finance');
const { Student } = require('../../models/academic');

const payment = await PaymentEntry.findByPk(id);
const student = await Student.findByPk(payment.student_id);

// Pattern 2: Raw SQL with DB prefix
const { financeDB } = require('../../config/databases');

const results = await financeDB.query(`
  SELECT 
    p.*,
    s.name as student_name
  FROM elite_finance.payment_entries p
  JOIN elite_academic.students s ON p.student_id = s.id
  WHERE p.school_id = :schoolId
`, {
  replacements: { schoolId },
  type: QueryTypes.SELECT
});

// Pattern 3: Service layer aggregation
class PaymentService {
  async getPaymentWithDetails(paymentId) {
    const payment = await PaymentEntry.findByPk(paymentId);
    const student = await Student.findByPk(payment.student_id);
    const user = await User.findByPk(student.user_id);
    
    return {
      ...payment.toJSON(),
      student: student.toJSON(),
      user: user.toJSON()
    };
  }
}
```

---

## 📋 Migration Checklist

### Week 1: Preparation
- [ ] Create directory structure
- [ ] Set up `databases.js` configuration
- [ ] Create base patterns documentation
- [ ] Identify all models per domain
- [ ] Create migration scripts

### Week 2: HR Module
- [ ] Move HR models to `models/hr/`
- [ ] Create `models/hr/index.js`
- [ ] Move HR controllers to `controllers/hr/`
- [ ] Move HR routes to `routes/hr/`
- [ ] Move HR services to `services/hr/`
- [ ] Update all imports
- [ ] Test HR endpoints
- [ ] Update API documentation

### Week 3: Finance Module
- [ ] Move finance models
- [ ] Move finance controllers
- [ ] Move finance routes
- [ ] Move finance services
- [ ] Update imports
- [ ] Test finance endpoints
- [ ] Verify cross-DB queries

### Week 4: Academic Module
- [ ] Move academic models
- [ ] Move academic controllers
- [ ] Move academic routes
- [ ] Move academic services
- [ ] Update imports
- [ ] Test academic endpoints
- [ ] Verify integrations

### Week 5: Content Module
- [ ] Move content models
- [ ] Move content controllers
- [ ] Move content routes
- [ ] Move content services
- [ ] Update imports
- [ ] Test content endpoints
- [ ] Verify media uploads

### Week 6: CBT Module
- [ ] Move CBT models
- [ ] Move CBT controllers
- [ ] Move CBT routes
- [ ] Move CBT services
- [ ] Update imports
- [ ] Test CBT endpoints
- [ ] Verify grade calculations

### Week 7: Cleanup & Testing
- [ ] Remove old model files
- [ ] Remove old controller files
- [ ] Remove old route files
- [ ] Update all documentation
- [ ] Full integration testing
- [ ] Performance testing
- [ ] Security audit

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// tests/unit/hr/staffService.test.js
const staffService = require('../../../src/services/hr/staffService');

describe('StaffService', () => {
  it('should create staff with user account', async () => {
    const data = { email: 'test@example.com', name: 'Test' };
    const result = await staffService.createStaff(data);
    
    expect(result.staff).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(data.email);
  });
});
```

### Integration Tests
```javascript
// tests/integration/hr/staff.test.js
const request = require('supertest');
const app = require('../../../src/index');

describe('POST /api/hr/staff', () => {
  it('should create staff and return 201', async () => {
    const response = await request(app)
      .post('/api/hr/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Staff', email: 'test@example.com' });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 📊 Progress Tracking

| Module | Models | Controllers | Routes | Services | Status |
|--------|--------|-------------|--------|----------|--------|
| Core | ✅ | ✅ | ✅ | ✅ | Complete |
| Audit | ✅ | ✅ | ✅ | ✅ | Complete |
| Bot | ✅ | ✅ | ✅ | ✅ | Complete |
| HR | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Finance | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Academic | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Content | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| CBT | ⏳ | ⏳ | ⏳ | ⏳ | Pending |

---

## 🚨 Breaking Changes

### API Endpoints
**Before:**
```
GET /api/staff
GET /api/payments
GET /api/students
```

**After:**
```
GET /api/hr/staff
GET /api/finance/payments
GET /api/academic/students
```

**Migration:** Add route aliases for backward compatibility

```javascript
// Backward compatibility
app.use('/api/staff', hrRoutes.staff); // Old
app.use('/api/hr/staff', hrRoutes.staff); // New
```

### Import Paths
**Before:**
```javascript
const { Staff, Student, Payment } = require('./models');
```

**After:**
```javascript
const { Staff } = require('./models/hr');
const { Student } = require('./models/academic');
const { Payment } = require('./models/finance');
```

---

## 🎯 Success Criteria

- [ ] All models organized by domain
- [ ] All controllers organized by domain
- [ ] All routes organized by domain
- [ ] All services organized by domain
- [ ] Clear separation of concerns
- [ ] No circular dependencies
- [ ] All tests passing
- [ ] API documentation updated
- [ ] Zero downtime deployment
- [ ] Performance maintained or improved

---

## 📝 Documentation Updates

### Files to Update
1. `README.md` - Architecture overview
2. `API_DOCUMENTATION.md` - New endpoint structure
3. `DEVELOPER_GUIDE.md` - Import patterns
4. `AGENTS.md` - Module ownership
5. `DEPLOYMENT_GUIDE.md` - New structure

---

## 🔄 Rollback Plan

### If Issues Arise
1. Keep old files with `.backup` extension
2. Maintain route aliases for 2 versions
3. Database rollback scripts ready
4. Feature flags for new modules
5. Gradual traffic migration

---

## 📈 Benefits

### Developer Experience
- Clear module boundaries
- Easier to navigate codebase
- Team ownership per domain
- Faster onboarding

### Performance
- Smaller bundle sizes per module
- Better code splitting
- Optimized imports
- Reduced memory footprint

### Maintenance
- Isolated changes
- Independent deployments
- Easier testing
- Better debugging

### Scalability
- Microservices ready
- Independent scaling
- Clear API contracts
- Future-proof architecture

---

## 🌐 Optional: API Gateway Phase

**Timeline:** Weeks 8-10 (after modularization complete)  
**Document:** See `API_GATEWAY_PLAN.md` for full details

### Overview

Add API Gateway as single entry point for microservices:

```
Client → API Gateway (Port 3000)
           ↓
           ├→ HR Service (Port 3001)
           ├→ Finance Service (Port 3002)
           ├→ Academic Service (Port 3003)
           ├→ Content Service (Port 3004)
           └→ CBT Service (Port 3005)
```

### Benefits
- Centralized authentication
- Rate limiting per service
- Load balancing
- Service monitoring
- Independent scaling

### When to Implement
✅ Team grows beyond 5 developers  
✅ Services need independent scaling  
✅ Different deployment schedules  
❌ Small team, simple app, low traffic

### Quick Start
```bash
# After Week 7 complete
mkdir elite-gateway
cd elite-gateway
npm install express http-proxy-middleware

# See API_GATEWAY_PLAN.md for complete code
```

### Timeline
- **Week 8:** Gateway setup, routing, middleware
- **Week 9:** Extract HR & Finance services
- **Week 10:** Extract remaining services, testing

**Recommendation:** Complete modularization first, add gateway only if needed.

---

## 🔔 Implementation Tracking

### Automated Setup

**Run this command to set up tracking:**
```bash
./scripts/setup-tracking.sh
```

**This will:**
1. Commit all plans to `expirement` branch
2. Create `feature/modularization` branch
3. Create `IMPLEMENTATION_TRACKER.md` with 7-week checklist
4. Create reminder script
5. Push to remote

### Daily Workflow

```bash
# Morning: Check status
./scripts/modularization-reminder.sh

# Shows:
# - Current week/phase
# - Next 5 tasks
# - Progress percentage
# - Quick commands

# Start working
git checkout feature/modularization

# Update progress
vim IMPLEMENTATION_TRACKER.md  # Mark tasks with [x]

# Commit
git add .
git commit -m "progress: [what you did]"
git push
```

### Branch Strategy

```
expirement (main development)
  └── All planning docs committed here
  
feature/modularization (implementation)
  └── IMPLEMENTATION_TRACKER.md
  └── Daily progress updates
  └── Merge back when complete
```

### Progress Tracking

**IMPLEMENTATION_TRACKER.md includes:**
- 7-week timeline with dates
- Task checklists per week
- Progress statistics
- Daily log section
- Blocker tracking
- Quick reference

**Check progress anytime:**
```bash
./scripts/modularization-reminder.sh
```

### Milestones

Tag each week completion:
```bash
git tag -a modularization-week1 -m "Week 1: Preparation complete"
git tag -a modularization-week2 -m "Week 2: HR module complete"
git push origin --tags
```

---

*Plan created: 2026-02-11 03:30 UTC*  
*Tracking added: 2026-02-11 03:40 UTC*  
*Estimated completion: 7 weeks*  
*Status: Ready for execution*
