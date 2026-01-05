-- Create RBAC menu tables and add ID Card Generator

-- 1. Create rbac_menu_items table
CREATE TABLE IF NOT EXISTS rbac_menu_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NULL,
  link VARCHAR(200) NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES rbac_menu_items(id) ON DELETE CASCADE
);

-- 2. Create rbac_menu_access table
CREATE TABLE IF NOT EXISTS rbac_menu_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  menu_item_id INT NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  school_id VARCHAR(20) NULL,
  valid_from DATE NULL,
  valid_until DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES rbac_menu_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_access (menu_item_id, user_type, school_id)
);

-- 3. Insert main menu categories
INSERT INTO rbac_menu_items (id, parent_id, label, icon, link, sort_order) VALUES
(1, NULL, 'Personal Data Mngr', NULL, NULL, 1),
(2, NULL, 'Class Management', NULL, NULL, 2),
(3, NULL, 'General Setups', NULL, NULL, 3),
(4, NULL, 'Exams & Records', NULL, NULL, 4),
(5, NULL, 'Express Finance', NULL, NULL, 5),
(6, NULL, 'Messaging', NULL, NULL, 6);

-- 4. Insert Students List submenu
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order) VALUES
(1, 'Staff', 'ti ti-users', '', 10),
(1, 'Parents', 'ti ti-users', NULL, 20),
(1, 'Students List', 'ti ti-school', NULL, 30),
(1, 'Student Attendance', 'ti ti-calendar-check', NULL, 40);

-- Get the Students List menu item ID
SET @students_list_id = (SELECT id FROM rbac_menu_items WHERE label = 'Students List' AND parent_id = 1);

-- 5. Insert Students List submenu items
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order) VALUES
(@students_list_id, 'Student List', 'ti ti-list', '/student/student-list', 10),
(@students_list_id, 'Class List', 'ti ti-classes', '/academic/class-list', 20),
(@students_list_id, 'Promotion & Graduation', NULL, '/students/promotion', 30),
(@students_list_id, 'ID Card Generator', 'ti ti-id-badge', '/student/id-card-generator', 40);

-- 6. Grant access to Admin and Branch Admin for all menu items
INSERT INTO rbac_menu_access (menu_item_id, user_type)
SELECT id, 'Admin' FROM rbac_menu_items WHERE is_active = 1;

INSERT INTO rbac_menu_access (menu_item_id, user_type)
SELECT id, 'Branch Admin' FROM rbac_menu_items WHERE is_active = 1;

-- 7. Clear cache
DELETE FROM rbac_menu_cache;

SELECT 'RBAC menu tables created and ID Card Generator added' AS result;
