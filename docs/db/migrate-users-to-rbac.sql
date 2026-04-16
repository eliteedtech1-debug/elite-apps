-- Migrate users table roles to user_roles table
-- Run this on production database

TRUNCATE TABLE user_roles;
-- Step 1: Insert base user_type as role assignments (case-insensitive match)
INSERT INTO user_roles (user_id, role_id, is_active, assigned_by, assigned_role_name, created_at)
SELECT 
  u.id as user_id,
  r.role_id,
  1 as is_active,
  u.id as assigned_by,
  u.user_type as assigned_role_name,
  NOW() as created_at
FROM users u
INNER JOIN roles r ON LOWER(r.user_type) = LOWER(u.user_type) AND r.school_id = u.school_id
WHERE u.id NOT IN (SELECT DISTINCT user_id FROM user_roles WHERE is_active = 1)
AND u.user_type IS NOT NULL;

-- Step 2: Verify migration
SELECT 
  u.id,
  u.name,
  u.user_type,
  u.school_id,
  COUNT(ur.user_id) as assigned_roles_count
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.is_active = 1
WHERE u.school_id = 'SCH/11'
GROUP BY u.id, u.name, u.user_type, u.school_id
LIMIT 20;
