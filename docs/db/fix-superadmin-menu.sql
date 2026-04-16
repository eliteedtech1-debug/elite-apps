-- Fix superadmin menu access
-- Update the menu cache to allow superadmin access to developer items

UPDATE rbac_menu_cache 
SET menu_data = REPLACE(
  menu_data, 
  '"requiredAccess": ["developer"]',
  '"requiredAccess": ["developer", "superadmin"]'
)
WHERE id = (SELECT MAX(id) FROM rbac_menu_cache);

-- Also update the Developer section name to be more appropriate
UPDATE rbac_menu_cache 
SET menu_data = REPLACE(
  menu_data, 
  '"name": "Developer"',
  '"name": "Super Admin"'
)
WHERE id = (SELECT MAX(id) FROM rbac_menu_cache);
