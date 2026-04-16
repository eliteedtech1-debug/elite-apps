-- Add "My Pay Slip" menu item for teachers
-- This should be added alongside "My Attendance" in the teacher menu

-- First, let's find the parent menu where "My Attendance" is located
-- Based on the search results, it seems to be under a teacher-specific section

-- Insert the new menu item
INSERT INTO rbac_menu_items (
  parent_id, 
  label, 
  icon, 
  link, 
  required_access, 
  required_permissions, 
  sort_order, 
  is_active, 
  feature, 
  premium, 
  elite, 
  created_at, 
  updated_at
) VALUES (
  NULL, -- Will be updated based on where "My Attendance" is located
  'My Pay Slip',
  'ti ti-receipt',
  '/my-payslip',
  NULL,
  NULL,
  2, -- Order after "My Attendance"
  1, -- Active
  'payroll',
  0, -- Not premium
  0, -- Not elite
  NOW(),
  NOW()
);

-- Get the ID of the newly inserted menu item
SET @my_payslip_menu_id = LAST_INSERT_ID();

-- Add access permissions for teachers only
INSERT INTO rbac_menu_access (menu_item_id, user_type, valid_from, valid_until, school_id) VALUES
(@my_payslip_menu_id, 'teacher', NULL, NULL, NULL);

-- If there's a specific parent menu for teacher items, update the parent_id
-- This query will need to be adjusted based on the actual menu structure
-- UPDATE rbac_menu_items 
-- SET parent_id = (SELECT id FROM rbac_menu_items WHERE label = 'Teacher Menu' LIMIT 1)
-- WHERE id = @my_payslip_menu_id;

SELECT 'My Pay Slip menu item added successfully' as status;