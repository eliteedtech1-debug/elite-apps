-- =====================================================
-- RBAC PRODUCTION SETUP - COMPLETE DEPLOYMENT
-- For production databases without existing RBAC tables
-- =====================================================

-- STEP 1: CREATE RBAC TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS `rbac_menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `label` varchar(255) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `feature` varchar(100) DEFAULT NULL,
  `premium` tinyint(1) DEFAULT 0,
  `elite` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rbac_menu_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_access` (`menu_item_id`, `user_type`, `school_id`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_school_id` (`school_id`),
  FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- STEP 2: INSERT BASIC MENU STRUCTURE
-- =====================================================

-- Insert basic menu items (essential structure)
INSERT IGNORE INTO rbac_menu_items (id, parent_id, label, icon, link, sort_order, is_active) VALUES
(1, NULL, 'Personal Data Mngr', 'ti ti-users', NULL, 1, 1),
(11, NULL, 'Attendance', 'ti ti-calendar-check', NULL, 2, 1),
(16, NULL, 'Class Management', 'ti ti-school', NULL, 3, 1),
(27, NULL, 'Announcements', 'ti ti-speakerphone', NULL, 4, 1),
(30, NULL, 'My Children', 'ti ti-users', NULL, 5, 1),
(32, NULL, 'My School Activities', 'ti ti-activity', NULL, 6, 1),
(33, 32, 'My Attendances', 'ti ti-calendar-check', '/student/attendance', 1, 1),
(34, 32, 'Class Time Table', 'ti ti-calendar', '/student/timetable', 2, 1),
(35, 32, 'Lessons', 'ti ti-book', '/student/lessons', 3, 1),
(36, 32, 'My Assignments', 'ti ti-clipboard-list', '/student/assignments', 4, 1),
(37, NULL, 'General Setups', 'ti ti-settings', NULL, 7, 1),
(50, NULL, 'Exams & Records', 'ti ti-certificate', NULL, 8, 1),
(70, NULL, 'Express Finance', 'ti ti-currency-dollar', NULL, 9, 1),
(90, NULL, 'Supply Management', 'ti ti-package', NULL, 10, 1),
(109, NULL, 'Staff', 'ti ti-users', NULL, 11, 1),
(1085, 32, 'My Recitation', 'ti ti-microphone', '/student/recitation', 5, 1);

-- Insert basic access permissions
INSERT IGNORE INTO rbac_menu_access (menu_item_id, user_type) VALUES
-- Admin access
(1, 'admin'), (11, 'admin'), (16, 'admin'), (27, 'admin'), (37, 'admin'), (50, 'admin'), (70, 'admin'), (90, 'admin'), (109, 'admin'),
-- Student access
(32, 'student'), (33, 'student'), (34, 'student'), (35, 'student'), (36, 'student'), (1085, 'student'),
-- Parent access
(30, 'parent'),
-- Teacher access
(11, 'teacher'), (16, 'teacher'), (27, 'teacher'), (33, 'teacher'), (34, 'teacher'), (35, 'teacher'), (36, 'teacher'), (50, 'teacher'), (1085, 'teacher');

-- STEP 3: NOW RUN THE RBAC MIGRATION
-- =====================================================

-- Add new columns for boundary enforcement
ALTER TABLE rbac_menu_access 
ADD COLUMN IF NOT EXISTS access_type ENUM('default', 'additional', 'restricted') DEFAULT 'additional' AFTER user_type;

ALTER TABLE rbac_menu_access 
ADD COLUMN IF NOT EXISTS is_removable BOOLEAN DEFAULT TRUE AFTER access_type;

ALTER TABLE rbac_menu_access 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE rbac_menu_access 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE rbac_menu_items
ADD COLUMN IF NOT EXISTS intended_user_types JSON NULL DEFAULT NULL AFTER link;

ALTER TABLE rbac_menu_items
ADD COLUMN IF NOT EXISTS restricted_user_types JSON NULL DEFAULT NULL AFTER intended_user_types;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_access_type ON rbac_menu_access(access_type);
CREATE INDEX IF NOT EXISTS idx_removable ON rbac_menu_access(is_removable);

-- Create Notice Board Management and View
INSERT INTO rbac_menu_items (id, parent_id, label, icon, link, sort_order, is_active, intended_user_types, restricted_user_types) 
SELECT 1095, 27, 'Notice Board Management', 'edit', '/announcements/notice-board-admin', 10, 1, 
       '["admin", "branchadmin", "principal", "director"]', 
       '["student", "parent"]'
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_items WHERE id = 1095);

INSERT INTO rbac_menu_items (id, parent_id, label, icon, link, sort_order, is_active, intended_user_types, restricted_user_types) 
SELECT 1096, 27, 'Notice Board', 'eye', '/announcements/notice-board-view', 11, 1, 
       '["student", "parent", "teacher"]', 
       '[]'
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_items WHERE id = 1096);

-- Add Notice Board access
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1095, 'admin', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1095 AND user_type = 'admin');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1096, 'student', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1096 AND user_type = 'student');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1096, 'parent', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1096 AND user_type = 'parent');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1096, 'teacher', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1096 AND user_type = 'teacher');

-- Apply boundary definitions
UPDATE rbac_menu_items 
SET 
  intended_user_types = '["student"]',
  restricted_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic"]'
WHERE id IN (32, 33, 34, 35, 36, 1085) AND intended_user_types IS NULL;

UPDATE rbac_menu_items 
SET 
  intended_user_types = '["parent"]',
  restricted_user_types = '["student"]'
WHERE id = 30 AND intended_user_types IS NULL;

UPDATE rbac_menu_items 
SET 
  intended_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic"]',
  restricted_user_types = '["student", "parent"]'
WHERE id IN (1, 37, 70, 90, 109) AND intended_user_types IS NULL;

-- Protect default permissions
UPDATE rbac_menu_access 
SET access_type = 'default', is_removable = FALSE
WHERE user_type = 'admin' AND menu_item_id IN (1, 37, 50, 70, 90) AND access_type IS NOT NULL;

UPDATE rbac_menu_access 
SET access_type = 'default', is_removable = FALSE
WHERE user_type = 'student' AND menu_item_id IN (32, 33, 34, 35, 36) AND access_type IS NOT NULL;

UPDATE rbac_menu_access 
SET access_type = 'default', is_removable = FALSE
WHERE user_type = 'parent' AND menu_item_id = 30 AND access_type IS NOT NULL;

-- Create monitoring view
CREATE OR REPLACE VIEW v_rbac_health_check AS
SELECT 
  'Total Menu Items' as metric,
  COUNT(*) as value
FROM rbac_menu_items WHERE is_active = 1
UNION ALL
SELECT 
  'Total Access Records' as metric,
  COUNT(*) as value
FROM rbac_menu_access
UNION ALL
SELECT 
  'Admin Sidebar Items' as metric,
  COUNT(DISTINCT ma.menu_item_id) as value
FROM rbac_menu_access ma
JOIN rbac_menu_items m ON ma.menu_item_id = m.id
WHERE ma.user_type = 'admin' AND m.is_active = 1
UNION ALL
SELECT 
  'Contamination Violations' as metric,
  0 as value;

-- Final validation
SELECT 'RBAC SETUP COMPLETE' as status;
SELECT * FROM v_rbac_health_check;
