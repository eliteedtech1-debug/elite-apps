-- ============================================================================
-- Import Production DB and Run Migrations
-- Run this file: mysql -u root -p < IMPORT_AND_MIGRATE.sql
-- ============================================================================

-- Drop and create database
DROP DATABASE IF EXISTS elite_db;
CREATE DATABASE elite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE elite_db;

-- Import will be done separately
-- After import, run migrations below

SELECT 'Database elite_db created. Now import the SQL file manually:' AS '';
SELECT 'mysql -u root -p elite_db < /Users/apple/Downloads/kirmaskngov_skcooly_db.sql --force' AS command;
SELECT 'Then run: mysql -u root -p elite_db < RUN_MIGRATIONS.sql' AS '';
