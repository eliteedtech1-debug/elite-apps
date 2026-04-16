# Admission Application Module - Multi-Agent Command Prompt

> **Project:** Production-Ready Admission Application Module for Multi-Tenant School Management System
> 
> **Execution Mode:** Coordinated Multi-Agent Development
> 
> **Date:** 2025-12-13

---

## 🎯 PROJECT OBJECTIVE

Build a PRODUCTION-READY Admission Application Module that:
- **REUSES** existing `school_applicants` table (PRIMARY constraint)
- **EVOLVES** the schema through careful normalization
- **PRESERVES** all existing data and workflows
- **DELIVERS** mobile-first, parent-friendly UI
- **MAINTAINS** multi-tenant isolation (school_id, branch_id)

---

## 🚨 CRITICAL CONSTRAINTS (NON-NEGOTIABLE)

### Database Constraints
- ✅ **MAXIMIZE** reuse of existing `school_applicants` table
- ✅ **ALTER** and clean existing table where necessary
- ✅ **NORMALIZE** gradually by extracting ONLY clearly distinct entities
- ✅ **ADD** new tables ONLY where architecturally justified
- ❌ **DO NOT** create redundant tables duplicating existing data
- ❌ **DO NOT** recreate applicant, exam, or admission tables from scratch
- ❌ **DO NOT** ignore legacy fields — explicitly map or deprecate them

### ID Structure (MANDATORY)
```sql
school_id VARCHAR(20)
branch_id VARCHAR(20)
applicant_id / application_no (preserve existing formats)
```

### Multi-Tenant Isolation
- All queries MUST filter by `school_id` and `branch_id`
- No cross-school data access
- Branch-level permissions enforced

---

## 📊 EXISTING CORE TABLE

### Table: `school_applicants`

**Current Contents:**
- Applicant personal data (name, DOB, gender, etc.)
- Guardian data (mixed/denormalized)
- Previous school data
- Entrance exam data (mathematics, english, scores)
- Admission outcome data (status, decision)
- Medical and health data
- School and branch identifiers

**Treatment:** This is the PRIMARY admission table. All agents MUST work with this table as the foundation.

---

## 🔄 ADMISSION WORKFLOWS

### Non-Exam Schools
```
submitted → screened → admitted / rejected
```

### Exam-Based Schools
```
submitted → exam_scheduled → exam_passed → admitted
                    ↓
              exam_failed → rejected
```

### Status Management
- Reuse existing `status` column
- Add status history table ONLY for audit purposes
- Track status transitions with timestamps

---

## 🤖 AGENT ASSIGNMENTS & RESPONSIBILITIES

### 1️⃣ **DBA Expert** (`@dba-expert`)

**PRIMARY RESPONSIBILITY:** Schema Analysis & Normalization Strategy

**Tasks:**
1. **Analyze** existing `school_applicants` table structure
2. **Categorize** all columns into:
   - ✅ **KEEP** - Use as-is
   - 🔄 **RENAME** - Improve clarity
   - ⚠️ **DEPRECATE** - Mark for future removal
   - 📦 **EXTRACT** - Move to new normalized table
3. **Propose** normalization plan:
   - Extract `admission_guardians` (ONLY if multiple guardians per applicant)
   - Extract `admission_documents` (for file uploads)
   - Extract `admission_status_history` (for audit trail)
   - Extract `admission_exams` (ONLY if multiple exams per applicant)
4. **Create** migration scripts:
   - ALTER TABLE statements (preferred)
   - CREATE TABLE statements (only when justified)
   - Data migration scripts
   - Rollback procedures
5. **Add** indexes, constraints, and foreign keys
6. **Ensure** no data loss during migration

**Deliverables:**
- `schema_analysis_report.md` - Current state analysis
- `normalization_plan.md` - Proposed changes with justification
- `migration_scripts.sql` - All ALTER/CREATE statements
- `rollback_scripts.sql` - Rollback procedures
- `data_validation_queries.sql` - Verify data integrity

**Quality Metrics:**
- Zero data loss
- All legacy fields mapped or deprecated
- Clear documentation for each change
- Backward compatibility maintained

**Command:**
```bash
@dba-expert analyze the school_applicants table and create a normalization plan that:
- Preserves all existing data
- Extracts only clearly distinct entities
- Provides ALTER TABLE scripts (preferred over CREATE)
- Documents every column decision (KEEP/RENAME/DEPRECATE/EXTRACT)
- Ensures multi-tenant isolation (school_id, branch_id)
```

---

### 2️⃣ **Backend Expert** (`@backend-expert`)

**PRIMARY RESPONSIBILITY:** API Development & Business Logic

**Tasks:**
1. **Map** APIs directly to `school_applicants` and normalized tables
2. **Handle** legacy fields safely with transformation layers
3. **Implement** admission workflow logic:
   - Status transitions (submitted → screened → admitted/rejected)
   - Exam scheduling and result processing
   - Admission decision workflows
4. **Create** controllers:
   - `AdmissionApplicationController.js`
   - `AdmissionExamController.js`
   - `AdmissionWorkflowController.js`
5. **Implement** multi-tenant isolation:
   - All queries filter by school_id and branch_id
   - Middleware for tenant validation
6. **Add** audit trail logging for all admission actions
7. **Create** API endpoints:
   - `POST /api/admissions/applications` - Submit application
   - `GET /api/admissions/applications/:id` - Get application
   - `PUT /api/admissions/applications/:id` - Update application
   - `POST /api/admissions/applications/:id/status` - Update status
   - `POST /api/admissions/exams/schedule` - Schedule exam
   - `POST /api/admissions/exams/results` - Submit exam results
   - `GET /api/admissions/reports` - Admission reports

**Deliverables:**
- `AdmissionApplicationController.js` - Main controller
- `AdmissionExamController.js` - Exam management
- `AdmissionWorkflowController.js` - Workflow logic
- API route definitions
- Sequelize models (updated)
- Middleware for tenant isolation
- API documentation

**Quality Metrics:**
- < 200ms p95 response time
- 100% multi-tenant isolation
- Comprehensive error handling
- Complete audit trail

**Command:**
```bash
@backend-expert create admission APIs that:
- Map directly to school_applicants table
- Handle legacy fields with transformation layers
- Implement workflow logic (non-exam and exam-based)
- Enforce multi-tenant isolation (school_id, branch_id)
- Add comprehensive audit logging
- Follow existing controller patterns in elscholar-api/src/controllers/
```

---

### 3️⃣ **Frontend Expert** (`@frontend-expert`)

**PRIMARY RESPONSIBILITY:** React UI Components & State Management

**Tasks:**
1. **Build** UI based on EXISTING data model (not fresh schema)
2. **Hide** deprecated fields from UI
3. **Create** components:
   - `AdmissionApplicationForm.tsx` - Multi-step form
   - `AdmissionApplicationList.tsx` - Applications table
   - `AdmissionApplicationDetail.tsx` - View/edit application
   - `AdmissionExamScheduler.tsx` - Exam scheduling
   - `AdmissionWorkflowManager.tsx` - Status management
4. **Implement** mobile-first, responsive design:
   - Native-app-like UX on mobile
   - Desktop-grade UI on large screens
5. **Add** tooltips for complex or legacy-mapped fields
6. **Integrate** with Redux for state management
7. **Handle** file uploads (documents, photos)
8. **Implement** form validation (client-side)

**Deliverables:**
- React components in `elscholar-ui/src/feature-module/admissions/`
- Redux slices for admission state
- Form validation logic
- Responsive CSS/styling
- Mobile-optimized layouts

**Quality Metrics:**
- WCAG 2.1 AA compliance minimum
- < 1.5s First Contentful Paint
- Mobile performance > 85 Lighthouse score
- Touch targets minimum 44x44px

**Command:**
```bash
@frontend-expert create admission UI components that:
- Work with existing school_applicants data model
- Hide deprecated fields from user view
- Provide mobile-first, parent-friendly experience
- Include tooltips for complex fields
- Follow existing component patterns in elscholar-ui/src/feature-module/
- Use Ant Design components consistently
```

---

### 4️⃣ **UI/UX Expert** (`@ui-ux-expert`)

**PRIMARY RESPONSIBILITY:** User Experience Design & Specifications

**Tasks:**
1. **Design** parent-friendly admission workflow
2. **Create** wireframes and UI specifications:
   - Application submission flow
   - Document upload interface
   - Exam scheduling interface
   - Status tracking dashboard
3. **Simplify** complex backend mappings in UI
4. **Design** for non-technical users (parents)
5. **Ensure** Nigerian school admission practices are reflected
6. **Create** mobile and desktop layouts
7. **Design** error states and validation messages

**Deliverables:**
- `admission_ui_ux_spec.md` - Complete UI/UX specifications
- Wireframe descriptions
- User flow diagrams
- Component interaction patterns
- Accessibility guidelines

**Quality Metrics:**
- Zero learning curve for parents
- Clear visual hierarchy
- Intuitive navigation
- Culturally appropriate design

**Command:**
```bash
@ui-ux-expert design admission UI/UX that:
- Simplifies complex backend for non-technical parents
- Follows Nigerian school admission practices
- Provides mobile-first, native-app-like experience
- Hides technical complexity
- Includes clear error messages and guidance
```

---

### 5️⃣ **Finance Expert** (`@finance-expert`)

**PRIMARY RESPONSIBILITY:** Admission Fee Integration

**Tasks:**
1. **Integrate** admission fees with existing payment system
2. **Link** admission applications to billing:
   - Application fees
   - Exam fees
   - Admission acceptance fees
3. **Ensure** fee structures vary by school/branch
4. **Create** payment workflows:
   - Pay application fee → application submitted
   - Pay exam fee → exam scheduled
   - Pay acceptance fee → admission confirmed
5. **Validate** accounting compliance for admission fees

**Deliverables:**
- Admission fee integration logic
- Payment workflow documentation
- Fee structure configuration

**Quality Metrics:**
- 100% accounting accuracy
- Complete audit trail for fees
- Proper revenue recognition

**Command:**
```bash
@finance-expert integrate admission fees with payment system:
- Link applications to payment_entries table
- Configure fee structures per school/branch
- Implement payment workflows (application, exam, acceptance fees)
- Ensure accounting compliance and audit trails
```

---

### 6️⃣ **QA Expert** (`@qa-expert`)

**PRIMARY RESPONSIBILITY:** Testing & Validation

**Tasks:**
1. **Validate** schema normalization correctness
2. **Ensure** no data loss during migration
3. **Test** legacy + new records compatibility
4. **Verify** mobile and desktop UX integrity
5. **Test** admission workflows:
   - Non-exam school workflow
   - Exam-based school workflow
   - Status transitions
6. **Test** multi-tenant isolation
7. **Perform** security testing:
   - SQL injection prevention
   - Authorization checks
   - Data access controls
8. **Load test** admission APIs

**Deliverables:**
- Test strategy document
- Automated test suite
- Manual test cases
- Performance test results
- Security audit report

**Quality Metrics:**
- > 90% code coverage
- Zero data loss verified
- All workflows tested
- Security vulnerabilities: Zero critical/high

**Command:**
```bash
@qa-expert test admission module:
- Validate schema migration (no data loss)
- Test legacy and new records compatibility
- Verify mobile and desktop UX
- Test all admission workflows
- Verify multi-tenant isolation
- Perform security and performance testing
```

---

### 7️⃣ **Project Manager** (`@project-manager`)

**PRIMARY RESPONSIBILITY:** Coordination & Risk Management

**Tasks:**
1. **Ensure** normalization does NOT break existing features
2. **Track** schema changes carefully
3. **Confirm** backward compatibility
4. **Coordinate** agent handoffs:
   - DBA → Backend → Frontend → QA
5. **Manage** risks:
   - Data loss risk
   - Breaking changes risk
   - Performance degradation risk
6. **Create** project timeline and milestones
7. **Monitor** progress and blockers
8. **Communicate** with stakeholders

**Deliverables:**
- Project plan with milestones
- Risk register with mitigation strategies
- Progress tracking dashboard
- Stakeholder communication plan

**Quality Metrics:**
- > 95% on-time delivery
- Zero breaking changes to existing features
- All risks mitigated

**Command:**
```bash
@project-manager coordinate admission module development:
- Create project plan with clear milestones
- Track schema changes and ensure backward compatibility
- Manage risks (data loss, breaking changes, performance)
- Coordinate DBA → Backend → Frontend → QA workflow
- Monitor progress and report blockers
```

---

### 8️⃣ **Security Expert** (`@security-expert`)

**PRIMARY RESPONSIBILITY:** Security & Access Control

**Tasks:**
1. **Implement** role-based access control:
   - Admin: Full access
   - Staff: View/manage applications
   - Parents: Submit/view own applications
2. **Ensure** multi-tenant data isolation
3. **Validate** input sanitization
4. **Implement** file upload security:
   - File type validation
   - Size limits
   - Virus scanning (if available)
5. **Audit** SQL injection prevention
6. **Review** authentication flows

**Deliverables:**
- Security audit report
- Access control matrix
- Security middleware
- Input validation rules

**Quality Metrics:**
- Zero security vulnerabilities
- 100% multi-tenant isolation
- Complete input validation

**Command:**
```bash
@security-expert secure admission module:
- Implement role-based access control
- Ensure multi-tenant data isolation
- Validate all inputs and file uploads
- Audit SQL injection prevention
- Review authentication and authorization flows
```

---

## 📋 EXECUTION WORKFLOW

### Phase 1: Analysis & Planning (DBA + Project Manager)
1. **DBA Expert** analyzes `school_applicants` table
2. **DBA Expert** creates normalization plan
3. **Project Manager** reviews and approves plan
4. **All Agents** review normalization plan for impact

**Deliverable:** Approved normalization plan

---

### Phase 2: Database Migration (DBA)
1. **DBA Expert** creates migration scripts
2. **DBA Expert** creates rollback scripts
3. **QA Expert** reviews migration scripts
4. **DBA Expert** executes migration on test database
5. **QA Expert** validates data integrity

**Deliverable:** Migrated database schema (test environment)

---

### Phase 3: Backend Development (Backend + Finance)
1. **Backend Expert** creates Sequelize models
2. **Backend Expert** implements controllers and routes
3. **Finance Expert** integrates admission fees
4. **Backend Expert** implements workflow logic
5. **Security Expert** reviews security implementation

**Deliverable:** Admission APIs (test environment)

---

### Phase 4: Frontend Development (Frontend + UI/UX)
1. **UI/UX Expert** creates design specifications
2. **Frontend Expert** builds React components
3. **Frontend Expert** integrates with APIs
4. **Frontend Expert** implements responsive design
5. **UI/UX Expert** reviews UI implementation

**Deliverable:** Admission UI (test environment)

---

### Phase 5: Testing & Validation (QA + All Agents)
1. **QA Expert** executes test suite
2. **QA Expert** performs security testing
3. **QA Expert** performs performance testing
4. **All Agents** fix identified issues
5. **QA Expert** validates fixes

**Deliverable:** Test report with all tests passing


ITERATION DIRECTIVE:

1. School Context Resolution
- Resolve target school using subdomain (school.short_name)
- Load school from school_locations
- Populate store.auth.school and default store.auth.selected_branch
- Block admission UI if context is missing

2. Branch Enforcement
- Every admission application MUST include:
  - school_id (VARCHAR(20))
  - branch_id (VARCHAR(20))
- Backend must reject applications without branch_id

3. Classes Resolution
- Classes must be loaded using:
  SELECT * FROM classes
  WHERE school_id = :school_id
    AND branch_id = :branch_id
    AND status = 'Active'
- Populate store.auth.classes from this query
- Admission form class selector must use store.auth.classes

4. Frontend Updates
- AdmissionApplicationForm must:
  - Assume school context exists
  - Auto-bind school_id and branch_id
  - Prevent manual override by parents
- Tooltips must explain branch and class selection

5. Backend Updates
- AdmissionApplicationController:
  - Validate school_id and branch_id
  - Cross-check branch belongs to school
- Add middleware:
  - resolveSchoolFromSubdomain
  - enforceBranchContext

6. Phase Control
- DO NOT execute Phase 6 (Production Deployment)
- Stop after code updates and QA notes

ITERATION 2:
### _post wrong application
 -- The following is a wrong application of _post

 const response = await _post('/api/admissions/applications' 
 reasons: 1. it use callback to return data is not promise function dont use it for async operation
 2. _postAsync should be use insted.
### Classes id not applicable
-- The Classes does not hav id as pk but class_code


### School context on local host

## ITERATION 3: Admission Access Control (QR / Scratch Cards & Payments)

### Objective
Support multiple admission access models:
- Token-based (QR / Scratch cards)
- Payment-based (Paystack)
- Hybrid (Token OR Payment)

Schools must be able to choose their preferred model
per school or per branch.

---

## Iteration 4
### 1. Admission Token Concept
Admission Tokens represent controlled access to application forms.

Each token:
- Is generated by school admin
- Is unique and non-guessable
- Can be QR-based or scratch-code based
- Has:
  - token_code
  - school_id (school_id can be accesses from headers[x-school-id])
  - branch_id (branch_id can be accesses from headers[x-branch-id])
  - usage_limit (default = 1)
  - used_count
  - expires_at
  - status (active, used, expired, disabled)

Tokens are NOT applicants and MUST NOT store applicant data.

---

### 2. Token Enforcement Rules

Each school/branch can configure admission access mode:
- FREE
- TOKEN_REQUIRED
- PAYMENT_REQUIRED
- TOKEN_OR_PAYMENT

Rules:
- If TOKEN_REQUIRED:
  - Application form requires valid token
- If PAYMENT_REQUIRED:
  - Application submission requires Paystack checkout
- If TOKEN_OR_PAYMENT:
  - Either valid token OR successful payment is required
- Token is marked as used only after successful submission

---

### 3. Backend Responsibilities

- Create AdmissionToken model and table
- Validate tokens:
  - belongs to school & branch
  - not expired
  - not exceeded usage limit
- Lock token usage on submission (transaction-safe)
- Integrate Paystack verification
- Enforce access rules before application submission
- Store reference to:
  - used token OR
  - payment reference
  in school_applicants

---

### 4. Frontend Responsibilities

- Admission form must:
  - Detect access mode from school config
  - Show token input or QR scanner when required
  - Redirect to Paystack checkout when payment required
- Token input UX:
  - Manual entry
  - QR scan (mobile-first)
- Clear messaging to parents

---

### 5. Admin UI – Token Manager (MANDATORY)

Add **Token Manager** to Main Admin Sidebar.

Features:
- Generate tokens (bulk & single)
- Choose:
  - school
  - branch
  - expiry
  - usage limit
- Export tokens:
  - Printable scratch cards
  - QR code PDFs
- View token usage:
  - used / unused / expired
- Disable tokens manually

---

### 6. Security & Audit

- Token validation must be server-side only
- Tokens must never be guessable
- All token usage must be logged
- Payment + token usage must be auditable

---
### 8. Dual School Context Resolution (Subdomain + Login)

The system MUST support accessing school context
with or without subdomain.

#### A. Subdomain-Based Context (Public Access)
- Used for:
  - Parents
  - Applicants
- School context resolved from subdomain
- Source: school_locations.short_name or domain mapping
- store.auth.school populated automatically
- store.auth.selected_branch set by default or selection
- Admission form MUST work without authentication

#### B. Login-Based Context (Internal Access)
- Used for:
  - Admins
  - Staff
  - Internal testing
- School context resolved during login
- Source: elscholar-ui/src/feature-module/auth/login/login.tsx
- store.auth.school populated after authentication
- store.auth.selected_branch selected or defaulted
- Admission form MUST respect existing store.auth context
- Subdomain is NOT required in this mode

#### C. Admission Form Context Rules
- Admission form must resolve school context in this order:
  1. store.auth.school (if already set)
  2. Subdomain resolution
- If neither is available:
  - Show school selection screen OR
  - Block form with clear instruction
- Context resolution logic MUST be shared (single hook/service)

#### D. Forbidden Behavior
- DO NOT override store.auth.school if already set
- DO NOT require subdomain for authenticated users
- DO NOT allow parent users to change school manually once resolved

### 7. Phase Control

- Apply this iteration without re-running Phase 1–5
- Update backend, frontend, and admin UI
- Do NOT proceed to Phase 6 (Deployment)
---

### 8. Dual School Context Resolution (Subdomain + Login)

The system MUST support accessing school context
with or without subdomain.

#### A. Subdomain-Based Context (Public Access)
- Used for:
  - Parents
  - Applicants
- School context resolved from subdomain
- Source: school_locations.short_name or domain mapping
- store.auth.school populated automatically
- store.auth.selected_branch set by default or selection
- Admission form MUST work without authentication

#### B. Login-Based Context (Internal Access)
- Used for:
  - Admins
  - Staff
  - Internal testing
- School context resolved during login
- Source: elscholar-ui/src/feature-module/auth/login/login.tsx
- store.auth.school populated after authentication
- store.auth.selected_branch selected or defaulted
- Admission form MUST respect existing store.auth context
- Subdomain is NOT required in this mode

#### C. Admission Form Context Rules
- Admission form must resolve school context in this order:
  1. store.auth.school (if already set)
  2. Subdomain resolution
- If neither is available:
  - Show school selection screen OR
  - Block form with clear instruction
- Context resolution logic MUST be shared (single hook/service)

#### D. Forbidden Behavior
- DO NOT override store.auth.school if already set
- DO NOT require subdomain for authenticated users
- DO NOT allow parent users to change school manually once resolved
### HTTP Client Enforcement (CRITICAL)

Frontend uses custom async HTTP helpers ONLY.

#### Allowed:
- await _postAsync(url, payload)
- await _getAsync(url)
- none promise  _post(url, payload)
- none promise  _get(url)

#### Forbidden:
- await _post(...)
- await _get(...)
- axios.*
- fetch()

#### Rules:
- All API calls MUST use promise-based helpers
- Do NOT invent or assume other HTTP utilities
- Token validation, admission submission, and lookups MUST use _postAsync/_getAsync
- Any usage of _post or _get is a bug and must be corrected

### Phase 5.5 General Test Review 
1️⃣ General Test & Review

Goal: Ensure that every iteration has been applied, the module is fully functional, and no regressions exist.

Checklist / Steps:

Frontend Validation

All React components render without errors

Admission form works for:

Subdomain access

Login-based school selection

Classes and branches are correctly loaded from DB

Token-based / scratch-card / QR-card validation works

File uploads (documents, images) work

Mobile-first responsiveness and desktop UI

Tooltips visible for complex fields

Form validation triggers correctly

Backend Validation

All APIs respond with correct HTTP status codes

Multi-tenant isolation enforced (school_id, branch_id)

Admission workflow statuses update correctly

Exam scheduling and result submission work

Admission fees are linked correctly to payment records

Audit trail logs all actions

Database Validation

Normalization applied correctly

No data loss in school_applicants and extracted tables

Legacy fields preserved or documented as deprecated

Branch and school linkage correct

Status history and token tables populated correctly

Security & QA

Role-based access works (Admin, Staff, Parents)

No SQL injections or unsafe queries

File upload restrictions enforced

API requests validated

All workflow edge cases tested (exam/non-exam, multiple branches)

2️⃣ Agent Reports Collection

Goal: Collect reports from all agents for final audit and documentation.

Agent	Expected Report / Deliverable
DBA	schema_analysis_report.md, normalization_plan.md, migration queries
Backend	Controllers, Sequelize models, API documentation, workflow logic
Frontend	React components, Redux slices, form validation logic, responsive CSS
UI/UX	admission_ui_ux_spec.md, wireframes, user flow diagrams
Finance	Fee integration logic, payment workflow documentation
QA	Test suite results, performance, security reports
Project Manager	Project plan, milestone tracking, risk register
Security	Access control matrix, security audit report, input validation rules

Action: Ask AI CLI to collect all agent outputs into a single directory for review.

3️⃣ Generate SQL Migration File for Production

Goal: Apply all schema changes, normalization, and extracted tables to production DB.

Steps:

Collect all ALTER / CREATE / INSERT scripts from DBA reports.

Add indexes, foreign keys, constraints for multi-tenant support.

Include rollback scripts at the bottom (optional but recommended).

Combine into one .sql file (e.g., admission_module_migration.sql).

Example Structure of .sql file:

-- ======================================
-- Admission Module Migration - Production
-- Generated: 2025-12-13
-- ======================================

-- 1. Alter school_applicants table
ALTER TABLE school_applicants
  ADD COLUMN branch_id VARCHAR(20) NOT NULL AFTER school_id,
  MODIFY COLUMN date_of_birth DATE,
  -- other alterations...

-- 2. Create admission_guardians table
CREATE TABLE admission_guardians (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  applicant_id VARCHAR(20) NOT NULL,
  guardian_name VARCHAR(255),
  relation VARCHAR(50),
  phone VARCHAR(50),
  FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id)
);

-- 3. Create admission_documents table
CREATE TABLE admission_documents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  applicant_id VARCHAR(20) NOT NULL,
  document_type VARCHAR(50),
  document_url VARCHAR(255),
  FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id)
);

-- 4. Create admission_status_history table
CREATE TABLE admission_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  applicant_id VARCHAR(20) NOT NULL,
  status VARCHAR(50),
  changed_by VARCHAR(50),
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id)
);

-- 5. Create admission_exams table
CREATE TABLE admission_exams (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  applicant_id VARCHAR(20) NOT NULL,
  exam_type VARCHAR(50),
  score DECIMAL(5,2),
  exam_date DATE,
  FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id)
);

-- 6. Insert default classes or tokens if needed
INSERT INTO classes (class_name, school_id, branch_id, status)
SELECT class_name, school_id, branch_id, 'Active'
FROM classes_temp_backup;

-- 7. Additional queries for fee integration, tokens, etc.

-- 8. Rollback Section (Optional)
-- DROP TABLE admission_guardians;
-- DROP TABLE admission_documents;
-- DROP TABLE admission_status_history;
-- DROP TABLE admission_exams;
-- ALTER TABLE school_applicants ADD COLUMN branch_id;


Important:

Review all queries before running in production

Backup the production DB first

Ensure indexes/constraints do not break legacy data

### Phase 6: Production Deployment (DevOps + Project Manager)
1. **DevOps Expert** prepares production deployment
2. **DBA Expert** executes production migration
3. **DevOps Expert** deploys backend and frontend
4. **QA Expert** performs smoke tests
5. **Project Manager** confirms successful deployment

**Deliverable:** Production-ready admission module

---

## 🎯 QUALITY BAR (STRICT)

### Database
- ✅ No redundant tables
- ✅ No broken legacy data
- ✅ No over-normalization
- ✅ Clean, understandable schema
- ✅ All migrations reversible

### Backend
- ✅ < 200ms p95 API response time
- ✅ 100% multi-tenant isolation
- ✅ Complete audit trail
- ✅ Comprehensive error handling

### Frontend
- ✅ Mobile-first, responsive design
- ✅ WCAG 2.1 AA compliance minimum
- ✅ < 1.5s First Contentful Paint
- ✅ Parent-friendly UX

### Testing
- ✅ > 90% code coverage
- ✅ Zero data loss
- ✅ All workflows tested
- ✅ Zero critical security vulnerabilities

### Documentation
- ✅ Complete API documentation
- ✅ Schema change documentation
- ✅ User guide for parents
- ✅ Admin guide for staff

---

## 🌍 NIGERIAN SCHOOL CONTEXT

### Admission Practices
- Application submission with documents
- Entrance exams (common in private schools)
- Screening/interview process
- Medical examination requirements
- Previous school records verification
- Guardian information (father, mother, or guardian)

### Document Requirements
- Birth certificate
- Previous school report card
- Passport photograph
- Medical report
- Guardian ID
- Proof of address

### Multi-Branch Operations
- Schools operate across states and LGAs
- Each branch may have different admission criteria
- Centralized reporting for school owners
- Branch-level autonomy for admission decisions

---

## 🚀 GETTING STARTED

### For Claude/Gemini:
```
"DBA Expert: Begin analysis of school_applicants table and create normalization plan"
"Project Manager: Create project plan for admission module development"
```

### For OpenCode:
```
@dba-expert analyze school_applicants table structure
@project-manager create admission module project plan
```

---

## 📞 AGENT COORDINATION

### Daily Standup (All Agents)
- Progress updates
- Blockers identification
- Dependency resolution

### Schema Review (DBA + Backend + QA)
- Review normalization plan
- Validate migration scripts
- Confirm data integrity

### Security Review (Security + Backend + QA)
- Review access controls
- Validate input sanitization
- Audit SQL injection prevention

### UX Review (UI/UX + Frontend + Project Manager)
- Review UI implementation
- Validate user flows
- Confirm accessibility compliance

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER** create redundant tables duplicating `school_applicants`
2. **ALWAYS** preserve existing data during migration
3. **ALWAYS** enforce multi-tenant isolation (school_id, branch_id)
4. **ALWAYS** add audit trails for admission actions
5. **ALWAYS** test backward compatibility
6. **NEVER** expose deprecated fields in UI
7. **ALWAYS** document schema changes
8. **ALWAYS** create rollback procedures

---

## 📊 SUCCESS CRITERIA

### Technical Success
- ✅ Schema normalized without data loss
- ✅ APIs performing < 200ms p95
- ✅ UI responsive on mobile and desktop
- ✅ 100% multi-tenant isolation
- ✅ Zero security vulnerabilities

### Business Success
- ✅ Parents can submit applications easily
- ✅ Staff can manage applications efficiently
- ✅ Admission workflows automated
- ✅ Reports available for decision-making
- ✅ System scales to multiple schools/branches

### User Success
- ✅ Non-technical parents can use system
- ✅ Mobile experience is native-app-like
- ✅ Clear guidance and error messages
- ✅ Fast and responsive interface
- ✅ Culturally appropriate design



**Version:** 1.0  
**Last Updated:** 2025-12-13  
**Compatible with:** Claude, OpenCode, Gemini  
**Project:** Elite Core - Admission Application Module
