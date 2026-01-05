-- ============================================================================
-- Student ID Card Generator - RBAC Menu Integration
-- Date: 2026-01-02
-- Description: Add Student ID Card Generator to RBAC menu system
-- ============================================================================

-- Add Student ID Card Generator feature
INSERT INTO features (feature_key, feature_name, description, is_active, created_at, updated_at) VALUES
('student_id_card_generator', 'Student ID Card Generator', 'Generate and manage student ID cards with customizable templates', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  feature_name = VALUES(feature_name),
  description = VALUES(description);

-- Update subscription packages to include ID Card Generator
UPDATE subscription_packages 
SET features = JSON_ARRAY_APPEND(features, '$', 'student_id_card_generator')
WHERE package_name IN ('premium', 'elite') 
AND NOT JSON_CONTAINS(features, '"student_id_card_generator"');

-- Add to superadmin features for Developer user (ID 1)
INSERT INTO superadmin_features (superadmin_user_id, feature_id, granted_by, is_active)
SELECT 1, f.id, 1, TRUE
FROM features f 
WHERE f.feature_key = 'student_id_card_generator'
AND NOT EXISTS (
  SELECT 1 FROM superadmin_features sf 
  WHERE sf.superadmin_user_id = 1 AND sf.feature_id = f.id
);

-- Update users table to include ID Card Generator in allowed_features for premium/elite users
UPDATE users 
SET allowed_features = CASE 
  WHEN allowed_features IS NULL THEN JSON_ARRAY('student_id_card_generator')
  WHEN NOT JSON_CONTAINS(allowed_features, '"student_id_card_generator"') THEN JSON_ARRAY_APPEND(allowed_features, '$', 'student_id_card_generator')
  ELSE allowed_features
END
WHERE user_type IN ('Admin', 'SuperAdmin', 'Developer');
