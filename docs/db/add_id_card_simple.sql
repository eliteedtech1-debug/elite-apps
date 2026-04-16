-- Add ID Card Generator permission
INSERT INTO permissions (permission_name, description) 
VALUES ('ID Card Generator', 'Generate student ID cards with templates');

-- Get the permission ID
SET @permission_id = LAST_INSERT_ID();

-- Add to role_permissions for Admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @permission_id 
FROM roles 
WHERE user_type IN ('Admin', 'Branch Admin');

-- Clear cache
DELETE FROM rbac_menu_cache;

SELECT 'ID Card Generator permission added' AS result;
