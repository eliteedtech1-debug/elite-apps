-- ============================================================================
-- ROLLBACK SCRIPT - December 7, 2025 Migration
-- Description: Safely rollback RBAC Package System changes
-- WARNING: Only run if migration needs to be reversed
-- ============================================================================

-- BACKUP REMINDER: Ensure you have a backup before rollback

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- STEP 1: Remove foreign key constraint from rbac_school_packages
-- ============================================================================

SET @fk_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'rbac_school_packages' 
  AND REFERENCED_TABLE_NAME = 'subscription_packages'
  LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE rbac_school_packages DROP FOREIGN KEY ', @fk_name),
  'SELECT "No FK to drop" AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 2: Drop RBAC tables (in correct order)
-- ============================================================================

DROP TABLE IF EXISTS rbac_school_packages;
DROP TABLE IF EXISTS subscription_packages;

-- Note: features table NOT dropped - may be used by other systems
-- If you need to drop features table, uncomment below:
-- DROP TABLE IF EXISTS features;
-- DROP TABLE IF EXISTS feature_categories;

-- ============================================================================
-- STEP 3: Remove allowed_features column from users table
-- ============================================================================

SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'allowed_features'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE users DROP COLUMN allowed_features',
  'SELECT "Column allowed_features does not exist" AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 4: Remove expected_life_years column from assets table
-- ============================================================================

SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'assets' 
  AND COLUMN_NAME = 'expected_life_years'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE assets DROP COLUMN expected_life_years',
  'SELECT "Column expected_life_years does not exist" AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- ROLLBACK VERIFICATION
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'ROLLBACK COMPLETED' AS status;
SELECT '========================================' AS '';

-- Verify tables dropped
SELECT 
  IF(
    (SELECT COUNT(*) FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rbac_school_packages') = 0,
    '✓ rbac_school_packages dropped',
    '✗ rbac_school_packages still exists'
  ) AS verification;

SELECT 
  IF(
    (SELECT COUNT(*) FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_packages') = 0,
    '✓ subscription_packages dropped',
    '✗ subscription_packages still exists'
  ) AS verification;

-- Verify columns removed
SELECT 
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'allowed_features') = 0,
    '✓ users.allowed_features removed',
    '✗ users.allowed_features still exists'
  ) AS verification;

SELECT 
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'expected_life_years') = 0,
    '✓ assets.expected_life_years removed',
    '✗ assets.expected_life_years still exists'
  ) AS verification;

SELECT '========================================' AS '';
SELECT 'Next Steps:' AS '';
SELECT '1. Restart backend application' AS '';
SELECT '2. Restore from backup if needed' AS '';
SELECT '3. Verify application functionality' AS '';
SELECT '========================================' AS '';
