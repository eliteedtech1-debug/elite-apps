-- Add WhatsApp System Configuration to RBAC menu for developers
-- This is for system-level WhatsApp configuration (OTPs, auth, admin notifications)
-- Different from school-level WhatsApp communication

-- Find the Super Admin parent menu ID
SET @super_admin_id = (SELECT id FROM rbac_menu_items WHERE label = 'Super Admin' AND parent_id IS NULL LIMIT 1);

-- Insert WhatsApp System Configuration menu item
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order) VALUES
(@super_admin_id, 'WhatsApp System Config', 'ti ti-brand-whatsapp', '/app/whatsapp-system-config', 50);

-- Get the menu item ID
SET @whatsapp_config_id = LAST_INSERT_ID();

-- Grant access to developers
INSERT INTO rbac_menu_access (menu_item_id, user_type) VALUES
(@whatsapp_config_id, 'developer');

-- Add to all packages (since it's developer-only)
INSERT INTO rbac_menu_packages (menu_item_id, package_id)
SELECT @whatsapp_config_id, id FROM subscription_packages;
