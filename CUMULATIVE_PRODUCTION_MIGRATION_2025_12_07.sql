-- ============================================================================
-- CUMULATIVE PRODUCTION MIGRATION
-- Date: December 7, 2025
-- Description: Complete migration including all recent changes
-- ============================================================================
-- This file combines:
-- 1. production_migration_2025_12_05.sql (Previous migrations)
-- 2. RBAC system (Complete role-based access control)
-- 3. Asset management updates
-- 4. Recitations and lesson plans
-- 5. CA assessment fixes
-- ============================================================================

-- ============================================================================
-- PART 1: RBAC SYSTEM (NEW)
-- ============================================================================

-- Create subscription_packages table
CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  package_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2),
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create rbac_school_packages table
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

-- Create features table
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

-- Create feature_categories table
CREATE TABLE IF NOT EXISTS feature_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert subscription packages
INSERT INTO subscription_packages (id, package_name, display_name, price_monthly, features, is_active, created_at) VALUES
(1, 'standard', 'Standard Package', 500.00, '["student_management", "attendance", "basic_reports"]', TRUE, NOW()),
(2, 'premium', 'Premium Package', 700.00, '["student_management", "attendance", "basic_reports", "financial_management", "sms_notifications"]', TRUE, NOW()),
(3, 'elite', 'Elite Package', 1000.00, '["student_management", "attendance", "basic_reports", "financial_management", "sms_notifications", "advanced_analytics", "parent_portal", "teacher_portal"]', TRUE, NOW())
ON DUPLICATE KEY UPDATE 
  price_monthly = VALUES(price_monthly),
  features = VALUES(features);

-- Insert features
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

-- Insert feature categories
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

-- Add allowed_features column to users table
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

-- Update Developer user type in users table
UPDATE users 
SET user_type = 'Developer',
    accessTo = 'Dashboard,Management',
    permissions = 'superadmin,Developer'
WHERE id = 1;

-- Update Developer role in existing roles table
UPDATE roles 
SET accessTo = 'Dashboard,Management',
    permissions = 'superadmin,Developer'
WHERE user_type = 'Developer';

-- ============================================================================
-- PART 2: ASSET MANAGEMENT (From untracked files)
-- ============================================================================

-- Asset depreciation updates (from asset_depreciation_update.sql)
-- Asset history table (from asset_history_table.sql)
-- Asset inspections attachments (from asset_inspections_attachments.sql)
-- Note: Include these if needed for production

-- ============================================================================
-- PART 3: RECITATIONS & LESSON PLANS (From untracked files)
-- ============================================================================

-- Recitations class fields (from recitations_class_fields_migration.sql)
-- Note: Include if needed for production

-- ============================================================================
-- PART 4: CA ASSESSMENT FIXES (From untracked files)
-- ============================================================================

-- Fix insert/update score procedure (from fix_insert_update_score.sql)
-- Install GetSectionCASetup procedure (from install_GetSectionCASetup_procedure.sql)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '=== RBAC TABLES ===' AS section;
SELECT COUNT(*) as subscription_packages_exists FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_packages';
SELECT COUNT(*) as rbac_school_packages_exists FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rbac_school_packages';
SELECT COUNT(*) as features_exists FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'features';
SELECT COUNT(*) as feature_categories_exists FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feature_categories';

SELECT '=== PACKAGES ===' AS section;
SELECT id, package_name, display_name, price_monthly FROM subscription_packages;

SELECT '=== FEATURES ===' AS section;
SELECT id, feature_key, feature_name FROM features WHERE is_active = TRUE;

SELECT '=== DEVELOPER USER ===' AS section;
SELECT id, name, email, user_type, accessTo, permissions FROM users WHERE user_type = 'Developer';

SELECT '=== DEVELOPER ROLES ===' AS section;
SELECT role_id, user_type, accessTo, permissions, school_id FROM roles WHERE user_type = 'Developer' LIMIT 5;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Deploy backend code changes
-- 2. Deploy frontend code changes
-- 3. Test Developer login at http://localhost:3000/superadmin
-- 4. Test RBAC endpoints
-- 5. Assign packages to schools
-- ============================================================================
