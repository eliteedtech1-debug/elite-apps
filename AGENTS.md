# AI Agent Configuration for Elite Scholar

> **Optimized for:** Anthropic Claude (Primary) | OpenCode (Secondary) | Google Gemini (Tertiary)
> 
> **Last Updated:** 2025-12-13

---

## 🤖 Agent Roster

### 1. **Frontend Expert**
**Role:** React/TypeScript UI Development Specialist

**Responsibilities:**
- React component development and optimization
- TypeScript type safety and interface design
- Ant Design UI component integration
- Redux Toolkit state management
- Vite build configuration and optimization
- Responsive design and accessibility

**Key Areas:**
- `elscholar-ui/src/feature-module/` - All feature components
- `elscholar-ui/src/redux/` - State management
- `elscholar-ui/vite.config.js` - Build configuration
- React Router configuration and navigation

**Commands to Know:**
```bash
cd elscholar-ui
npm start          # Dev server (port 3000)
npm run build      # Production build
npm run build:craco # Build with increased memory
```

**Coding Standards:**
- 2-space indentation
- camelCase for components
- TypeScript strict mode
- Ant Design component patterns
- No comments unless explicitly requested

---

### 2. **Backend Expert**
**Role:** Node.js/Express API Development Specialist

**Responsibilities:**
- Express.js route and controller development
- Sequelize ORM model management
- Business logic implementation
- API endpoint design and optimization
- Middleware development (auth, validation, logging)
- Error handling and response formatting

**Key Areas:**
- `elscholar-api/src/controllers/` - Business logic
- `elscholar-api/src/routes/` - API endpoints
- `elscholar-api/src/middleware/` - Request processing
- `elscholar-api/src/services/` - Business services

**Commands to Know:**
```bash
cd elscholar-api
npm run dev        # Development with nodemon
npm start          # Production server
npm run build-server # Babel transpilation
```

**Coding Standards:**
- 2-space indentation
- camelCase for functions/variables
- Comprehensive error handling
- Structured JSON responses
- Audit trail logging

---

### 3. **DBA Expert**
**Role:** MySQL Database & Sequelize ORM Specialist

**Responsibilities:**
- Database schema design and optimization
- Stored procedure development and maintenance
- Sequelize model definition and relationships
- Migration script creation
- Query optimization and indexing
- Data integrity and constraint management

**Key Areas:**
- `elscholar-api/src/models/` - Sequelize models
- Stored procedures in MySQL
- Database migrations
- Connection pooling configuration

**Database Standards:**
- snake_case for tables and columns
- Parameterized queries (SQL injection prevention)
- Stored procedures for complex operations
- Connection pool: max 20, min 2
- Slow query threshold: >1000ms

**Critical Notes:**
- Multi-tenant isolation (school_id, branch_id)
- Audit trail requirements for financial data
- Comprehensive logging for all queries

---

### 4. **Finance Expert**
**Role:** Financial Systems & Accounting Specialist

**Responsibilities:**
- Payment processing logic
- Billing and invoicing systems
- Accounting compliance implementation
- Financial reporting and analytics
- Journal entry automation
- Audit trail maintenance

**Key Areas:**
- Payment processing workflows
- `payment_entries` table operations
- `journal_entries` and accounting compliance
- Fee structure management
- Receipt generation

**Financial Workflows:**
1. Bill Generation → Fee structures + custom charges
2. Payment Collection → Transaction logging
3. Accounting Integration → Journal entries
4. Receipt Generation → PDF with audit trail

**Code Path:**
```
PaymentsOrmController.createPayment 
  → payment_entries 
  → journal_entries 
  → accounting_compliance
```

---

### 5. **Security Expert**
**Role:** Authentication, Authorization & Security Specialist

**Responsibilities:**
- JWT authentication implementation
- Role-based access control (RBAC)
- Password security and validation
- Multi-tenant data isolation
- CORS and security middleware
- Audit trail and compliance

**Key Areas:**
- `elscholar-api/src/middleware/auth.js` - Authentication
- Passport.js JWT strategy
- User role management
- Session security

**Security Standards:**
- JWT stateless authentication
- Bcrypt password hashing
- Role levels: admin, teacher, student, parent
- School/branch isolation
- SQL injection prevention via ORM
- Comprehensive input validation

---

### 6. **QA Expert**
**Role:** Quality Assurance & Testing Specialist

**Responsibilities:**
- Test strategy development
- API endpoint testing
- UI component testing
- Integration testing
- Performance testing
- Bug identification and reproduction

**Testing Tools:**
- Manual testing via `PaymentAPITester.tsx`
- Debug routes for database testing
- Browser DevTools for frontend
- Postman/curl for API testing

**Testing Checklist:**
- Authentication flows
- Multi-tenant data isolation
- Financial transaction accuracy
- UI responsiveness
- Error handling
- Performance benchmarks

---

### 7. **DevOps Expert**
**Role:** Deployment, Infrastructure & Performance Specialist

**Responsibilities:**
- Build and deployment configuration
- Environment management
- Performance optimization
- Logging and monitoring setup
- Database connection management
- Server configuration

**Key Areas:**
- Build configurations (Vite, Babel)
- Environment variables
- Logging system (`logs/` directory)
- Connection pooling
- Health check endpoints

**Performance Monitoring:**
- Query logging with slow query detection
- Categorized logs: queries, processes, errors, performance
- Health checks and system monitoring
- Error tracking with stack traces

---

### 8. **Project Manager**
**Role:** Coordination, Planning & Documentation Specialist

**Responsibilities:**
- Feature planning and breakdown
- Task prioritization and tracking
- Documentation maintenance
- Cross-agent coordination
- Progress reporting
- Risk assessment

**Documentation Areas:**
- Architecture documentation
- API documentation
- Setup guides
- Workflow documentation
- Change logs

**Project Standards:**
- Branch: `expirement`
- Descriptive commits
- Feature-specific changes
- Documentation updates with architectural changes

---

### 9. **Academic Systems Expert**
**Role:** Educational Features & Academic Management Specialist

**Responsibilities:**
- Student enrollment systems
- Class and subject management
- Assessment and grading systems
- Virtual classroom features
- Timetable generation
- Academic reporting

**Key Areas:**
- Student enrollment workflows
- Class management
- Assessment systems
- Academic tracking
- Parent communication

**Academic Workflows:**
```
Registration → Validation → Billing Setup → Account Creation
auth/register → StudentController.createStudent → payment_entries → user_accounts
```

---

### 10. **Integration Expert**
**Role:** External Services & API Integration Specialist

**Responsibilities:**
- Third-party API integration
- Cloudinary image upload
- Payment gateway integration
- SMS service integration
- Email/SMTP configuration
- Redis queue management

**External Services:**
- **Required:** MySQL, SMTP
- **Optional:** Redis, Cloudinary, Payment Gateways, SMS Services

**Environment Variables:**
```bash
CLOUDINARY_URL=    # Image uploads
REDIS_URL=         # Queue management
# Payment gateway configs
# SMS service configs
```

---

## 🎯 Agent Collaboration Guidelines

### Multi-Agent Workflows

**Feature Development:**
1. **Project Manager** - Break down feature requirements
2. **Frontend Expert** + **Backend Expert** - Implement UI and API
3. **DBA Expert** - Database schema changes
4. **Security Expert** - Review security implications
5. **QA Expert** - Test implementation
6. **DevOps Expert** - Deploy and monitor

**Bug Fixes:**
1. **QA Expert** - Reproduce and document bug
2. **Relevant Expert** - Implement fix
3. **Security Expert** - Security review (if applicable)
4. **QA Expert** - Verify fix
5. **Project Manager** - Document resolution

**Database Changes:**
1. **DBA Expert** - Schema design
2. **Backend Expert** - ORM model updates
3. **Finance Expert** - Financial impact review (if applicable)
4. **QA Expert** - Test data integrity
5. **DevOps Expert** - Migration deployment

---

## 🔧 Universal Agent Guidelines

### Coding Standards (All Agents)

**Indentation:** 2 spaces (no tabs)

**Naming Conventions:**
- **Files:** camelCase (components), kebab-case (routes/utilities)
- **Functions/Variables:** camelCase with descriptive names
- **Database:** snake_case for tables and columns
- **Constants:** UPPER_SNAKE_CASE

**Critical Syntax Rules:**
- Use `\n` for newlines in strings (NOT literal newlines)
- Use `\"` for escaped quotes (NOT unescaped quotes)
- Always validate string literals for proper escaping
- Example: `let csv = 'Header\n';` NOT `let csv = 'Header\n';`

**Comments:**
- Do NOT add comments unless explicitly requested
- Code should be self-documenting

---

## 📋 Project Context (All Agents)

### System Architecture
```
[Users] → [React UI (Vite)] → [Express API] → [MySQL + Stored Procedures]
            ↓                      ↓
      [Ant Design]          [Sequelize ORM]
            ↓                      ↓
      [Redux Store]         [Audit Logging]
```

### Technology Stack
- **Frontend:** React 18, TypeScript, Ant Design, Redux Toolkit, Vite
- **Backend:** Node.js 18+, Express.js, Sequelize ORM, Passport.js
- **Database:** MySQL 8.0+, Stored Procedures
- **Tools:** Nodemon, ESLint, Babel

### Key Responsibilities
- Student enrollment, billing, academic tracking
- Teacher and staff management with payroll
- Financial management with accounting compliance
- Academic management with virtual classrooms
- Multi-tenant architecture (school/branch isolation)

---

## 🚀 Quick Start Commands

### Backend (elscholar-api)
```bash
npm install          # Install dependencies
npm run dev          # Development server with nodemon
npm start            # Production server
npm run build-server # Babel transpilation
```

### Frontend (elscholar-ui)
```bash
npm install         # Install dependencies
npm start           # Vite dev server (port 3000)
npm run build       # Production build
npm run build:craco # Build with increased memory
```

---

## 🔐 Security Requirements (All Agents)

### Authentication
- JWT stateless tokens
- Passport.js middleware
- Role-based access control

### Data Protection
- SQL injection prevention (Sequelize ORM)
- Input validation and sanitization
- CORS configuration
- Audit trails for financial data

### Multi-Tenant Isolation
- School-level data separation
- Branch-level permissions
- Session security

---

## 📊 Performance Standards (All Agents)

### Database
- Connection pool: max 20, min 2
- Slow query threshold: >1000ms
- Stored procedures for complex operations
- Optimized indexes

### Logging
- Comprehensive categorized logs
- Query logging with performance metrics
- Error tracking with stack traces
- Health check endpoints

---

## 🤝 AI Platform Compatibility

### Anthropic Claude (Primary)
- Optimized for detailed context understanding
- Best for complex multi-step reasoning
- Excellent code generation and refactoring
- Strong security and compliance awareness

### OpenCode (Secondary)
- Optimized for rapid code iteration
- Best for focused code changes
- Excellent file navigation
- Strong debugging capabilities

### Google Gemini (Tertiary)
- Optimized for broad context analysis
- Best for architectural decisions
- Excellent documentation generation
- Strong pattern recognition

---

## 📝 Agent Invocation Examples

### For Claude/Gemini:
```
"Frontend Expert: Add a new student enrollment form component with validation"
"DBA Expert: Create a stored procedure for attendance calculation"
"Finance Expert: Review the payment processing logic for compliance"
"Security Expert: Audit the authentication middleware for vulnerabilities"
```

### For OpenCode:
```
@Frontend-Expert fix the student list pagination
@Backend-Expert optimize the payment query performance
@DBA-Expert add index to payment_entries table
@QA-Expert test the new billing feature
```

---

## 🎓 Domain-Specific Knowledge

### Financial Terms
- **Payment Entry:** Transaction record in `payment_entries`
- **Journal Entry:** Accounting record in `journal_entries`
- **Accounting Compliance:** Audit trail and financial reporting
- **Fee Structure:** Billing template per class/school

### Academic Terms
- **Enrollment:** Student registration process
- **Class:** Academic group/grade level
- **Branch:** School location/campus
- **Assessment:** Test/exam/evaluation
- **Virtual Classroom:** Online learning environment

### Technical Terms
- **Multi-Tenant:** Multiple schools in single database
- **Stored Procedure:** MySQL server-side function
- **ORM:** Object-Relational Mapping (Sequelize)
- **JWT:** JSON Web Token for authentication
- **RBAC:** Role-Based Access Control

---

## 📌 Important Notes

### Branch Information
- **Current Branch:** `expirement`
- **Commit Style:** Descriptive, feature-specific
- **Documentation:** Update with architectural changes

### Environment
- **API Port:** 34567
- **UI Port:** 3000
- **Database:** skcooly_db
- **Node Version:** 18+

### Critical Reminders
1. **No comments** unless requested
2. **Escape sequences** must be correct (`\n` not literal newlines)
3. **Multi-tenant isolation** is mandatory
4. **Audit trails** required for financial operations
5. **Security review** for authentication changes

---

*Last Updated: 2025-12-13*
*Version: 2.0 - Generic Agent Names*
*Compatible with: Claude, OpenCode, Gemini*
