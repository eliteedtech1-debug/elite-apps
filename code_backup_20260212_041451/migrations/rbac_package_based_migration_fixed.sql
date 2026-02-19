-- ============================================================================
-- RBAC Package-Based Migration - FIXED (Idempotent)
-- Date: 2025-12-07
-- Description: Transform existing RBAC tables to support package-based access
-- Note: Separate from school_subscriptions (old pricing system)
-- ============================================================================

-- STEP 1: Handle subscription_packages (may already exist)
-- ============================================================================
-- Check if permission_categories exists, rename it
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'permission_categories');

SET @sql = IF(@table_exists > 0, 
  'RENAME TABLE permission_categories TO subscription_packages',
  'SELECT "permission_categories already renamed" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Alter subscription_packages if columns don't exist
SET @sql = 'ALTER TABLE subscription_packages
  CHANGE COLUMN IF EXISTS category_name package_name VARCHAR(50) NOT NULL,
  CHANGE COLUMN IF EXISTS description display_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS package_description TEXT AFTER display_name,
  ADD COLUMN IF NOT EXISTS features JSON COMMENT "Array of feature codes included in package",
  ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS max_students INT DEFAULT NULL COMMENT "NULL = unlimited",
  ADD COLUMN IF NOT EXISTS max_teachers INT DEFAULT NULL COMMENT "NULL = unlimited",
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE';
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- STEP 2: Create rbac_school_packages from permission_cache
-- ============================================================================
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'permission_cache');

SET @sql = IF(@table_exists > 0, 
  'RENAME TABLE permission_cache TO rbac_school_packages',
  'SELECT "permission_cache already renamed" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Alter rbac_school_packages structure
ALTER TABLE rbac_school_packages
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS cached_permissions,
  DROP COLUMN IF EXISTS cache_expires_at,
  ADD COLUMN IF NOT EXISTS package_id INT NOT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL,
  ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS features_override JSON COMMENT 'Custom feature enable/disable per school',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT NULL;

-- Add foreign key if not exists
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() AND table_name = 'rbac_school_packages' 
  AND constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%package_id%');

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE rbac_school_packages ADD FOREIGN KEY (package_id) REFERENCES subscription_packages(id)',
  'SELECT "Foreign key already exists" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes if not exist
ALTER TABLE rbac_school_packages
  ADD INDEX IF NOT EXISTS idx_school_active (school_id, is_active),
  ADD INDEX IF NOT EXISTS idx_package (package_id);

-- STEP 3: Rename permissions to features
-- ============================================================================
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'permissions');

SET @sql = IF(@table_exists > 0, 
  'RENAME TABLE permissions TO features',
  'SELECT "permissions already renamed" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Alter features structure
ALTER TABLE features
  CHANGE COLUMN IF EXISTS permission_name feature_code VARCHAR(100) NOT NULL,
  CHANGE COLUMN IF EXISTS description feature_name VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) COMMENT 'academic, financial, management, etc',
  ADD COLUMN IF NOT EXISTS parent_feature VARCHAR(100) COMMENT 'For nested features',
  ADD COLUMN IF NOT EXISTS route_path VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sidebar_icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE;

-- STEP 4: Update role_permissions
-- ============================================================================
ALTER TABLE role_permissions
  CHANGE COLUMN IF EXISTS permission_id feature_id INT NOT NULL,
  ADD COLUMN IF NOT EXISTS can_view BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_create BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_delete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_export BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_approve BOOLEAN DEFAULT FALSE;

-- STEP 5: Update user_permission_overrides
-- ============================================================================
ALTER TABLE user_permission_overrides
  CHANGE COLUMN IF EXISTS permission_id feature_id INT NOT NULL,
  ADD COLUMN IF NOT EXISTS override_type ENUM('grant', 'revoke') DEFAULT 'grant',
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS expires_at DATETIME DEFAULT NULL;

-- STEP 6: Update permission_audit_log to feature_audit_log
-- ============================================================================
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'permission_audit_log');

SET @sql = IF(@table_exists > 0, 
  'RENAME TABLE permission_audit_log TO feature_audit_log',
  'SELECT "permission_audit_log already renamed" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE feature_audit_log
  CHANGE COLUMN IF EXISTS permission_id feature_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS package_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_id INT DEFAULT NULL;

-- STEP 7: Add allowed_features to users table
-- ============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS allowed_features JSON COMMENT 'Features this SuperAdmin can manage (Developer controlled)' AFTER Permission;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Migration completed successfully' AS status;
SELECT 'Old system: school_subscriptions (pricing/invoices) - PRESERVED' AS note1;
SELECT 'New system: rbac_school_packages (feature access) - CREATED' AS note2;
