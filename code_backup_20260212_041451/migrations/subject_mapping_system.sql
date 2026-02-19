-- Subject Mapping System for Global Scraped Content

-- 1. Global scraped content repository (enhanced syllabus table)
ALTER TABLE syllabus 
ADD COLUMN global_subject_code VARCHAR(50) AFTER subject,
ADD COLUMN global_level_code VARCHAR(10) AFTER class_code,
ADD COLUMN is_global_content BOOLEAN DEFAULT FALSE AFTER scraped_source;

-- 2. School subject mapping table
CREATE TABLE IF NOT EXISTS school_subject_mapping (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  
  -- School's custom subject details
  school_subject_name VARCHAR(100) NOT NULL,
  school_subject_code VARCHAR(50),
  school_class_code VARCHAR(20) NOT NULL,
  
  -- Mapping to global content
  global_subject_code VARCHAR(50) NOT NULL,
  global_level_code VARCHAR(10) NOT NULL,
  
  -- Mapping metadata
  mapping_confidence DECIMAL(3,2) DEFAULT 1.00,
  mapped_by INT, -- teacher/admin who created mapping
  approved_by INT, -- senior master who approved
  mapping_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_school_subject (school_id, school_subject_name, school_class_code),
  INDEX idx_global_mapping (global_subject_code, global_level_code),
  INDEX idx_school_mapping (school_id, school_subject_name),
  
  FOREIGN KEY (mapped_by) REFERENCES teachers(id),
  FOREIGN KEY (approved_by) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Update global content with standard codes
UPDATE syllabus 
SET 
  global_subject_code = 'MATH_PRIMARY',
  global_level_code = 'P1',
  is_global_content = TRUE
WHERE subject = 'Mathematics' AND class_code = 'P1' AND scraped_source IS NOT NULL;

-- 4. Sample school mappings
INSERT INTO school_subject_mapping (
  school_id, school_subject_name, school_class_code,
  global_subject_code, global_level_code,
  mapping_status, mapped_by
) VALUES 
('SCH/1', 'General Mathematics', 'Primary 1', 'MATH_PRIMARY', 'P1', 'approved', 1),
('SCH/1', 'Mathematics Study', 'Primary 1', 'MATH_PRIMARY', 'P1', 'approved', 1),
('SCH/2', 'Basic Mathematics', 'P1', 'MATH_PRIMARY', 'P1', 'pending', 2);

-- 5. View for mapped content access
CREATE OR REPLACE VIEW school_mapped_syllabus AS
SELECT 
  s.id,
  s.subject as global_subject,
  s.global_subject_code,
  s.global_level_code,
  s.term,
  s.week,
  s.title,
  s.content,
  s.scraped_source,
  s.created_at,
  
  -- School mapping details
  ssm.school_id,
  ssm.branch_id,
  ssm.school_subject_name,
  ssm.school_class_code,
  ssm.mapping_confidence,
  ssm.mapping_status
  
FROM syllabus s
INNER JOIN school_subject_mapping ssm ON (
  s.global_subject_code = ssm.global_subject_code 
  AND s.global_level_code = ssm.global_level_code
)
WHERE s.is_global_content = TRUE 
AND ssm.mapping_status = 'approved';

COMMIT;
