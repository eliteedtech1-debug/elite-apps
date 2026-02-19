-- ============================================================================
-- PRODUCTION MIGRATION - December 7, 2025
-- Description: RBAC Package System + School Creation Fixes
-- SAFE: No impact on students, teachers, or academic data
-- ============================================================================

-- BACKUP REMINDER: Ensure database backup is completed before running this script

-- ============================================================================
-- STEP 1: Create rbac_school_packages table (NEW - for feature access control)
-- This is separate from school_subscriptions (pricing/invoicing)
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
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key only if subscription_packages exists and FK doesn't exist
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
-- STEP 2: Ensure subscription_packages table exists (for RBAC feature packages)
-- ============================================================================

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

-- ============================================================================
-- STEP 3: Ensure features table exists (for RBAC feature definitions)
-- Note: Table may already exist with different structure - preserve it
-- ============================================================================

-- Only create if doesn't exist (preserve existing structure)
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

-- ============================================================================
-- STEP 4: Add allowed_features column to users table (for SuperAdmin restrictions)
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS allowed_features JSON 
  COMMENT 'Features this SuperAdmin can manage (Developer controlled)';

-- ============================================================================
-- STEP 5: Insert default subscription packages (if table is empty)
-- ============================================================================

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

-- ============================================================================
-- STEP 6: Insert default features (if table is empty)
-- Note: features table may already exist with different structure
-- ============================================================================

-- Check if features table has feature_code column (new structure)
SET @has_feature_code = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'features' AND column_name = 'feature_code');

-- If old structure (feature_key), insert using old column names
SET @sql = IF(@has_feature_code = 0,
  'INSERT IGNORE INTO features (feature_key, feature_name, description, is_active, created_at, updated_at) VALUES
    ("students", "Student Management", "Manage student records and enrollment", 1, NOW(), NOW()),
    ("teachers", "Teacher Management", "Manage teacher records and assignments", 1, NOW(), NOW()),
    ("classes", "Class Management", "Manage classes and subjects", 1, NOW(), NOW()),
    ("exams", "Examinations", "Manage exams and assessments", 1, NOW(), NOW()),
    ("lesson_plans", "Lesson Plans", "Create and manage lesson plans", 1, NOW(), NOW()),
    ("recitation", "Recitation Module", "Audio recitation assignments", 1, NOW(), NOW()),
    ("fees", "Fee Collection", "Manage fee collection and billing", 1, NOW(), NOW()),
    ("accounting", "Accounting", "Financial accounting and reports", 1, NOW(), NOW()),
    ("payroll", "Payroll Management", "Staff payroll processing", 1, NOW(), NOW()),
    ("reports", "Reports & Analytics", "Generate system reports", 1, NOW(), NOW()),
    ("communication", "Communication", "Messaging and notifications", 1, NOW(), NOW()),
    ("settings", "System Settings", "System configuration", 1, NOW(), NOW())',
  'INSERT IGNORE INTO features (feature_code, feature_name, category, display_order) VALUES
    ("students", "Student Management", "academic", 1),
    ("teachers", "Teacher Management", "academic", 2),
    ("classes", "Class Management", "academic", 3),
    ("exams", "Examinations", "academic", 4),
    ("lesson_plans", "Lesson Plans", "academic", 5),
    ("recitation", "Recitation Module", "academic", 6),
    ("fees", "Fee Collection", "financial", 10),
    ("accounting", "Accounting", "financial", 11),
    ("payroll", "Payroll Management", "financial", 12),
    ("reports", "Reports & Analytics", "management", 20),
    ("communication", "Communication", "management", 21),
    ("settings", "System Settings", "management", 22)');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 7: Verify school_subscriptions table structure (OLD pricing system)
-- This should already exist - we're just verifying
-- ============================================================================

-- Check if school_subscriptions exists
SET @table_check = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'school_subscriptions');

SELECT IF(@table_check > 0, 
  'school_subscriptions table exists (OLD pricing system) - OK', 
  'WARNING: school_subscriptions table missing!') AS verification;

-- ============================================================================
-- STEP 8: Verify subscription_invoices table exists (OLD pricing system)
-- ============================================================================

-- Check if subscription_invoices exists
SET @invoice_check = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'subscription_invoices');

SELECT IF(@invoice_check > 0, 
  'subscription_invoices table exists (OLD pricing system) - OK', 
  'WARNING: subscription_invoices table missing!') AS verification;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'MIGRATION COMPLETED SUCCESSFULLY' AS status;
SELECT '========================================' AS '';

SELECT 'System Separation:' AS '';
SELECT '  OLD SYSTEM: school_subscriptions (pricing/invoices)' AS '';
SELECT '  NEW RBAC: rbac_school_packages (feature access)' AS '';
SELECT '========================================' AS '';

-- Show table counts
SELECT 
  (SELECT COUNT(*) FROM rbac_school_packages) AS rbac_packages_count,
  (SELECT COUNT(*) FROM subscription_packages) AS packages_count,
  (SELECT COUNT(*) FROM features) AS features_count;

SELECT '========================================' AS '';
SELECT 'Next Steps:' AS '';
SELECT '1. Restart backend application' AS '';
SELECT '2. Test school creation' AS '';
SELECT '3. Test RBAC package assignment' AS '';
SELECT '========================================' AS '';

-- ============================================================================
-- Asset Management: Add missing expected_life_years column
-- ============================================================================
ALTER TABLE assets ADD COLUMN IF NOT EXISTS expected_life_years INT DEFAULT 5 AFTER depreciation_rate;
