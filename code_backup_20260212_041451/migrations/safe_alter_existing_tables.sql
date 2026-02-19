-- Safe ALTER script - only add missing columns
-- Check and add missing columns to syllabus_tracker for lesson plan functionality

-- Add missing columns to syllabus_tracker
ALTER TABLE syllabus_tracker 
ADD COLUMN IF NOT EXISTS teacher_id INT NOT NULL DEFAULT 1 AFTER id,
ADD COLUMN IF NOT EXISTS title VARCHAR(300) AFTER teacher_id,
ADD COLUMN IF NOT EXISTS lesson_date DATE AFTER title,
ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 40 AFTER lesson_date,
ADD COLUMN IF NOT EXISTS objectives TEXT AFTER duration_minutes,
ADD COLUMN IF NOT EXISTS lesson_content TEXT AFTER objectives,
ADD COLUMN IF NOT EXISTS activities TEXT AFTER lesson_content,
ADD COLUMN IF NOT EXISTS resources TEXT AFTER activities,
ADD COLUMN IF NOT EXISTS assessment_methods TEXT AFTER resources,
ADD COLUMN IF NOT EXISTS homework TEXT AFTER assessment_methods,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NULL AFTER status,
ADD COLUMN IF NOT EXISTS reviewed_by INT NULL AFTER submitted_at,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL AFTER reviewed_by,
ADD COLUMN IF NOT EXISTS review_comments TEXT AFTER reviewed_at,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE AFTER review_comments,
ADD COLUMN IF NOT EXISTS ai_enhancement_type VARCHAR(50) AFTER ai_generated,
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2) AFTER ai_enhancement_type,
ADD COLUMN IF NOT EXISTS school_id VARCHAR(20) AFTER ai_confidence_score,
ADD COLUMN IF NOT EXISTS branch_id INT AFTER school_id;

-- Update syllabus_tracker status enum to include lesson plan statuses
ALTER TABLE syllabus_tracker 
MODIFY COLUMN status ENUM(
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived',
  'Pending', 'Ongoing', 'Onhold', 'Completed'
) DEFAULT 'draft';

-- Add missing columns to syllabus table
ALTER TABLE syllabus 
ADD COLUMN IF NOT EXISTS school_id VARCHAR(20) AFTER created_by,
ADD COLUMN IF NOT EXISTS branch_id INT AFTER school_id;

-- Update syllabus status enum
ALTER TABLE syllabus 
MODIFY COLUMN status ENUM('draft', 'active', 'archived', 'deleted', 'Pending', 'Ongoing', 'Onhold', 'Deleted') DEFAULT 'active';

-- Create lesson_notes table if it doesn't exist
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
  INDEX idx_teacher_date (teacher_id, actual_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add indexes if they don't exist (these will fail silently if they exist)
ALTER TABLE syllabus_tracker ADD INDEX IF NOT EXISTS idx_teacher_date (teacher_id, lesson_date);
ALTER TABLE syllabus_tracker ADD INDEX IF NOT EXISTS idx_syllabus_ref (syllabus_id);
ALTER TABLE syllabus_tracker ADD INDEX IF NOT EXISTS idx_lesson_status (status);
ALTER TABLE syllabus_tracker ADD INDEX IF NOT EXISTS idx_ai_generated (ai_generated);

ALTER TABLE syllabus ADD INDEX IF NOT EXISTS idx_class_subject (class_code, subject);
ALTER TABLE syllabus ADD INDEX IF NOT EXISTS idx_term_week (term, week);
ALTER TABLE syllabus ADD INDEX IF NOT EXISTS idx_status (status);

ALTER TABLE class_role ADD INDEX IF NOT EXISTS idx_teacher_role (teacher_id, role);
ALTER TABLE class_role ADD INDEX IF NOT EXISTS idx_school_active (school_id, is_active);

-- Update existing data
UPDATE syllabus SET status = 'active' WHERE status = 'Pending';
UPDATE syllabus SET status = 'archived' WHERE status = 'Onhold';
UPDATE syllabus SET status = 'deleted' WHERE status = 'Deleted';

UPDATE syllabus_tracker SET status = 'draft' WHERE status = 'Pending';
UPDATE syllabus_tracker SET status = 'approved' WHERE status = 'Completed';

-- Set default teacher_id for existing records (you may need to adjust this)
UPDATE syllabus_tracker SET teacher_id = 1 WHERE teacher_id = 0 OR teacher_id IS NULL;

COMMIT;
