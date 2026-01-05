-- ID Card Templates
CREATE TABLE id_card_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  branch_id INT,
  template_name VARCHAR(100) NOT NULL,
  template_type ENUM('student', 'staff') DEFAULT 'student',
  dimensions JSON NOT NULL, -- {"width": 336, "height": 212, "unit": "px"}
  background_config JSON, -- {"color": "#ffffff", "image_url": "", "opacity": 1}
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_school_branch (school_id, branch_id),
  INDEX idx_active_templates (school_id, is_active)
);

-- Template Elements (text, image, barcode positions)
CREATE TABLE template_elements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  element_type ENUM('text', 'image', 'barcode', 'qr_code') NOT NULL,
  element_key VARCHAR(50) NOT NULL, -- 'student_name', 'photo', 'school_logo', etc.
  position_config JSON NOT NULL, -- {"x": 10, "y": 20, "width": 100, "height": 30}
  style_config JSON, -- {"font_family": "Arial", "font_size": 14, "color": "#000000", "align": "left"}
  data_source VARCHAR(100), -- 'students.full_name', 'schools.logo_url', etc.
  is_required BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES id_card_templates(id) ON DELETE CASCADE,
  INDEX idx_template_elements (template_id, display_order)
);

-- School Branding Configuration
CREATE TABLE school_branding (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  branch_id INT,
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#1890ff',
  secondary_color VARCHAR(7) DEFAULT '#f0f0f0',
  font_family VARCHAR(50) DEFAULT 'Arial',
  school_motto TEXT,
  contact_info JSON, -- {"phone": "", "email": "", "address": ""}
  updated_by INT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  UNIQUE KEY unique_school_branch (school_id, branch_id)
);

-- Generated ID Cards Tracking
CREATE TABLE generated_id_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  template_id INT NOT NULL,
  card_number VARCHAR(50) NOT NULL,
  file_url VARCHAR(500),
  generation_status ENUM('pending', 'generated', 'failed') DEFAULT 'pending',
  generated_by INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSON, -- Additional card data
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (template_id) REFERENCES id_card_templates(id),
  FOREIGN KEY (generated_by) REFERENCES users(id),
  UNIQUE KEY unique_active_card (student_id, is_active),
  INDEX idx_student_cards (student_id, is_active),
  INDEX idx_card_number (card_number)
);

-- Audit Trail for Template Changes
CREATE TABLE template_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  action_type ENUM('created', 'updated', 'deleted', 'activated', 'deactivated') NOT NULL,
  changed_fields JSON, -- {"field_name": {"old": "value", "new": "value"}}
  changed_by INT NOT NULL,
  change_reason VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES id_card_templates(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_template_audit (template_id, created_at),
  INDEX idx_user_actions (changed_by, created_at)
);

-- Stored Procedure: Get Active Template for School/Branch
DELIMITER //
CREATE PROCEDURE GetActiveTemplate(
  IN p_school_id INT,
  IN p_branch_id INT,
  IN p_template_type VARCHAR(20)
)
BEGIN
  SELECT 
    t.*,
    GROUP_CONCAT(
      JSON_OBJECT(
        'element_type', e.element_type,
        'element_key', e.element_key,
        'position_config', e.position_config,
        'style_config', e.style_config,
        'data_source', e.data_source
      ) ORDER BY e.display_order
    ) as elements,
    b.logo_url, b.primary_color, b.secondary_color, b.font_family
  FROM id_card_templates t
  LEFT JOIN template_elements e ON t.id = e.template_id
  LEFT JOIN school_branding b ON t.school_id = b.school_id 
    AND (t.branch_id = b.branch_id OR (t.branch_id IS NULL AND b.branch_id IS NULL))
  WHERE t.school_id = p_school_id
    AND (t.branch_id = p_branch_id OR t.branch_id IS NULL)
    AND t.template_type = p_template_type
    AND t.is_active = true
  ORDER BY t.is_default DESC, t.created_at DESC
  LIMIT 1;
END //
DELIMITER ;

-- Stored Procedure: Generate Card Number
DELIMITER //
CREATE PROCEDURE GenerateCardNumber(
  IN p_school_id INT,
  IN p_student_id INT,
  OUT p_card_number VARCHAR(50)
)
BEGIN
  DECLARE school_code VARCHAR(10);
  DECLARE year_suffix VARCHAR(4);
  DECLARE sequence_num INT;
  
  SELECT code INTO school_code FROM schools WHERE id = p_school_id;
  SET year_suffix = RIGHT(YEAR(CURDATE()), 2);
  
  SELECT COALESCE(MAX(CAST(RIGHT(card_number, 4) AS UNSIGNED)), 0) + 1 
  INTO sequence_num
  FROM generated_id_cards g
  JOIN students s ON g.student_id = s.id
  WHERE s.school_id = p_school_id
    AND card_number LIKE CONCAT(school_code, year_suffix, '%');
  
  SET p_card_number = CONCAT(school_code, year_suffix, LPAD(sequence_num, 4, '0'));
END //
DELIMITER ;