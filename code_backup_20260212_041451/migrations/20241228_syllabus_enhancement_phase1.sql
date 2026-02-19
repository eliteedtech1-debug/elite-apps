-- Phase 1: Enhanced Teacher Roles and Lesson Plans Schema
-- Date: December 28, 2024
-- Version: 1.0

-- Enhanced teacher roles table
CREATE TABLE IF NOT EXISTS teacher_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  role_type ENUM(
    'Form Master', 
    'Subject Teacher', 
    'Curriculum Designer', 
    'Department Head', 
    'Mentor Teacher', 
    'Content Reviewer'
  ) NOT NULL DEFAULT 'Subject Teacher',
  permissions JSON,
  department VARCHAR(100),
  school_id INT NOT NULL,
  branch_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_school_id (school_id),
  INDEX idx_role_type (role_type),
  INDEX idx_department (department),
  
  FOREIGN KEY (teacher_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES school_setup(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enhanced lesson plans table (if not exists, create; if exists, alter)
CREATE TABLE IF NOT EXISTS lesson_plans_enhanced (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  syllabus_id INT,
  subject_code VARCHAR(50) NOT NULL,
  class_code VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  lesson_date DATE NOT NULL,
  duration_minutes INT DEFAULT 40,
  
  -- Lesson content fields
  objectives TEXT,
  content TEXT,
  activities TEXT,
  resources TEXT,
  assessment_methods TEXT,
  homework TEXT,
  
  -- Workflow fields
  status ENUM('draft', 'submitted', 'approved', 'rejected', 'archived') DEFAULT 'draft',
  submitted_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  approved_by INT,
  rejection_reason TEXT,
  
  -- AI enhancement fields
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_enhancement_type VARCHAR(50),
  ai_confidence_score DECIMAL(3,2),
  
  -- Metadata
  school_id INT NOT NULL,
  branch_id INT,
  academic_year VARCHAR(20),
  term VARCHAR(50),
  week_number TINYINT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_school_id (school_id),
  INDEX idx_subject_code (subject_code),
  INDEX idx_class_code (class_code),
  INDEX idx_lesson_date (lesson_date),
  INDEX idx_status (status),
  INDEX idx_ai_generated (ai_generated),
  INDEX idx_academic_year_term (academic_year, term),
  
  FOREIGN KEY (teacher_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (syllabus_id) REFERENCES syllabus(id) ON DELETE SET NULL,
  FOREIGN KEY (school_id) REFERENCES school_setup(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES staffs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lesson plan collaborators table for peer review
CREATE TABLE IF NOT EXISTS lesson_plan_collaborators (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_plan_id INT NOT NULL,
  collaborator_id INT NOT NULL,
  role ENUM('reviewer', 'mentor', 'approver') NOT NULL,
  status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
  feedback TEXT,
  reviewed_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lesson_plan_id (lesson_plan_id),
  INDEX idx_collaborator_id (collaborator_id),
  INDEX idx_status (status),
  
  FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans_enhanced(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_id) REFERENCES staffs(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_lesson_collaborator (lesson_plan_id, collaborator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher permissions table for granular access control
CREATE TABLE IF NOT EXISTS teacher_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  permission_value BOOLEAN DEFAULT TRUE,
  granted_by INT,
  expires_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_permission_key (permission_key),
  
  FOREIGN KEY (teacher_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES staffs(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_teacher_permission (teacher_id, permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Curriculum coverage tracking
CREATE TABLE IF NOT EXISTS curriculum_coverage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  class_code VARCHAR(50) NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  syllabus_id INT NOT NULL,
  lesson_plan_id INT,
  
  coverage_status ENUM('not_started', 'in_progress', 'completed', 'reviewed') DEFAULT 'not_started',
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  quality_score DECIMAL(3,2),
  
  school_id INT NOT NULL,
  branch_id INT,
  academic_year VARCHAR(20),
  term VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_class_subject (class_code, subject_code),
  INDEX idx_school_id (school_id),
  INDEX idx_academic_year_term (academic_year, term),
  
  FOREIGN KEY (teacher_id) REFERENCES staffs(id) ON DELETE CASCADE,
  FOREIGN KEY (syllabus_id) REFERENCES syllabus(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans_enhanced(id) ON DELETE SET NULL,
  FOREIGN KEY (school_id) REFERENCES school_setup(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_coverage_tracking (teacher_id, class_code, subject_code, syllabus_id, academic_year, term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions for each role type
INSERT INTO teacher_permissions (teacher_id, permission_key, permission_value, created_at) 
SELECT DISTINCT tc.teacher_id, 'view_syllabus', TRUE, NOW()
FROM teacher_classes tc 
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_permissions tp 
  WHERE tp.teacher_id = tc.teacher_id AND tp.permission_key = 'view_syllabus'
);

-- Insert default teacher roles based on existing teacher_classes
INSERT INTO teacher_roles (teacher_id, role_type, school_id, branch_id, permissions, created_at)
SELECT DISTINCT 
  tc.teacher_id,
  CASE 
    WHEN tc.role = 'Form Master' THEN 'Form Master'
    ELSE 'Subject Teacher'
  END as role_type,
  COALESCE(s.id, 1) as school_id,
  NULL as branch_id,
  JSON_OBJECT(
    'view_syllabus', true,
    'create_lesson_plans', true,
    'submit_lesson_plans', true,
    'view_own_analytics', true
  ) as permissions,
  NOW()
FROM teacher_classes tc
LEFT JOIN school_setup s ON s.id = 1  -- Default school
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_roles tr 
  WHERE tr.teacher_id = tc.teacher_id
);

-- Create stored procedure for role-based permission checking
DELIMITER //
CREATE PROCEDURE CheckTeacherPermission(
  IN p_teacher_id INT,
  IN p_permission_key VARCHAR(100),
  OUT p_has_permission BOOLEAN
)
BEGIN
  DECLARE permission_count INT DEFAULT 0;
  
  SELECT COUNT(*) INTO permission_count
  FROM teacher_permissions tp
  WHERE tp.teacher_id = p_teacher_id 
    AND tp.permission_key = p_permission_key
    AND tp.permission_value = TRUE
    AND (tp.expires_at IS NULL OR tp.expires_at > NOW());
  
  SET p_has_permission = (permission_count > 0);
END //
DELIMITER ;

-- Create stored procedure for curriculum coverage calculation
DELIMITER //
CREATE PROCEDURE CalculateCurriculumCoverage(
  IN p_teacher_id INT,
  IN p_class_code VARCHAR(50),
  IN p_subject_code VARCHAR(50),
  IN p_academic_year VARCHAR(20),
  IN p_term VARCHAR(50),
  OUT p_coverage_percentage DECIMAL(5,2)
)
BEGIN
  DECLARE total_topics INT DEFAULT 0;
  DECLARE completed_topics INT DEFAULT 0;
  
  -- Get total syllabus topics for the class/subject/term
  SELECT COUNT(*) INTO total_topics
  FROM syllabus s
  INNER JOIN subjects sub ON sub.subject = s.subject AND sub.class_code = s.class_code
  WHERE s.class_code = p_class_code
    AND sub.subject_code = p_subject_code
    AND s.term = p_term
    AND s.status != 'Deleted';
  
  -- Get completed topics (with approved lesson plans)
  SELECT COUNT(DISTINCT s.id) INTO completed_topics
  FROM syllabus s
  INNER JOIN subjects sub ON sub.subject = s.subject AND sub.class_code = s.class_code
  INNER JOIN lesson_plans_enhanced lp ON lp.syllabus_id = s.id
  WHERE s.class_code = p_class_code
    AND sub.subject_code = p_subject_code
    AND s.term = p_term
    AND s.status != 'Deleted'
    AND lp.teacher_id = p_teacher_id
    AND lp.status IN ('approved', 'submitted');
  
  -- Calculate percentage
  IF total_topics > 0 THEN
    SET p_coverage_percentage = (completed_topics / total_topics) * 100;
  ELSE
    SET p_coverage_percentage = 0;
  END IF;
END //
DELIMITER ;

-- Add indexes for performance optimization
CREATE INDEX idx_syllabus_class_subject_term ON syllabus(class_code, subject, term, status);
CREATE INDEX idx_teacher_classes_teacher_class_subject ON teacher_classes(teacher_id, class_code, subject);

-- Migration completion log
INSERT INTO migration_logs (migration_name, status, executed_at) 
VALUES ('20241228_syllabus_enhancement_phase1', 'completed', NOW())
ON DUPLICATE KEY UPDATE 
  status = 'completed', 
  executed_at = NOW();