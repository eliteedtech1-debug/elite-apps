-- =====================================================
-- RBAC PRODUCTION MIGRATION - MySQL 5.5 Compatible
-- Safe deployment for older MySQL versions
-- =====================================================

-- STEP 1: CREATE SAFETY BACKUP
CREATE TABLE rbac_menu_access_backup_prod_20260119 AS 
SELECT * FROM rbac_menu_access;

CREATE TABLE rbac_menu_items_backup_prod_20260119 AS 
SELECT * FROM rbac_menu_items;

-- STEP 2: ADD NEW COLUMNS (MySQL 5.5 Compatible)
ALTER TABLE rbac_menu_access 
ADD COLUMN access_type ENUM('default', 'additional', 'restricted') DEFAULT 'additional' AFTER user_type;

ALTER TABLE rbac_menu_access 
ADD COLUMN is_removable BOOLEAN DEFAULT TRUE AFTER access_type;

ALTER TABLE rbac_menu_access 
ADD COLUMN created_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE rbac_menu_access 
ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL;

-- Use TEXT instead of JSON for MySQL 5.5
ALTER TABLE rbac_menu_items
ADD COLUMN intended_user_types TEXT DEFAULT NULL AFTER link;

ALTER TABLE rbac_menu_items
ADD COLUMN restricted_user_types TEXT DEFAULT NULL AFTER intended_user_types;

-- STEP 3: REMOVE CONTAMINATED ACCESS
DELETE FROM rbac_menu_access 
WHERE menu_item_id IN (32, 33, 34, 35, 36, 1085)
AND user_type IN ('admin', 'branchadmin', 'director', 'principal', 'vp_academic');

DELETE FROM rbac_menu_access 
WHERE menu_item_id = 30
AND user_type IN ('admin', 'branchadmin', 'director', 'principal', 'vp_academic');

-- STEP 4: CREATE NOTICE BOARD ITEMS
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

UPDATE rbac_menu_items SET is_active = 0 WHERE id = 29;

-- STEP 5: ADD ACCESS PERMISSIONS
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1095, 'admin', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1095 AND user_type = 'admin');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1095, 'branchadmin', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1095 AND user_type = 'branchadmin');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1096, 'student', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1096 AND user_type = 'student');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1096, 'parent', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1096 AND user_type = 'parent');

INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) 
SELECT 1096, 'teacher', 'default', FALSE
WHERE NOT EXISTS (SELECT 1 FROM rbac_menu_access WHERE menu_item_id = 1096 AND user_type = 'teacher');

-- STEP 6: APPLY BOUNDARY DEFINITIONS (TEXT format for MySQL 5.5)
UPDATE rbac_menu_items 
SET 
  intended_user_types = '["student"]',
  restricted_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic"]'
WHERE id IN (32, 33, 34, 35, 36, 1085) AND intended_user_types IS NULL;

UPDATE rbac_menu_items 
SET 
  intended_user_types = '["parent"]',
  restricted_user_types = '["student"]'
WHERE id IN (30, 31) AND intended_user_types IS NULL;

UPDATE rbac_menu_items 
SET 
  intended_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic"]',
  restricted_user_types = '["student", "parent"]'
WHERE id IN (1, 37, 70, 90, 109) AND intended_user_types IS NULL;

-- STEP 7: PROTECT DEFAULT PERMISSIONS
UPDATE rbac_menu_access 
SET access_type = 'default', is_removable = FALSE
WHERE user_type = 'admin' AND menu_item_id IN (1, 37, 50, 70, 90);

UPDATE rbac_menu_access 
SET access_type = 'default', is_removable = FALSE
WHERE user_type = 'student' AND menu_item_id IN (32, 33, 34, 35, 36);

UPDATE rbac_menu_access 
SET access_type = 'default', is_removable = FALSE
WHERE user_type = 'parent' AND menu_item_id IN (30, 31);

-- STEP 8: CREATE MONITORING VIEW (MySQL 5.5 Compatible)
DROP VIEW IF EXISTS v_rbac_health_check;

CREATE VIEW v_rbac_health_check AS
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
  COUNT(*) as value
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1
  AND m.id IN (32, 33, 34, 35, 36, 30)
  AND ma.user_type = 'admin';

-- STEP 9: VALIDATION
SELECT 'RBAC MIGRATION COMPLETE - MySQL 5.5 Compatible' as status;

SELECT * FROM v_rbac_health_check;
