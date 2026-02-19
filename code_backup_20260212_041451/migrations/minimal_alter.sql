-- Minimal ALTER script - only essential changes
-- Add lesson plan functionality to existing syllabus_tracker table

-- Add essential columns to syllabus_tracker for lesson plans
ALTER TABLE syllabus_tracker 
ADD COLUMN teacher_id INT NOT NULL DEFAULT 1 AFTER id,
ADD COLUMN title VARCHAR(300) AFTER teacher_id,
ADD COLUMN lesson_date DATE AFTER title,
ADD COLUMN objectives TEXT AFTER lesson_date,
ADD COLUMN lesson_content TEXT AFTER objectives,
ADD COLUMN activities TEXT AFTER lesson_content,
ADD COLUMN resources TEXT AFTER activities,
ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE AFTER resources,
ADD COLUMN school_id VARCHAR(20) AFTER ai_generated;

-- Add essential columns to syllabus table
ALTER TABLE syllabus 
ADD COLUMN school_id VARCHAR(20) AFTER created_by;

-- Create lesson_notes table
CREATE TABLE IF NOT EXISTS lesson_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_plan_id INT NOT NULL,
  teacher_id INT NOT NULL,
  actual_date DATE NOT NULL,
  topics_covered TEXT,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lesson_plan (lesson_plan_id),
  INDEX idx_teacher_date (teacher_id, actual_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add basic indexes
ALTER TABLE syllabus_tracker ADD INDEX idx_teacher_lesson (teacher_id, lesson_date);
ALTER TABLE syllabus ADD INDEX idx_class_subject (class_code, subject);

COMMIT;
