-- ============================================================================
-- TEST SCRIPT - December 7, 2025 Migration
-- Description: Verify migration success without modifying data
-- Safe to run multiple times
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'MIGRATION VERIFICATION TEST' AS '';
SELECT '========================================' AS '';

-- ============================================================================
-- TEST 1: Table Existence
-- ============================================================================

SELECT '--- TEST 1: Table Existence ---' AS '';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS rbac_school_packages_exists
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rbac_school_packages';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS subscription_packages_exists
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_packages';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS features_exists
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'features';

-- ============================================================================
-- TEST 2: Column Additions
-- ============================================================================

SELECT '--- TEST 2: Column Additions ---' AS '';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS users_allowed_features_exists
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'allowed_features';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS assets_expected_life_years_exists
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'assets' 
AND COLUMN_NAME = 'expected_life_years';

-- ============================================================================
-- TEST 3: Default Data Inserted
-- ============================================================================

SELECT '--- TEST 3: Default Data ---' AS '';

SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN CONCAT('✓ PASS (', COUNT(*), ' packages)')
    ELSE CONCAT('✗ FAIL (', COUNT(*), ' packages, expected 3)')
  END AS subscription_packages_count
FROM subscription_packages;

SELECT 
  CASE 
    WHEN COUNT(*) >= 10 THEN CONCAT('✓ PASS (', COUNT(*), ' features)')
    ELSE CONCAT('⚠ WARNING (', COUNT(*), ' features, expected 10+)')
  END AS features_count
FROM features;

-- ============================================================================
-- TEST 4: Foreign Key Constraint
-- ============================================================================

SELECT '--- TEST 4: Foreign Key ---' AS '';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '⚠ WARNING (FK not created)'
  END AS foreign_key_exists
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'rbac_school_packages' 
AND REFERENCED_TABLE_NAME = 'subscription_packages';

-- ============================================================================
-- TEST 5: Data Integrity
-- ============================================================================

SELECT '--- TEST 5: Package Details ---' AS '';

SELECT 
  package_name,
  display_name,
  price_monthly,
  JSON_LENGTH(features) AS feature_count,
  is_active
FROM subscription_packages
ORDER BY price_monthly;

-- ============================================================================
-- TEST 6: Features List
-- ============================================================================

SELECT '--- TEST 6: Features List ---' AS '';

SELECT 
  feature_key,
  feature_name,
  is_active
FROM features
WHERE is_active = 1
ORDER BY feature_key;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'TEST SUMMARY' AS '';
SELECT '========================================' AS '';

SELECT 
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rbac_school_packages') AS tables_created,
  (SELECT COUNT(*) FROM subscription_packages) AS packages_inserted,
  (SELECT COUNT(*) FROM features WHERE is_active = 1) AS active_features,
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'allowed_features') AS columns_added;

SELECT '========================================' AS '';
SELECT 'If all tests show ✓ PASS, migration successful!' AS '';
SELECT '========================================' AS '';
