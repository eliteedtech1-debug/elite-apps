# 🎯 Database Separation Plan - Elite Core Microservices

**Status:** Planning Phase  
**Risk Level:** Medium  
**Estimated Time:** 2-3 weeks  
**Downtime:** Minimal (per database)

---

## 🎨 Proposed Architecture

### Current State
```
full_skcooly (274 tables)
├── HR tables (staff, payroll, attendance)
├── Finance tables (payments, fees, accounting)
├── Academic tables (students, grades, classes)
├── System tables (users, schools, branches)
└── Other tables (inventory, library, etc.)

skcooly_audit (3 tables)
elite_bot (3 tables)
```

### Target State
```
full_skcooly (core only)
├── users, schools, branches
├── authentication, permissions
└── shared reference data

elite_hr (HR & Payroll)
├── staff, payroll_lines
├── attendance, leave_management
└── performance, training

elite_finance (Finance & Accounting)
├── payment_entries, journal_entries
├── fees, invoices, receipts
└── accounting, budgets

elite_academic (Academic Management)
├── students, classes, subjects
├── enrollments, promotions
└── timetables, curriculum

elite_content (Content Management)
├── lesson_plans, lesson_notes
├── syllabus, curriculum_content
├── cms_pages, cms_posts
├── media_library, documents
└── school_website_content

elite_cbt (Assessment & Testing)
├── exams, exam_schedules
├── questions, question_banks
├── assessments, continuous_assessment
├── grades, results
└── certificates, transcripts

skcooly_audit (logs)
elite_bot (AI)
```

---

## 📊 Table Distribution Analysis

### Phase 1: elite_hr (HR & Payroll)
**Tables to Move:** ~15-20 tables

**Core Tables:**
- `staff` (staff management)
- `payroll_lines` (salary processing)
- `attendance` (staff attendance)
- `leave_requests`
- `leave_types`
- `departments`
- `designations`
- `grade_levels` (salary grades)
- `salary_structure_history`
- `staff_documents`
- `staff_qualifications`
- `performance_reviews`
- `training_records`

**Dependencies:**
- References `users` (keep in main)
- References `schools`, `branches` (keep in main)
- No foreign keys to finance/academic

**Data Size:** ~500 MB  
**Migration Time:** 2-3 minutes  
**Risk:** Low (isolated domain)

---

### Phase 2: elite_finance (Finance & Accounting)
**Tables to Move:** ~25-30 tables

**Core Tables:**
- `payment_entries` (all payments)
- `journal_entries` (accounting)
- `chart_of_accounts`
- `account_categories`
- `fee_structures`
- `fee_items`
- `invoices`
- `receipts`
- `refunds`
- `budgets`
- `budget_lines`
- `expenses`
- `expense_categories`
- `bank_accounts`
- `bank_transactions`
- `reconciliations`
- `financial_years`
- `accounting_periods`

**Dependencies:**
- References `students` (cross-DB query needed)
- References `staff` (cross-DB query needed)
- Heavy integration with other modules

**Data Size:** ~2-3 GB  
**Migration Time:** 5-10 minutes  
**Risk:** Medium (high integration)

---

### Phase 3: elite_academic (Academic Management)
**Tables to Move:** ~20-25 tables

**Core Tables:**
- `students` (student records)
- `classes` (class management)
- `subjects`
- `enrollments`
- `promotions`
- `graduations`
- `timetables`
- `class_schedules`
- `attendance` (student attendance)
- `parent_teacher_meetings`
- `student_documents`
- `admissions`
- `sections`
- `streams`

**Dependencies:**
- References `staff` (teachers - cross-DB)
- References `payment_entries` (fees - cross-DB)
- Core to entire system

**Data Size:** ~2-3 GB  
**Migration Time:** 10-15 minutes  
**Risk:** High (core functionality)

---

### Phase 4: elite_content (Content Management)
**Tables to Move:** ~15-20 tables

**Core Tables:**
- `lesson_plans` (teacher lesson plans)
- `lesson_notes` (lesson notes)
- `syllabus` (syllabus management)
- `curriculum` (curriculum content)
- `curriculum_scraping` (scraped curriculum)
- `teacher_lesson_plans`
- `cms_pages` (school website pages)
- `cms_posts` (blog posts, news)
- `cms_menus` (website navigation)
- `cms_widgets`
- `media_library` (images, videos)
- `documents` (PDFs, files)
- `announcements`
- `newsletters`

**Dependencies:**
- References `staff` (content creators)
- References `classes`, `subjects` (lesson plans)
- Minimal cross-DB queries

**Data Size:** ~1-2 GB  
**Migration Time:** 5-10 minutes  
**Risk:** Low (isolated domain)

**Benefits:**
- Separate scaling for media/content
- Can use CDN for static content
- Better for CMS performance
- Isolated from academic data

---

### Phase 5: elite_cbt (Assessment & Testing)
**Tables to Move:** ~20-25 tables

**Core Tables:**
- `exams` (exam management)
- `exam_schedules` (exam timetables)
- `questions` (exam questions)
- `question_banks` (question repository)
- `assessments` (assessment records)
- `continuous_assessment` (CA scores)
- `grades` (student grades)
- `results` (exam results)
- `grade_items`
- `grade_categories`
- `report_cards` (generated reports)
- `certificates` (certificates)
- `transcripts` (academic transcripts)
- `exam_submissions`
- `online_tests`
- `quiz_results`

**Dependencies:**
- References `students` (cross-DB)
- References `subjects` (cross-DB)
- References `staff` (teachers - cross-DB)
- High integration with academic

**Data Size:** ~1-2 GB  
**Migration Time:** 5-10 minutes  
**Risk:** Medium (assessment critical)

**Benefits:**
- Isolated assessment workload
- Better for CBT performance
- Can scale independently during exams
- Separate backup for grades/results

---

### Phase 3: elite_finance (Finance & Accounting)

## 🔄 Migration Strategy

### Option A: Big Bang (Not Recommended)
- Move all tables at once
- High risk
- Long downtime
- Difficult rollback

### Option B: Phased Migration (Recommended)
- One database at a time
- Test between phases
- Easy rollback
- Minimal downtime per phase

### Option C: Gradual (Safest)
- Run dual-write for 1 week
- Verify data consistency
- Switch reads gradually
- Zero downtime

---

## 📋 Detailed Migration Plan

### Pre-Migration (Week 1)

#### 1. Analysis & Planning
- [ ] Identify all tables per domain
- [ ] Map foreign key relationships
- [ ] Identify cross-database queries
- [ ] Document API endpoints affected
- [ ] Create dependency graph

#### 2. Code Preparation
- [ ] Create database connection configs
- [ ] Create models for each database
- [ ] Update services to use correct DB
- [ ] Implement cross-DB query patterns
- [ ] Add database routing logic

#### 3. Testing Environment
- [ ] Clone production to staging
- [ ] Test migration scripts
- [ ] Verify data integrity
- [ ] Test all API endpoints
- [ ] Performance benchmarks

---

### Phase 1: elite_hr (Week 2)

#### Day 1-2: Preparation
```bash
# 1. Create database
CREATE DATABASE elite_hr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Backup
mysqldump full_skcooly staff payroll_lines attendance > hr_backup.sql

# 3. Test migration on staging
./scripts/migrate_hr_tables.sh --dry-run
```

#### Day 3: Migration
```bash
# 1. Maintenance window (2 AM - 4 AM)
# 2. Full backup
mysqldump full_skcooly > full_backup_before_hr.sql

# 3. Move tables (RENAME - instant)
RENAME TABLE full_skcooly.staff TO elite_hr.staff;
RENAME TABLE full_skcooly.payroll_lines TO elite_hr.payroll_lines;
# ... all HR tables

# 4. Update .env
HR_DB_NAME=elite_hr

# 5. Restart backend
pm2 restart elscholar-api

# 6. Verify
./scripts/test-db-setup.sh
```

#### Day 4-5: Testing & Monitoring
- [ ] Test all HR features
- [ ] Test payroll processing
- [ ] Test staff attendance
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify data integrity

#### Day 6-7: Stabilization
- [ ] Fix any issues found
- [ ] Optimize queries
- [ ] Update documentation
- [ ] Train support team

---

### Phase 2: elite_finance (Week 3)

#### Day 1-2: Preparation
```bash
# 1. Create database
CREATE DATABASE elite_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Backup
mysqldump full_skcooly payment_entries journal_entries > finance_backup.sql

# 3. Test cross-DB queries
# Payment references student (now in different DB)
SELECT p.*, s.name 
FROM elite_finance.payment_entries p
JOIN full_skcooly.students s ON p.student_id = s.id;
```

#### Day 3: Migration
```bash
# 1. Maintenance window
# 2. Full backup
# 3. Move tables
RENAME TABLE full_skcooly.payment_entries TO elite_finance.payment_entries;
RENAME TABLE full_skcooly.journal_entries TO elite_finance.journal_entries;
# ... all finance tables

# 4. Update .env
FINANCE_DB_NAME=elite_finance

# 5. Restart backend
# 6. Verify
```

#### Day 4-7: Testing & Monitoring
- [ ] Test payment processing
- [ ] Test fee collection
- [ ] Test accounting reports
- [ ] Test invoicing
- [ ] Monitor performance
- [ ] Verify financial data accuracy

---

### Phase 3: elite_academic (Week 4)

#### Day 1-3: Preparation
```bash
# 1. Create database
CREATE DATABASE elite_academic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Backup (large dataset)
mysqldump full_skcooly students classes > academic_backup.sql

# 3. Test extensively (core functionality)
```

#### Day 4: Migration
```bash
# 1. Extended maintenance window (4 hours)
# 2. Full backup
# 3. Move tables
RENAME TABLE full_skcooly.students TO elite_academic.students;
RENAME TABLE full_skcooly.classes TO elite_academic.classes;
RENAME TABLE full_skcooly.subjects TO elite_academic.subjects;
RENAME TABLE full_skcooly.enrollments TO elite_academic.enrollments;
RENAME TABLE full_skcooly.promotions TO elite_academic.promotions;
RENAME TABLE full_skcooly.timetables TO elite_academic.timetables;
# ... all academic tables (NOT exams/grades)

# 4. Update .env
ACADEMIC_DB_NAME=elite_academic

# 5. Restart backend
# 6. Verify
```

#### Day 5-7: Testing & Monitoring
- [ ] Test student enrollment
- [ ] Test class management
- [ ] Test timetables
- [ ] Test promotions
- [ ] Monitor performance
- [ ] Verify data integrity

---

### Phase 4: elite_content (Week 5)

#### Day 1-2: Preparation
```bash
# 1. Create database
CREATE DATABASE elite_content CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Backup
mysqldump full_skcooly lesson_plans syllabus cms_pages > content_backup.sql
```

#### Day 3: Migration
```bash
# Move content tables
RENAME TABLE full_skcooly.lesson_plans TO elite_content.lesson_plans;
RENAME TABLE full_skcooly.lesson_notes TO elite_content.lesson_notes;
RENAME TABLE full_skcooly.syllabus TO elite_content.syllabus;
RENAME TABLE full_skcooly.curriculum TO elite_content.curriculum;
RENAME TABLE full_skcooly.cms_pages TO elite_content.cms_pages;
RENAME TABLE full_skcooly.cms_posts TO elite_content.cms_posts;
RENAME TABLE full_skcooly.cms_menus TO elite_content.cms_menus;
RENAME TABLE full_skcooly.media_library TO elite_content.media_library;
RENAME TABLE full_skcooly.documents TO elite_content.documents;

# Update .env
CONTENT_DB_NAME=elite_content
```

#### Day 4-5: Testing
- [ ] Test lesson plan creation
- [ ] Test syllabus management
- [ ] Test CMS pages
- [ ] Test media uploads
- [ ] Test school website

---

### Phase 5: elite_cbt (Week 6)

#### Day 1-2: Preparation
```bash
# 1. Create database
CREATE DATABASE elite_cbt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Backup
mysqldump full_skcooly exams grades assessments > cbt_backup.sql
```

#### Day 3: Migration
```bash
# Move assessment tables
RENAME TABLE full_skcooly.exams TO elite_cbt.exams;
RENAME TABLE full_skcooly.exam_schedules TO elite_cbt.exam_schedules;
RENAME TABLE full_skcooly.questions TO elite_cbt.questions;
RENAME TABLE full_skcooly.question_banks TO elite_cbt.question_banks;
RENAME TABLE full_skcooly.assessments TO elite_cbt.assessments;
RENAME TABLE full_skcooly.continuous_assessment TO elite_cbt.continuous_assessment;
RENAME TABLE full_skcooly.grades TO elite_cbt.grades;
RENAME TABLE full_skcooly.results TO elite_cbt.results;
RENAME TABLE full_skcooly.report_cards TO elite_cbt.report_cards;
RENAME TABLE full_skcooly.certificates TO elite_cbt.certificates;
RENAME TABLE full_skcooly.transcripts TO elite_cbt.transcripts;

# Update .env
CBT_DB_NAME=elite_cbt
```

#### Day 4-5: Testing
- [ ] Test exam creation
- [ ] Test CBT functionality
- [ ] Test grade entry
- [ ] Test report cards
- [ ] Test CA calculations
- [ ] Verify academic performance data

---

### Phase 3: elite_academic (Week 4)

## 🔧 Technical Implementation

### 1. Database Configuration
```javascript
// src/config/databases.js
const mainDB = createConnection(config.main, 'Main');
const auditDB = createConnection(config.audit, 'Audit');
const botDB = createConnection(config.bot, 'Bot');
const hrDB = createConnection(config.hr, 'HR');
const financeDB = createConnection(config.finance, 'Finance');
const academicDB = createConnection(config.academic, 'Academic');
const contentDB = createConnection(config.content, 'Content');
const cbtDB = createConnection(config.cbt, 'CBT');

module.exports = {
  mainDB,
  auditDB,
  botDB,
  hrDB,
  financeDB,
  academicDB,
  contentDB,
  cbtDB
};
```

### 2. Model Organization
```
src/models/
├── index.js (main DB)
├── audit/
├── bot/
├── hr/
│   ├── index.js
│   ├── Staff.js
│   ├── PayrollLine.js
│   └── Attendance.js
├── finance/
│   ├── index.js
│   ├── PaymentEntry.js
│   ├── JournalEntry.js
│   └── FeeStructure.js
├── academic/
│   ├── index.js
│   ├── Student.js
│   ├── Class.js
│   └── Subject.js
├── content/
│   ├── index.js
│   ├── LessonPlan.js
│   ├── Syllabus.js
│   ├── CmsPage.js
│   └── MediaLibrary.js
└── cbt/
    ├── index.js
    ├── Exam.js
    ├── Question.js
    ├── Grade.js
    └── Assessment.js
```

### 3. Cross-Database Queries
```javascript
// Pattern 1: Fetch separately and merge
const hrDB = require('../models/hr');
const mainDB = require('../models');

const staff = await hrDB.Staff.findByPk(staffId);
const user = await mainDB.User.findByPk(staff.user_id);

// Pattern 2: Raw SQL with database prefix
const results = await mainDB.sequelize.query(`
  SELECT s.*, u.email 
  FROM elite_hr.staff s
  JOIN full_skcooly.users u ON s.user_id = u.id
  WHERE s.school_id = :schoolId
`, { replacements: { schoolId } });

// Pattern 3: Service layer abstraction
class StaffService {
  async getStaffWithUser(staffId) {
    const staff = await hrDB.Staff.findByPk(staffId);
    const user = await mainDB.User.findByPk(staff.user_id);
    return { ...staff.toJSON(), user };
  }
}
```

### 4. Transaction Handling
```javascript
// Cross-DB transactions not supported
// Use saga pattern instead

async function createStaffWithUser(data) {
  let user, staff;
  
  try {
    // Step 1: Create user in main DB
    user = await mainDB.User.create(data.user);
    
    // Step 2: Create staff in HR DB
    staff = await hrDB.Staff.create({
      ...data.staff,
      user_id: user.id
    });
    
    return { user, staff };
  } catch (error) {
    // Compensating transaction
    if (user) await mainDB.User.destroy({ where: { id: user.id } });
    if (staff) await hrDB.Staff.destroy({ where: { id: staff.id } });
    throw error;
  }
}
```

---

## ⚠️ Risks & Mitigation

### Risk 1: Cross-Database Foreign Keys
**Problem:** Cannot enforce FK constraints across databases  
**Mitigation:**
- Enforce in application layer
- Add validation in services
- Use database triggers (optional)
- Regular integrity checks

### Risk 2: Cross-Database Transactions
**Problem:** Cannot use transactions across databases  
**Mitigation:**
- Use saga pattern
- Implement compensating transactions
- Add idempotency keys
- Event sourcing for critical operations

### Risk 3: Performance Degradation
**Problem:** Cross-DB queries slower than single DB  
**Mitigation:**
- Cache frequently accessed data
- Denormalize where appropriate
- Use materialized views
- Optimize query patterns

### Risk 4: Data Inconsistency
**Problem:** Data can become inconsistent across DBs  
**Mitigation:**
- Regular consistency checks
- Automated reconciliation
- Audit logging
- Monitoring alerts

### Risk 5: Complex Queries
**Problem:** Joins across databases difficult  
**Mitigation:**
- Fetch separately and merge in code
- Use raw SQL with DB prefixes
- Create database views
- Service layer abstraction

---

## 📊 Success Metrics

### Performance
- [ ] Query response time < 200ms (95th percentile)
- [ ] API response time < 500ms (95th percentile)
- [ ] Database CPU < 70%
- [ ] Database memory < 80%

### Reliability
- [ ] Uptime > 99.9%
- [ ] Zero data loss
- [ ] Error rate < 0.1%
- [ ] Successful rollback capability

### Data Integrity
- [ ] 100% data migration accuracy
- [ ] All foreign key relationships maintained
- [ ] No orphaned records
- [ ] Consistent data across databases

---

## 🔄 Rollback Plan

### Per Phase Rollback
```bash
# If issues found within 48 hours

# 1. Stop application
pm2 stop elscholar-api

# 2. Restore from backup
mysql full_skcooly < full_backup_before_hr.sql

# 3. Drop new database
DROP DATABASE elite_hr;

# 4. Revert .env
# Remove HR_DB_NAME

# 5. Restart application
pm2 start elscholar-api

# 6. Verify
./scripts/test-db-setup.sh
```

### Full Rollback
```bash
# If major issues after all phases

# 1. Restore all databases from backups
mysql full_skcooly < full_backup_original.sql

# 2. Drop new databases
DROP DATABASE elite_hr;
DROP DATABASE elite_finance;
DROP DATABASE elite_academic;

# 3. Revert all code changes
git revert <commit-hash>

# 4. Deploy previous version
```

---

## 📁 Scripts to Create

### 1. Migration Scripts
```bash
scripts/
├── migrate_hr_tables.sh
├── migrate_finance_tables.sh
├── migrate_academic_tables.sh
├── verify_migration.sh
├── rollback_migration.sh
└── test_cross_db_queries.sh
```

### 2. Monitoring Scripts
```bash
scripts/monitoring/
├── check_data_integrity.sh
├── check_performance.sh
├── check_consistency.sh
└── generate_report.sh
```

### 3. Testing Scripts
```bash
scripts/testing/
├── test_hr_features.sh
├── test_finance_features.sh
├── test_academic_features.sh
└── test_integration.sh
```

---

## 💰 Cost-Benefit Analysis

### Costs
- **Development Time:** 2-3 weeks
- **Testing Time:** 1 week
- **Migration Downtime:** 6-8 hours total (spread across phases)
- **Risk:** Medium (mitigated by phased approach)

### Benefits
- **Performance:** 30-50% faster queries (isolated workloads)
- **Scalability:** Independent scaling per domain
- **Maintenance:** Easier to manage smaller databases
- **Security:** Better data isolation
- **Deployment:** Can deploy domain-specific changes
- **Team Structure:** Aligns with microservices architecture

### ROI
- **Short-term (3 months):** Neutral (migration overhead)
- **Medium-term (6-12 months):** Positive (better performance)
- **Long-term (1+ years):** Very Positive (scalability, maintainability)

---

## 🎯 Decision Points

### Go/No-Go Criteria

**Proceed if:**
- ✅ All tables identified and mapped
- ✅ Cross-DB query patterns tested
- ✅ Staging migration successful
- ✅ Team trained and ready
- ✅ Rollback plan tested
- ✅ Monitoring in place

**Abort if:**
- ❌ Performance degradation > 20%
- ❌ Data integrity issues found
- ❌ Critical bugs in cross-DB queries
- ❌ Team not confident
- ❌ Insufficient testing

---

## 📅 Timeline Summary

```
Week 1: Planning & Preparation
├── Day 1-2: Analysis
├── Day 3-4: Code preparation
└── Day 5-7: Testing environment

Week 2: elite_hr Migration
├── Day 1-2: Preparation
├── Day 3: Migration
└── Day 4-7: Testing & stabilization

Week 3: elite_finance Migration
├── Day 1-2: Preparation
├── Day 3: Migration
└── Day 4-7: Testing & stabilization

Week 4: elite_academic Migration
├── Day 1-3: Preparation
├── Day 4: Migration
└── Day 5-7: Testing & stabilization

Week 5: elite_content Migration
├── Day 1-2: Preparation
├── Day 3: Migration
└── Day 4-5: Testing & stabilization

Week 6: elite_cbt Migration
├── Day 1-2: Preparation
├── Day 3: Migration
└── Day 4-5: Testing & stabilization

Week 7: Final Testing & Documentation
```

**Total Time:** 7 weeks  
**Total Downtime:** 10-12 hours (spread across 5 maintenance windows)

---

## 🚦 Recommendation

### Proceed with Phased Migration
1. **Start with elite_hr** (lowest risk, isolated domain)
2. **Then elite_finance** (medium risk, high value)
3. **Finally elite_academic** (highest risk, core functionality)

### Alternative: Don't Migrate
**Keep current structure if:**
- Current performance is acceptable
- No scaling issues
- Team prefers monolithic architecture
- Risk outweighs benefits

---

## 📞 Next Steps

1. **Review this plan** with team
2. **Get stakeholder approval**
3. **Set up staging environment**
4. **Create detailed table mapping**
5. **Develop migration scripts**
6. **Test on staging**
7. **Schedule maintenance windows**
8. **Execute Phase 1 (elite_hr)**

---

**Status:** Awaiting Approval  
**Risk Level:** Medium (with mitigation)  
**Recommendation:** Proceed with caution  
**Timeline:** 5 weeks  

*Plan created: 2026-02-11 03:17 UTC*
