# Elite Scholar RBAC System - Comprehensive Analysis

> **Document Version:** 1.0  
> **Date:** 2025-12-21  
> **Purpose:** Analysis of current Role-Based Access Control (RBAC) system, identifying gaps, and proposing a robust, scalable solution

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Architecture](#current-system-architecture)
3. [Identified Gaps & Issues](#identified-gaps--issues)
4. [Performance Concerns](#performance-concerns)
5. [Structural Issues](#structural-issues)
6. [Scalability Challenges](#scalability-challenges)
7. [Flexibility & Customization Issues](#flexibility--customization-issues)
8. [Existing Database Tables (Migration Ready)](#existing-database-tables-migration-ready)
9. [Proposed RBAC Architecture](#proposed-rbac-architecture)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Migration Strategy](#migration-strategy)

---

## Executive Summary

The current Elite Scholar RBAC system suffers from **fragmented authorization logic**, **legacy field dependencies**, and **lack of hierarchical permission inheritance**. The system uses a hybrid approach mixing:

- Legacy `users.accessTo` and `users.permissions` string fields
- Newer RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`)
- Hardcoded role checks in middleware and frontend sidebar
- Feature flags on `schools` table for subscription-based access

This creates **inconsistent authorization**, **difficult maintenance**, and **poor scalability** for multi-tenant school management.

### Key Problems

| Area | Current State | Impact |
|------|---------------|--------|
| **Authorization Source** | Multiple sources (users table, roles table, hardcoded) | Inconsistent access control |
| **Staff Roles** | No clear role definitions (cashier, exam_officer, etc.) | Manual permission assignment |
| **Superadmin Control** | Cannot restrict features for schools they onboard | Security risk |
| **Permission Inheritance** | None - flat structure | Repetitive configuration |
| **Frontend Sidebar** | Hardcoded `requiredAccess` and `requiredPermissions` | Inflexible, requires code changes |
| **Multi-tenant Isolation** | Partial - relies on school_id/branch_id in queries | Potential data leakage |

---

## Current System Architecture

### 1. User Types Hierarchy

```
Developer (God Mode - bypasses all checks)
    └── SuperAdmin (Creates schools, manages subscriptions)
            └── Admin (School-level administrator)
                    └── BranchAdmin (Branch-level administrator)
                            ├── Teacher (Academic staff)
                            ├── exam_officer (Examination management)
                            ├── cashier (Finance operations)
                            └── Other Staff Roles (undefined)
                                    ├── Student
                                    └── Parent
```

### 2. Current Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  sidebarData.tsx                                                         │
│  ├── filterByAccessAndPermissions()                                      │
│  │   ├── Checks user_type against requiredAccess[]                      │
│  │   ├── Checks accessTo[] against requiredAccess[]                     │
│  │   └── Checks permissions[] against requiredPermissions[]             │
│  │                                                                       │
│  └── Hardcoded menu items with:                                         │
│      ├── requiredAccess: ["Finance & Account", "admin", "branchadmin"]  │
│      └── requiredPermissions: ["Income Reports", "Fees Setup"]          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  middleware/auth.js                                                      │
│  ├── Decodes JWT token                                                  │
│  ├── Sets req.user with: id, user_type, school_id, branch_id           │
│  └── NO permission validation (allows everything)                       │
│                                                                          │
│  middleware/roleBasedAuth.js                                            │
│  ├── requireRoles(['admin', 'branchadmin'])                             │
│  ├── ROLE_HIERARCHY for level-based checks                              │
│  └── Only checks user_type, NOT granular permissions                    │
│                                                                          │
│  middleware/checkFeatureAccess.js (NEW - partially implemented)         │
│  ├── Checks school subscription package                                 │
│  ├── Checks role_permissions table                                      │
│  └── Checks user_permission_overrides                                   │
│  └── NOT integrated with most routes                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE (MySQL)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  LEGACY TABLES:                                                          │
│  ├── users.accessTo (TEXT) - comma-separated access strings             │
│  ├── users.permissions (TEXT) - comma-separated permission strings      │
│  └── roles.accessTo, roles.permissions (same pattern)                   │
│                                                                          │
│  NEW RBAC TABLES (partially used):                                      │
│  ├── roles (role_id, user_type, description, accessTo, permissions)     │
│  ├── permissions (permission_id, permission_key, permission_name)       │
│  ├── role_permissions (role_id, feature_id, can_view/create/edit/etc)   │
│  ├── user_roles (user_id, role_id, school_id, branch_id)               │
│  ├── features (feature_key, feature_name, category_id)                  │
│  ├── feature_categories (category_name, parent_id)                      │
│  └── user_permission_overrides (user_id, feature_id, override_type)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Current Data Sources for Authorization

| Source | Location | Format | Used By |
|--------|----------|--------|---------|
| `users.accessTo` | users table | Comma-separated string | Legacy frontend |
| `users.permissions` | users table | Comma-separated string | Legacy frontend |
| `roles.accessTo` | roles table | Comma-separated string | schoolAccessController |
| `roles.permissions` | roles table | Comma-separated string | schoolAccessController |
| `user_type` | users table | String enum | Middleware, sidebar |
| `school_setup.*_section` | school_setup table | Boolean flags | Feature availability |
| `role_permissions` | role_permissions table | Granular CRUD flags | checkFeatureAccess (unused) |

---

## Identified Gaps & Issues

### Gap 1: Dual Authorization Systems Running in Parallel

**Problem:** The system maintains both legacy string-based permissions AND new table-based RBAC, causing:

```javascript
// LEGACY: sidebarData.tsx
requiredAccess: ["Finance & Account", "admin", "branchadmin"]
requiredPermissions: ["Income Reports", "Fees Setup"]

// NEW: checkFeatureAccess.js (not integrated)
checkFeatureAccess('FINANCE_INCOME_REPORT', 'view')
```

**Impact:**
- Developers must update BOTH systems when adding features
- Inconsistent behavior between frontend and backend
- No single source of truth

### Gap 2: No Superadmin Feature Restriction

**Problem:** When a superadmin creates a school, they cannot restrict which features that school can access based on their own allowed features.

**Current Flow:**
```
SuperAdmin A (allowed: Finance, Academics)
    └── Creates School X
            └── School X gets ALL features (no inheritance)
```

**Expected Flow:**
```
SuperAdmin A (allowed: Finance, Academics)
    └── Creates School X
            └── School X can ONLY have Finance, Academics (inherited limit)
```

### Gap 3: Undefined Staff Roles

**Problem:** The `teachers` table (used as staff) has `staff_type` and `staff_role` fields but:

```sql
-- Current teachers table
staff_type VARCHAR(30)  -- Values: NULL, 'Teaching', 'Non-Teaching'
staff_role VARCHAR(30)  -- Values: NULL, undefined
user_type VARCHAR(20)   -- Values: 'Teacher' (always)
```

**Missing Role Definitions:**
- `cashier` - Finance operations
- `exam_officer` - Examination management
- `accountant` - Financial reporting
- `librarian` - Library management
- `form_master` - Class management
- `head_of_department` - Department oversight
- `vice_principal` - Administrative duties
- `principal` - School leadership

### Gap 4: No Permission Delegation

**Problem:** Admin/BranchAdmin cannot delegate specific permissions to teachers.

**Current State:**
```
Admin assigns teacher to class
    └── Teacher gets hardcoded "teacher" permissions
    └── No way to grant "exam_officer" permissions to specific teacher
```

**Expected:**
```
Admin assigns teacher to class
    └── Admin can grant additional permissions:
        ├── "Can release exam results"
        ├── "Can view financial reports"
        └── "Can manage attendance for all classes"
```

### Gap 5: Frontend Sidebar Hardcoding

**Problem:** `sidebarData.tsx` has 800+ lines of hardcoded menu items with embedded permission checks.

```typescript
// Current: Hardcoded in sidebarData.tsx
{
  label: "Finance Report",
  link: routes.schoolFinancialDashboard,
  requiredAccess: ["Express Finance"],  // Hardcoded
}

// Expected: Dynamic from database
{
  label: feature.display_name,
  link: feature.route_path,
  requiredAccess: feature.required_access,  // From DB
}
```

### Gap 6: No Audit Trail for Permission Changes

**Problem:** No tracking of who granted/revoked permissions and when.

**Missing:**
- Permission change history
- Approval workflow for sensitive permissions
- Compliance reporting

---

## Performance Concerns

### 1. N+1 Query Problem in Authorization

**Current Implementation:**
```javascript
// checkFeatureAccess.js - 3 separate queries per request
const schoolSubscription = await db.sequelize.query(...);  // Query 1
const rolePermission = await db.sequelize.query(...);      // Query 2
const userOverride = await db.sequelize.query(...);        // Query 3
```

**Impact:** Every protected route makes 3 database queries for authorization.

### 2. No Permission Caching

**Problem:** Permissions are fetched on every request, no caching layer.

**Current:**
```
Request → Decode JWT → Query DB for permissions → Process request
```

**Expected:**
```
Request → Decode JWT → Check Redis cache → (miss) Query DB → Cache → Process
```

### 3. String Parsing Overhead

**Problem:** Legacy `accessTo` and `permissions` fields require string parsing:

```javascript
// schoolAccessController.js
const access = role.accessTo.split(',').map(a => a.trim());
```

**Impact:** CPU overhead on every permission check.

### 4. Missing Database Indexes

**Current indexes on RBAC tables:**
```sql
-- user_roles table
INDEX (user_id)
INDEX (role_id)
INDEX (school_id)
INDEX (branch_id)
UNIQUE (user_id, role_id, school_id, branch_id)

-- MISSING:
INDEX (is_active)  -- For filtering active roles
INDEX (expires_at) -- For expiration checks
```

---

## Structural Issues

### 1. Mixed Responsibility in Models

**Problem:** `Role` model contains both new RBAC fields AND legacy fields:

```javascript
// models/Role.js
const Role = sequelize.define('Role', {
  role_id: { ... },
  user_type: { ... },
  description: { ... },
  accessTo: { ... },      // LEGACY - should be removed
  permissions: { ... },   // LEGACY - should be removed
  school_id: { ... }
});
```

### 2. Inconsistent Naming Conventions

| Table | Primary Key | Naming Style |
|-------|-------------|--------------|
| roles | role_id | snake_case |
| permissions | permission_id | snake_case |
| features | id | generic |
| user_roles | id | generic |
| role_permissions | id | generic |

### 3. Missing Foreign Key Constraints

```sql
-- role_permissions.role_id references roles.id
-- BUT roles table uses role_id as primary key
-- This causes referential integrity issues
```

### 4. No Soft Delete Support

**Problem:** Deleting a role hard-deletes it, losing audit history.

**Expected:** `deleted_at` timestamp for soft deletes.

---

## Scalability Challenges

### 1. Single-Level Role Assignment

**Current:** User has ONE role per school/branch.

**Problem:** Real-world scenarios require multiple roles:
- Teacher + Form Master + Exam Officer
- Admin + Finance Manager

### 2. No Role Templates

**Problem:** Each school must configure roles from scratch.

**Expected:** System-wide role templates that schools can customize:
```
System Template: "Standard Teacher"
    └── School A: Customizes to add "Can view attendance reports"
    └── School B: Uses as-is
```

### 3. No Permission Groups

**Problem:** Permissions are flat, no grouping for bulk assignment.

**Expected:**
```
Permission Group: "Full Finance Access"
    ├── finance.view_reports
    ├── finance.create_invoice
    ├── finance.process_payment
    └── finance.export_data
```

### 4. Branch-Level Permission Complexity

**Current:** `user_roles.branch_id = NULL` means "all branches".

**Problem:** No way to grant different permissions per branch for same user.

---

## Flexibility & Customization Issues

### 1. Cannot Create Custom Roles

**Problem:** Schools cannot create custom roles beyond predefined types.

**Current user_types:**
- Developer, SuperAdmin, Admin, BranchAdmin, Teacher, Student, Parent

**Missing ability to create:**
- "Senior Teacher", "Department Head", "Lab Assistant", etc.

### 2. No Conditional Permissions

**Problem:** Cannot set permissions based on conditions.

**Expected:**
```
Permission: "Can view student grades"
Condition: "Only for students in assigned classes"
```

### 3. No Time-Based Permissions

**Problem:** `user_roles.expires_at` exists but not enforced consistently.

**Expected:**
- Temporary exam officer role during exam period
- Substitute teacher access for specific dates

### 4. No Permission Dependencies

**Problem:** No way to define that Permission A requires Permission B.

**Expected:**
```
"Can approve payments" REQUIRES "Can view payments"
"Can delete students" REQUIRES "Can edit students"
```

---

## Existing Database Tables (Migration Ready)

Based on the codebase analysis, these RBAC tables already exist and can be leveraged:

### Core RBAC Tables

```sql
-- 1. roles
CREATE TABLE roles (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  user_type VARCHAR(50) NOT NULL,
  description TEXT,
  accessTo TEXT,           -- LEGACY: to be deprecated
  permissions TEXT,        -- LEGACY: to be deprecated
  school_id VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 2. permissions
CREATE TABLE permissions (
  permission_id INT PRIMARY KEY AUTO_INCREMENT,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  permission_name VARCHAR(255) NOT NULL,
  description TEXT,
  feature_id INT
);

-- 3. features
CREATE TABLE features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 4. feature_categories
CREATE TABLE feature_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  category_key VARCHAR(50) UNIQUE,
  parent_id INT,
  display_order INT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE
);

-- 5. role_permissions
CREATE TABLE role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  feature_id INT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  can_approve BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY (role_id, feature_id)
);

-- 6. user_roles
CREATE TABLE user_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  school_id VARCHAR(10) NOT NULL,
  branch_id VARCHAR(20),
  assigned_by INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  revoked_by INT,
  revoked_at TIMESTAMP,
  revoke_reason TEXT,
  UNIQUE KEY (user_id, role_id, school_id, branch_id)
);

-- 7. user_permission_overrides
CREATE TABLE user_permission_overrides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  feature_id INT NOT NULL,
  override_type ENUM('grant', 'revoke') NOT NULL,
  granted_by INT,
  expires_at TIMESTAMP,
  reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 8. permission_audit_logs (for tracking)
CREATE TABLE permission_audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_user_id INT,
  target_role_id INT,
  target_permission_id INT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subscription/Package Tables

```sql
-- subscription_packages
CREATE TABLE subscription_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  package_name VARCHAR(100) NOT NULL,
  package_code VARCHAR(50) UNIQUE,
  description TEXT,
  features JSON,  -- Array of feature_keys included
  price_per_student DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE
);

-- rbac_school_packages (school subscriptions)
CREATE TABLE rbac_school_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(10) NOT NULL,
  package_id INT NOT NULL,
  features_override JSON,  -- {feature_key: true/false}
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE
);
```

---

## Proposed RBAC Architecture

### 1. Hierarchical Permission Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GLOBAL LEVEL (Platform)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  • System Features (all possible features)                               │
│  • System Roles (Developer, SuperAdmin templates)                        │
│  • Subscription Packages (feature bundles)                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SUPERADMIN LEVEL                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  • SuperAdmin has assigned features (what they can onboard)              │
│  • Can only grant features they have access to                           │
│  • Creates schools with subset of their features                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SCHOOL LEVEL                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  • School has subscribed features (from package + overrides)             │
│  • School-specific roles (Admin, BranchAdmin, custom roles)              │
│  • Cannot exceed SuperAdmin's allowed features                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BRANCH LEVEL                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  • Branch inherits school features                                       │
│  • Branch-specific role assignments                                      │
│  • Optional branch-level feature restrictions                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER LEVEL                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  • User has role(s) in school/branch context                             │
│  • User-specific permission overrides (grant/revoke)                     │
│  • Effective permissions = Role permissions ± Overrides                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. New Table Structure (Additions)

```sql
-- superadmin_features (what features each superadmin can onboard)
CREATE TABLE superadmin_features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  superadmin_user_id INT NOT NULL,
  feature_id INT NOT NULL,
  granted_by INT,  -- Developer who granted
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY (superadmin_user_id, feature_id)
);

-- staff_roles (predefined staff role types)
CREATE TABLE staff_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_code VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,  -- Cannot be deleted
  default_permissions JSON,  -- Default permission set
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- INSERT predefined staff roles
INSERT INTO staff_roles (role_code, role_name, is_system_role) VALUES
('TEACHER', 'Teacher', TRUE),
('FORM_MASTER', 'Form Master', TRUE),
('EXAM_OFFICER', 'Exam Officer', TRUE),
('CASHIER', 'Cashier', TRUE),
('ACCOUNTANT', 'Accountant', TRUE),
('LIBRARIAN', 'Librarian', TRUE),
('HEAD_OF_DEPT', 'Head of Department', FALSE),
('VICE_PRINCIPAL', 'Vice Principal', FALSE),
('PRINCIPAL', 'Principal', FALSE);

-- staff_role_assignments (assign staff roles to teachers)
CREATE TABLE staff_role_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,  -- teachers.id
  staff_role_id INT NOT NULL,
  school_id VARCHAR(10) NOT NULL,
  branch_id VARCHAR(20),
  assigned_by INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY (staff_id, staff_role_id, school_id, branch_id)
);

-- feature_menu_config (dynamic sidebar configuration)
CREATE TABLE feature_menu_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_id INT NOT NULL,
  parent_menu_id INT,  -- For nested menus
  menu_label VARCHAR(100) NOT NULL,
  menu_icon VARCHAR(50),
  route_path VARCHAR(200),
  display_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (feature_id) REFERENCES features(id)
);
```

### 3. Permission Resolution Algorithm

```
function getEffectivePermissions(user_id, school_id, branch_id):
    
    1. Get school's subscribed features
       features = getSchoolFeatures(school_id)
    
    2. Get user's roles in this school/branch
       roles = getUserRoles(user_id, school_id, branch_id)
    
    3. Get role permissions for subscribed features only
       role_permissions = getRolePermissions(roles, features)
    
    4. Get user-specific overrides
       overrides = getUserOverrides(user_id, features)
    
    5. Calculate effective permissions
       effective = {}
       for feature in features:
           base = role_permissions[feature] or {view: false, ...}
           override = overrides[feature]
           
           if override.type == 'grant':
               effective[feature] = merge(base, override.permissions)
           elif override.type == 'revoke':
               effective[feature] = {view: false, create: false, ...}
           else:
               effective[feature] = base
    
    6. Cache result in Redis (TTL: 5 minutes)
       cache.set(f"perms:{user_id}:{school_id}:{branch_id}", effective)
    
    return effective
```

### 4. Dynamic Sidebar Generation

```typescript
// NEW: Fetch menu from API instead of hardcoded sidebarData.tsx
async function fetchUserMenu(user_id, school_id, branch_id) {
  const response = await api.get('/api/rbac/user-menu', {
    params: { user_id, school_id, branch_id }
  });
  
  return response.data.menu;
  // Returns:
  // [
  //   {
  //     label: "Express Finance",
  //     icon: "ti-coin",
  //     children: [
  //       { label: "Finance Report", link: "/finance/dashboard", permissions: ["view"] },
  //       { label: "School Fees", link: "/finance/fees", permissions: ["view", "create"] }
  //     ]
  //   }
  // ]
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Populate features table** with all system features
2. **Create feature_categories** hierarchy
3. **Define staff_roles** with default permissions
4. **Create superadmin_features** table and seed data
5. **Add indexes** to existing RBAC tables

### Phase 2: Backend Integration (Week 3-4)

1. **Create RBAC service** (`/services/rbacService.js`)
   - `getEffectivePermissions()`
   - `checkPermission()`
   - `invalidateCache()`

2. **Update auth middleware** to use new RBAC service
3. **Create permission caching** with Redis
4. **Add audit logging** for permission changes

### Phase 3: API Endpoints (Week 5-6)

1. **Role Management API**
   - `GET /api/rbac/roles` - List roles
   - `POST /api/rbac/roles` - Create custom role
   - `PUT /api/rbac/roles/:id/permissions` - Update role permissions

2. **User Permission API**
   - `GET /api/rbac/users/:id/permissions` - Get effective permissions
   - `POST /api/rbac/users/:id/overrides` - Add permission override
   - `GET /api/rbac/users/:id/menu` - Get dynamic menu

3. **School Feature API**
   - `GET /api/rbac/schools/:id/features` - Get school features
   - `PUT /api/rbac/schools/:id/features` - Update school features

### Phase 4: Frontend Migration (Week 7-8)

1. **Create PermissionContext** React context
2. **Replace hardcoded sidebarData.tsx** with dynamic menu
3. **Create permission hooks** (`usePermission`, `useFeatureAccess`)
4. **Update all protected routes** to use new permission system

### Phase 5: Migration & Cleanup (Week 9-10)

1. **Migrate existing permissions** from legacy fields
2. **Remove legacy fields** (`users.accessTo`, `users.permissions`)
3. **Update all controllers** to use new RBAC
4. **Comprehensive testing**

---

## Migration Strategy

### Step 1: Data Migration Script

```sql
-- Migrate legacy permissions to new structure
INSERT INTO user_roles (user_id, role_id, school_id, branch_id, assigned_at)
SELECT 
  u.id,
  r.role_id,
  u.school_id,
  u.branch_id,
  NOW()
FROM users u
JOIN roles r ON r.user_type = u.user_type AND r.school_id = u.school_id
WHERE u.user_type NOT IN ('student', 'parent');
```

### Step 2: Parallel Running Period

- Keep legacy fields populated during transition
- New system reads from new tables
- Sync service keeps both in sync
- Monitor for discrepancies

### Step 3: Deprecation

- Remove legacy field writes
- Remove legacy field reads
- Drop legacy columns

---

## Conclusion

The current RBAC system requires significant restructuring to meet enterprise-grade requirements. The proposed architecture provides:

✅ **Hierarchical permission inheritance** (Platform → SuperAdmin → School → Branch → User)  
✅ **Granular staff roles** (cashier, exam_officer, etc.)  
✅ **SuperAdmin feature restrictions** (can only onboard features they have)  
✅ **Dynamic sidebar generation** (no hardcoding)  
✅ **Permission caching** (Redis-based)  
✅ **Audit trail** (all changes logged)  
✅ **Multi-tenant isolation** (school/branch context)  
✅ **Scalable architecture** (supports custom roles, permission groups)

The existing database tables provide a solid foundation, requiring primarily:
1. New tables for superadmin features and staff roles
2. Service layer for permission resolution
3. Frontend migration to dynamic menu
4. Deprecation of legacy string-based permissions

---

*Document prepared for Elite Scholar RBAC System Upgrade Project*
