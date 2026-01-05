-- Quick fix to add ID Card Generator to menu
-- Run this in your database

-- 1. Get the feature ID
SET @feature_id = (SELECT id FROM features WHERE feature_key = 'student_id_card_generator');

-- 2. Add permissions for Admin role
INSERT IGNORE INTO role_permissions (role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export)
SELECT r.role_id, @feature_id, 1, 1, 1, 0, 1
FROM roles r 
WHERE r.user_type = 'Admin';

-- 3. Add permissions for Branch Admin role  
INSERT IGNORE INTO role_permissions (role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export)
SELECT r.role_id, @feature_id, 1, 1, 1, 0, 1
FROM roles r 
WHERE r.user_type = 'Branch Admin';

-- 4. Clear RBAC cache
DELETE FROM rbac_menu_cache;

SELECT 'ID Card Generator added to menu' AS result;
