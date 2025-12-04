# Repository Guidelines

## Project Structure & Module Organization

Elite Scholar is organized as a dual-repository system with clear separation of concerns:

- **elscholar-api/**: Node.js/Express backend API with comprehensive logging, authentication, and database management
- **elscholar-ui/**: React/TypeScript frontend with Vite build system and modern UI components
- **src/**: Main application code for both repositories
- **docs/**: Extensive documentation including setup guides, API documentation, and system architecture
- **logs/**: Comprehensive logging system with categorized log files (queries, processes, errors, performance)

## Build, Test, and Development Commands

```bash
# Backend (elscholar-api)
npm install          # Install dependencies
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run build-server # Build with Babel transpilation

# Frontend (elscholar-ui)
npm install         # Install dependencies
npm start          # Start Vite development server (port 3000)
npm run build      # Build for production with Vite
npm run build:craco # Alternative build with increased memory
```

## Coding Style & Naming Conventions

- **Indentation**: 2 spaces (configured in package.json and vite.config.js)
- **File naming**: camelCase for components, kebab-case for routes and utilities
- **Function/variable naming**: camelCase with descriptive names (e.g., `authenticateToken`, `getStudentBillingDetails`)
- **Database naming**: snake_case for tables and columns (e.g., `payment_entries`, `school_id`)
- **Linting**: ESLint configuration with React and TypeScript rules
- **⚠️ IMPORTANT SYNTAX NOTE**: Be extremely careful with escape sequences in code:
  - Use `\n` for actual newlines in strings (not `
` which breaks syntax)
  - Use `\"` for escaped quotes in strings (not `"` which terminates strings prematurely)
  - Always validate string literals for proper escaping before committing
  - Example: `let csv = 'Header\n';` not `let csv = 'Header
';`

## Testing Guidelines

- **Framework**: No specific testing framework detected in current configuration
- **API Testing**: Manual testing tools available in `src/feature-module/management/feescollection/PaymentAPITester.tsx`
- **Database Testing**: Debug routes available for testing database connections and queries
- **Environment**: Separate development and production configurations

## Commit & Pull Request Guidelines

- **Current branch**: Both repositories are on `expirement` branch
- **Commit pattern**: Descriptive commits with feature-specific changes
- **File organization**: Maintain separation between API and UI repositories
- **Documentation**: Update relevant documentation when making architectural changes

---

# Repository Tour

## 🎯 What This Repository Does

Elite Scholar is a comprehensive school management system designed for educational institutions. It provides a complete solution for managing students, teachers, academic programs, financial operations, and administrative tasks through a modern web-based platform.

**Key responsibilities:**
- Student enrollment, billing, and academic tracking
- Teacher and staff management with payroll integration
- Financial management including payments, accounting, and reporting
- Academic management with virtual classrooms and assessment systems

---

## 🏗️ Architecture Overview

### System Context
```
[Students/Teachers/Admin] → [Elite Scholar UI (React)] → [Elite Scholar API (Node.js)] → [MySQL Database]
                                     ↓                            ↓
                              [Ant Design UI]              [Sequelize ORM]
                                     ↓                            ↓
                              [Redux Store]               [Stored Procedures]
```

### Key Components
- **Authentication Service** - JWT-based authentication with Passport.js, role-based access control
- **Student Management** - Enrollment, billing, academic tracking, and parent communication
- **Financial System** - Payment processing, accounting compliance, financial reporting with audit trails
- **Academic Engine** - Class management, assessments, virtual classrooms, and timetable generation
- **Notification System** - Real-time notifications, support tickets, and communication tools

### Data Flow
1. **User Authentication** - JWT tokens validated through Passport.js middleware
2. **Request Processing** - Express.js routes with comprehensive logging and validation
3. **Database Operations** - Sequelize ORM with MySQL, extensive stored procedure usage
4. **Response Formatting** - Structured JSON responses with error handling and audit trails

---

## 📁 Project Structure [Partial Directory Tree]

```
elite/
├── elscholar-api/                  # Backend Node.js API
│   ├── src/
│   │   ├── controllers/            # Business logic controllers
│   │   ├── models/                 # Sequelize ORM models
│   │   ├── routes/                 # Express.js route definitions
│   │   ├── middleware/             # Authentication, CORS, security middleware
│   │   ├── services/               # Business services and utilities
│   │   ├── logging/                # Comprehensive logging system
│   │   └── config/                 # Database and application configuration
│   ├── logs/                       # Categorized log files (queries, errors, performance)
│   ├── docs/                       # API documentation and setup guides
│   └── package.json                # Dependencies and scripts
├── elscholar-ui/                   # Frontend React application
│   ├── src/
│   │   ├── feature-module/         # Feature-based component organization
│   │   │   ├── academic/           # Academic management components
│   │   │   ├── management/         # Administrative management
│   │   │   ├── auth/               # Authentication components
│   │   │   ├── Utils/              # Shared utilities and helpers
│   │   │   └── router/             # React Router configuration
│   │   ├── redux/                  # Redux Toolkit store configuration
│   │   └── services/               # API services and utilities
│   ├── dist/                       # Vite build output
│   ├── docs/                       # Frontend documentation
│   ├── vite.config.js              # Vite build configuration
│   └── package.json                # Dependencies and scripts
```

### Key Files to Know

| File | Purpose | When You'd Touch It |
|------|---------|---------------------|
| `elscholar-api/src/index.js` | Main API server entry point | Server configuration changes |
| `elscholar-api/src/models/index.js` | Database connection and ORM setup | Database configuration |
| `elscholar-ui/vite.config.js` | Frontend build configuration | Build optimization, proxy setup |
| `elscholar-ui/src/feature-module/router/` | React routing configuration | Adding new routes |
| `elscholar-api/src/middleware/auth.js` | Authentication middleware | Security policy changes |

---

## 🔧 Technology Stack

### Core Technologies
- **Backend Language:** Node.js (v18+) - Chosen for JavaScript ecosystem consistency and npm package availability
- **Backend Framework:** Express.js - Lightweight, flexible web framework with extensive middleware ecosystem
- **Frontend Framework:** React 18 with TypeScript - Modern UI development with type safety
- **Database:** MySQL 8.0+ with Sequelize ORM - Relational database with comprehensive stored procedure support
- **Build Tool:** Vite - Fast development server and optimized production builds

### Key Libraries
- **Sequelize ORM** - Database abstraction with migration support and relationship management
- **Passport.js** - Authentication middleware with JWT strategy implementation
- **Ant Design** - Professional React UI component library for consistent design
- **Redux Toolkit** - State management with modern Redux patterns
- **React Router** - Client-side routing with history API support

### Development Tools
- **Nodemon** - Development server with automatic restart on file changes
- **ESLint** - Code linting with React and TypeScript rules
- **Babel** - JavaScript transpilation for broader browser compatibility

---

## 🌐 External Dependencies

### Required Services
- **MySQL Database** - Primary data storage with stored procedures for complex business logic
- **Redis (Optional)** - Queue management for background processing and caching
- **SMTP Server** - Email notifications and communication features

### Optional Integrations
- **Cloudinary** - Image and file upload management with CDN delivery
- **Payment Gateways** - Financial transaction processing (configurable)
- **SMS Services** - Mobile notifications and alerts

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=skcooly_db
DB_USERNAME=root
DB_PASSWORD=

# Server Configuration
PORT=34567                    # API server port
NODE_ENV=development         # Environment mode

# Authentication
JWT_SECRET=your_jwt_secret   # JWT token signing secret
PASSPORT_SECRET=your_secret  # Passport session secret

# Logging
ENABLE_LOGGING=true          # Enable comprehensive logging
LOG_LEVEL=DEBUG             # Logging verbosity level
ENABLE_DB_LOGGING=true      # Database query logging

# Optional Services
CLOUDINARY_URL=             # Image upload service
REDIS_URL=                  # Queue management
```

---

## 🔄 Common Workflows

### Student Enrollment Workflow
1. **Registration** - Student data entry through admin interface or online forms
2. **Validation** - Data validation and duplicate checking via stored procedures
3. **Billing Setup** - Automatic fee structure assignment based on class and school policies
4. **Account Creation** - User account generation with role-based permissions

**Code path:** `auth/register` → `StudentController.createStudent` → `payment_entries` table → `user_accounts` table

### Payment Processing Workflow
1. **Bill Generation** - Automated billing based on fee structures and custom charges
2. **Payment Collection** - Multiple payment methods with transaction logging
3. **Accounting Integration** - Automatic journal entry creation for financial compliance
4. **Receipt Generation** - PDF receipt generation with audit trail

**Code path:** `PaymentsOrmController.createPayment` → `payment_entries` → `journal_entries` → `accounting_compliance`

---

## 📈 Performance & Scale

### Performance Considerations
- **Database Optimization** - Extensive use of stored procedures for complex operations, optimized indexes
- **Connection Pooling** - Sequelize connection pool (max: 20, min: 2 connections)
- **Query Logging** - Comprehensive SQL query logging with slow query detection (>1000ms threshold)

### Monitoring
- **Comprehensive Logging** - Categorized logs for queries, processes, errors, and performance metrics
- **Health Checks** - Database connectivity monitoring and system health endpoints
- **Error Tracking** - Detailed error logging with stack traces and context information

---

## 🚨 Security Considerations

### 🔒 Authentication & Authorization
- **JWT Authentication** - Stateless token-based authentication with configurable expiration
- **Role-Based Access** - Multi-level permissions (admin, teacher, student, parent) with school/branch isolation
- **Password Security** - Bcrypt hashing with comprehensive password validation and history tracking

### Data Protection
- **SQL Injection Prevention** - Sequelize ORM with parameterized queries and stored procedures
- **CORS Configuration** - Proper cross-origin resource sharing with header injection middleware
- **Input Validation** - Comprehensive request validation and sanitization
- **Audit Trails** - Complete transaction logging for financial compliance and security monitoring

### Multi-Tenant Security
- **School Isolation** - Database-level separation ensuring schools cannot access each other's data
- **Branch-Level Access** - Granular permissions within school hierarchies
- **Session Management** - Secure session handling with automatic cleanup and monitoring

*Updated at: 2024-12-20 UTC*