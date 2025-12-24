# Phase 1: Database Schema - DBA Expert Tasks

> **Agent:** DBA Expert
> **Estimated Duration:** 3-4 days
> **Dependencies:** None (First Phase)
> **Principle:** Utilize existing tables, alter as needed, only create truly new tables

---

## Existing Tables Inventory

**Review these tables FIRST before any changes:**

| Table | Exists? | Action Required |
|-------|---------|-----------------|
| `roles` | ✅ Yes | ALTER - add role_code, is_system_role |
| `permissions` | ✅ Yes | Use as-is, populate data |
| `role_permissions` | ✅ Yes | Use as-is |
| `user_roles` | ✅ Yes | ALTER - add audit columns if missing |
| `features` | ✅ Yes | ALTER - add menu columns |
| `feature_categories` | ✅ Yes | Use as-is, populate data |
| `user_permission_overrides` | ✅ Yes | Use as-is |
| `permission_audit_logs` | ✅ Yes | Use as-is |
| `teachers` | ✅ Yes | ALTER - add staff_role column |
| `superadmin_features` | ❌ No | CREATE NEW |
| `staff_role_definitions` | ❌ No | CREATE NEW |

---

## Task 1.1: Alter Existing Tables

```sql
-- 1. ALTER roles table - add columns if missing
ALTER TABLE roles 
  ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) AFTER role_id,
  ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS default_permissions JSON,
  ADD UNIQUE INDEX IF NOT EXISTS idx_role_code (role_code);

-- 2. ALTER teachers table - add staff role support
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50) DEFAULT NULL 
    COMMENT 'cashier, exam_officer, form_master, accountant, librarian, etc.',
  ADD INDEX IF NOT EXISTS idx_staff_role (staff_role);

-- 3. ALTER features table - add menu config columns for dynamic sidebar
ALTER TABLE features
  ADD COLUMN IF NOT EXISTS parent_feature_id INT NULL,
  ADD COLUMN IF NOT EXISTS menu_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS menu_label_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS menu_icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS route_path VARCHAR(200),
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_menu_item BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS required_user_types JSON COMMENT '["admin","branchadmin","teacher"]',
  ADD INDEX IF NOT EXISTS idx_parent (parent_feature_id),
  ADD INDEX IF NOT EXISTS idx_display_order (display_order);

-- 4. ALTER user_roles - ensure audit columns exist
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS assigned_by INT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS revoked_by INT NULL,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT NULL,
  ADD INDEX IF NOT EXISTS idx_active_expires (is_active, expires_at);
```

---

## Task 1.2: Create NEW Tables (Only What Doesn't Exist)

```sql
-- 1. superadmin_features (NEW - controls what features superadmins can onboard to schools)
CREATE TABLE IF NOT EXISTS superadmin_features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  superadmin_user_id INT NOT NULL,
  feature_id INT NOT NULL,
  granted_by INT COMMENT 'Developer who granted this feature access',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uk_superadmin_feature (superadmin_user_id, feature_id),
  INDEX idx_superadmin (superadmin_user_id),
  FOREIGN KEY (superadmin_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- 2. staff_role_definitions (NEW - predefined staff role types like cashier, exam_officer)
-- Note: This is DIFFERENT from 'roles' table - these define what staff_role values mean
CREATE TABLE IF NOT EXISTS staff_role_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'CASHIER, EXAM_OFFICER, FORM_MASTER, etc.',
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE COMMENT 'System roles cannot be deleted',
  default_feature_access JSON COMMENT 'Array of feature_keys this role grants access to',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Task 1.3: Seed Staff Role Definitions

```sql
INSERT INTO staff_role_definitions (role_code, role_name, description, is_system_role, default_feature_access) VALUES
('TEACHER', 'Teacher', 'Regular teaching staff', TRUE, 
  '["DASHBOARD", "CLASS_TIMETABLE", "LESSONS", "ASSIGNMENTS", "SCORE_ENTRY", "ATTENDANCE"]'),
('FORM_MASTER', 'Form Master', 'Class form master/teacher', TRUE, 
  '["DASHBOARD", "CLASS_TIMETABLE", "LESSONS", "ASSIGNMENTS", "SCORE_ENTRY", "ATTENDANCE", "FORMMASTER_REVIEW", "STUDENTS_LIST"]'),
('EXAM_OFFICER', 'Exam Officer', 'Examination management', TRUE, 
  '["DASHBOARD", "SCORE_ENTRY", "FORMMASTER_REVIEW", "REPORTS_GENERATOR", "BROAD_SHEET", "EXAM_ANALYTICS", "CA_SETUP"]'),
('CASHIER', 'Cashier', 'Finance/payment collection', TRUE, 
  '["DASHBOARD", "COLLECT_FEES", "INCOME_REPORTS"]'),
('ACCOUNTANT', 'Accountant', 'Financial reporting and management', TRUE, 
  '["DASHBOARD", "FINANCE_DASHBOARD", "FEES_SETUP", "COLLECT_FEES", "INCOME_REPORTS", "EXPENSE_REPORTS", "PAYROLL"]'),
('LIBRARIAN', 'Librarian', 'Library management', FALSE, 
  '["DASHBOARD", "LIBRARY"]'),
('HEAD_OF_DEPT', 'Head of Department', 'Department oversight', FALSE, 
  '["DASHBOARD", "SCORE_ENTRY", "BROAD_SHEET", "EXAM_ANALYTICS"]'),
('VICE_PRINCIPAL', 'Vice Principal', 'Administrative duties', FALSE, 
  '["DASHBOARD", "STUDENTS_LIST", "STAFF_LIST", "REPORTS_GENERATOR", "BROAD_SHEET", "EXAM_ANALYTICS"]'),
('PRINCIPAL', 'Principal', 'School leadership', FALSE, 
  '["DASHBOARD", "STUDENTS_LIST", "STAFF_LIST", "REPORTS_GENERATOR", "BROAD_SHEET", "EXAM_ANALYTICS", "FINANCE_DASHBOARD"]')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), default_feature_access = VALUES(default_feature_access);
```

---

## Task 1.4: Populate Features Table (Dynamic Sidebar Data)

```sql
-- First, ensure feature_categories exist
INSERT INTO feature_categories (category_name, category_key, display_order, icon, is_active) VALUES
('Main', 'MAIN', 1, 'ti-layout-dashboard', TRUE),
('Personal Data Manager', 'PERSONAL_DATA', 2, 'ti-users', TRUE),
('Class Management', 'CLASS_MGMT', 3, 'ti-school', TRUE),
('Exams & Records', 'EXAMS', 4, 'ti-certificate', TRUE),
('Express Finance', 'FINANCE', 5, 'ti-coin', TRUE),
('General Setups', 'SETUP', 6, 'ti-settings', TRUE),
('Super Admin', 'SUPERADMIN', 7, 'ti-shield', TRUE)
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

-- Populate features with menu configuration
INSERT INTO features (feature_key, feature_name, category_id, menu_label, menu_icon, route_path, display_order, is_active, required_user_types) VALUES
-- Dashboard
('DASHBOARD', 'Dashboard', 1, 'Dashboard', 'ti-layout-dashboard', '/admin-dashboard', 1, TRUE, '["admin","branchadmin","teacher","superadmin"]'),
-- Personal Data Manager
('STUDENTS_LIST', 'Students List', 2, 'Students List', 'ti-school', '/students/student-list', 1, TRUE, '["admin","branchadmin"]'),
('STAFF_LIST', 'Staff List', 2, 'Staff List', 'ti-users', '/teachers/teacher-list', 2, TRUE, '["admin","branchadmin"]'),
('PARENTS_LIST', 'Parents List', 2, 'Parent List', 'ti-user-bolt', '/parents/parent-list', 3, TRUE, '["admin","branchadmin"]'),
('ATTENDANCE', 'Attendance', 2, 'Student Attendance', 'ti-calendar-check', '/attendance/register', 4, TRUE, '["admin","branchadmin","teacher"]'),
-- Examinations
('SCORE_ENTRY', 'Score Entry', 4, 'Assessment Form', 'fa-clipboard-list', '/academic/ca-assessment-system', 1, TRUE, '["admin","branchadmin","teacher","exam_officer"]'),
('FORMMASTER_REVIEW', 'FormMaster Review', 4, 'FormMaster Review', 'fa-clipboard-list', '/academic/formmaster-scoresheet', 2, TRUE, '["admin","branchadmin","teacher","exam_officer"]'),
('REPORTS_GENERATOR', 'Reports Generator', 4, 'Reports Generator', 'fa-file-alt', '/academic/reports/Exam', 3, TRUE, '["admin","branchadmin","exam_officer"]'),
('BROAD_SHEET', 'Broad Sheet', 4, 'Broad Sheet', 'fa-table', '/academic/broad-sheet', 4, TRUE, '["admin","branchadmin","teacher","exam_officer"]'),
('EXAM_ANALYTICS', 'Exam Analytics', 4, 'Exam Analytics', 'fa-chart-bar', '/academic/exam-analytics', 5, TRUE, '["admin","branchadmin","exam_officer"]'),
-- Finance
('FINANCE_DASHBOARD', 'Finance Dashboard', 5, 'Finance Report', 'ti-chart-bar', '/finance/dashboard', 1, TRUE, '["admin","branchadmin","cashier","accountant"]'),
('FEES_SETUP', 'Fees Setup', 5, 'Fees Setup', 'ti-settings', '/finance/fees-setup', 2, TRUE, '["admin","branchadmin","accountant"]'),
('COLLECT_FEES', 'Collect Fees', 5, 'Single Billing', 'ti-receipt', '/finance/collect-fees', 3, TRUE, '["admin","branchadmin","cashier","accountant"]'),
('INCOME_REPORTS', 'Income Reports', 5, 'Income Reports', 'ti-arrow-up', '/finance/income-report', 4, TRUE, '["admin","branchadmin","accountant"]'),
('EXPENSE_REPORTS', 'Expense Reports', 5, 'Expenses Reports', 'ti-arrow-down', '/finance/expenses-report', 5, TRUE, '["admin","branchadmin","accountant"]'),
('PAYROLL', 'Payroll', 5, 'Payroll', 'ti-briefcase', '/finance/payroll', 6, TRUE, '["admin","branchadmin","accountant"]'),
-- School Setup
('ACADEMIC_CALENDAR', 'Academic Calendar', 6, 'Academic Calendar', 'ti-calendar', '/academic-year', 1, TRUE, '["admin","branchadmin"]'),
('CLASSES_SETUP', 'Classes Setup', 6, 'Classes Setup', 'ti-classes', '/classes-setup', 2, TRUE, '["admin","branchadmin"]'),
('SUBJECTS_SETUP', 'Subjects Setup', 6, 'Subjects Setup', 'ti-book', '/subjects', 3, TRUE, '["admin","branchadmin"]'),
('CA_SETUP', 'Assessment Setup', 6, 'Assessment Setup', 'ti-book', '/ca-setup', 4, TRUE, '["admin","branchadmin"]'),
('REPORT_CONFIG', 'Report Configuration', 6, 'Report Template', 'fa-cog', '/report-configuration', 5, TRUE, '["admin","branchadmin"]')
ON DUPLICATE KEY UPDATE menu_label = VALUES(menu_label), route_path = VALUES(route_path);
```

---

## Task 1.5: Add Missing Indexes for Performance

```sql
-- Ensure indexes exist on frequently queried columns
ALTER TABLE role_permissions ADD INDEX IF NOT EXISTS idx_role_feature (role_id, feature_id);
ALTER TABLE features ADD INDEX IF NOT EXISTS idx_active_category (is_active, category_id);
ALTER TABLE permissions ADD INDEX IF NOT EXISTS idx_feature (feature_id);
```

---

## Task 1.6: Create Migration Stored Procedure

```sql
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS migrate_legacy_permissions()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  
  -- Migrate users with legacy permissions to user_roles table
  INSERT IGNORE INTO user_roles (user_id, role_id, school_id, branch_id, assigned_at, is_active)
  SELECT 
    u.id,
    r.role_id,
    u.school_id,
    u.branch_id,
    NOW(),
    TRUE
  FROM users u
  JOIN roles r ON LOWER(r.user_type) = LOWER(u.user_type) 
    AND (r.school_id = u.school_id OR r.school_id IS NULL)
  WHERE u.user_type NOT IN ('student', 'parent')
    AND u.status = 'active';
  
  COMMIT;
  
  SELECT 'Migration completed successfully' AS result;
END //
DELIMITER ;
```

---

## Deliverables Checklist

- [ ] Existing tables audited
- [ ] ALTER statements executed for: roles, teachers, features, user_roles
- [ ] NEW tables created: superadmin_features, staff_role_definitions
- [ ] Staff role definitions seeded (9 roles)
- [ ] Features populated with menu config (20+ features)
- [ ] Indexes verified/added
- [ ] Migration procedure created and tested
- [ ] No redundant tables created

---

## Verification Queries

```sql
-- Check altered tables have new columns
DESCRIBE roles;
DESCRIBE teachers;
DESCRIBE features;
DESCRIBE user_roles;

-- Check new tables exist
SHOW TABLES LIKE 'superadmin_features';
SHOW TABLES LIKE 'staff_role_definitions';

-- Check seed data
SELECT COUNT(*) FROM staff_role_definitions;
SELECT COUNT(*) FROM features WHERE is_menu_item = TRUE;
```
