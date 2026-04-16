# RBAC API Testing Guide
**Date:** December 7, 2025  
**API Base URL:** http://localhost:34567

## Table of Contents
1. [Authentication](#authentication)
2. [Developer APIs](#developer-apis)
3. [SuperAdmin APIs](#superadmin-apis)
4. [Package Management](#package-management)
5. [Test Scripts](#test-scripts)

---

## Authentication

### Login Endpoint
```bash
POST /users/login
Content-Type: application/json

{
  "username": "Elite Developer",
  "password": "123456",
  "school_id": "SCH/1"
}

Response:
{
  "success": true,
  "token": "Bearer eyJhbGc...",
  "user": { ... }
}
```

**Note:** All subsequent requests require `Authorization: Bearer <token>` header

---

## Developer APIs

### 1. Get All SuperAdmins
```bash
GET /api/rbac/developer/super-admins
Authorization: Bearer <developer_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1030,
      "name": "Test SuperAdmin",
      "email": "superadmin@example.com",
      "allowed_features": null,
      "status": "Active"
    }
  ]
}
```

### 2. Create SuperAdmin
```bash
POST /api/rbac/developer/create-superadmin
Authorization: Bearer <developer_token>
Content-Type: application/json

{
  "name": "New SuperAdmin",
  "email": "newadmin@example.com",
  "password": "secure_password"
}

Response:
{
  "success": true,
  "message": "SuperAdmin created successfully"
}
```

**Implementation Details:**
- Password is hashed with bcrypt (10 rounds)
- User created with user_type: 'SuperAdmin'
- Status set to 'Active'
- School_id set to 'SCH/1' by default
- Username set to email

### 3. Update SuperAdmin Permissions
```bash
POST /api/rbac/developer/update-superadmin-permissions
Authorization: Bearer <developer_token>
Content-Type: application/json

{
  "superadmin_id": 1030,
  "allowed_features": ["student_management", "attendance", "financial_management"]
}

Response:
{
  "success": true,
  "message": "Permissions updated successfully"
}
```

---

## SuperAdmin APIs

### 1. Get Schools with Subscriptions
```bash
GET /api/rbac/super-admin/schools-subscriptions
Authorization: Bearer <superadmin_token>

Response:
{
  "success": true,
  "data": [
    {
      "school_id": "SCH/1",
      "school_name": "ABC ACADEMY",
      "package_name": "elite",
      "package_display_name": "Elite Package",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "is_active": 1
    }
  ]
}
```

**Access Control:**
- **SuperAdmin:** Only sees schools where `created_by = their_user_id`
- **Developer:** Sees ALL schools in the system

### 2. Get All Packages
```bash
GET /api/rbac/super-admin/packages
Authorization: Bearer <superadmin_or_developer_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "package_name": "standard",
      "display_name": "Standard Package",
      "price_monthly": 500.00,
      "features": ["student_management", "attendance", "basic_reports"],
      "is_active": true
    }
  ]
}
```

### 3. Get All Features
```bash
GET /api/rbac/super-admin/all-features
Authorization: Bearer <superadmin_or_developer_token>

Response:
{
  "success": true,
  "data": [
    {
      "feature_code": "student_management",
      "feature_name": "Student Management",
      "category": "Core",
      "display_order": 1
    }
  ]
}
```

### 4. Assign Package to School
```bash
POST /api/rbac/super-admin/assign-package
Authorization: Bearer <superadmin_or_developer_token>
Content-Type: application/json

{
  "school_id": "SCH/1",
  "package_id": 1,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31"
}

Response:
{
  "success": true,
  "message": "Package assigned successfully"
}
```

**Access Control:**
- **SuperAdmin:** Can only assign packages to schools they created
- **Developer:** Can assign packages to ANY school

**Implementation:**
- Uses `ON DUPLICATE KEY UPDATE` for upsert behavior
- Only one active package per school (enforced by UNIQUE constraint)
- Sets `created_by` to current user ID

### 5. Get School Feature Overrides
```bash
GET /api/rbac/super-admin/school-overrides/:school_id
Authorization: Bearer <superadmin_or_developer_token>

Response:
{
  "success": true,
  "data": {
    "financial_management": false,
    "sms_notifications": true
  }
}
```

### 6. Toggle Feature for School
```bash
POST /api/rbac/super-admin/toggle-feature
Authorization: Bearer <superadmin_or_developer_token>
Content-Type: application/json

{
  "school_id": "SCH/1",
  "feature_code": "financial_management",
  "enabled": false
}

Response:
{
  "success": true,
  "message": "Feature toggled successfully"
}
```

**Use Case:** Temporarily disable/enable specific features for a school without changing their package

---

## Package Management

### Available Packages

#### 1. Standard Package (NGN 500/student/term)
```json
{
  "id": 1,
  "features": [
    "student_management",
    "attendance",
    "basic_reports"
  ]
}
```

#### 2. Premium Package (NGN 700/student/term)
```json
{
  "id": 2,
  "features": [
    "student_management",
    "attendance",
    "basic_reports",
    "financial_management",
    "sms_notifications"
  ]
}
```

#### 3. Elite Package (NGN 1,000/student/term)
```json
{
  "id": 3,
  "features": [
    "student_management",
    "attendance",
    "basic_reports",
    "financial_management",
    "sms_notifications",
    "advanced_analytics",
    "parent_portal",
    "teacher_portal"
  ]
}
```

---

## Test Scripts

### Test 1: Complete RBAC Flow
**File:** `TEST_RBAC_COMPLETE_FLOW.sh`

**What it tests:**
1. Developer login
2. Create SuperAdmin
3. SuperAdmin login
4. School creation (blocked by validation)
5. RBAC filtering (SuperAdmin vs Developer access)

**Run:**
```bash
./TEST_RBAC_COMPLETE_FLOW.sh
```

**Expected Results:**
- ✅ Developer login successful
- ✅ SuperAdmin created
- ✅ SuperAdmin login successful
- ✅ Developer sees all schools
- ✅ SuperAdmin sees only their schools

---

### Test 2: Package Subscription
**File:** `TEST_PACKAGE_SUBSCRIPTION.sh`

**What it tests:**
1. Developer login
2. Assign Standard package to SCH/1
3. Assign Premium package to SCH/10
4. Assign Elite package to SCH/11
5. View schools with packages

**Run:**
```bash
./TEST_PACKAGE_SUBSCRIPTION.sh
```

**Expected Results:**
- ✅ All packages assigned successfully
- ✅ Schools show correct package information
- ✅ Package features are active

---

## Database Schema

### subscription_packages
```sql
CREATE TABLE subscription_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  package_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2),
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### rbac_school_packages
```sql
CREATE TABLE rbac_school_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(10) NOT NULL,
  package_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  features_override JSON,
  created_by INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_active_school (school_id, is_active),
  FOREIGN KEY (package_id) REFERENCES subscription_packages(id)
);
```

### features
```sql
CREATE TABLE features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

---

## Authentication Middleware Changes

**File:** `/elscholar-api/src/middleware/auth.js`

**Key Changes:**
```javascript
// Now decodes JWT tokens and extracts user_type
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        user_type: decoded.user_type,
        school_id: decoded.school_id,
        branch_id: decoded.branch_id,
        // ...
      };
      return next();
    } catch (err) {
      // Falls back to header-based auth
    }
  }
  // Header-based fallback...
};
```

**Why this matters:**
- Previous implementation only read from headers
- JWT tokens were not being decoded
- `req.user.user_type` was always undefined
- RBAC endpoints couldn't verify user roles

---

## Error Handling

### Common Errors

#### 1. Developer access only
```json
{
  "success": false,
  "error": "Developer access only"
}
```
**Cause:** Endpoint requires Developer role but user is not Developer

#### 2. Super admin or Developer only
```json
{
  "success": false,
  "error": "Super admin or Developer only"
}
```
**Cause:** Endpoint requires SuperAdmin or Developer role

#### 3. Access denied to this school
```json
{
  "success": false,
  "error": "Access denied to this school"
}
```
**Cause:** SuperAdmin trying to access school they didn't create

---

## Testing Checklist

### Developer APIs
- [x] Login as Developer
- [x] Create SuperAdmin
- [x] Get all SuperAdmins
- [x] Update SuperAdmin permissions
- [x] View all schools (no filtering)
- [x] Assign packages to any school

### SuperAdmin APIs
- [x] Login as SuperAdmin
- [x] View only created schools (filtered)
- [x] Assign packages to own schools only
- [x] Get school overrides
- [x] Toggle features for own schools

### Package Management
- [x] Assign Standard package
- [x] Assign Premium package
- [x] Assign Elite package
- [x] View schools with packages
- [x] Verify package features

---

## Production Deployment

### Migration Steps
1. Run `RBAC_MINIMAL_MIGRATION.sql`
2. Verify tables created
3. Update Developer user in database
4. Deploy updated auth middleware
5. Deploy RBAC routes
6. Test all endpoints

### Verification Queries
```sql
-- Check packages
SELECT * FROM subscription_packages;

-- Check school packages
SELECT * FROM rbac_school_packages;

-- Check features
SELECT * FROM features;

-- Check Developer user
SELECT id, name, email, user_type FROM users WHERE user_type = 'Developer';
```

---

## Support

For issues or questions:
1. Check `RBAC_TEST_RESULTS.md` for test outcomes
2. Check `PACKAGE_SUBSCRIPTION_RESULTS.md` for package details
3. Review API logs in `/elscholar-api/logs/`
