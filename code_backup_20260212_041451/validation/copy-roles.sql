UPDATE user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r 
   ON u.user_type = r.user_type
  AND (r.school_id = u.school_id)
SET 
    ur.permissions = r.permissions,
    ur.accessTo = r.accessTo;