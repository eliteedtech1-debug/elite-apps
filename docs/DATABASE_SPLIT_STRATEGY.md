# Elite Core Database Split Strategy

> **Document Version:** 1.0  
> **Created:** 2026-02-12  
> **Status:** Planning Phase  
> **DBA Expert Reference**

---

## 🎯 Objective

Split the monolithic `full_skcooly` database into specialized databases for better:
- **Performance**: Reduced query contention and optimized connection pooling
- **Scalability**: Independent scaling of different system components
- **Maintenance**: Isolated backups, migrations, and schema changes
- **Security**: Granular access control per database
- **Multi-tenancy**: Better data isolation

---

## 📊 Current Database Architecture

### Existing Setup
```
full_skcooly (Main DB)
├── elite_logs (Audit DB) ✅ Already Extracted
└── elite_bot (AI DB) ✅ Already Extracted
```

### Environment Variables (Current)
```bash
# Main Database
DB_NAME=full_skcooly
DB_USERNAME=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306

# Audit Database (Already Separated)
AUDIT_DB_NAME=elite_logs
AUDIT_DB_USERNAME=root
AUDIT_DB_PASSWORD=
AUDIT_DB_HOST=localhost
AUDIT_DB_PORT=3306

# AI Database (Already Separated)
AI_DB_NAME=elite_bot
AI_DB_USERNAME=root
AI_DB_PASSWORD=
AI_DB_HOST=localhost
AI_DB_PORT=3306
```

---

## 🗂️ Proposed Database Split

### 1. **elite_core** (Main/Core Database)
**Purpose:** Core school management, users, authentication, and configuration

**Tables:**
- `users` - User accounts and authentication
- `user_roles` - User role assignments
- `roles` - Role definitions
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings
- `user_permission_overrides` - User-specific permission overrides
- `staff` - Staff/teacher records
- `students` - Student records
- `school_setup` - School configuration
- `school_locations` - Branch/campus information
- `school_subscriptions` - Subscription management
- `system_config` - System-wide configuration
- `login_sessions` - Active user sessions
- `school_access_audit` - Access audit trails
- `rbac_audit_logs` - RBAC change logs
- `permission_cache` - Permission caching
- `superadmin_features` - Superadmin feature flags
- `staff_role_definitions` - Staff role templates
- `features` - Feature definitions
- `feature_categories` - Feature categorization

**Connection Pool:** max: 20, min: 5

---

### 2. **elite_content** (NEW - Educational Content)
**Purpose:** Lesson plans, syllabus, educational materials, and recitations

**Tables to Extract:**

#### Lesson Management
- `lesson_plans` - Teacher lesson plans
- `lesson_notes` - Post-lesson notes and reflections
- `lesson_plan_reviews` - Lesson plan approval workflow
- `lesson_timetables` - Class scheduling

#### Syllabus & Curriculum
- `syllabus` - Curriculum topics and content
- `subjects` - Subject definitions
- `predefined_subjects` - System-wide subject templates
- `teacher_classes` - Teacher-class assignments
- `classes` - Class/grade definitions
- `grade_levels` - Grade level configurations

#### Recitation System
- `recitations` - Audio recitation assignments
- `recitation_replies` - Student audio submissions
- `recitation_feedbacks` - Teacher feedback on recitations

#### Knowledge Domains
- `knowledge_domains` - Assessment domains (cognitive, affective, etc.)
- `knowledge_domain_criteria` - Domain assessment criteria
- `knowledge_domains_simplified` - Simplified domain structure
- `knowledge_domains_enhanced` - Enhanced domain structure

**Connection Pool:** max: 10, min: 2

**Environment Variables:**
```bash
CONTENT_DB_NAME=elite_content
CONTENT_DB_USERNAME=root
CONTENT_DB_PASSWORD=
CONTENT_DB_HOST=localhost
CONTENT_DB_PORT=3306
```

---

### 3. **elite_assessment** (NEW - Exams & Assessments)
**Purpose:** CA, exams, grading, and assessment management

**Tables to Extract:**

#### CA (Continuous Assessment)
- `ca_setup` - CA configuration
- `ca_templates` - CA templates
- `ca_groups` - CA grouping
- `ca_configurations` - CA settings
- `ca_exam_submissions` - Student CA submissions
- `ca_exam_notifications` - CA notifications
- `ca_exam_print_logs` - CA printing logs
- `ca_exam_moderation_logs` - CA moderation tracking

#### Grading System
- `grading_systems` - Grading scale definitions
- `grade_boundaries` - Grade boundary configurations
- `exam_remarks` - Exam remarks/comments
- `remarks` - General remarks
- `assessment_criteria_simplified` - Simplified assessment criteria
- `assessment_criteria_enhanced` - Enhanced assessment criteria

**Connection Pool:** max: 10, min: 2

**Environment Variables:**
```bash
ASSESSMENT_DB_NAME=elite_assessment
ASSESSMENT_DB_USERNAME=root
ASSESSMENT_DB_PASSWORD=
ASSESSMENT_DB_HOST=localhost
ASSESSMENT_DB_PORT=3306
```

---

### 4. **elite_finance** (NEW - Financial Management)
**Purpose:** Payments, billing, accounting, and financial transactions

**Tables to Extract:**

#### Payment Processing
- `payment_entries` - All payment transactions
- `student_ledgers` - Student account balances
- `custom_charge_items` - Custom billing items
- `custom_items` - Additional custom items

#### Accounting
- `journal_entries` - Double-entry accounting records
- `chart_of_accounts` - Account definitions
- `school_revenue` - Revenue tracking

#### Payroll
- `payroll_periods` - Payroll period definitions
- `payroll_lines` - Individual payroll records
- `staff_allowances` - Staff allowance records
- `staff_deductions` - Staff deduction records
- `allowance_types` - Allowance type definitions
- `deduction_types` - Deduction type definitions
- `allowance_packages` - Allowance package templates
- `allowance_package_items` - Package item details
- `grade_allowance_packages` - Grade-based allowance packages
- `salary_structure_history` - Salary change history

#### Loans
- `loans` - Loan records
- `loan_types` - Loan type definitions
- `loan_payments` - Loan payment tracking
- `loan_status_history` - Loan status changes

#### ID Cards
- `id_card_generations` - ID card generation records
- `id_card_templates` - ID card templates
- `id_card_billing_config` - ID card billing configuration
- `id_card_financial_tracking` - ID card financial tracking

**Connection Pool:** max: 15, min: 3

**Environment Variables:**
```bash
FINANCE_DB_NAME=elite_finance
FINANCE_DB_USERNAME=root
FINANCE_DB_PASSWORD=
FINANCE_DB_HOST=localhost
FINANCE_DB_PORT=3306
```

---

### 5. **elite_inventory** (NEW - Asset & Inventory Management)
**Purpose:** Asset tracking, retail inventory, and facility management

**Tables to Extract:**

#### Asset Management
- `assets` - Asset records
- `asset_categories` - Asset categorization
- `asset_transfers` - Asset transfer history
- `asset_inspections` - Asset inspection records
- `asset_documents` - Asset documentation
- `maintenance_requests` - Maintenance tracking

#### Retail Inventory
- `products` - Product catalog
- `product_categories` - Product categorization
- `product_variants` - Product variations
- `product_stock` - Stock levels
- `stock_transactions` - Stock movement
- `stock_adjustments` - Stock adjustments
- `suppliers` - Supplier information
- `purchase_orders` - Purchase orders
- `purchase_order_items` - PO line items
- `sales_transactions` - Sales records
- `sales_transaction_items` - Sales line items

#### Facilities
- `facility_rooms` - Room/facility tracking

**Connection Pool:** max: 8, min: 2

**Environment Variables:**
```bash
INVENTORY_DB_NAME=elite_inventory
INVENTORY_DB_USERNAME=root
INVENTORY_DB_PASSWORD=
INVENTORY_DB_HOST=localhost
INVENTORY_DB_PORT=3306
```

---

### 6. **elite_communication** (NEW - Messaging & Communication)
**Purpose:** WhatsApp, SMS, notifications, and messaging

**Tables to Extract:**

#### WhatsApp Integration
- `whatsapp_connections` - WhatsApp connection configs
- `whatsapp_messages` - WhatsApp message logs

#### Messaging System
- `messaging_packages` - Messaging package definitions
- `messaging_subscriptions` - School messaging subscriptions
- `messaging_usage` - Usage tracking

#### Support System
- `support_tickets` - Support ticket management
- `ticket_messages` - Ticket conversation threads

**Connection Pool:** max: 8, min: 2

**Environment Variables:**
```bash
COMMUNICATION_DB_NAME=elite_communication
COMMUNICATION_DB_USERNAME=root
COMMUNICATION_DB_PASSWORD=
COMMUNICATION_DB_HOST=localhost
COMMUNICATION_DB_PORT=3306
```

---

### 7. **elite_admission** (NEW - Admissions & Applications)
**Purpose:** Student admission, application processing, and enrollment

**Tables to Extract:**
- `school_applicants` - Applicant records
- `admission_forms` - Admission form submissions
- `admission_tokens` - Admission access tokens
- `admission_number_generators` - Admission number sequences
- `application_status_history` - Application status tracking

**Connection Pool:** max: 5, min: 1

**Environment Variables:**
```bash
ADMISSION_DB_NAME=elite_admission
ADMISSION_DB_USERNAME=root
ADMISSION_DB_PASSWORD=
ADMISSION_DB_HOST=localhost
ADMISSION_DB_PORT=3306
```

---

### 8. **elite_logs** (EXISTING - Audit & Logging)
**Purpose:** System logs, audit trails, and compliance

**Tables (Already Separated):**
- `audit_trails` - System audit logs
- `elite_logs` - Application logs and notifications
- `permission_audit_logs` - Permission change logs
- `crash_reports` - Application crash reports
- `app_health_indicators` - System health metrics

**Connection Pool:** max: 5, min: 1

---

### 9. **elite_bot** (EXISTING - AI & Chatbot)
**Purpose:** AI chatbot, conversations, and knowledge base

**Tables (Already Separated):**
- `chatbot_conversations` - Chat conversation history
- `chatbot_intents` - Intent definitions
- `chatbot_knowledge_base` - Knowledge base articles

**Connection Pool:** max: 5, min: 1

---

## 🔧 Implementation Strategy

### Phase 1: Database Creation & Schema Migration
**Duration:** 1-2 days

1. **Create New Databases**
```sql
CREATE DATABASE elite_content CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_assessment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_communication CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE elite_admission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Export Table Schemas**
```bash
# Example for content tables
mysqldump -u root -p --no-data full_skcooly \
  lesson_plans lesson_notes lesson_plan_reviews syllabus \
  subjects recitations recitation_replies recitation_feedbacks \
  knowledge_domains knowledge_domain_criteria \
  > elite_content_schema.sql
```

3. **Import Schemas to New Databases**
```bash
mysql -u root -p elite_content < elite_content_schema.sql
```

---

### Phase 2: Connection Configuration
**Duration:** 1 day

1. **Update `.env` File**
```bash
# Add new database configurations
CONTENT_DB_NAME=elite_content
CONTENT_DB_USERNAME=root
CONTENT_DB_PASSWORD=
CONTENT_DB_HOST=localhost
CONTENT_DB_PORT=3306

ASSESSMENT_DB_NAME=elite_assessment
# ... (repeat for all new databases)
```

2. **Create Database Connection File**
Create `/elscholar-api/src/config/databases.js` (extend existing):

```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const createConnection = (config, name) => {
  const connection = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port || 3306,
      dialect: 'mysql',
      logging: config.logging || false,
      pool: config.pool || { max: 10, min: 2, acquire: 30000, idle: 10000 },
      dialectOptions: {
        supportBigNumbers: true,
        bigNumberStrings: true,
        timezone: 'Z',
        dateStrings: true
      }
    }
  );
  connection.dbName = name;
  return connection;
};

// Existing connections
const mainDB = createConnection({
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  pool: { max: 20, min: 5 }
}, 'Main');

const auditDB = createConnection({
  database: process.env.AUDIT_DB_NAME || process.env.DB_NAME,
  username: process.env.AUDIT_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.AUDIT_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.AUDIT_DB_HOST || process.env.DB_HOST,
  port: process.env.AUDIT_DB_PORT || process.env.DB_PORT,
  pool: { max: 5, min: 1 }
}, 'Audit');

const aiDB = createConnection({
  database: process.env.AI_DB_NAME || process.env.DB_NAME,
  username: process.env.AI_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.AI_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.AI_DB_HOST || process.env.DB_HOST,
  port: process.env.AI_DB_PORT || process.env.DB_PORT,
  pool: { max: 5, min: 1 }
}, 'AI');

// NEW CONNECTIONS
const contentDB = createConnection({
  database: process.env.CONTENT_DB_NAME || process.env.DB_NAME,
  username: process.env.CONTENT_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.CONTENT_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.CONTENT_DB_HOST || process.env.DB_HOST,
  port: process.env.CONTENT_DB_PORT || process.env.DB_PORT,
  pool: { max: 10, min: 2 }
}, 'Content');

const assessmentDB = createConnection({
  database: process.env.ASSESSMENT_DB_NAME || process.env.DB_NAME,
  username: process.env.ASSESSMENT_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.ASSESSMENT_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.ASSESSMENT_DB_HOST || process.env.DB_HOST,
  port: process.env.ASSESSMENT_DB_PORT || process.env.DB_PORT,
  pool: { max: 10, min: 2 }
}, 'Assessment');

const financeDB = createConnection({
  database: process.env.FINANCE_DB_NAME || process.env.DB_NAME,
  username: process.env.FINANCE_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.FINANCE_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.FINANCE_DB_HOST || process.env.DB_HOST,
  port: process.env.FINANCE_DB_PORT || process.env.DB_PORT,
  pool: { max: 15, min: 3 }
}, 'Finance');

const inventoryDB = createConnection({
  database: process.env.INVENTORY_DB_NAME || process.env.DB_NAME,
  username: process.env.INVENTORY_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.INVENTORY_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.INVENTORY_DB_HOST || process.env.DB_HOST,
  port: process.env.INVENTORY_DB_PORT || process.env.DB_PORT,
  pool: { max: 8, min: 2 }
}, 'Inventory');

const communicationDB = createConnection({
  database: process.env.COMMUNICATION_DB_NAME || process.env.DB_NAME,
  username: process.env.COMMUNICATION_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.COMMUNICATION_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.COMMUNICATION_DB_HOST || process.env.DB_HOST,
  port: process.env.COMMUNICATION_DB_PORT || process.env.DB_PORT,
  pool: { max: 8, min: 2 }
}, 'Communication');

const admissionDB = createConnection({
  database: process.env.ADMISSION_DB_NAME || process.env.DB_NAME,
  username: process.env.ADMISSION_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.ADMISSION_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.ADMISSION_DB_HOST || process.env.DB_HOST,
  port: process.env.ADMISSION_DB_PORT || process.env.DB_PORT,
  pool: { max: 5, min: 1 }
}, 'Admission');

const testConnections = async () => {
  const dbs = {
    main: mainDB,
    audit: auditDB,
    ai: aiDB,
    content: contentDB,
    assessment: assessmentDB,
    finance: financeDB,
    inventory: inventoryDB,
    communication: communicationDB,
    admission: admissionDB
  };

  const results = {};

  for (const [name, db] of Object.entries(dbs)) {
    try {
      await db.authenticate();
      console.log(`✅ ${name} DB connected:`, db.config.database);
      results[name] = true;
    } catch (error) {
      console.error(`❌ ${name} DB failed:`, error.message);
      results[name] = false;
    }
  }

  return results;
};

module.exports = {
  mainDB,
  auditDB,
  aiDB,
  contentDB,
  assessmentDB,
  financeDB,
  inventoryDB,
  communicationDB,
  admissionDB,
  testConnections
};
```

---

### Phase 3: Model Reorganization
**Duration:** 2-3 days

1. **Create Database-Specific Model Directories**
```
/elscholar-api/src/models/
├── core/           # elite_core models
├── content/        # elite_content models (NEW)
├── assessment/     # elite_assessment models (NEW)
├── finance/        # elite_finance models (NEW)
├── inventory/      # elite_inventory models (NEW)
├── communication/  # elite_communication models (NEW)
├── admission/      # elite_admission models (NEW)
├── audit/          # elite_logs models (EXISTING)
└── ai/             # elite_bot models (EXISTING)
```

2. **Create Index Files for Each Database**

Example: `/elscholar-api/src/models/content/index.js`
```javascript
const { contentDB } = require('../../config/databases');

const LessonPlan = require('./LessonPlan')(contentDB, contentDB.Sequelize.DataTypes);
const LessonNote = require('./LessonNote')(contentDB, contentDB.Sequelize.DataTypes);
const LessonPlanReview = require('./LessonPlanReview')(contentDB, contentDB.Sequelize.DataTypes);
const Syllabus = require('./Syllabus')(contentDB, contentDB.Sequelize.DataTypes);
const Subject = require('./Subject')(contentDB, contentDB.Sequelize.DataTypes);
const Recitation = require('./Recitation')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationReply = require('./RecitationReply')(contentDB, contentDB.Sequelize.DataTypes);
const RecitationFeedback = require('./RecitationFeedback')(contentDB, contentDB.Sequelize.DataTypes);
const KnowledgeDomain = require('./KnowledgeDomain')(contentDB, contentDB.Sequelize.DataTypes);
const KnowledgeDomainCriteria = require('./KnowledgeDomainCriteria')(contentDB, contentDB.Sequelize.DataTypes);

// Define associations
Object.values({
  LessonPlan,
  LessonNote,
  LessonPlanReview,
  Syllabus,
  Subject,
  Recitation,
  RecitationReply,
  RecitationFeedback,
  KnowledgeDomain,
  KnowledgeDomainCriteria
}).forEach(model => {
  if (model.associate) {
    model.associate({
      LessonPlan,
      LessonNote,
      LessonPlanReview,
      Syllabus,
      Subject,
      Recitation,
      RecitationReply,
      RecitationFeedback,
      KnowledgeDomain,
      KnowledgeDomainCriteria
    });
  }
});

module.exports = {
  sequelize: contentDB,
  LessonPlan,
  LessonNote,
  LessonPlanReview,
  Syllabus,
  Subject,
  Recitation,
  RecitationReply,
  RecitationFeedback,
  KnowledgeDomain,
  KnowledgeDomainCriteria
};
```

3. **Move Model Files**
```bash
# Move content models
mv src/models/LessonPlan.js src/models/content/
mv src/models/LessonNote.js src/models/content/
mv src/models/Syllabus.js src/models/content/
# ... (repeat for all content models)
```

---

### Phase 4: Data Migration
**Duration:** 2-3 days (depends on data volume)

1. **Backup Current Database**
```bash
mysqldump -u root -p full_skcooly > full_skcooly_backup_$(date +%Y%m%d).sql
```

2. **Migrate Data to New Databases**
```bash
# Example: Migrate lesson_plans table
mysqldump -u root -p full_skcooly lesson_plans | mysql -u root -p elite_content

# Migrate all content tables
mysqldump -u root -p full_skcooly \
  lesson_plans lesson_notes lesson_plan_reviews syllabus \
  subjects recitations recitation_replies recitation_feedbacks \
  knowledge_domains knowledge_domain_criteria \
  | mysql -u root -p elite_content
```

3. **Verify Data Integrity**
```sql
-- Check row counts match
SELECT COUNT(*) FROM full_skcooly.lesson_plans;
SELECT COUNT(*) FROM elite_content.lesson_plans;
```

---

### Phase 5: Controller & Service Updates
**Duration:** 3-4 days

1. **Update Import Statements**

Before:
```javascript
const { LessonPlan } = require('../models');
```

After:
```javascript
const { LessonPlan } = require('../models/content');
```

2. **Update Cross-Database Queries**

For queries spanning multiple databases, use raw SQL or separate queries:

```javascript
// Example: Get lesson plan with teacher info
const { LessonPlan } = require('../models/content');
const { Staff } = require('../models/core');

// Separate queries
const lessonPlan = await LessonPlan.findByPk(id);
const teacher = await Staff.findByPk(lessonPlan.teacher_id);

// Or use raw SQL with JOIN across databases
const result = await mainDB.query(`
  SELECT 
    lp.*,
    s.name as teacher_name
  FROM elite_content.lesson_plans lp
  LEFT JOIN elite_core.staff s ON lp.teacher_id = s.id
  WHERE lp.id = :id
`, {
  replacements: { id },
  type: QueryTypes.SELECT
});
```

---

### Phase 6: Testing
**Duration:** 2-3 days

1. **Unit Tests**
- Test each model's CRUD operations
- Verify associations work correctly
- Test cross-database queries

2. **Integration Tests**
- Test API endpoints
- Verify data consistency
- Test transaction rollbacks

3. **Performance Tests**
- Benchmark query performance
- Monitor connection pool usage
- Test under load

---

### Phase 7: Deployment
**Duration:** 1 day

1. **Production Environment Setup**
```bash
# Create production databases
# Update production .env
# Run migrations
# Deploy updated code
```

2. **Monitoring**
- Monitor database connections
- Track query performance
- Watch for errors

---

## 🔄 Cross-Database Relationships

### Handling Foreign Keys Across Databases

MySQL doesn't support foreign keys across databases. Use application-level enforcement:

1. **Application-Level Validation**
```javascript
// Before creating lesson plan, verify teacher exists
const teacher = await Staff.findByPk(teacher_id);
if (!teacher) {
  throw new Error('Teacher not found');
}

const lessonPlan = await LessonPlan.create({
  teacher_id,
  // ... other fields
});
```

2. **Soft References**
```javascript
// Use IDs without FK constraints
// Validate in application layer
// Handle orphaned records gracefully
```

3. **Denormalization (When Needed)**
```javascript
// Store frequently accessed data redundantly
const lessonPlan = await LessonPlan.create({
  teacher_id,
  teacher_name, // Denormalized for quick access
  // ... other fields
});
```

---

## 📈 Performance Optimization

### Connection Pooling Strategy

```javascript
// High-traffic databases
financeDB: { max: 15, min: 3 }
mainDB: { max: 20, min: 5 }

// Medium-traffic databases
contentDB: { max: 10, min: 2 }
assessmentDB: { max: 10, min: 2 }

// Low-traffic databases
auditDB: { max: 5, min: 1 }
admissionDB: { max: 5, min: 1 }
```

### Query Optimization

1. **Use Database-Specific Indexes**
```sql
-- elite_content indexes
CREATE INDEX idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_date ON lesson_plans(lesson_date);
CREATE INDEX idx_lesson_plans_school_branch ON lesson_plans(school_id, branch_id);
```

2. **Implement Caching**
```javascript
// Cache frequently accessed data
const Redis = require('redis');
const cache = Redis.createClient();

// Cache lesson plan
await cache.setex(`lesson_plan:${id}`, 3600, JSON.stringify(lessonPlan));
```

---

## 🚨 Rollback Strategy

### If Issues Arise

1. **Keep Original Database Intact**
- Don't drop tables from `full_skcooly` until fully tested
- Maintain parallel operation during transition

2. **Fallback Configuration**
```bash
# In .env, keep fallback to main DB
CONTENT_DB_NAME=elite_content
CONTENT_DB_FALLBACK=full_skcooly  # Fallback if elite_content fails
```

3. **Gradual Migration**
- Migrate one database at a time
- Test thoroughly before next migration
- Keep rollback scripts ready

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup `full_skcooly` database
- [ ] Document all stored procedures
- [ ] List all cross-table queries
- [ ] Identify foreign key relationships
- [ ] Review connection pool settings

### Migration
- [ ] Create new databases
- [ ] Export and import schemas
- [ ] Migrate data with verification
- [ ] Update `.env` configuration
- [ ] Reorganize model files
- [ ] Update controllers and services
- [ ] Update stored procedures

### Post-Migration
- [ ] Run comprehensive tests
- [ ] Verify data integrity
- [ ] Monitor performance
- [ ] Update documentation
- [ ] Train team on new structure
- [ ] Monitor logs for errors

### Cleanup (After 30 Days)
- [ ] Drop migrated tables from `full_skcooly`
- [ ] Remove old model files
- [ ] Archive old backups
- [ ] Update AGENTS.md documentation

---

## 🎓 Benefits Summary

### Performance
- **Reduced Lock Contention**: Separate databases reduce table-level locks
- **Optimized Connection Pools**: Right-sized pools per database
- **Faster Queries**: Smaller databases = faster table scans

### Scalability
- **Independent Scaling**: Scale databases based on load
- **Horizontal Partitioning**: Easier to shard by school_id
- **Resource Allocation**: Dedicated resources per database

### Maintenance
- **Isolated Backups**: Backup critical data more frequently
- **Targeted Migrations**: Schema changes don't affect entire system
- **Easier Debugging**: Isolate issues to specific databases

### Security
- **Granular Access**: Different credentials per database
- **Data Isolation**: Limit blast radius of security breaches
- **Compliance**: Easier to meet regulatory requirements

---

## 📞 Support & Questions

**DBA Expert:** Database schema and migration execution  
**Backend Expert:** Model and controller updates  
**DevOps Expert:** Environment configuration and deployment  
**QA Expert:** Testing and validation  

---

*Document Created: 2026-02-12*  
*Next Review: After Phase 1 Completion*
