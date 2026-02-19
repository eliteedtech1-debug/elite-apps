-- Phase 1: Alter Existing Tables for Enhanced Syllabus System
-- This script modifies existing tables instead of creating new ones

-- 1. Enhance existing class_role table to support more role types
ALTER TABLE class_role 
MODIFY COLUMN role ENUM(
  'Form Master', 'Subject Teacher', 'Curriculum Designer',
  'Department Head', 'Mentor Teacher', 'Content Reviewer',
  'Senior Teacher', 'HOD'
) NOT NULL;

-- Add additional columns to class_role for enhanced permissions
ALTER TABLE class_role 
ADD COLUMN department VARCHAR(100) AFTER role,
ADD COLUMN permissions JSON AFTER department,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER permissions,
ADD COLUMN assigned_by INT AFTER is_active,
ADD COLUMN assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER assigned_by;

-- Add indexes for better performance
ALTER TABLE class_role 
ADD INDEX idx_teacher_role (teacher_id, role),
ADD INDEX idx_school_active (school_id, is_active);

-- 2. Enhance existing syllabus table
ALTER TABLE syllabus 
ADD COLUMN status ENUM('draft', 'active', 'archived', 'deleted') DEFAULT 'active' AFTER content,
ADD COLUMN created_by INT AFTER status,
ADD COLUMN school_id VARCHAR(20) AFTER created_by,
ADD COLUMN branch_id INT AFTER school_id;

-- Add indexes to syllabus table
ALTER TABLE syllabus 
ADD INDEX idx_class_subject (class_code, subject),
ADD INDEX idx_term_week (term, week_no),
ADD INDEX idx_status (status),
ADD INDEX idx_school_branch (school_id, branch_id);

-- 3. Enhance syllabus_tracker table to work as lesson_plans
ALTER TABLE syllabus_tracker 
ADD COLUMN teacher_id INT NOT NULL AFTER id,
ADD COLUMN title VARCHAR(300) AFTER teacher_id,
ADD COLUMN lesson_date DATE AFTER title,
ADD COLUMN duration_minutes INT DEFAULT 40 AFTER lesson_date,
ADD COLUMN objectives TEXT AFTER duration_minutes,
ADD COLUMN lesson_content TEXT AFTER objectives,
ADD COLUMN activities TEXT AFTER lesson_content,
ADD COLUMN resources TEXT AFTER activities,
ADD COLUMN assessment_methods TEXT AFTER resources,
ADD COLUMN homework TEXT AFTER assessment_methods,
ADD COLUMN submitted_at TIMESTAMP NULL AFTER status,
ADD COLUMN reviewed_by INT NULL AFTER submitted_at,
ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by,
ADD COLUMN review_comments TEXT AFTER reviewed_at,
ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE AFTER review_comments,
ADD COLUMN ai_enhancement_type VARCHAR(50) AFTER ai_generated,
ADD COLUMN ai_confidence_score DECIMAL(3,2) AFTER ai_enhancement_type,
ADD COLUMN school_id VARCHAR(20) AFTER ai_confidence_score,
ADD COLUMN branch_id INT AFTER school_id,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER branch_id;

-- Update syllabus_tracker status enum to match lesson plan workflow
ALTER TABLE syllabus_tracker 
MODIFY COLUMN status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived', 'Pending', 'Ongoing', 'Onhold', 'Completed') DEFAULT 'draft';

-- Add indexes to enhanced syllabus_tracker (lesson plans)
ALTER TABLE syllabus_tracker 
ADD INDEX idx_teacher_date (teacher_id, lesson_date),
ADD INDEX idx_syllabus_ref (syllabus_id),
ADD INDEX idx_lesson_status (status),
ADD INDEX idx_ai_generated (ai_generated),
ADD INDEX idx_school_branch_tracker (school_id, branch_id);

-- 4. Create a simple lesson_notes table (new, minimal)
CREATE TABLE IF NOT EXISTS lesson_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_plan_id INT NOT NULL,
  teacher_id INT NOT NULL,
  actual_date DATE NOT NULL,
  actual_duration_minutes INT,
  topics_covered TEXT,
  teaching_method VARCHAR(100),
  resources_used TEXT,
  student_engagement_level ENUM('Low', 'Medium', 'High'),
  challenges_faced TEXT,
  next_lesson_preparation TEXT,
  assessment_conducted BOOLEAN DEFAULT FALSE,
  assessment_results TEXT,
  students_present INT,
  students_absent INT,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lesson_plan (lesson_plan_id),
  INDEX idx_teacher_date (teacher_id, actual_date),
  FOREIGN KEY (lesson_plan_id) REFERENCES syllabus_tracker(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Add foreign key constraints (if they don't exist)
-- Note: These may fail if constraints already exist, that's okay

-- Add foreign key for syllabus_tracker.teacher_id
ALTER TABLE syllabus_tracker 
ADD CONSTRAINT fk_syllabus_tracker_teacher 
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- Add foreign key for syllabus_tracker.reviewed_by
ALTER TABLE syllabus_tracker 
ADD CONSTRAINT fk_syllabus_tracker_reviewer 
FOREIGN KEY (reviewed_by) REFERENCES teachers(id) ON DELETE SET NULL;

-- Add foreign key for class_role.assigned_by
ALTER TABLE class_role 
ADD CONSTRAINT fk_class_role_assigner 
FOREIGN KEY (assigned_by) REFERENCES teachers(id) ON DELETE SET NULL;

-- 6. Update existing data to set default values
UPDATE class_role SET is_active = TRUE WHERE is_active IS NULL;
UPDATE syllabus SET status = 'active' WHERE status IS NULL;
UPDATE syllabus_tracker SET status = 'draft' WHERE status IN ('Pending', 'Ongoing');
UPDATE syllabus_tracker SET status = 'completed' WHERE status = 'Completed';

-- 7. Create view for backward compatibility (optional)
CREATE OR REPLACE VIEW lesson_plans AS
SELECT 
  id,
  teacher_id,
  syllabus_id,
  class_code,
  subject,
  title,
  lesson_date,
  duration_minutes,
  objectives,
  lesson_content as content,
  activities,
  resources,
  assessment_methods,
  homework,
  status,
  submitted_at,
  reviewed_by,
  reviewed_at,
  review_comments,
  ai_generated,
  ai_enhancement_type,
  ai_confidence_score,
  created_at,
  updated_at,
  school_id,
  branch_id
FROM syllabus_tracker
WHERE status NOT IN ('Pending', 'Ongoing', 'Onhold', 'Completed');

-- 8. Create view for enhanced teacher roles
CREATE OR REPLACE VIEW teacher_roles AS
SELECT 
  CONCAT(teacher_id, '_', role) as id,
  teacher_id,
  role as role_type,
  department,
  permissions,
  is_active,
  assigned_by,
  assigned_date,
  school_id,
  NULL as branch_id
FROM class_role
WHERE is_active = TRUE;

COMMIT;
