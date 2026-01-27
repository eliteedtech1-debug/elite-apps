-- Create grade_allowance_packages table to link salary grades with allowance packages
CREATE TABLE IF NOT EXISTS grade_allowance_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade_id INT NOT NULL,
  package_id INT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE COMMENT 'If true, this package is automatically assigned to staff with this grade',
  effective_date DATE NOT NULL DEFAULT (CURDATE()),
  end_date DATE NULL,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (grade_id) REFERENCES grade_levels(grade_id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES allowance_packages(package_id) ON DELETE CASCADE,
  UNIQUE KEY uniq_grade_package_date (grade_id, package_id, effective_date),
  INDEX idx_grade_packages (grade_id),
  INDEX idx_package_grades (package_id),
  INDEX idx_default_packages (is_default, effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Links salary grades with allowance packages for automatic assignment';

-- Add package_id to allowance_packages table if it doesn't exist (for referential integrity)
ALTER TABLE allowance_packages 
ADD COLUMN IF NOT EXISTS auto_assign_to_grades BOOLEAN DEFAULT FALSE 
COMMENT 'If true, this package can be auto-assigned based on grade';

-- Add grade_id to teachers table if it doesn't exist (to link staff with grades)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS grade_id INT NULL 
COMMENT 'Links staff member to salary grade',
ADD INDEX IF NOT EXISTS idx_teachers_grade (grade_id);
