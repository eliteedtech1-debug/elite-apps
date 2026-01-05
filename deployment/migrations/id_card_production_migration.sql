-- =====================================================
-- Student ID Card Generator - Production Migration
-- Phase 1 Deployment - Database Schema
-- =====================================================

-- Check if tables already exist to prevent conflicts
SET @table_exists = 0;
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'id_card_templates';

-- Only create tables if they don't exist
SET @sql = IF(@table_exists = 0, 
'
-- ID Card Templates
CREATE TABLE id_card_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  branch_id INT,
  template_name VARCHAR(100) NOT NULL,
  template_type ENUM(''student'', ''staff'') DEFAULT ''student'',
  dimensions JSON NOT NULL,
  background_config JSON,
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

-- Template Elements
CREATE TABLE template_elements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  element_type ENUM(''text'', ''image'', ''barcode'', ''qr_code'') NOT NULL,
  element_key VARCHAR(50) NOT NULL,
  position_config JSON NOT NULL,
  style_config JSON,
  data_source VARCHAR(100),
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
  primary_color VARCHAR(7) DEFAULT ''#1890ff'',
  secondary_color VARCHAR(7) DEFAULT ''#f0f0f0'',
  font_family VARCHAR(50) DEFAULT ''Arial'',
  school_motto TEXT,
  contact_info JSON,
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
  generation_status ENUM(''pending'', ''generated'', ''failed'') DEFAULT ''pending'',
  generated_by INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSON,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (template_id) REFERENCES id_card_templates(id),
  FOREIGN KEY (generated_by) REFERENCES users(id),
  UNIQUE KEY unique_active_card (student_id, is_active),
  INDEX idx_student_cards (student_id, is_active),
  INDEX idx_card_number (card_number)
);

-- Template Audit Log
CREATE TABLE template_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  action_type ENUM(''created'', ''updated'', ''deleted'', ''activated'', ''deactivated'') NOT NULL,
  changed_fields JSON,
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
', 'SELECT ''Tables already exist, skipping creation'';');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create stored procedures
DELIMITER //

-- Get Active Template Procedure
DROP PROCEDURE IF EXISTS GetActiveTemplate//
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

-- Generate Card Number Procedure
DROP PROCEDURE IF EXISTS GenerateCardNumber//
CREATE PROCEDURE GenerateCardNumber(
  IN p_school_id INT,
  IN p_student_id INT,
  OUT p_card_number VARCHAR(50)
)
BEGIN
  DECLARE school_code VARCHAR(10);
  DECLARE year_suffix VARCHAR(4);
  DECLARE sequence_num INT;
  
  SELECT COALESCE(code, 'SCH') INTO school_code FROM schools WHERE id = p_school_id;
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

-- Insert default templates for existing schools
INSERT IGNORE INTO id_card_templates (school_id, branch_id, template_name, template_type, dimensions, is_default, created_by)
SELECT 
  s.id as school_id,
  NULL as branch_id,
  'Default Student ID Card' as template_name,
  'student' as template_type,
  JSON_OBJECT('width', 336, 'height', 212, 'unit', 'px') as dimensions,
  true as is_default,
  1 as created_by
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM id_card_templates t 
  WHERE t.school_id = s.id AND t.template_type = 'student' AND t.is_default = true
);

-- Migration completion log
INSERT INTO migration_log (migration_name, executed_at, status) 
VALUES ('id_card_production_migration', NOW(), 'completed')
ON DUPLICATE KEY UPDATE executed_at = NOW(), status = 'completed';

SELECT 'ID Card Generator Phase 1 migration completed successfully' as result;