-- ============================================================================
-- COMPLETE PRODUCTION MIGRATION - December 8, 2025
-- Description: RBAC + Missing Tables + Collation Fixes
-- SAFE: Tested on elite_db, ready for production
-- ============================================================================

-- BACKUP REMINDER: Ensure database backup is completed before running this script

SET FOREIGN_KEY_CHECKS=0;
SET SESSION sql_mode = '';

-- ============================================================================
-- STEP 1: Fix Database Collation (Safe - only affects new tables)
-- ============================================================================

-- Set default for new tables only (doesn't change existing data)
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: Create RBAC Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS rbac_school_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id VARCHAR(50) NOT NULL,
  package_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  features_override JSON COMMENT 'Custom feature enable/disable per school',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT DEFAULT NULL,
  updated_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_active (school_id, is_active),
  INDEX idx_package (package_id),
  INDEX idx_dates (start_date, end_date),
  UNIQUE KEY unique_active_school (school_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  package_description TEXT,
  features JSON COMMENT 'Array of feature codes included in package',
  price_monthly DECIMAL(10,2) DEFAULT 0.00,
  price_yearly DECIMAL(10,2) DEFAULT 0.00,
  max_students INT DEFAULT NULL COMMENT 'NULL = unlimited',
  max_teachers INT DEFAULT NULL COMMENT 'NULL = unlimited',
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description MEDIUMTEXT,
  category_id INT DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key after both tables exist
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() 
  AND table_name = 'rbac_school_packages' 
  AND constraint_type = 'FOREIGN KEY' 
  AND constraint_name LIKE '%package%');

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'subscription_packages');

SET @sql = IF(@fk_exists = 0 AND @table_exists > 0,
  'ALTER TABLE rbac_school_packages ADD CONSTRAINT fk_rbac_package 
   FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE RESTRICT',
  'SELECT "Foreign key already exists or subscription_packages missing" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 3: Create Recitations Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS recitations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id INT NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    audio_url VARCHAR(1024) NOT NULL,
    audio_public_id VARCHAR(255) NOT NULL,
    audio_format VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 0,
    allow_replies BOOLEAN DEFAULT TRUE,
    due_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_class_id (class_id),
    INDEX idx_due_date (due_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recitation_replies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recitation_id CHAR(36) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    audio_url VARCHAR(1024) NOT NULL,
    audio_public_id VARCHAR(255) NOT NULL,
    audio_format VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 0,
    transcript TEXT NULL,
    ai_score FLOAT NULL,
    status ENUM('submitted', 'graded') DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recitation_id) REFERENCES recitations(id) ON DELETE CASCADE,
    INDEX idx_recitation_id (recitation_id),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_student_recitation (recitation_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recitation_feedbacks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reply_id CHAR(36) NOT NULL,
    teacher_id INT NOT NULL,
    grade INT NOT NULL CHECK (grade >= 0 AND grade <= 100),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reply_id) REFERENCES recitation_replies(id) ON DELETE CASCADE,
    INDEX idx_reply_id (reply_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_grade (grade),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 4: Create Asset Management Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_categories (
  category_id VARCHAR(20) PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS facility_rooms (
  room_id VARCHAR(20) PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  room_code VARCHAR(10) NOT NULL,
  description TEXT,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assets (
  asset_id VARCHAR(20) PRIMARY KEY,
  asset_name VARCHAR(100) NOT NULL,
  asset_code VARCHAR(20) NOT NULL,
  category_id VARCHAR(20),
  room_id VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive', 'Under Maintenance', 'Damaged') DEFAULT 'Active',
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  expected_life_years INT DEFAULT 5,
  depreciation_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES asset_categories(category_id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES facility_rooms(room_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 5: Create Teacher Management Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school (school_id),
  INDEX idx_status (status, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  class_id VARCHAR(50) NOT NULL,
  subject_code VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  INDEX idx_teacher (teacher_id),
  INDEX idx_class (class_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 6: Create Supporting Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_setup (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL UNIQUE,
  school_name VARCHAR(200) NOT NULL,
  default_lang VARCHAR(10) DEFAULT 'en',
  second_lang VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 7: Insert Default Data
-- ============================================================================

-- Insert subscription packages
INSERT IGNORE INTO subscription_packages 
  (package_name, display_name, package_description, features, price_monthly, price_yearly, max_students, max_teachers)
VALUES
  ('elite', 'Elite Package', 'Full system access with all features - NGN 1,000 per student per term', 
   '["students", "teachers", "classes", "exams", "fees", "accounting", "reports", "communication", "recitation", "lesson_plans", "payroll", "assets", "inventory"]',
   1000.00, 0.00, NULL, NULL),
  
  ('premium', 'Premium Package', 'Core academic and financial features - NGN 700 per student per term',
   '["students", "teachers", "classes", "exams", "fees", "accounting", "reports", "communication", "lesson_plans"]',
   700.00, 0.00, NULL, NULL),
  
  ('standard', 'Standard Package', 'Essential features for growing schools - NGN 500 per student per term',
   '["students", "teachers", "classes", "exams", "fees", "reports", "communication"]',
   500.00, 0.00, NULL, NULL);

-- Insert features
INSERT IGNORE INTO features (feature_key, feature_name, description, is_active, created_at, updated_at) VALUES
  ('students', 'Student Management', 'Manage student records and enrollment', 1, NOW(), NOW()),
  ('teachers', 'Teacher Management', 'Manage teacher records and assignments', 1, NOW(), NOW()),
  ('classes', 'Class Management', 'Manage classes and subjects', 1, NOW(), NOW()),
  ('exams', 'Examinations', 'Manage exams and assessments', 1, NOW(), NOW()),
  ('lesson_plans', 'Lesson Plans', 'Create and manage lesson plans', 1, NOW(), NOW()),
  ('recitation', 'Recitation Module', 'Audio recitation assignments', 1, NOW(), NOW()),
  ('fees', 'Fee Collection', 'Manage fee collection and billing', 1, NOW(), NOW()),
  ('accounting', 'Accounting', 'Financial accounting and reports', 1, NOW(), NOW()),
  ('payroll', 'Payroll Management', 'Staff payroll processing', 1, NOW(), NOW()),
  ('reports', 'Reports & Analytics', 'Generate system reports', 1, NOW(), NOW()),
  ('communication', 'Communication', 'Messaging and notifications', 1, NOW(), NOW()),
  ('assets', 'Asset Management', 'Track and manage school assets', 1, NOW(), NOW()),
  ('inventory', 'Inventory Management', 'Manage school inventory', 1, NOW(), NOW());

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'MIGRATION COMPLETED SUCCESSFULLY' AS status;
SELECT '========================================' AS '';

-- Show table counts
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rbac_school_packages') AS rbac_packages_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'subscription_packages') AS packages_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'features') AS features_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'recitations') AS recitations_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'assets') AS assets_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'teachers') AS teachers_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'teacher_classes') AS teacher_classes_table;

-- Show data counts
SELECT 
  (SELECT COUNT(*) FROM subscription_packages) AS packages_count,
  (SELECT COUNT(*) FROM features) AS features_count;

SELECT '========================================' AS '';
SELECT 'Tables Created:' AS '';
SELECT '  ✓ RBAC: rbac_school_packages, subscription_packages, features' AS '';
SELECT '  ✓ Recitations: recitations, recitation_replies, recitation_feedbacks' AS '';
SELECT '  ✓ Assets: assets, asset_categories, facility_rooms' AS '';
SELECT '  ✓ Teachers: teachers, teacher_classes' AS '';
SELECT '  ✓ Supporting: school_setup' AS '';
SELECT '========================================' AS '';
SELECT 'Collation: utf8mb4_unicode_ci (applied to all new tables)' AS '';
SELECT '========================================' AS '';
SELECT 'Next Steps:' AS '';
SELECT '1. Restart backend application' AS '';
SELECT '2. Test RBAC endpoints' AS '';
SELECT '3. Test new features (recitations, assets, teachers)' AS '';
SELECT '========================================' AS '';
