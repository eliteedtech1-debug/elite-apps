-- Notification Triggers Configuration
-- Database: elite_logs

USE elite_logs;

-- Add retention policy to system_notifications
ALTER TABLE `system_notifications` 
ADD COLUMN `retention_policy` enum('permanent','temporary','auto_delete') DEFAULT 'permanent',
ADD COLUMN `expires_at` timestamp NULL DEFAULT NULL,
ADD COLUMN `auto_delete_after_read` tinyint(1) DEFAULT 0;

-- Notification types and their retention policies
CREATE TABLE IF NOT EXISTS `notification_triggers` (
  `id` char(36) NOT NULL DEFAULT (UUID()),
  `trigger_event` varchar(100) NOT NULL,
  `title_template` varchar(255) NOT NULL,
  `message_template` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `retention_policy` enum('permanent','temporary','auto_delete') DEFAULT 'permanent',
  `retention_days` int DEFAULT NULL,
  `auto_delete_after_read` tinyint(1) DEFAULT 0,
  `notify_roles` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_trigger_event` (`trigger_event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default notification triggers
INSERT INTO `notification_triggers` 
(`trigger_event`, `title_template`, `message_template`, `category`, `retention_policy`, `retention_days`, `auto_delete_after_read`, `notify_roles`) 
VALUES
-- PERMANENT NOTIFICATIONS (Important, keep forever)
('assignment_published', 'New Assignment: {{title}}', 'Assignment "{{title}}" has been published for {{class}}. Due date: {{due_date}}', 'academic', 'permanent', NULL, 0, '["student", "parent"]'),
('assignment_deadline_reminder', 'Assignment Due Soon: {{title}}', 'Reminder: Assignment "{{title}}" is due on {{due_date}}', 'academic', 'permanent', NULL, 0, '["student", "parent"]'),
('virtual_class_scheduled', 'Virtual Class: {{subject}}', 'Virtual class for {{subject}} scheduled on {{date}} at {{time}}', 'academic', 'permanent', NULL, 0, '["student", "teacher", "parent"]'),
('role_assigned', 'New Role Assigned', 'You have been assigned the role: {{role_name}}', 'system', 'permanent', NULL, 0, '["teacher", "staff"]'),
('exam_published', 'Exam Scheduled: {{exam_name}}', 'Exam "{{exam_name}}" scheduled for {{date}}', 'academic', 'permanent', NULL, 0, '["student", "parent", "teacher"]'),
('result_published', 'Results Published: {{exam_name}}', 'Your results for {{exam_name}} are now available', 'academic', 'permanent', NULL, 0, '["student", "parent"]'),
('fee_invoice', 'Fee Invoice: {{term}}', 'New fee invoice for {{term}} - Amount: {{amount}}', 'finance', 'permanent', NULL, 0, '["student", "parent"]'),
('payment_received', 'Payment Confirmed', 'Payment of {{amount}} received for {{description}}', 'finance', 'permanent', NULL, 0, '["student", "parent"]'),

-- TEMPORARY NOTIFICATIONS (Keep for limited time)
('attendance_marked', 'Attendance Marked', 'Your attendance has been marked for {{date}}', 'attendance', 'temporary', 7, 1, '["student"]'),
('class_cancelled', 'Class Cancelled: {{subject}}', 'Class for {{subject}} on {{date}} has been cancelled', 'academic', 'temporary', 3, 0, '["student", "teacher", "parent"]'),
('homework_reminder', 'Homework Reminder', 'Don\'t forget your homework for {{subject}}', 'academic', 'temporary', 2, 1, '["student"]'),
('meeting_reminder', 'Meeting Reminder', 'Meeting scheduled for {{date}} at {{time}}', 'general', 'temporary', 1, 1, '["teacher", "staff"]'),

-- AUTO-DELETE NOTIFICATIONS (Delete after read)
('login_alert', 'New Login Detected', 'New login from {{device}} at {{time}}', 'security', 'auto_delete', NULL, 1, '["all"]'),
('password_changed', 'Password Changed', 'Your password was changed successfully', 'security', 'auto_delete', NULL, 1, '["all"]'),
('document_uploaded', 'Document Uploaded', 'Document "{{filename}}" uploaded successfully', 'general', 'auto_delete', NULL, 1, '["all"]'),
('notice_published', 'New Notice: {{title}}', '{{description}}', 'announcement', 'permanent', NULL, 0, '["all"]');
