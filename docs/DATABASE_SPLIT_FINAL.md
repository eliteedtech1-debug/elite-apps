# Elite Core Database Split - Final Plan

> **Version:** 3.0 (Final)  
> **Date:** 2026-02-12  
> **Status:** Ready for Implementation

---

## 🎯 Core Principle

**Clear Separation by Purpose:**

- **elite_content** = Educational materials & curriculum
- **elite_core** = System/school configuration  
- **elite_assessment** = CA/exam configuration
- **elite_finance** = Payment/billing configuration

---

## 📊 Database Breakdown

### 1. **elite_content** (Educational Materials & Curriculum)

**Purpose:** Everything related to teaching, learning, and curriculum delivery

#### Lesson Management (7 tables)
```
✅ lesson_plans (5 rows)
✅ lesson_notes (0 rows)
✅ lesson_plan_reviews (0 rows)
✅ lesson_comments (0 rows)
✅ lesson_time_table (73 rows)
✅ lesson_time_table_backup (3 rows)
✅ lessons (4 rows)
```

#### Syllabus & Curriculum (3 tables)
```
✅ syllabus (30 rows)
✅ syllabus_tracker (10 rows)
✅ syllabus_suggestions (5 rows)
```

#### Subject Management (5 tables)
```
✅ subjects (2,573 rows) ⚠️ LARGEST
✅ predefined_subjects (67 rows)
✅ student_subjects (46 rows)
✅ school_subject_mapping (4 rows)
✅ subject_streams (0 rows)
```

#### Recitation System (3 tables)
```
✅ recitations (0 rows)
✅ recitation_replies (0 rows)
✅ recitation_feedbacks (0 rows)
```

#### Knowledge Domains (4 tables)
```
✅ knowledge_domains (0 rows)
✅ knowledge_domain_criteria (0 rows)
✅ knowledge_domains_simplified (0 rows)
✅ knowledge_domains_enhanced (0 rows)
```

#### Assignments & Homework (5 tables)
```
✅ assignments (3 rows)
✅ student_assignments (0 rows)
✅ assignment_questions (2 rows)
✅ assignment_responses (0 rows)
✅ assignment_question_options (0 rows)
```

#### Virtual Classroom (6 tables)
```
✅ virtual_classrooms (6 rows)
✅ virtual_classroom_participants (36 rows)
✅ virtual_classroom_attendance (0 rows)
✅ virtual_classroom_chat_messages (0 rows)
✅ virtual_classroom_recordings (0 rows)
✅ virtual_classroom_notifications (55 rows)
```

#### Teacher Assignments (2 tables)
```
✅ teacher_classes (1,096 rows) - Teacher-subject-class assignments
✅ class_timing (39 rows) - Class schedule/timing
```

**Total:** 35 tables, ~4,200 rows, ~7.5 MB

---

### 2. **elite_assessment** (CA/Exam Configuration)

**Purpose:** Assessment setup, exam configuration, grading systems

#### CA Configuration (10 tables)
```
✅ ca_setup (65 rows)
✅ ca_configurations (0 rows)
✅ ca_section_configs (0 rows)
✅ ca_templates (0 rows)
✅ ca_groups (0 rows)
✅ ca_exam_submissions (0 rows)
✅ ca_exam_notifications (0 rows)
✅ ca_exam_print_logs (0 rows)
✅ ca_exam_moderation_logs (0 rows)
✅ ca_knowledge_domain_links (0 rows)
```

#### Exam System (8 tables)
```
✅ exam_ca_setup (5 rows)
✅ examinations (0 rows)
✅ exam_questions (0 rows)
✅ exam_question_options (0 rows)
✅ exam_responses (0 rows)
✅ exams_attendance (0 rows)
✅ exam_calendar (0 rows)
✅ exams_subject (0 rows)
```

#### Grading System (4 tables)
```
✅ grade_boundaries (90 rows)
✅ grade_levels (4 rows)
✅ grade_setup (0 rows)
✅ grading_systems (0 rows)
```

#### Assessment Criteria (3 tables)
```
✅ assessment_criteria_simplified (0 rows)
✅ assessment_criteria_enhanced (0 rows)
✅ assessment_scores (0 rows)
```

#### Character/Behavioral Assessment (3 tables)
```
✅ character_traits (234 rows) - Trait definitions (NEATNESS, OBEDIENT, etc.)
✅ character_scores (18,902 rows) ⚠️ LARGEST - Student character grades
✅ weekly_scores (450 rows) - Weekly assessment scores
```

**Total:** 28 tables, ~19,850 rows, ~9 MB

---

### 3. **elite_core** (System/School Configuration)

**Purpose:** Core system, users, schools, and system-wide settings

#### User & Authentication
```
✅ users
✅ user_roles
✅ roles
✅ permissions
✅ role_permissions
✅ user_permission_overrides
✅ login_sessions
```

#### School Management
```
✅ school_setup
✅ school_locations
✅ school_subscriptions
✅ school_access_audit
```

#### Staff & Students
```
✅ staff
✅ students
✅ classes
✅ exam_remarks (1,551 rows) - Report card comments
```

#### System Configuration
```
✅ system_config (0 rows)
✅ report_configurations (13 rows)
✅ features
✅ feature_categories
✅ superadmin_features
```

#### RBAC System
```
✅ rbac_audit_logs
✅ permission_cache
✅ staff_role_definitions
```

**Remains as:** `full_skcooly` (or rename to `elite_core`)

---

### 4. **elite_finance** (Payment/Billing Configuration)

**Purpose:** Financial transactions, billing, payroll, accounting

#### Payment System
```
✅ payment_entries
✅ student_ledgers
✅ custom_charge_items
✅ payment_gateway_config (4 rows)
✅ vendor_payment_configs (0 rows)
```

#### Accounting
```
✅ journal_entries
✅ chart_of_accounts
✅ school_revenue
```

#### Payroll
```
✅ payroll_periods
✅ payroll_lines
✅ staff_allowances
✅ staff_deductions
✅ allowance_types
✅ deduction_types
✅ salary_structure_history
```

#### Billing Configuration
```
✅ id_card_billing_config (0 rows)
✅ id_card_financial_tracking
```

#### Loans
```
✅ loans
✅ loan_types
✅ loan_payments
```

---

### 5. **elite_logs** (Audit & Logging) ✅ Already Separated

```
✅ audit_trails
✅ elite_logs
✅ permission_audit_logs
✅ crash_reports
```

---

### 6. **elite_bot** (AI & Chatbot) ✅ Already Separated

```
✅ chatbot_conversations
✅ chatbot_intents
✅ chatbot_knowledge_base
```

---

## 🔧 Implementation Steps

### Phase 1: Create Databases
```sql
CREATE DATABASE elite_content CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_assessment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Phase 2: Export Schemas
```bash
# Content (35 tables)
mysqldump -u root -p --no-data full_skcooly \
  lesson_plans lesson_notes lesson_plan_reviews lesson_comments \
  lesson_time_table lesson_time_table_backup lessons \
  syllabus syllabus_tracker syllabus_suggestions \
  subjects predefined_subjects student_subjects school_subject_mapping subject_streams \
  recitations recitation_replies recitation_feedbacks \
  knowledge_domains knowledge_domain_criteria knowledge_domains_simplified knowledge_domains_enhanced \
  assignments student_assignments assignment_questions assignment_responses assignment_question_options \
  virtual_classrooms virtual_classroom_participants virtual_classroom_attendance \
  virtual_classroom_chat_messages virtual_classroom_recordings virtual_classroom_notifications \
  teacher_classes class_timing \
  > elite_content_schema.sql

# Assessment (28 tables)
mysqldump -u root -p --no-data full_skcooly \
  ca_setup ca_configurations ca_section_configs ca_templates ca_groups \
  ca_exam_submissions ca_exam_notifications ca_exam_print_logs ca_exam_moderation_logs ca_knowledge_domain_links \
  exam_ca_setup examinations exam_questions exam_question_options exam_responses \
  exams_attendance exam_calendar exams_subject \
  grade_boundaries grade_levels grade_setup \
  assessment_criteria_simplified assessment_criteria_enhanced assessment_scores \
  character_traits character_scores weekly_scores \
  > elite_assessment_schema.sql

# Finance
mysqldump -u root -p --no-data full_skcooly \
  payment_entries student_ledgers journal_entries \
  payroll_periods payroll_lines staff_allowances \
  payment_gateway_config id_card_billing_config \
  > elite_finance_schema.sql
```

### Phase 3: Migrate Data
```bash
# Content - Large tables
mysqldump -u root -p full_skcooly subjects | mysql -u root -p elite_content
mysqldump -u root -p full_skcooly teacher_classes | mysql -u root -p elite_content

# Content - Medium tables
mysqldump -u root -p full_skcooly \
  lesson_time_table predefined_subjects student_subjects syllabus \
  virtual_classroom_participants virtual_classroom_notifications class_timing \
  | mysql -u root -p elite_content

# Assessment - Large table (character_scores: 18,902 rows)
mysqldump -u root -p full_skcooly character_scores | mysql -u root -p elite_assessment

# Assessment - Medium tables
mysqldump -u root -p full_skcooly \
  weekly_scores character_traits ca_setup grade_boundaries \
  | mysql -u root -p elite_assessment

# Finance (verify payment_entries size first)
mysqldump -u root -p full_skcooly payment_entries | mysql -u root -p elite_finance
```

### Phase 4: Update .env
```bash
# Content Database
CONTENT_DB_NAME=elite_content
CONTENT_DB_USERNAME=root
CONTENT_DB_PASSWORD=
CONTENT_DB_HOST=localhost
CONTENT_DB_PORT=3306

# Assessment Database
ASSESSMENT_DB_NAME=elite_assessment
ASSESSMENT_DB_USERNAME=root
ASSESSMENT_DB_PASSWORD=
ASSESSMENT_DB_HOST=localhost
ASSESSMENT_DB_PORT=3306

# Finance Database
FINANCE_DB_NAME=elite_finance
FINANCE_DB_USERNAME=root
FINANCE_DB_PASSWORD=
FINANCE_DB_HOST=localhost
FINANCE_DB_PORT=3306
```

### Phase 5: Update Models
```javascript
// /models/content/index.js
const { contentDB } = require('../../config/databases');
const LessonPlan = require('./LessonPlan')(contentDB, contentDB.Sequelize.DataTypes);
const Syllabus = require('./Syllabus')(contentDB, contentDB.Sequelize.DataTypes);
const Subject = require('./Subject')(contentDB, contentDB.Sequelize.DataTypes);

// /models/assessment/index.js
const { assessmentDB } = require('../../config/databases');
const CASetup = require('./CASetup')(assessmentDB, assessmentDB.Sequelize.DataTypes);
const GradeBoundary = require('./GradeBoundary')(assessmentDB, assessmentDB.Sequelize.DataTypes);

// /models/finance/index.js
const { financeDB } = require('../../config/databases');
const PaymentEntry = require('./PaymentEntry')(financeDB, financeDB.Sequelize.DataTypes);
const PayrollLine = require('./PayrollLine')(financeDB, financeDB.Sequelize.DataTypes);
```

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup full_skcooly database
- [ ] Verify table row counts
- [ ] Document stored procedures
- [ ] List all controllers using tables
- [ ] Test connection pool settings

### Migration Execution
- [ ] Create new databases
- [ ] Export and import schemas
- [ ] Migrate data with verification
- [ ] Update .env configuration
- [ ] Reorganize model files
- [ ] Update controllers
- [ ] Migrate stored procedures

### Post-Migration
- [ ] Verify row counts match
- [ ] Test all API endpoints
- [ ] Check application logs
- [ ] Performance benchmarks
- [ ] Monitor for 7 days

### Cleanup (After 30 Days)
- [ ] Drop migrated tables from full_skcooly
- [ ] Archive old backups
- [ ] Update documentation

---

## 🎯 Expected Benefits

### Performance
- 30-40% faster queries (smaller databases)
- Reduced lock contention
- Optimized connection pools per database

### Operations
- Faster backups (content: 2 min, assessment: 1 min vs 15 min full)
- Isolated schema changes
- Independent scaling

### Development
- Clear separation of concerns
- Easier testing
- Better code organization

---

## 🚨 Rollback Plan

```bash
# Immediate rollback - revert .env
CONTENT_DB_NAME=full_skcooly
ASSESSMENT_DB_NAME=full_skcooly
FINANCE_DB_NAME=full_skcooly

# Restart application
npm restart
```

---

*Final Document - Ready for Implementation*  
*Created: 2026-02-12*
