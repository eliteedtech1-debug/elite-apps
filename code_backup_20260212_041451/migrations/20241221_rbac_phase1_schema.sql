-- ============================================================================
-- RBAC Phase 1: Schema Alterations & New Tables (IDEMPOTENT)
-- Date: 2025-12-21
-- Description: Alter existing tables, create superadmin_features & staff_role_definitions
-- Safe to run multiple times
-- ============================================================================

-- ============================================================================
-- TASK 1.1: ALTER EXISTING TABLES
-- ============================================================================

-- 1. ALTER roles table
ALTER TABLE roles 
  ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) AFTER role_id,
  ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS default_permissions JSON;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'roles' AND index_name = 'idx_role_code');
SET @sql = IF(@idx_exists = 0, 'CREATE UNIQUE INDEX idx_role_code ON roles (role_code)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. ALTER teachers table - add staff_role
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50) DEFAULT NULL 
    COMMENT 'cashier, exam_officer, form_master, accountant, librarian, etc.';

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'teachers' AND index_name = 'idx_staff_role');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_staff_role ON teachers (staff_role)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. ALTER features table - add menu config columns
ALTER TABLE features
  ADD COLUMN IF NOT EXISTS parent_feature_id INT NULL,
  ADD COLUMN IF NOT EXISTS menu_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS menu_label_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS menu_icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS route_path VARCHAR(200),
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_menu_item BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS required_user_types JSON COMMENT '["admin","branchadmin","teacher"]';

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'features' AND index_name = 'idx_parent');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_parent ON features (parent_feature_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'features' AND index_name = 'idx_display_order');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_display_order ON features (display_order)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. ALTER user_roles - ensure all columns exist
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS assigned_by INT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS revoked_by INT NULL,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT NULL;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'user_roles' AND index_name = 'idx_active_expires');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_active_expires ON user_roles (is_active, expires_at)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- TASK 1.2: CREATE NEW TABLES
-- ============================================================================

-- 1. superadmin_features
CREATE TABLE IF NOT EXISTS superadmin_features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  superadmin_user_id INT NOT NULL,
  feature_id INT NOT NULL,
  granted_by INT COMMENT 'Developer who granted this feature access',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uk_superadmin_feature (superadmin_user_id, feature_id),
  INDEX idx_superadmin (superadmin_user_id)
);

-- Add foreign keys only if they don't exist
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() AND table_name = 'superadmin_features' 
  AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'fk_saf_user');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE superadmin_features ADD CONSTRAINT fk_saf_user FOREIGN KEY (superadmin_user_id) REFERENCES users(id) ON DELETE CASCADE', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() AND table_name = 'superadmin_features' 
  AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'fk_saf_feature');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE superadmin_features ADD CONSTRAINT fk_saf_feature FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. staff_role_definitions
CREATE TABLE IF NOT EXISTS staff_role_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'CASHIER, EXAM_OFFICER, FORM_MASTER, etc.',
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE COMMENT 'System roles cannot be deleted',
  default_feature_access JSON COMMENT 'Array of feature_keys this role grants access to',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- TASK 1.3: SEED STAFF ROLE DEFINITIONS
-- ============================================================================

INSERT INTO staff_role_definitions (role_code, role_name, description, is_system_role, default_feature_access) VALUES
('TEACHER', 'Teacher', 'Regular teaching staff', TRUE, '["DASHBOARD", "CLASS_TIMETABLE", "LESSONS", "ASSIGNMENTS", "SCORE_ENTRY", "ATTENDANCE"]'),
('FORM_MASTER', 'Form Master', 'Class form master/teacher', TRUE, '["DASHBOARD", "CLASS_TIMETABLE", "LESSONS", "ASSIGNMENTS", "SCORE_ENTRY", "ATTENDANCE", "FORMMASTER_REVIEW", "STUDENTS_LIST"]'),
('EXAM_OFFICER', 'Exam Officer', 'Examination management', TRUE, '["DASHBOARD", "SCORE_ENTRY", "FORMMASTER_REVIEW", "REPORTS_GENERATOR", "BROAD_SHEET", "EXAM_ANALYTICS", "CA_SETUP"]'),
('CASHIER', 'Cashier', 'Finance/payment collection', TRUE, '["DASHBOARD", "COLLECT_FEES", "INCOME_REPORTS"]'),
('ACCOUNTANT', 'Accountant', 'Financial reporting and management', TRUE, '["DASHBOARD", "FINANCE_DASHBOARD", "FEES_SETUP", "COLLECT_FEES", "INCOME_REPORTS", "EXPENSE_REPORTS", "PAYROLL"]'),
('LIBRARIAN', 'Librarian', 'Library management', FALSE, '["DASHBOARD", "LIBRARY"]'),
('HEAD_OF_DEPT', 'Head of Department', 'Department oversight', FALSE, '["DASHBOARD", "SCORE_ENTRY", "BROAD_SHEET", "EXAM_ANALYTICS"]'),
('VICE_PRINCIPAL', 'Vice Principal', 'Administrative duties', FALSE, '["DASHBOARD", "STUDENTS_LIST", "STAFF_LIST", "REPORTS_GENERATOR", "BROAD_SHEET", "EXAM_ANALYTICS"]'),
('PRINCIPAL', 'Principal', 'School leadership', FALSE, '["DASHBOARD", "STUDENTS_LIST", "STAFF_LIST", "REPORTS_GENERATOR", "BROAD_SHEET", "EXAM_ANALYTICS", "FINANCE_DASHBOARD"]')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), default_feature_access = VALUES(default_feature_access);

-- ============================================================================
-- TASK 1.5: STANDARDIZE COLUMN NAMES & PERFORMANCE INDEXES
-- ============================================================================

-- Rename permission_id to feature_id in role_permissions (if not already done)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'role_permissions' AND column_name = 'permission_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE role_permissions CHANGE COLUMN permission_id feature_id INT NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename permission_id to feature_id in user_permission_overrides (if not already done)
-- First drop FK if exists, rename column, then recreate FK
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'user_permission_overrides' AND column_name = 'permission_id');

-- Drop FK constraint if it exists
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE() AND table_name = 'user_permission_overrides' AND constraint_type = 'FOREIGN KEY');
SET @sql = IF(@fk_exists > 0 AND @col_exists > 0, 
  'ALTER TABLE user_permission_overrides DROP FOREIGN KEY user_permission_overrides_ibfk_2', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename column
SET @sql = IF(@col_exists > 0, 'ALTER TABLE user_permission_overrides CHANGE COLUMN permission_id feature_id INT NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on role_permissions (role_id, feature_id)
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'role_permissions' AND index_name = 'idx_role_feature');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_role_feature ON role_permissions (role_id, feature_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- features index
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'features' AND index_name = 'idx_active_category');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_active_category ON features (is_active, category_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'RBAC Phase 1 Migration Complete' AS status;
SELECT COUNT(*) AS staff_roles_count FROM staff_role_definitions;
