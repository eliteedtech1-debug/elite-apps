# Elite Scholar System Documentation

## System Overview

Elite Scholar is a comprehensive school management system with a modern architecture featuring:
- **Frontend**: React/TypeScript application with Vite build system
- **Backend**: Node.js/Express API with MySQL database
- **Key Features**: Student management, academic administration, accounting/finance, HR management, and more

## Architecture

### Backend (elscholar-api)

The backend is built with Node.js and Express, featuring:

1. **Core Technologies**:
   - Express.js framework
   - MySQL database with Sequelize ORM
   - JWT-based authentication
   - Redis for queue management
   - BullMQ for background job processing
   - Database: skcooly_db (root user with empty password)

2. **Security Features**:
   - Helmet.js for HTTP security headers
   - CORS configuration with branch context support
   - Rate limiting for API endpoints
   - Input validation and sanitization
   - SQL injection prevention through ORM
   - Password hashing with bcrypt

3. **Key API Modules**:
   - User management and authentication
   - Student admission and management
   - Academic administration (classes, subjects, exams)
   - Financial/accounting system with comprehensive chart of accounts
   - HR/payroll management
   - Attendance tracking
   - Communication systems (email, SMS)

4. **Accounting System**:
   - GAAP-compliant chart of accounts
   - Double-entry bookkeeping
   - Revenue recognition for different charge types
   - Standard account codes and categories
   - Journal entries with automatic balancing
   - Stored procedures for complex financial operations (in process of migration to ORM)

### Frontend (elscholar-ui)

The frontend is a React/TypeScript application with:

1. **Core Technologies**:
   - React 18 with TypeScript
   - Vite build system
   - Ant Design component library
   - Redux for state management
   - React Router for navigation

2. **UI Components**:
   - Responsive layout with header and sidebar
   - Feature-based module organization
   - Component-based architecture
   - Theme support (light/dark mode)

3. **Key Feature Modules**:
   - Academic management (classes, subjects, exams)
   - Accounting and financial reporting
   - Student management
   - Staff/HR management
   - Administrative dashboards
   - Reporting and analytics

## Key Features

### 1. Authentication & Authorization
- JWT-based authentication system
- Role-based access control (admin, teacher, student, parent)
- Email verification for account security
- Password change and security settings

### 2. Student Management
- Student admission and registration
- Student profiles with personal and academic information
- Class assignment and management
- Academic records and reporting

### 3. Academic Administration
- Class management (creation, scheduling)
- Subject management
- Examination system with grade management
- Lesson planning and time tables
- Attendance tracking

### 4. Financial/Accounting System
- Comprehensive chart of accounts (GAAP-compliant)
- Student billing and fee management
- Revenue recognition for different charge types
- Double-entry bookkeeping with journal entries
- Financial reporting and dashboards
- Payment processing and tracking
- ORM-based transaction processing (migrating from stored procedures)

#### Current State and Migration Plan
The financial system currently uses a mix of Sequelize ORM and stored procedures for complex operations. As part of our ongoing improvement efforts, we are migrating all stored procedure implementations to pure ORM-based approaches to improve code clarity, maintainability, and testability. This migration will:
- Eliminate database-specific logic from the application
- Improve code readability and reduce complexity
- Enhance security through parameterized queries
- Enable better unit testing of database operations
- Facilitate future database migrations or upgrades

### 5. HR & Payroll
- Staff management
- Payroll processing
- Leave management
- Performance evaluation

### 6. Communication
- Email notifications
- SMS messaging (Twilio integration)
- Announcement system

## API Architecture

### RESTful Endpoints
The API follows REST principles with organized endpoints:

1. **User Management**: `/users/*`
2. **Student Management**: Various routes for admission, profiles, etc.
3. **Academic Management**: `/academic/*`, `/examinations/*`
4. **Financial/Accounting**: `/api/accounting/*`, `/payments/*`
5. **HR Management**: `/hrm/*`, `/payroll/*`

### Security Implementation
- All endpoints require authentication (except specific public endpoints)
- Role-based access control
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure headers with Helmet.js
- CORS configuration with branch context support

### Stored Procedure Migration
The API is currently transitioning from stored procedure-based implementations to pure ORM-based approaches. This migration affects several key areas:
1. **Financial Operations**: Complex accounting transactions are being refactored to use Sequelize ORM
2. **Reporting Queries**: Database-intensive reports are being reimplemented with ORM query builders
3. **Data Aggregation**: Stored procedures that aggregate data across multiple tables are being replaced with ORM-based solutions

The migration is being performed gradually to ensure system stability and data consistency. Both stored procedure and ORM implementations currently coexist, with new features being developed exclusively with ORM.

## Database Design

### Key Tables
1. **Users**: Authentication and user profiles
2. **Students**: Student information and academic records
3. **Teachers**: Staff information
4. **Classes**: Academic class structure
5. **Subjects**: Academic subjects
6. **Payments**: Financial transactions
7. **Chart of Accounts**: Accounting structure
8. **Journal Entries**: Financial transaction records

### Database Configuration
- **Database Name**: skcooly_db
- **Username**: root
- **Password**: (empty string)
- **Host**: localhost (default)
- **Port**: 3306 (default MySQL port)

Qwen AI has been granted read access to the database for observation purposes, allowing direct analysis of the live data structure and content rather than relying solely on SQL dump files. This access enables more accurate understanding of the actual database schema, relationships, and data patterns as they exist in the production environment.

### Accounting Structure
The system implements a GAAP-compliant chart of accounts with:
- Standard account codes (4-digit)
- Account types (Asset, Liability, Equity, Revenue, Expense)
- Account categories (Current Asset, Operating Revenue, etc.)
- Normal balance rules (Debit/Credit)

## Frontend Architecture

### Module Organization
1. **Academic**: All academic-related features
2. **Accounting**: Financial and accounting features
3. **HRM**: Human resource management
4. **Management**: Administrative features
5. **Reporting**: Analytics and reports
6. **Settings**: System configuration

### State Management
- Redux with Redux Toolkit
- Feature-based state slices
- Async thunks for API interactions
- Middleware for side effects

### Routing
- React Router v6 with nested routes
- Protected routes with authentication
- Role-based route access
- Dynamic route loading

## Deployment & Infrastructure

### Environment Configuration
- Environment-specific configuration files
- Dotenv for environment variables
- Separate configurations for development, staging, and production

### Frontend Environment Files (.env)
The frontend uses different environment configuration files for various deployment scenarios:

1. **Development Environment** (`.env.development` and `.env`)
   - Used for local development
   - Points to localhost API endpoints
   - Enables development features and debugging
   - Uses development branding (SKCOOLY DEV)

2. **SKCOOLY PLUS Environment** (`.env.skcoolyplus`)
   - Production configuration for skcoolyplus.org.ng domain
   - Connects to production API endpoints
   - Enables PWA and offline features
   - Uses SKCOOLY PLUS branding

3. **ELITE SCHOLAR Environment** (`.env.elitescholar`)
   - Production configuration for elitescholar.ng domain
   - Connects to production API endpoints
   - Enables PWA and offline features
   - Uses ELITE SCHOLAR branding with different color scheme

### Build Process
- Vite for frontend builds
- Babel for JavaScript transpilation
- ESLint for code quality
- TypeScript compilation

### Security Considerations
1. **Frontend**:
   - Input validation and sanitization
   - Secure HTTP headers
   - Content Security Policy
   - Protection against XSS and CSRF

2. **Backend**:
   - SQL injection prevention through ORM
   - Input validation and sanitization
   - Authentication and authorization
   - Rate limiting
   - Secure error handling
   - Audit logging

## Development Practices

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Unit testing (Jest)
- Integration testing

### Version Control
- Git for version control
- Feature branching strategy
- Pull requests for code review
- Continuous integration setup

### Documentation
- Inline code documentation
- API documentation
- User guides
- Technical specifications

## Key Security Features

### API Security
- JWT token authentication
- Role-based access control
- Rate limiting to prevent abuse
- Input validation and sanitization
- SQL injection prevention through ORM
- Secure error handling without information disclosure

### Frontend Security
- Secure HTTP headers
- Content Security Policy
- Input validation and sanitization
- Protection against XSS and CSRF
- Secure authentication flow

### Data Security
- Password hashing with bcrypt
- Encrypted communication (HTTPS)
- Database access controls
- Regular security audits
- Data backup and recovery procedures

## Compliance & Standards

### Accounting Standards
- GAAP-compliant chart of accounts
- Double-entry bookkeeping
- Revenue recognition principles
- Financial reporting standards

### Data Privacy
- GDPR compliance considerations
- Data encryption at rest and in transit
- User consent management
- Data retention policies

## Performance Optimization

### Frontend
- Code splitting and lazy loading
- Bundle optimization
- Caching strategies
- Progressive Web App (PWA) features

### Backend
- Database query optimization
- Caching with Redis
- Background job processing
- Connection pooling
- API response caching

## Monitoring & Logging

### Application Monitoring
- Error tracking and reporting
- Performance monitoring
- User activity logging
- System health checks

### Database Monitoring
- Query performance monitoring
- Connection pool monitoring
- Database backup verification
- Storage capacity monitoring

## Future Enhancements

### Planned Features
- Enhanced analytics and reporting
- Mobile application development
- Advanced integration capabilities
- AI-powered insights and recommendations
- Multi-tenancy improvements
- Enhanced security features

### Technical Improvements
- **ORM Migration**: Replace stored procedures with ORM-based implementation for clearer, more maintainable codebase
- Microservices architecture
- GraphQL API implementation
- Real-time data synchronization
- Advanced caching strategies
- Containerization with Docker
- CI/CD pipeline improvements

### ORM Migration Plan

#### Current State
The system currently uses a mix of:
- Sequelize ORM for some operations
- Stored procedures for complex financial operations
- Direct SQL queries in some cases

#### Migration Goals
1. **Eliminate Stored Procedures**: Replace all stored procedures with ORM-based implementations
2. **Code Clarity**: Create a consistent, readable codebase that's easier to maintain
3. **Security Improvements**: Reduce SQL injection risks through parameterized queries
4. **Testability**: Enable better unit testing of database operations
5. **Portability**: Reduce database vendor lock-in

#### Migration Strategy
1. **Phase 1: Assessment**
   - Catalog all existing stored procedures
   - Identify dependencies and usage patterns
   - Prioritize procedures based on complexity and usage frequency

2. **Phase 2: Implementation**
   - Replace simple procedures first
   - Implement complex operations using ORM with proper transaction management
   - Maintain backward compatibility during transition

3. **Phase 3: Testing**
   - Comprehensive testing of ORM implementations
   - Performance benchmarking against stored procedure equivalents
   - Data consistency verification

4. **Phase 4: Deployment**
   - Gradual rollout with monitoring
   - Rollback procedures in case of issues
   - Performance monitoring post-deployment

#### Benefits of ORM Migration
- **Improved Maintainability**: ORM code is more readable and easier to modify
- **Enhanced Security**: Built-in protection against SQL injection
- **Better Testing**: ORM operations can be easily mocked for unit tests
- **Database Portability**: Reduced dependency on specific database features
- **Type Safety**: Better integration with TypeScript type checking
- **Development Speed**: Faster implementation of new features

## Troubleshooting Guide

### Common Issues
1. **Authentication Problems**:
   - Token expiration
   - Role permission issues
   - Session management

2. **Database Issues**:
   - Connection timeouts
   - Query performance
   - Data consistency

3. **API Issues**:
   - Rate limiting
   - CORS configuration
   - Response time optimization

### Debugging Tools
- Application logs
- Database query logs
- Network traffic analysis
- Performance profiling

## Conclusion

The Elite Scholar system is a robust, secure, and scalable school management solution that implements industry best practices for both frontend and backend development. Its modular architecture allows for easy maintenance and extension, while its comprehensive security measures ensure data protection and regulatory compliance.