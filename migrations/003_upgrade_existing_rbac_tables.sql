-- =====================================================
-- RBAC System Upgrade Migration - Elite Core
-- Description: Enhance existing RBAC tables for comprehensive role management
-- Author: Claude Code
-- Date: 2025-11-19
-- IMPORTANT: This upgrades existing tables. Backup your data first!
-- =====================================================

-- =================
-- 1. UPGRADE ROLES TABLE
-- =================

-- Check current schema first
SELECT 'Current roles table schema:' AS Info;
DESCRIBE roles;

-- Add missing columns to roles table if they don't exist
ALTER TABLE `roles`
  ADD COLUMN IF NOT EXISTS `id` INT AUTO_INCREMENT UNIQUE FIRST,
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) AFTER `id`,
  ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(255) AFTER `name`,
  ADD COLUMN IF NOT EXISTS `is_system_role` TINYINT(1) DEFAULT 0 AFTER `description`,
  ADD COLUMN IF NOT EXISTS `branch_id` VARCHAR(20) DEFAULT NULL AFTER `school_id`,
  ADD COLUMN IF NOT EXISTS `created_by` INT DEFAULT NULL AFTER `branch_id`,
  ADD COLUMN IF NOT EXISTS `updated_by` INT DEFAULT NULL AFTER `created_by`;

-- Add indexes
ALTER TABLE `roles`
  ADD INDEX IF NOT EXISTS `idx_name` (`name`),
  ADD INDEX IF NOT EXISTS `idx_school_branch` (`school_id`, `branch_id`);

-- Add foreign keys if they don't exist
ALTER TABLE `roles`
  ADD CONSTRAINT IF NOT EXISTS `fk_roles_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_roles_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Populate name and display_name from user_type for existing rows
UPDATE `roles`
SET
  `name` = LOWER(REPLACE(`user_type`, ' ', '_')),
  `display_name` = `user_type`,
  `is_system_role` = 1
WHERE `name` IS NULL OR `name` = '';

SELECT 'Roles table upgraded successfully!' AS status;

-- =================
-- 2. UPGRADE PERMISSIONS TABLE
-- =================

SELECT 'Current permissions table schema:' AS Info;
DESCRIBE permissions;

-- Add missing columns
ALTER TABLE `permissions`
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) AFTER `permission_id`,
  ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(255) AFTER `name`,
  ADD COLUMN IF NOT EXISTS `module` VARCHAR(50) DEFAULT 'general' AFTER `display_name`,
  ADD COLUMN IF NOT EXISTS `action` VARCHAR(50) DEFAULT 'access' AFTER `module`,
  ADD COLUMN IF NOT EXISTS `is_system_permission` TINYINT(1) DEFAULT 0 AFTER `feature_id`,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Add indexes
ALTER TABLE `permissions`
  ADD INDEX IF NOT EXISTS `idx_name` (`name`),
  ADD INDEX IF NOT EXISTS `idx_module_action` (`module`, `action`);

-- Populate new fields from existing data
UPDATE `permissions`
SET
  `name` = COALESCE(`permission_key`, LOWER(REPLACE(`permission_name`, ' ', '_'))),
  `display_name` = `permission_name`,
  `is_system_permission` = 1
WHERE (`name` IS NULL OR `name` = '') AND `permission_name` IS NOT NULL;

-- Parse module and action from permission_name (e.g., "Students List" -> module: "students", action: "list")
UPDATE `permissions`
SET
  `module` = LOWER(SUBSTRING_INDEX(`permission_name`, ' ', 1)),
  `action` = LOWER(SUBSTRING_INDEX(`permission_name`, ' ', -1))
WHERE `module` = 'general';

SELECT 'Permissions table upgraded successfully!' AS status;

-- =================
-- 3. UPGRADE USER_ROLES TABLE
-- =================

SELECT 'Current user_roles table schema:' AS Info;
DESCRIBE user_roles;

-- Add missing columns for audit trail
ALTER TABLE `user_roles`
  ADD COLUMN IF NOT EXISTS `id` INT AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS `school_id` VARCHAR(10) NOT NULL DEFAULT 'SCH/1' AFTER `role_id`,
  ADD COLUMN IF NOT EXISTS `branch_id` VARCHAR(20) DEFAULT NULL AFTER `school_id`,
  ADD COLUMN IF NOT EXISTS `assigned_by` INT DEFAULT NULL AFTER `branch_id`,
  ADD COLUMN IF NOT EXISTS `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `assigned_by`,
  ADD COLUMN IF NOT EXISTS `expires_at` TIMESTAMP NULL DEFAULT NULL AFTER `assigned_at`,
  ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) DEFAULT 1 AFTER `expires_at`,
  ADD COLUMN IF NOT EXISTS `revoked_by` INT DEFAULT NULL AFTER `is_active`,
  ADD COLUMN IF NOT EXISTS `revoked_at` TIMESTAMP NULL DEFAULT NULL AFTER `revoked_by`,
  ADD COLUMN IF NOT EXISTS `revoke_reason` TEXT AFTER `revoked_at`;

-- Add indexes
ALTER TABLE `user_roles`
  ADD INDEX IF NOT EXISTS `idx_user_role_active` (`user_id`, `role_id`, `is_active`),
  ADD INDEX IF NOT EXISTS `idx_school_branch` (`school_id`, `branch_id`);

-- Add foreign keys
ALTER TABLE `user_roles`
  ADD CONSTRAINT IF NOT EXISTS `fk_user_roles_assigned_by`
    FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_user_roles_revoked_by`
    FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

SELECT 'User_roles table upgraded successfully!' AS status;

-- =================
-- 4. UPGRADE ROLE_PERMISSIONS TABLE
-- =================

SELECT 'Current role_permissions table schema:' AS Info;
DESCRIBE role_permissions;

-- Add missing columns
ALTER TABLE `role_permissions`
  ADD COLUMN IF NOT EXISTS `id` INT AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS `granted_by` INT DEFAULT NULL AFTER `permission_id`,
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `granted_by`;

-- Add indexes
ALTER TABLE `role_permissions`
  ADD UNIQUE INDEX IF NOT EXISTS `unique_role_permission` (`role_id`, `permission_id`),
  ADD INDEX IF NOT EXISTS `idx_granted_by` (`granted_by`);

-- Add foreign key
ALTER TABLE `role_permissions`
  ADD CONSTRAINT IF NOT EXISTS `fk_role_permissions_granted_by`
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

SELECT 'Role_permissions table upgraded successfully!' AS status;

-- =================
-- 5. CREATE PERMISSION_AUDIT_LOG TABLE (if not exists)
-- =================

CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `target_user_id` INT DEFAULT NULL COMMENT 'User who was affected',
  `action` ENUM('role_assigned', 'role_revoked', 'permission_granted', 'permission_revoked', 'role_created', 'role_updated', 'role_deleted') NOT NULL,
  `entity_type` ENUM('role', 'permission', 'user_role', 'role_permission') NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `old_value` JSON DEFAULT NULL,
  `new_value` JSON DEFAULT NULL,
  `reason` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `school_id` VARCHAR(10) DEFAULT NULL,
  `branch_id` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_target_user_id` (`target_user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_entity_type` (`entity_type`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_audit_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_target_user_id` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit log for all permission-related changes';

SELECT 'Permission_audit_log table created successfully!' AS status;

-- =================
-- 6. MIGRATE EXISTING DATA
-- =================

-- Migrate user_roles: Set school_id from users table
UPDATE `user_roles` ur
INNER JOIN `users` u ON ur.user_id = u.id
SET ur.school_id = u.school_id,
    ur.branch_id = u.branch_id
WHERE ur.school_id = 'SCH/1'; -- Only update default values

SELECT 'Data migration completed successfully!' AS status;

-- =================
-- 7. SUMMARY
-- =================

SELECT 'RBAC Upgrade Summary:' AS Info;
SELECT COUNT(*) AS total_roles FROM `roles`;
SELECT COUNT(*) AS total_permissions FROM `permissions`;
SELECT COUNT(*) AS total_user_roles FROM `user_roles`;
SELECT COUNT(*) AS total_role_permissions FROM `role_permissions`;

SELECT '✅ RBAC tables upgraded successfully! Ready for top-tier role-based access control.' AS final_status;
