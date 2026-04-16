-- =====================================================
-- RBAC System Migration - Elite Core
-- Description: Create comprehensive Role-Based Access Control tables
-- Author: Claude Code
-- Date: 2025-11-19
-- =====================================================

-- =================
-- 1. ROLES TABLE
-- =================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `display_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_system_role` TINYINT(1) DEFAULT 0 COMMENT 'System roles cannot be deleted',
  `school_id` VARCHAR(10) DEFAULT NULL COMMENT 'NULL for system-wide roles, specific for school roles',
  `branch_id` VARCHAR(20) DEFAULT NULL COMMENT 'NULL for school-wide roles, specific for branch roles',
  `created_by` INT DEFAULT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_branch_id` (`branch_id`),
  CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_roles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Roles for RBAC system';

-- =================
-- 2. PERMISSIONS TABLE
-- =================
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Machine name like "students.create"',
  `display_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `module` VARCHAR(50) NOT NULL COMMENT 'Module grouping like "students", "finance", "exams"',
  `action` VARCHAR(50) NOT NULL COMMENT 'Action like "create", "read", "update", "delete"',
  `is_system_permission` TINYINT(1) DEFAULT 0 COMMENT 'System permissions cannot be deleted',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_module` (`module`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Permissions for RBAC system';

-- =================
-- 3. ROLE_PERMISSIONS TABLE (Many-to-Many)
-- =================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `granted_by` INT DEFAULT NULL COMMENT 'User who granted this permission',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_role_permission` (`role_id`, `permission_id`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_permission_id` (`permission_id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Role-Permission assignments';

-- =================
-- 4. USER_ROLES TABLE (Many-to-Many)
-- =================
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `school_id` VARCHAR(10) NOT NULL,
  `branch_id` VARCHAR(20) DEFAULT NULL COMMENT 'NULL means role applies to all branches',
  `assigned_by` INT DEFAULT NULL COMMENT 'User who assigned this role',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'NULL means no expiration',
  `is_active` TINYINT(1) DEFAULT 1,
  `revoked_by` INT DEFAULT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `revoke_reason` TEXT,
  UNIQUE KEY `unique_user_role_school_branch` (`user_id`, `role_id`, `school_id`, `branch_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_branch_id` (`branch_id`),
  INDEX `idx_is_active` (`is_active`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_roles_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User-Role assignments with audit trail';

-- =================
-- 5. PERMISSION_AUDIT_LOG TABLE
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

-- =================
-- SUCCESS MESSAGE
-- =================
SELECT 'RBAC tables created successfully!' AS status;
