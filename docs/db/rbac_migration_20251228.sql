-- RBAC System Migration - December 28, 2025
-- This file contains all SQL changes for the enhanced RBAC system

-- 1. Add is_active column to user_roles table (if not exists)
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1 AFTER assigned_role_name;

-- 2. Add assigned_role_name column to user_roles table (if not exists)  
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS assigned_role_name VARCHAR(50) AFTER role_id;

-- 3. Add is_system_role flag to roles table (if not exists)
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS is_system_role TINYINT(1) DEFAULT 0 AFTER updated_at;

-- 4. Mark system roles as system roles
UPDATE roles 
SET is_system_role = 1 
WHERE user_type IN ('superadmin', 'developer', 'SuperAdmin', 'Developer');

-- 5. Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error', 'role_change') DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  school_id VARCHAR(20),
  branch_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_school_id (school_id),
  INDEX idx_created_at (created_at)
);

-- 6. Create role_inheritance table (if not exists)
CREATE TABLE IF NOT EXISTS role_inheritance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_role VARCHAR(50) NOT NULL,
  child_role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_inheritance (parent_role, child_role),
  INDEX idx_parent_role (parent_role),
  INDEX idx_child_role (child_role)
);

-- 7. Insert role inheritance relationships
INSERT IGNORE INTO role_inheritance (parent_role, child_role) VALUES
('teacher', 'form_master'),
('teacher', 'exam_officer'),
('teacher', 'senior_master');

-- 8. Ensure RBAC tables exist (these should already exist from previous setup)
-- rbac_menu_items, rbac_menu_access, rbac_menu_packages, etc.

-- 9. Sample menu items and access (if needed)
-- Note: These may already exist, using INSERT IGNORE to avoid duplicates

-- 10. Update any existing user_roles to be active
UPDATE user_roles SET is_active = 1 WHERE is_active IS NULL;

-- 11. Add indexes for performance
ALTER TABLE user_roles ADD INDEX IF NOT EXISTS idx_user_school_active (user_id, school_id, is_active);
ALTER TABLE user_roles ADD INDEX IF NOT EXISTS idx_expires_at (expires_at);

-- 12. Clean up any orphaned records (optional)
-- DELETE FROM user_roles WHERE role_id NOT IN (SELECT role_id FROM roles);

-- Migration completed successfully
-- Remember to test all RBAC functionality after applying this migration
