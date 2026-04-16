-- =====================================================
-- Student ID Card Generator - RBAC Menu Integration
-- Date: 2026-01-02
-- Description: Add Student ID Card Generator to RBAC menu system
-- =====================================================

-- 1. Add Student ID Card Generator feature to features table
INSERT INTO features (feature_key, feature_name, description, is_active, menu_label, menu_icon, route_path, is_menu_item, display_order, created_at, updated_at) VALUES
('student_id_card_generator', 'Student ID Card Generator', 'Generate and manage student ID cards with customizable templates', TRUE, 'ID Card Generator', 'ti ti-id-badge-2', '/academic/id-card-generator', TRUE, 50, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  feature_name = VALUES(feature_name),
  description = VALUES(description),
  menu_label = VALUES(menu_label),
  menu_icon = VALUES(menu_icon),
  route_path = VALUES(route_path);

-- 2. Update subscription packages to include ID Card Generator
UPDATE subscription_packages 
SET features = JSON_ARRAY_APPEND(features, '$', 'student_id_card_generator')
WHERE package_name IN ('premium', 'elite') 
AND NOT JSON_CONTAINS(features, '"student_id_card_generator"');

-- 3. Add to superadmin features for Developer user (ID 1)
INSERT INTO superadmin_features (superadmin_user_id, feature_id, granted_by, is_active)
SELECT 1, f.id, 1, TRUE
FROM features f 
WHERE f.feature_key = 'student_id_card_generator'
AND NOT EXISTS (
  SELECT 1 FROM superadmin_features sf 
  WHERE sf.superadmin_user_id = 1 AND sf.feature_id = f.id
);

-- 4. Update RBAC menu cache to include ID Card Generator
UPDATE rbac_menu_cache 
SET menu_data = JSON_SET(
  menu_data,
  '$[0].items[2]',
  JSON_OBJECT(
    'key', 'ID_CARD_GENERATOR',
    'label', 'ID Card Generator',
    'icon', 'ti ti-id-badge-2',
    'link', '/academic/id-card-generator',
    'feature', 'student_id_card_generator',
    'premium', true,
    'requiredAccess', JSON_ARRAY('admin', 'branchadmin'),
    'submenu', true,
    'submenuItems', JSON_ARRAY(
      JSON_OBJECT('label', 'Generate ID Cards', 'link', '/academic/id-card-generator'),
      JSON_OBJECT('label', 'Template Manager', 'link', '/academic/id-card-templates'),
      JSON_OBJECT('label', 'Batch Processing', 'link', '/academic/id-card-batch')
    )
  )
)
WHERE id = (SELECT MAX(id) FROM (SELECT id FROM rbac_menu_cache) AS temp);

-- 5. Update users table to include ID Card Generator in allowed_features
UPDATE users 
SET allowed_features = CASE 
  WHEN allowed_features IS NULL THEN JSON_ARRAY('student_id_card_generator')
  WHEN NOT JSON_CONTAINS(allowed_features, '"student_id_card_generator"') THEN JSON_ARRAY_APPEND(allowed_features, '$', 'student_id_card_generator')
  ELSE allowed_features
END
WHERE user_type IN ('Admin', 'SuperAdmin', 'Developer');

SELECT 'Student ID Card Generator added to RBAC menu successfully' AS status;
