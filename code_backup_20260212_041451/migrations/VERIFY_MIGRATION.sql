-- ============================================================================
-- POST-MIGRATION VERIFICATION SCRIPT
-- Run this after PRODUCTION_MIGRATION_2025_12_07.sql
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'MIGRATION VERIFICATION REPORT' AS '';
SELECT '========================================' AS '';

-- Check new RBAC tables exist
SELECT 'NEW RBAC TABLES:' AS '';
SELECT 
  table_name,
  table_rows,
  ROUND(data_length/1024/1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name IN ('rbac_school_packages', 'subscription_packages', 'features')
ORDER BY table_name;

SELECT '========================================' AS '';

-- Check old pricing tables preserved
SELECT 'OLD PRICING TABLES (PRESERVED):' AS '';
SELECT 
  table_name,
  table_rows,
  ROUND(data_length/1024/1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name IN ('school_subscriptions', 'subscription_invoices', 'subscription_pricing')
ORDER BY table_name;

SELECT '========================================' AS '';

-- Check users table has new column
SELECT 'USERS TABLE MODIFICATION:' AS '';
SELECT 
  column_name,
  column_type,
  is_nullable,
  column_comment
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND table_name = 'users'
AND column_name = 'allowed_features';

SELECT '========================================' AS '';

-- Check default packages inserted
SELECT 'DEFAULT PACKAGES:' AS '';
SELECT 
  id,
  package_name,
  display_name,
  max_students,
  max_teachers,
  is_active
FROM subscription_packages
ORDER BY id;

SELECT '========================================' AS '';

-- Check default features inserted
SELECT 'DEFAULT FEATURES:' AS '';
SELECT 
  id,
  COALESCE(feature_code, feature_key) as feature_identifier,
  feature_name,
  is_active
FROM features
WHERE is_active = 1
ORDER BY id
LIMIT 15;

SELECT '========================================' AS '';

-- Check foreign keys
SELECT 'FOREIGN KEY CONSTRAINTS:' AS '';
SELECT 
  constraint_name,
  table_name,
  referenced_table_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
AND table_name = 'rbac_school_packages'
AND referenced_table_name IS NOT NULL;

SELECT '========================================' AS '';

-- Check indexes
SELECT 'INDEXES ON rbac_school_packages:' AS '';
SELECT 
  index_name,
  column_name,
  seq_in_index
FROM information_schema.statistics
WHERE table_schema = DATABASE()
AND table_name = 'rbac_school_packages'
ORDER BY index_name, seq_in_index;

SELECT '========================================' AS '';

-- Final status
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'rbac_school_packages') = 1
    AND (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = 'school_subscriptions') = 1
    THEN '✅ MIGRATION SUCCESSFUL - Both systems operational'
    ELSE '❌ MIGRATION INCOMPLETE - Check errors above'
  END AS final_status;

SELECT '========================================' AS '';
