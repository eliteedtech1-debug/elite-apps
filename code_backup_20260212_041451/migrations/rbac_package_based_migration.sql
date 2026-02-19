-- ============================================================================
-- RBAC Package-Based Migration - Using Existing Tables
-- Date: 2025-12-07
-- Description: Transform existing RBAC tables to support package-based access
-- ============================================================================

-- STEP 1: Rename permission_categories to subscription_packages
-- This table will store package definitions (Elite, Premium, Basic)
-- ============================================================================
RENAME TABLE permission_categories TO subscription_packages;

-- Alter subscription_packages structure
ALTER TABLE subscription_packages
  CHANGE COLUMN category_name package_name VARCHAR(50) NOT NULL,
  CHANGE COLUMN description display_name VARCHAR(100),
  ADD COLUMN package_description TEXT AFTER display_name,
  ADD COLUMN features JSON COMMENT 'Array of feature codes included in package',
  ADD COLUMN price_monthly DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN price_yearly DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN max_students INT DEFAULT NULL COMMENT 'NULL = unlimited',
  ADD COLUMN max_teachers INT DEFAULT NULL COMMENT 'NULL = unlimited',
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE;

-- STEP 2: Rename permission_cache to rbac_school_packages
-- This table will track which package each school has (RBAC system only)
-- Note: Separate from school_subscriptions (old pricing/invoice system)
-- ============================================================================
RENAME TABLE permission_cache TO rbac_school_packages;

-- Alter rbac_school_packages structure
ALTER TABLE rbac_school_packages
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS cached_permissions,
  DROP COLUMN IF EXISTS cache_expires_at,
  ADD COLUMN package_id INT NOT NULL AFTER id,
  ADD COLUMN start_date DATE NOT NULL,
  ADD COLUMN end_date DATE DEFAULT NULL,
  ADD COLUMN features_override JSON COMMENT 'Custom feature enable/disable per school',
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN created_by INT DEFAULT NULL,
  ADD COLUMN updated_by INT DEFAULT NULL,
  ADD FOREIGN KEY (package_id) REFERENCES subscription_packages(id),
  ADD INDEX idx_school_active (school_id, is_active),
  ADD INDEX idx_package (package_id);

-- STEP 3: Rename permissions to features
-- This table will define all available features in the system
-- ============================================================================
RENAME TABLE permissions TO features;

-- Alter features structure
ALTER TABLE features
  CHANGE COLUMN permission_name feature_code VARCHAR(100) NOT NULL,
  CHANGE COLUMN description feature_name VARCHAR(100) NOT NULL,
  ADD COLUMN category VARCHAR(50) COMMENT 'academic, financial, management, etc',
  ADD COLUMN parent_feature VARCHAR(100) COMMENT 'For nested features',
  ADD COLUMN route_path VARCHAR(255),
  ADD COLUMN sidebar_icon VARCHAR(50),
  ADD COLUMN display_order INT DEFAULT 0,
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE;

-- STEP 4: Keep role_permissions as is (maps roles to features)
-- This defines what each role can do with each feature
-- ============================================================================
ALTER TABLE role_permissions
  CHANGE COLUMN permission_id feature_id INT NOT NULL,
  ADD COLUMN can_view BOOLEAN DEFAULT TRUE,
  ADD COLUMN can_create BOOLEAN DEFAULT FALSE,
  ADD COLUMN can_edit BOOLEAN DEFAULT FALSE,
  ADD COLUMN can_delete BOOLEAN DEFAULT FALSE,
  ADD COLUMN can_export BOOLEAN DEFAULT FALSE,
  ADD COLUMN can_approve BOOLEAN DEFAULT FALSE;

-- STEP 5: Keep user_permission_overrides for special cases
-- Allows specific users to have custom permissions beyond their role
-- ============================================================================
ALTER TABLE user_permission_overrides
  CHANGE COLUMN permission_id feature_id INT NOT NULL,
  ADD COLUMN override_type ENUM('grant', 'revoke') DEFAULT 'grant',
  ADD COLUMN reason TEXT,
  ADD COLUMN expires_at DATETIME DEFAULT NULL;

-- STEP 6: Update permission_audit_log to feature_audit_log
-- ============================================================================
RENAME TABLE permission_audit_log TO feature_audit_log;

ALTER TABLE feature_audit_log
  CHANGE COLUMN permission_id feature_id INT DEFAULT NULL,
  ADD COLUMN package_id INT DEFAULT NULL,
  ADD COLUMN subscription_id INT DEFAULT NULL;

-- STEP 7: Add allowed_features to users table for SuperAdmin restrictions
-- ============================================================================
ALTER TABLE users
  ADD COLUMN allowed_features JSON COMMENT 'Features this SuperAdmin can manage (Developer controlled)' AFTER Permission;

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Insert default subscription packages
INSERT INTO subscription_packages (package_name, display_name, package_description, features, is_active) VALUES
('elite', 'Elite Package', 'Full access to all features', JSON_ARRAY(
  'dashboard', 'students', 'teachers', 'staff', 'classes', 'subjects',
  'assessments', 'exams', 'reports', 'fees', 'accounting', 'payroll',
  'attendance', 'timetable', 'library', 'transport', 'hostel',
  'communication', 'analytics', 'recitation', 'virtual_classroom',
  'assets', 'inventory', 'settings'
), TRUE),
('premium', 'Premium Package', 'Core academic and financial features', JSON_ARRAY(
  'dashboard', 'students', 'teachers', 'classes', 'subjects',
  'assessments', 'exams', 'reports', 'fees', 'attendance',
  'timetable', 'communication', 'analytics'
), TRUE),
('basic', 'Basic Package', 'Essential school management', JSON_ARRAY(
  'dashboard', 'students', 'teachers', 'classes', 'subjects',
  'assessments', 'reports', 'attendance'
), TRUE);

-- Migrate existing schools to Elite package (default)
INSERT INTO school_subscriptions (school_id, package_id, start_date, is_active)
SELECT DISTINCT 
  school_id, 
  (SELECT id FROM subscription_packages WHERE package_name = 'elite' LIMIT 1),
  CURDATE(),
  TRUE
FROM users 
WHERE school_id IS NOT NULL
ON DUPLICATE KEY UPDATE school_id = school_id;

-- Insert core features
INSERT INTO features (feature_code, feature_name, category, route_path, sidebar_icon, display_order) VALUES
-- Academic
('dashboard', 'Dashboard', 'core', '/dashboard', 'ti ti-dashboard', 1),
('students', 'Students', 'academic', '/students', 'ti ti-users', 10),
('teachers', 'Teachers', 'academic', '/teachers', 'ti ti-user-check', 20),
('classes', 'Classes', 'academic', '/academic/classes', 'ti ti-school', 30),
('subjects', 'Subjects', 'academic', '/academic/subjects', 'ti ti-book', 40),
('assessments', 'Assessments', 'academic', '/academic/assessments', 'ti ti-clipboard', 50),
('exams', 'Examinations', 'academic', '/examinations', 'ti ti-certificate', 60),
('recitation', 'Recitation', 'academic', '/academic/recitation', 'ti ti-microphone', 65),
('reports', 'Reports', 'academic', '/academic/reports', 'ti ti-file-text', 70),
-- Financial
('fees', 'Fees Collection', 'financial', '/fees-collection', 'ti ti-currency-dollar', 100),
('accounting', 'Accounting', 'financial', '/accounting', 'ti ti-calculator', 110),
('payroll', 'Payroll', 'financial', '/payroll', 'ti ti-wallet', 120),
-- Management
('attendance', 'Attendance', 'management', '/attendance', 'ti ti-calendar-check', 200),
('timetable', 'Timetable', 'management', '/academic/class-timetable', 'ti ti-calendar', 210),
('communication', 'Communication', 'management', '/communication', 'ti ti-message', 220),
('settings', 'Settings', 'management', '/settings', 'ti ti-settings', 300);

-- Map default role permissions
INSERT INTO role_permissions (role_id, feature_id, can_view, can_create, can_edit, can_delete)
SELECT 
  r.id as role_id,
  f.id as feature_id,
  CASE 
    WHEN r.role_name = 'admin' THEN TRUE
    WHEN r.role_name = 'teacher' AND f.category IN ('academic', 'management') THEN TRUE
    WHEN r.role_name = 'student' AND f.feature_code IN ('dashboard', 'assessments', 'recitation') THEN TRUE
    ELSE FALSE
  END as can_view,
  CASE 
    WHEN r.role_name = 'admin' THEN TRUE
    WHEN r.role_name = 'teacher' AND f.feature_code IN ('assessments', 'recitation', 'attendance') THEN TRUE
    ELSE FALSE
  END as can_create,
  CASE 
    WHEN r.role_name = 'admin' THEN TRUE
    WHEN r.role_name = 'teacher' AND f.feature_code IN ('assessments', 'recitation') THEN TRUE
    ELSE FALSE
  END as can_edit,
  CASE 
    WHEN r.role_name = 'admin' THEN TRUE
    ELSE FALSE
  END as can_delete
FROM roles r
CROSS JOIN features f
WHERE r.role_name IN ('admin', 'teacher', 'student', 'parent')
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check subscription packages
-- SELECT * FROM subscription_packages;

-- Check school subscriptions
-- SELECT * FROM school_subscriptions;

-- Check features
-- SELECT * FROM features ORDER BY category, display_order;

-- Check role permissions
-- SELECT r.role_name, f.feature_code, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
-- FROM role_permissions rp
-- JOIN roles r ON rp.role_id = r.id
-- JOIN features f ON rp.feature_id = f.id
-- ORDER BY r.role_name, f.category, f.display_order;
