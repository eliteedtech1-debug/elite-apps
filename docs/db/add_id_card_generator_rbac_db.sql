-- =====================================================
-- Student ID Card Generator - Database-Driven RBAC Integration
-- Date: 2026-01-02
-- Description: Add Student ID Card Generator to database-driven RBAC system
-- =====================================================

-- 1. Add feature category for Student Management (if not exists)
INSERT INTO feature_categories (category_name, description, display_order, is_active, created_at, updated_at) VALUES
('Student Management', 'Student data and document management features', 2, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  display_order = VALUES(display_order);

-- 2. Add Student ID Card Generator feature to features table
INSERT INTO features (
  feature_key, 
  feature_name, 
  description, 
  category_id,
  is_active, 
  menu_label, 
  menu_icon, 
  route_path, 
  is_menu_item, 
  display_order,
  required_user_types,
  parent_feature_key,
  created_at, 
  updated_at
) VALUES (
  'student_id_card_generator',
  'Student ID Card Generator',
  'Generate and manage student ID cards with customizable templates',
  (SELECT id FROM feature_categories WHERE category_name = 'Student Management' LIMIT 1),
  TRUE,
  'ID Card Generator',
  'ti ti-id-badge-2',
  '/academic/id-card-generator',
  TRUE,
  25,
  JSON_ARRAY('admin', 'branchadmin'),
  'students',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  feature_name = VALUES(feature_name),
  description = VALUES(description),
  menu_label = VALUES(menu_label),
  menu_icon = VALUES(menu_icon),
  route_path = VALUES(route_path),
  display_order = VALUES(display_order),
  required_user_types = VALUES(required_user_types);

-- 3. Update subscription packages to include ID Card Generator
UPDATE subscription_packages 
SET features = JSON_ARRAY_APPEND(features, '$', 'student_id_card_generator')
WHERE package_name IN ('premium', 'elite') 
AND NOT JSON_CONTAINS(features, '"student_id_card_generator"');

-- 4. Add default role permissions for ID Card Generator
INSERT INTO role_permissions (role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export, created_at, updated_at)
SELECT 
  r.id as role_id,
  f.id as feature_id,
  TRUE as can_view,
  TRUE as can_create,
  TRUE as can_edit,
  FALSE as can_delete,
  TRUE as can_export,
  NOW() as created_at,
  NOW() as updated_at
FROM roles r
CROSS JOIN features f
WHERE r.role_name IN ('Admin', 'Branch Admin', 'SuperAdmin')
AND f.feature_key = 'student_id_card_generator'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id AND rp.feature_id = f.id
);

-- 5. Add to superadmin features for Developer user (ID 1)
INSERT INTO superadmin_features (superadmin_user_id, feature_id, granted_by, is_active, created_at)
SELECT 1, f.id, 1, TRUE, NOW()
FROM features f 
WHERE f.feature_key = 'student_id_card_generator'
AND NOT EXISTS (
  SELECT 1 FROM superadmin_features sf 
  WHERE sf.superadmin_user_id = 1 AND sf.feature_id = f.id
);

-- 6. Update users table to include ID Card Generator in allowed_features
UPDATE users 
SET allowed_features = CASE 
  WHEN allowed_features IS NULL THEN JSON_ARRAY('student_id_card_generator')
  WHEN NOT JSON_CONTAINS(allowed_features, '"student_id_card_generator"') THEN JSON_ARRAY_APPEND(allowed_features, '$', 'student_id_card_generator')
  ELSE allowed_features
END
WHERE user_type IN ('Admin', 'SuperAdmin', 'Developer');

-- 7. Clear RBAC cache to force menu refresh
DELETE FROM rbac_menu_cache;

SELECT 'Student ID Card Generator added to database-driven RBAC system successfully' AS status;
