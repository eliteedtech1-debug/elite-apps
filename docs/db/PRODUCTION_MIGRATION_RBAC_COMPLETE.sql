-- ============================================================================
-- RBAC PRODUCTION MIGRATION - COMPLETE
-- Date: December 7, 2025
-- Description: Complete migration for Role-Based Access Control system
-- ============================================================================

-- Step 1: Create subscription_packages table
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  package_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2),
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 2: Create rbac_school_packages table
-- ============================================================================
CREATE TABLE IF NOT EXISTS rbac_school_packages (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 3: Create features table
-- ============================================================================
CREATE TABLE IF NOT EXISTS features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 3a: Create feature_categories table
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 3b: Create roles table (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  description TEXT,
  school_id VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_role_school (role_name, school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 3c: Create role_permissions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  feature_id INT NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_role_feature (role_id, feature_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 4: Insert subscription packages
-- ============================================================================
INSERT INTO subscription_packages (id, package_name, display_name, price_monthly, features, is_active, created_at) VALUES
(1, 'standard', 'Standard Package', 500.00, '["student_management", "attendance", "basic_reports"]', TRUE, NOW()),
(2, 'premium', 'Premium Package', 700.00, '["student_management", "attendance", "basic_reports", "financial_management", "sms_notifications"]', TRUE, NOW()),
(3, 'elite', 'Elite Package', 1000.00, '["student_management", "attendance", "basic_reports", "financial_management", "sms_notifications", "advanced_analytics", "parent_portal", "teacher_portal"]', TRUE, NOW())
ON DUPLICATE KEY UPDATE 
  price_monthly = VALUES(price_monthly),
  features = VALUES(features);

-- Step 5: Insert features
-- ============================================================================
INSERT INTO features (feature_key, feature_name, description, is_active, created_at, updated_at) VALUES
('student_management', 'Student Management', 'Manage student records and enrollment', TRUE, NOW(), NOW()),
('attendance', 'Attendance Tracking', 'Track student and staff attendance', TRUE, NOW(), NOW()),
('basic_reports', 'Basic Reports', 'Generate basic academic and administrative reports', TRUE, NOW(), NOW()),
('financial_management', 'Financial Management', 'Manage fees, payments, and accounting', TRUE, NOW(), NOW()),
('sms_notifications', 'SMS Notifications', 'Send SMS to parents and staff', TRUE, NOW(), NOW()),
('advanced_analytics', 'Advanced Analytics', 'Detailed analytics and insights', TRUE, NOW(), NOW()),
('parent_portal', 'Parent Portal', 'Parent access to student information', TRUE, NOW(), NOW()),
('teacher_portal', 'Teacher Portal', 'Teacher dashboard and tools', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  feature_name = VALUES(feature_name),
  description = VALUES(description);

-- Step 5a: Insert feature categories
-- ============================================================================
INSERT INTO feature_categories (category_name, description, display_order, is_active) VALUES
('Core', 'Core system features', 1, TRUE),
('Academic', 'Academic management features', 2, TRUE),
('Financial', 'Financial management features', 3, TRUE),
('Communication', 'Communication and notification features', 4, TRUE),
('Analytics', 'Analytics and reporting features', 5, TRUE),
('Portal', 'User portal features', 6, TRUE)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  display_order = VALUES(display_order);

-- Step 5b: Insert default roles
-- ============================================================================
INSERT INTO roles (role_name, description, school_id, is_active) VALUES
('developer', 'System Developer - Full Access', 'default', TRUE),
('superadmin', 'Super Administrator - School Creator', 'default', TRUE),
('admin', 'School Administrator', 'default', TRUE),
('teacher', 'Teacher', 'default', TRUE),
('student', 'Student', 'default', TRUE),
('parent', 'Parent', 'default', TRUE)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description);

-- Step 5c: Insert default role permissions (Developer - Full Access)
-- ============================================================================
INSERT INTO role_permissions (role_id, feature_id, can_view, can_create, can_edit, can_delete)
SELECT 
  r.id as role_id,
  f.id as feature_id,
  TRUE as can_view,
  TRUE as can_create,
  TRUE as can_edit,
  TRUE as can_delete
FROM roles r
CROSS JOIN features f
WHERE r.role_name = 'developer' AND r.school_id = 'default'
ON DUPLICATE KEY UPDATE 
  can_view = TRUE,
  can_create = TRUE,
  can_edit = TRUE,
  can_delete = TRUE;

-- Step 5d: Insert default role permissions (SuperAdmin - Full Access)
-- ============================================================================
INSERT INTO role_permissions (role_id, feature_id, can_view, can_create, can_edit, can_delete)
SELECT 
  r.id as role_id,
  f.id as feature_id,
  TRUE as can_view,
  TRUE as can_create,
  TRUE as can_edit,
  TRUE as can_delete
FROM roles r
CROSS JOIN features f
WHERE r.role_name = 'superadmin' AND r.school_id = 'default'
ON DUPLICATE KEY UPDATE 
  can_view = TRUE,
  can_create = TRUE,
  can_edit = TRUE,
  can_delete = TRUE;

-- Step 6: Add allowed_features column to users table (if not exists)
-- ============================================================================
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'allowed_features'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE users ADD COLUMN allowed_features JSON',
  'SELECT "Column allowed_features already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Update Developer user type in users table
-- ============================================================================
-- Update existing superadmin user to Developer type
UPDATE users 
SET user_type = 'Developer',
    accessTo = 'Dashboard,Management',
    permissions = 'superadmin,Developer'
WHERE id = 1 AND email LIKE '%superadmin%';

-- Step 8: Update Developer role in roles table
-- ============================================================================
UPDATE roles 
SET accessTo = 'Dashboard,Management',
    permissions = 'superadmin,Developer'
WHERE user_type = 'Developer';

-- Step 9: Add Developer to user_typeQueryMap (for getUserProfile)
-- ============================================================================
-- This is handled in backend code - no SQL needed
-- File: /elscholar-api/src/controllers/user.js
-- Added: developer: async () => await db.sequelize.query(`SELECT t.* FROM users t WHERE t.id = :id;`)

-- Step 10: Update superadminLogin to accept Developer
-- ============================================================================
-- This is handled in backend code - no SQL needed
-- File: /elscholar-api/src/controllers/user.js
-- Changed: user_type: { [Op.in]: ["superadmin", "Developer"] }

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify subscription_packages
SELECT 'Subscription Packages' AS verification_step;
SELECT id, package_name, display_name, price_monthly FROM subscription_packages;

-- Verify features
SELECT 'Features' AS verification_step;
SELECT id, feature_key, feature_name FROM features WHERE is_active = TRUE;

-- Verify feature_categories
SELECT 'Feature Categories' AS verification_step;
SELECT id, category_name, display_order FROM feature_categories WHERE is_active = TRUE;

-- Verify roles
SELECT 'Roles' AS verification_step;
SELECT id, role_name, description, school_id FROM roles WHERE is_active = TRUE;

-- Verify role_permissions
SELECT 'Role Permissions Count' AS verification_step;
SELECT r.role_name, COUNT(rp.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.school_id = 'default'
GROUP BY r.role_name;

-- Verify Developer user
SELECT 'Developer User' AS verification_step;
SELECT id, name, email, user_type, accessTo, permissions FROM users WHERE user_type = 'Developer';

-- Verify Developer roles in roles table (existing table)
SELECT 'Developer Roles (existing table)' AS verification_step;
SELECT role_id, user_type, accessTo, permissions, school_id FROM roles WHERE user_type = 'Developer' LIMIT 5;

-- Verify rbac_school_packages table exists
SELECT 'RBAC School Packages Table' AS verification_step;
SELECT COUNT(*) as table_exists FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rbac_school_packages';

-- ============================================================================
-- ROLLBACK SCRIPT (USE WITH CAUTION)
-- ============================================================================
-- Uncomment the following lines to rollback changes

-- DROP TABLE IF EXISTS role_permissions;
-- DROP TABLE IF EXISTS roles;
-- DROP TABLE IF EXISTS feature_categories;
-- DROP TABLE IF EXISTS rbac_school_packages;
-- DROP TABLE IF EXISTS features;
-- DROP TABLE IF EXISTS subscription_packages;
-- ALTER TABLE users DROP COLUMN IF EXISTS allowed_features;
-- UPDATE users SET user_type = 'superadmin', accessTo = 'Dashboard,Personal Data Mngr,...', permissions = 'superadmin' WHERE id = 1;
-- UPDATE roles SET accessTo = 'Dashboard,Developer', permissions = 'Developer' WHERE user_type = 'Developer';

-- ============================================================================
-- POST-MIGRATION STEPS
-- ============================================================================
-- 1. Deploy updated backend code:
--    - /elscholar-api/src/routes/rbac.js
--    - /elscholar-api/src/middleware/auth.js
--    - /elscholar-api/src/controllers/user.js
--
-- 2. Deploy updated frontend code:
--    - /elscholar-ui/src/feature-module/mainMenu/developerDashboard/DeveloperSuperAdminManager.tsx
--    - /elscholar-ui/src/feature-module/auth/login/superadmin-login.tsx
--    - /elscholar-ui/src/redux/actions/auth.ts
--    - /elscholar-ui/src/core/data/json/sidebarData.tsx
--
-- 3. Test Developer login at: http://localhost:3000/superadmin
--    Username: Elite Developer
--    Password: 123456
--
-- 4. Verify RBAC endpoints:
--    - GET /api/rbac/developer/super-admins
--    - POST /api/rbac/developer/create-superadmin
--    - POST /api/rbac/developer/update-superadmin-permissions
--    - GET /api/rbac/super-admin/schools-subscriptions
--    - GET /api/rbac/super-admin/packages
--    - POST /api/rbac/super-admin/assign-package
--
-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
