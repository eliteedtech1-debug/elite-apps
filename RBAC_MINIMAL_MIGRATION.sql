-- Minimal RBAC Migration for Testing
-- Creates only essential tables and data

-- Create subscription_packages table
CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  package_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2),
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rbac_school_packages table
CREATE TABLE IF NOT EXISTS rbac_school_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(10) NOT NULL,
  package_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  features_override JSON,
  created_by INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_active_school (school_id, is_active),
  FOREIGN KEY (package_id) REFERENCES subscription_packages(id)
);

-- Create features table
CREATE TABLE IF NOT EXISTS features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert packages
INSERT INTO subscription_packages (id, package_name, display_name, price_monthly, features, is_active, created_at) VALUES
(1, 'standard', 'Standard Package', 500.00, '["student_management", "attendance", "basic_reports"]', TRUE, NOW()),
(2, 'premium', 'Premium Package', 700.00, '["student_management", "attendance", "basic_reports", "financial_management", "sms_notifications"]', TRUE, NOW()),
(3, 'elite', 'Elite Package', 1000.00, '["student_management", "attendance", "basic_reports", "financial_management", "sms_notifications", "advanced_analytics", "parent_portal", "teacher_portal"]', TRUE, NOW())
ON DUPLICATE KEY UPDATE 
  price_monthly = VALUES(price_monthly),
  features = VALUES(features);

-- Insert features
INSERT INTO features (feature_key, feature_name, description, is_active, created_at) VALUES
('student_management', 'Student Management', 'Manage student records and enrollment', TRUE, NOW()),
('attendance', 'Attendance Tracking', 'Track student and staff attendance', TRUE, NOW()),
('basic_reports', 'Basic Reports', 'Generate basic academic and administrative reports', TRUE, NOW()),
('financial_management', 'Financial Management', 'Manage fees, payments, and accounting', TRUE, NOW()),
('sms_notifications', 'SMS Notifications', 'Send SMS to parents and staff', TRUE, NOW()),
('advanced_analytics', 'Advanced Analytics', 'Detailed analytics and insights', TRUE, NOW()),
('parent_portal', 'Parent Portal', 'Parent access to student information', TRUE, NOW()),
('teacher_portal', 'Teacher Portal', 'Teacher dashboard and tools', TRUE, NOW())
ON DUPLICATE KEY UPDATE 
  feature_name = VALUES(feature_name),
  description = VALUES(description);

