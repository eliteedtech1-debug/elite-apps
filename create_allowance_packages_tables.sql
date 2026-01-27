-- Create allowance_packages table
CREATE TABLE IF NOT EXISTS allowance_packages (
  package_id INT AUTO_INCREMENT PRIMARY KEY,
  package_name VARCHAR(100) NOT NULL,
  package_code VARCHAR(20) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uniq_package_code_school_branch (package_code, school_id, branch_id),
  INDEX idx_package_school (school_id, branch_id),
  INDEX idx_package_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create allowance_package_items table (junction table for package-allowance relationships)
CREATE TABLE IF NOT EXISTS allowance_package_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  allowance_id INT NOT NULL,
  amount DECIMAL(10,2),
  percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (package_id) REFERENCES allowance_packages(package_id) ON DELETE CASCADE,
  FOREIGN KEY (allowance_id) REFERENCES allowance_types(allowance_id) ON DELETE CASCADE,
  UNIQUE KEY uniq_package_allowance (package_id, allowance_id),
  INDEX idx_package_items (package_id),
  INDEX idx_allowance_items (allowance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
