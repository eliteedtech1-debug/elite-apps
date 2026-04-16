-- Add CA/Exam Assessment Form feature to the database
-- This allows teachers to enter CA and MOCK exam scores

-- First, find the parent feature ID for "Examinations"
SET @examinations_parent_id = (SELECT id FROM features WHERE feature_key = 'Examinations' OR menu_label = 'Examinations' LIMIT 1);

-- Insert the Assessment Form feature
INSERT INTO features (
  feature_key,
  feature_name,
  description,
  menu_label,
  route_path,
  parent_feature_id,
  is_menu_item,
  is_active,
  display_order,
  required_user_types,
  created_at,
  updated_at
) VALUES (
  'CAAssessmentSystem',
  'CA/Exam Assessment Form',
  'Enter and manage CA scores, exam scores, and mock exam scores for students',
  'Assessment Form',
  '/academic/assessments',
  @examinations_parent_id,
  1,
  1,
  1,
  '["Teacher", "Admin"]',
  NOW(),
  NOW()
);

-- Get the newly created feature ID
SET @new_feature_id = LAST_INSERT_ID();

-- Grant this feature to all teachers in the school
-- (Adjust school_id and branch_id as needed)
INSERT INTO staff_role_features (staff_role_id, feature_id, granted_at)
SELECT DISTINCT sr.id, @new_feature_id, NOW()
FROM staff_roles sr
WHERE sr.role_name = 'Teacher'
  AND NOT EXISTS (
    SELECT 1 FROM staff_role_features srf 
    WHERE srf.staff_role_id = sr.id 
    AND srf.feature_id = @new_feature_id
  );

SELECT 'Feature added successfully!' AS status, @new_feature_id AS feature_id;
