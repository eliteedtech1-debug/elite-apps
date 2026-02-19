-- Assessment System Database Schema

-- 1. Assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  lesson_plan_id INT,
  title VARCHAR(300) NOT NULL,
  instructions TEXT,
  questions JSON NOT NULL,
  total_marks INT DEFAULT 0,
  time_limit INT DEFAULT 60,
  question_types JSON,
  difficulty_level VARCHAR(50),
  ai_generated BOOLEAN DEFAULT FALSE,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher (teacher_id),
  INDEX idx_lesson_plan (lesson_plan_id),
  INDEX idx_status (status),
  INDEX idx_school (school_id),
  
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (lesson_plan_id) REFERENCES syllabus_tracker(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Question banks table
CREATE TABLE IF NOT EXISTS question_banks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class_code VARCHAR(20) NOT NULL,
  term VARCHAR(50),
  question_bank_data JSON NOT NULL,
  total_questions INT DEFAULT 0,
  total_topics INT DEFAULT 0,
  ai_generated BOOLEAN DEFAULT FALSE,
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher_subject (teacher_id, subject),
  INDEX idx_class_term (class_code, term),
  INDEX idx_school (school_id),
  
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Assessment results table (for future use)
CREATE TABLE IF NOT EXISTS assessment_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assessment_id INT NOT NULL,
  student_id INT NOT NULL,
  answers JSON,
  score INT DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0.00,
  time_taken INT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_assessment (assessment_id),
  INDEX idx_student (student_id),
  
  FOREIGN KEY (assessment_id) REFERENCES assessments(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
