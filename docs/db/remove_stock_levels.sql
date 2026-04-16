-- Remove Stock Levels from RBAC menu items
DELETE FROM rbac_menu_items 
WHERE menu_name = 'Stock Levels' 
   OR menu_path = '/supply-management/inventory/stock'
   OR menu_key = 'stockManagement';

-- Also remove any related permissions
DELETE FROM rbac_role_permissions 
WHERE menu_item_id IN (
    SELECT menu_item_id FROM rbac_menu_items 
    WHERE menu_name = 'Stock Levels' 
       OR menu_path = '/supply-management/inventory/stock'
);

-- Verify removal
SELECT * FROM rbac_menu_items WHERE menu_name LIKE '%Stock%';
