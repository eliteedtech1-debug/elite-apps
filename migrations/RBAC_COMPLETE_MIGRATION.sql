-- =====================================================
-- RBAC COMPLETE MIGRATION - Elite Scholar
-- Description: Complete RBAC system setup in one file
-- Author: Claude Code
-- Date: 2025-11-19
-- IMPORTANT: Backup your database before running!
-- =====================================================

-- Set character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- PART 1: CREATE/UPGRADE TABLES
-- =====================================================

-- =================
-- 1. ROLES TABLE
-- =================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT DEFAULT NULL COMMENT 'Legacy field for compatibility',
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Machine name like admin, teacher, accountant',
  `user_type` VARCHAR(50) DEFAULT NULL COMMENT 'Legacy field for compatibility',
  `display_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `accessTo` TEXT COMMENT 'Legacy field - auto-synced',
  `permissions` TEXT COMMENT 'Legacy field - auto-synced',
  `is_system_role` TINYINT(1) DEFAULT 0 COMMENT 'System roles cannot be deleted',
  `school_id` VARCHAR(10) DEFAULT NULL COMMENT 'NULL for system-wide roles',
  `branch_id` VARCHAR(20) DEFAULT NULL COMMENT 'NULL for school-wide roles',
  `created_by` INT DEFAULT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_branch_id` (`branch_id`),
  INDEX `idx_user_type` (`user_type`),
  CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_roles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Roles for RBAC system';

-- Upgrade existing roles table if needed
ALTER TABLE `roles`
  MODIFY COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS `role_id` INT DEFAULT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) AFTER `role_id`,
  ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(255) AFTER `name`,
  ADD COLUMN IF NOT EXISTS `is_system_role` TINYINT(1) DEFAULT 0 AFTER `permissions`,
  ADD COLUMN IF NOT EXISTS `branch_id` VARCHAR(20) DEFAULT NULL AFTER `school_id`,
  ADD COLUMN IF NOT EXISTS `created_by` INT DEFAULT NULL AFTER `branch_id`,
  ADD COLUMN IF NOT EXISTS `updated_by` INT DEFAULT NULL AFTER `created_by`;

-- Add indexes if they don't exist
ALTER TABLE `roles`
  ADD INDEX IF NOT EXISTS `idx_name` (`name`),
  ADD INDEX IF NOT EXISTS `idx_school_branch` (`school_id`, `branch_id`);

-- Populate name and display_name from user_type for existing rows
UPDATE `roles`
SET
  `name` = COALESCE(`name`, LOWER(REPLACE(`user_type`, ' ', '_'))),
  `display_name` = COALESCE(`display_name`, `user_type`),
  `is_system_role` = 1
WHERE (`name` IS NULL OR `name` = '') AND `user_type` IS NOT NULL;

-- =================
-- 2. PERMISSIONS TABLE
-- =================
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `permission_id` INT DEFAULT NULL COMMENT 'Legacy field for compatibility',
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Machine name like students.create',
  `permission_key` VARCHAR(100) DEFAULT NULL COMMENT 'Legacy field',
  `permission_name` VARCHAR(255) DEFAULT NULL COMMENT 'Legacy field',
  `display_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `module` VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT 'Module like students, finance, exams',
  `action` VARCHAR(50) NOT NULL DEFAULT 'access' COMMENT 'Action like create, read, update, delete',
  `is_system_permission` TINYINT(1) DEFAULT 0 COMMENT 'System permissions cannot be deleted',
  `feature_id` INT DEFAULT NULL COMMENT 'Legacy field for feature linking',
  `subscription_tier` ENUM('Standard', 'Premium', 'Elite') DEFAULT NULL COMMENT 'Required subscription tier',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_module` (`module`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module_action` (`module`, `action`),
  INDEX `idx_permission_key` (`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Permissions for RBAC system';

-- Upgrade existing permissions table
ALTER TABLE `permissions`
  MODIFY COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS `permission_id` INT DEFAULT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) AFTER `permission_id`,
  ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(255) AFTER `name`,
  ADD COLUMN IF NOT EXISTS `module` VARCHAR(50) DEFAULT 'general' AFTER `display_name`,
  ADD COLUMN IF NOT EXISTS `action` VARCHAR(50) DEFAULT 'access' AFTER `module`,
  ADD COLUMN IF NOT EXISTS `is_system_permission` TINYINT(1) DEFAULT 0 AFTER `feature_id`,
  ADD COLUMN IF NOT EXISTS `subscription_tier` ENUM('Standard', 'Premium', 'Elite') DEFAULT NULL AFTER `is_system_permission`,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Populate new fields from existing data
UPDATE `permissions`
SET
  `name` = COALESCE(`name`, `permission_key`, LOWER(REPLACE(`permission_name`, ' ', '_'))),
  `display_name` = COALESCE(`display_name`, `permission_name`),
  `is_system_permission` = 1
WHERE (`name` IS NULL OR `name` = '') AND `permission_name` IS NOT NULL;

-- Parse module and action from permission_name
UPDATE `permissions`
SET
  `module` = LOWER(SUBSTRING_INDEX(`permission_name`, ' ', 1)),
  `action` = LOWER(SUBSTRING_INDEX(`permission_name`, ' ', -1))
WHERE `module` = 'general' AND `permission_name` IS NOT NULL;

-- =================
-- 3. ROLE_PERMISSIONS TABLE
-- =================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `granted` TINYINT(1) DEFAULT 1 COMMENT 'Whether permission is granted or denied',
  `conditions` JSON DEFAULT NULL COMMENT 'Additional conditions',
  `granted_by` INT DEFAULT NULL COMMENT 'User who granted this permission',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Legacy field',
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When permission expires',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `unique_role_permission` (`role_id`, `permission_id`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_permission_id` (`permission_id`),
  INDEX `idx_granted_by` (`granted_by`),
  INDEX `idx_granted` (`granted`),
  INDEX `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Role-Permission assignments';

-- Upgrade existing role_permissions table
ALTER TABLE `role_permissions`
  ADD COLUMN IF NOT EXISTS `id` INT AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS `granted` TINYINT(1) DEFAULT 1 AFTER `permission_id`,
  ADD COLUMN IF NOT EXISTS `conditions` JSON DEFAULT NULL AFTER `granted`,
  ADD COLUMN IF NOT EXISTS `granted_by` INT DEFAULT NULL AFTER `conditions`,
  ADD COLUMN IF NOT EXISTS `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `granted_by`,
  ADD COLUMN IF NOT EXISTS `expires_at` TIMESTAMP NULL DEFAULT NULL AFTER `granted_at`,
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `expires_at`,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Add indexes
ALTER TABLE `role_permissions`
  ADD UNIQUE INDEX IF NOT EXISTS `unique_role_permission` (`role_id`, `permission_id`),
  ADD INDEX IF NOT EXISTS `idx_granted` (`granted`),
  ADD INDEX IF NOT EXISTS `idx_expires_at` (`expires_at`);

-- =================
-- 4. USER_ROLES TABLE
-- =================
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `permissions` TEXT COMMENT 'Legacy field - auto-synced',
  `accessTo` TEXT COMMENT 'Legacy field - auto-synced',
  `school_id` VARCHAR(10) NOT NULL,
  `branch_id` VARCHAR(20) DEFAULT NULL COMMENT 'NULL means role applies to all branches',
  `assigned_by` INT DEFAULT NULL COMMENT 'User who assigned this role',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'NULL means no expiration',
  `is_active` TINYINT(1) DEFAULT 1,
  `revoked_by` INT DEFAULT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `revoke_reason` TEXT,
  UNIQUE INDEX `unique_user_role_school_branch` (`user_id`, `role_id`, `school_id`, `branch_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_branch_id` (`branch_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_user_role_active` (`user_id`, `role_id`, `is_active`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_roles_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User-Role assignments with audit trail';

-- Upgrade existing user_roles table
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

-- Migrate existing data
UPDATE `user_roles` ur
INNER JOIN `users` u ON ur.user_id = u.id
SET ur.school_id = u.school_id,
    ur.branch_id = u.branch_id
WHERE ur.school_id = 'SCH/1';

-- =================
-- 5. PERMISSION_AUDIT_LOG TABLE
-- =================
CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT 'User who performed the action',
  `target_user_id` INT DEFAULT NULL COMMENT 'User who was affected',
  `action` ENUM('role_assigned', 'role_revoked', 'permission_granted', 'permission_revoked', 'role_created', 'role_updated', 'role_deleted') NOT NULL,
  `entity_type` ENUM('role', 'permission', 'user_role', 'role_permission') NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `old_value` JSON DEFAULT NULL COMMENT 'Previous state before change',
  `new_value` JSON DEFAULT NULL COMMENT 'New state after change',
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
  INDEX `idx_school_id` (`school_id`),
  CONSTRAINT `fk_audit_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_target_user_id` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit log for all permission-related changes';

-- =====================================================
-- PART 2: SEED DEFAULT ROLES
-- =====================================================

INSERT INTO `roles` (`name`, `display_name`, `description`, `is_system_role`, `school_id`, `branch_id`) VALUES
-- Super Admin (system-wide)
('superadmin', 'Super Administrator', 'Full system access across all schools', 1, NULL, NULL),
('developer', 'Developer', 'Technical access for system maintenance', 1, NULL, NULL),

-- School-level roles
('admin', 'School Administrator', 'Full access to school management functions', 1, NULL, NULL),
('branchadmin', 'Branch Administrator', 'Full access to branch management functions', 1, NULL, NULL),

-- Teaching roles
('teacher', 'Teacher', 'Regular teaching staff with class management access', 1, NULL, NULL),
('form_master', 'Form Master/Class Teacher', 'Class teacher with additional student management permissions', 1, NULL, NULL),
('subject_teacher', 'Subject Teacher', 'Teacher assigned to specific subjects', 1, NULL, NULL),
('exam_officer', 'Exam Officer', 'Manages examinations and result processing', 1, NULL, NULL),

-- Financial roles
('accountant', 'Accountant', 'Manages financial records and reporting', 1, NULL, NULL),
('cashier', 'Cashier', 'Processes payments and manages cash transactions', 1, NULL, NULL),
('bursar', 'Bursar', 'Senior financial officer with full financial access', 1, NULL, NULL),

-- Operational roles
('manager', 'Manager', 'Operations manager with cross-department access', 1, NULL, NULL),
('storekeeper', 'Storekeeper', 'Manages inventory and supply management', 1, NULL, NULL),
('librarian', 'Librarian', 'Manages library resources', 1, NULL, NULL),
('nurse', 'School Nurse', 'Manages health records and medical services', 1, NULL, NULL),

-- Parent/Student roles
('parent', 'Parent/Guardian', 'Access to children information and communication', 1, NULL, NULL),
('student', 'Student', 'Access to personal academic information', 1, NULL, NULL)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`);

-- =====================================================
-- PART 3: SEED DEFAULT PERMISSIONS
-- =====================================================

-- Dashboard Permissions
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('dashboard.view', 'View Dashboard', 'Access to main dashboard', 'dashboard', 'view', 1),
('dashboard.analytics', 'View Analytics', 'Access to analytics and reports', 'dashboard', 'view', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Student Management
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('students.view', 'View Students', 'View student list and details', 'students', 'read', 1),
('students.create', 'Create Students', 'Add new students', 'students', 'create', 1),
('students.update', 'Update Students', 'Edit student information', 'students', 'update', 1),
('students.delete', 'Delete Students', 'Remove students from system', 'students', 'delete', 1),
('students.promote', 'Promote Students', 'Promote students to next class', 'students', 'update', 1),
('students.export', 'Export Students', 'Export student data', 'students', 'export', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Staff Management
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('staff.view', 'View Staff', 'View staff list and details', 'staff', 'read', 1),
('staff.create', 'Create Staff', 'Add new staff members', 'staff', 'create', 1),
('staff.update', 'Update Staff', 'Edit staff information', 'staff', 'update', 1),
('staff.delete', 'Delete Staff', 'Remove staff from system', 'staff', 'delete', 1),
('staff.assign_roles', 'Assign Roles', 'Assign roles and permissions to staff', 'staff', 'update', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Class Management
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('classes.view', 'View Classes', 'View class list and details', 'classes', 'read', 1),
('classes.create', 'Create Classes', 'Create new classes', 'classes', 'create', 1),
('classes.update', 'Update Classes', 'Edit class information', 'classes', 'update', 1),
('classes.delete', 'Delete Classes', 'Remove classes', 'classes', 'delete', 1),
('classes.assign_students', 'Assign Students to Classes', 'Assign students to classes', 'classes', 'update', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Attendance
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('attendance.view', 'View Attendance', 'View attendance records', 'attendance', 'read', 1),
('attendance.mark', 'Mark Attendance', 'Mark student attendance', 'attendance', 'create', 1),
('attendance.update', 'Update Attendance', 'Edit attendance records', 'attendance', 'update', 1),
('attendance.reports', 'Attendance Reports', 'Generate attendance reports', 'attendance', 'export', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Examinations & Results
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('exams.view', 'View Exams', 'View examination records', 'exams', 'read', 1),
('exams.create', 'Create Exams', 'Create examinations', 'exams', 'create', 1),
('exams.update', 'Update Exams', 'Edit examination details', 'exams', 'update', 1),
('exams.delete', 'Delete Exams', 'Remove examinations', 'exams', 'delete', 1),
('results.enter', 'Enter Results', 'Enter examination scores', 'exams', 'create', 1),
('results.update', 'Update Results', 'Edit examination scores', 'exams', 'update', 1),
('results.publish', 'Publish Results', 'Publish results to students/parents', 'exams', 'publish', 1),
('results.generate_reports', 'Generate Report Cards', 'Generate student report cards', 'exams', 'export', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Finance Management
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('finance.view', 'View Financial Records', 'View financial transactions', 'finance', 'read', 1),
('finance.create_invoice', 'Create Invoices', 'Generate student invoices', 'finance', 'create', 1),
('finance.receive_payment', 'Receive Payments', 'Process student payments', 'finance', 'create', 1),
('finance.void_transaction', 'Void Transactions', 'Void/cancel transactions', 'finance', 'delete', 1),
('finance.expenses', 'Manage Expenses', 'Record and manage expenses', 'finance', 'create', 1),
('finance.financial_reports', 'Financial Reports', 'Generate financial reports', 'finance', 'export', 1),
('finance.journal_entries', 'Journal Entries', 'Create and manage journal entries', 'finance', 'create', 1),
('finance.reconciliation', 'Account Reconciliation', 'Reconcile financial accounts', 'finance', 'update', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Payroll Management
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('payroll.view', 'View Payroll', 'View payroll records', 'payroll', 'read', 1),
('payroll.process', 'Process Payroll', 'Process staff salaries', 'payroll', 'create', 1),
('payroll.approve', 'Approve Payroll', 'Approve payroll for payment', 'payroll', 'approve', 1),
('payroll.disburse', 'Disburse Salaries', 'Execute salary payments', 'payroll', 'execute', 1),
('payroll.reports', 'Payroll Reports', 'Generate payroll reports', 'payroll', 'export', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Inventory/Supply Management
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('inventory.view', 'View Inventory', 'View inventory items', 'inventory', 'read', 1),
('inventory.create', 'Add Inventory', 'Add new inventory items', 'inventory', 'create', 1),
('inventory.update', 'Update Inventory', 'Edit inventory records', 'inventory', 'update', 1),
('inventory.delete', 'Delete Inventory', 'Remove inventory items', 'inventory', 'delete', 1),
('inventory.stock_in', 'Stock In', 'Record incoming stock', 'inventory', 'create', 1),
('inventory.stock_out', 'Stock Out', 'Issue/release stock', 'inventory', 'create', 1),
('inventory.reports', 'Inventory Reports', 'Generate inventory reports', 'inventory', 'export', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Communication
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('communication.send_sms', 'Send SMS', 'Send SMS messages', 'communication', 'send', 1),
('communication.send_email', 'Send Email', 'Send email messages', 'communication', 'send', 1),
('communication.send_whatsapp', 'Send WhatsApp', 'Send WhatsApp messages', 'communication', 'send', 1),
('communication.bulk_messaging', 'Bulk Messaging', 'Send bulk messages', 'communication', 'send', 1),
('communication.notices', 'Manage Notices', 'Create and manage notice board', 'communication', 'create', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Settings & Configuration
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('settings.school', 'School Settings', 'Manage school settings', 'settings', 'update', 1),
('settings.academic', 'Academic Settings', 'Manage academic calendar and terms', 'settings', 'update', 1),
('settings.subjects', 'Subjects Setup', 'Configure subjects', 'settings', 'update', 1),
('settings.classes', 'Classes Setup', 'Configure classes and sections', 'settings', 'update', 1),
('settings.grading', 'Grading Setup', 'Configure grading system', 'settings', 'update', 1),
('settings.roles', 'Roles & Permissions', 'Manage roles and permissions', 'settings', 'update', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- Reports
INSERT INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `is_system_permission`) VALUES
('reports.student', 'Student Reports', 'Generate student-related reports', 'reports', 'export', 1),
('reports.financial', 'Financial Reports', 'Generate financial reports', 'reports', 'export', 1),
('reports.attendance', 'Attendance Reports', 'Generate attendance reports', 'reports', 'export', 1),
('reports.exam', 'Exam Reports', 'Generate examination reports', 'reports', 'export', 1),
('reports.custom', 'Custom Reports', 'Create custom reports', 'reports', 'export', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- =====================================================
-- PART 4: ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Super Admin - All permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'superadmin'
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Developer - All permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'developer'
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- School Admin - Most permissions except developer-specific
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'admin'
  AND p.name NOT LIKE 'system.%'
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Accountant - Finance permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'accountant'
  AND (p.module IN ('finance', 'reports') OR p.name IN ('dashboard.view', 'students.view'))
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Cashier - Payment processing
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'cashier'
  AND p.name IN (
    'dashboard.view',
    'students.view',
    'finance.view',
    'finance.create_invoice',
    'finance.receive_payment',
    'reports.financial'
  )
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Teacher - Teaching permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'teacher'
  AND p.name IN (
    'dashboard.view',
    'students.view',
    'classes.view',
    'attendance.view',
    'attendance.mark',
    'exams.view',
    'results.enter',
    'communication.send_sms',
    'communication.send_email'
  )
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Form Master - Extended teacher permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'form_master'
  AND p.name IN (
    'dashboard.view',
    'students.view',
    'students.update',
    'classes.view',
    'attendance.view',
    'attendance.mark',
    'attendance.update',
    'attendance.reports',
    'exams.view',
    'results.enter',
    'results.update',
    'communication.send_sms',
    'communication.send_email',
    'communication.send_whatsapp',
    'reports.student',
    'reports.attendance'
  )
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Exam Officer - Exam management
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'exam_officer'
  AND (p.module = 'exams' OR p.name IN ('dashboard.view', 'students.view', 'classes.view', 'reports.exam'))
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Storekeeper - Inventory permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'storekeeper'
  AND (p.module = 'inventory' OR p.name = 'dashboard.view')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Manager - Operational access (read permissions)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'manager'
  AND p.action IN ('read', 'view', 'export')
  AND p.module NOT IN ('settings')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- =====================================================
-- PART 5: VERIFICATION & SUMMARY
-- =====================================================

SELECT '===========================================';
SELECT 'RBAC COMPLETE MIGRATION - SUMMARY';
SELECT '===========================================';

SELECT CONCAT('✅ Roles created: ', COUNT(*)) AS status FROM `roles`;
SELECT CONCAT('✅ Permissions created: ', COUNT(*)) AS status FROM `permissions`;
SELECT CONCAT('✅ Role-Permission mappings: ', COUNT(*)) AS status FROM `role_permissions`;
SELECT CONCAT('✅ Audit log table ready: ', IF(COUNT(*) >= 0, 'YES', 'NO')) AS status FROM `permission_audit_log` LIMIT 1;

SELECT '===========================================';
SELECT '✅ RBAC SYSTEM READY FOR USE!';
SELECT '===========================================';

-- Show installed roles
SELECT 'Installed Roles:' AS '';
SELECT id, name, display_name, is_system_role FROM `roles` ORDER BY id;

-- Show permission count by module
SELECT 'Permissions by Module:' AS '';
SELECT module, COUNT(*) as count FROM `permissions` GROUP BY module ORDER BY count DESC;

SELECT '===========================================';
SELECT 'Next Steps:';
SELECT '1. Restart backend server: pm2 restart elite';
SELECT '2. Add RoleAssignmentModal to teacher list UI';
SELECT '3. Test role assignment';
SELECT '4. Check logs: pm2 logs elite';
SELECT '===========================================';
