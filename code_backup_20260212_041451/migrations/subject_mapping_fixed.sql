-- Subject Mapping System (Fixed Collation)

-- 1. Add columns to syllabus table
ALTER TABLE syllabus 
ADD COLUMN IF NOT EXISTS global_subject_code VARCHAR(50) AFTER subject,
ADD COLUMN IF NOT EXISTS global_level_code VARCHAR(10) AFTER class_code,
ADD COLUMN IF NOT EXISTS is_global_content BOOLEAN DEFAULT FALSE AFTER scraped_source;

-- 2. School subject mapping table
CREATE TABLE IF NOT EXISTS school_subject_mapping (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  
  school_subject_name VARCHAR(100) NOT NULL,
  school_subject_code VARCHAR(50),
  school_class_code VARCHAR(20) NOT NULL,
  
  global_subject_code VARCHAR(50) NOT NULL,
  global_level_code VARCHAR(10) NOT NULL,
  
  mapping_confidence DECIMAL(3,2) DEFAULT 1.00,
  mapped_by INT,
  approved_by INT,
  mapping_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_school_subject (school_id, school_subject_name, school_class_code),
  INDEX idx_global_mapping (global_subject_code, global_level_code),
  INDEX idx_school_mapping (school_id, school_subject_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Update existing scraped content
UPDATE syllabus 
SET 
  global_subject_code = 'MATH_PRIMARY',
  global_level_code = 'P1',
  is_global_content = TRUE
WHERE subject = 'Mathematics' AND class_code = 'P1' AND scraped_source IS NOT NULL;

-- 4. Sample mappings
INSERT IGNORE INTO school_subject_mapping (
  school_id, school_subject_name, school_class_code,
  global_subject_code, global_level_code,
  mapping_status, mapped_by
) VALUES 
('SCH/1', 'General Mathematics', 'Primary 1', 'MATH_PRIMARY', 'P1', 'approved', 1),
('SCH/1', 'Mathematics Study', 'Primary 1', 'MATH_PRIMARY', 'P1', 'approved', 1);

COMMIT;
