-- CA Question Submissions table (aligning with existing workflow)
CREATE TABLE IF NOT EXISTS ca_question_submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  ca_setup_id INT NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  class_code VARCHAR(20) NOT NULL,
  submission_code VARCHAR(100) NOT NULL,
  questions_data JSON,
  question_file_url VARCHAR(500),
  question_file_name VARCHAR(255),
  total_marks INT DEFAULT 0,
  time_limit INT DEFAULT 60,
  ai_generated BOOLEAN DEFAULT FALSE,
  status ENUM('Draft', 'Submitted', 'Under Moderation', 'Approved', 'Rejected', 'Modification Requested') DEFAULT 'Draft',
  comments TEXT,
  moderator_comments TEXT,
  submission_date TIMESTAMP NULL,
  moderation_date TIMESTAMP NULL,
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  academic_year VARCHAR(20),
  term VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_teacher (teacher_id),
  INDEX idx_ca_setup (ca_setup_id),
  INDEX idx_status (status),
  INDEX idx_school (school_id),
  INDEX idx_submission_code (submission_code),
  
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
