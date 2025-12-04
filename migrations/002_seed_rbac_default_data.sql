-- =====================================================
-- RBAC System Seeder - Elite Scholar
-- Description: Seed default roles and permissions
-- Author: Claude Code
-- Date: 2025-11-19
-- =====================================================

-- =================
-- 1. SEED SYSTEM ROLES
-- =================
INSERT INTO `roles` (`name`, `display_name`, `description`, `is_system_role`, `school_id`, `branch_id`) VALUES
-- Super Admin (system-wide)
('superadmin', 'Super Administrator', 'Full system access across all schools', 1, NULL, NULL),
('developer', 'Developer', 'Technical access for system maintenance', 1, NULL, NULL),

-- School-level roles (school_id will be set when creating school-specific instances)
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
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- =================
-- 2. SEED PERMISSIONS
-- =================

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

-- =================
-- 3. ASSIGN PERMISSIONS TO ROLES
-- =================

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

-- Manager - Operational access
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'manager'
  AND p.action IN ('read', 'view', 'export')
  AND p.module NOT IN ('settings')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- =================
-- SUCCESS MESSAGE
-- =================
SELECT 'RBAC roles and permissions seeded successfully!' AS status;
SELECT COUNT(*) AS total_roles FROM `roles`;
SELECT COUNT(*) AS total_permissions FROM `permissions`;
SELECT COUNT(*) AS total_role_permissions FROM `role_permissions`;
