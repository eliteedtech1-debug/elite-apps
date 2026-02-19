-- Add missing syllabus features to RBAC menu items
-- Daily Routine section (parent_id = 17)

INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order) VALUES
(17, 'My Teaching Hub', 'ti ti-dashboard', '/academic/teacher-syllabus-hub', 25),
(17, 'Create Lesson Plan', 'ti ti-plus', '/academic/lesson-plan-creator', 26),
(17, 'Browse Curriculum', 'ti ti-search', '/academic/curriculum-browser', 27),
(17, 'Generate Assessment', 'ti ti-clipboard-check', '/academic/assessment-generator', 28),
(17, 'Subject Mapping', 'ti ti-link', '/academic/subject-mapping', 29);

-- Add to School Setup section (find parent_id for School Setup)
SET @school_setup_id = (SELECT id FROM rbac_menu_items WHERE label = 'School Setup' AND parent_id IS NOT NULL LIMIT 1);

INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order) VALUES
(@school_setup_id, 'Subject Mapping', 'ti ti-link', '/academic/subject-mapping', 150);

-- Add menu access for different user types
INSERT INTO rbac_menu_access (menu_item_id, user_type) 
SELECT id, 'teacher' FROM rbac_menu_items WHERE label IN ('My Teaching Hub', 'Create Lesson Plan', 'Browse Curriculum', 'Generate Assessment');

INSERT INTO rbac_menu_access (menu_item_id, user_type) 
SELECT id, 'admin' FROM rbac_menu_items WHERE label = 'Subject Mapping';

INSERT INTO rbac_menu_access (menu_item_id, user_type) 
SELECT id, 'branchadmin' FROM rbac_menu_items WHERE label = 'Subject Mapping';

-- Add to premium/elite packages (2=premium, 1=elite)
INSERT INTO rbac_menu_packages (menu_item_id, package_id) 
SELECT id, 2 FROM rbac_menu_items WHERE label IN ('My Teaching Hub', 'Create Lesson Plan', 'Browse Curriculum', 'Generate Assessment');

INSERT INTO rbac_menu_packages (menu_item_id, package_id) 
SELECT id, 1 FROM rbac_menu_items WHERE label = 'Subject Mapping';
