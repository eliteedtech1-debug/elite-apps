-- ============================================================================
-- Run All Migrations on elite_db
-- Usage: mysql -u root -p elite_db < RUN_MIGRATIONS.sql
-- ============================================================================

USE elite_db;

SET FOREIGN_KEY_CHECKS=0;

SELECT '========================================' AS '';
SELECT 'Starting Migrations on elite_db' AS '';
SELECT '========================================' AS '';

-- Source all migration files
SOURCE elscholar-api/src/migrations/PRODUCTION_MIGRATION_2025_12_07.sql;
SOURCE elscholar-api/migrations/20251208021417-drop-v2-tables.sql;
SOURCE install_GetSectionCASetup_procedure.sql;
SOURCE recitations_class_fields_migration.sql;
SOURCE sql/lesson_plans_schema.sql;
SOURCE elscholar-api/migrations/add_is_late_submission_column.sql;
SOURCE elscholar-api/src/migrations/fix_teacher_classes_active_filter.sql;
SOURCE add_expected_life_years.sql;

SET FOREIGN_KEY_CHECKS=1;

SELECT '========================================' AS '';
SELECT 'All Migrations Complete!' AS '';
SELECT '========================================' AS '';

-- Run verification
SOURCE TEST_MIGRATION_2025_12_07.sql;
