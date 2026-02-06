-- =====================================================
-- Payroll One-Time Items Migration
-- Date: 2026-02-06
-- Description: Add one-time item templates and notes support
-- =====================================================

-- 1. Create onetime_item_templates table
CREATE TABLE IF NOT EXISTS `onetime_item_templates` (
  `template_id` INT(11) NOT NULL AUTO_INCREMENT,
  `template_name` VARCHAR(100) NOT NULL,
  `item_type` ENUM('allowance', 'deduction') NOT NULL,
  `calculation_type` ENUM('fixed', 'per_unit') DEFAULT 'fixed',
  `amount_per_unit` DECIMAL(10,2) NULL,
  `fixed_amount` DECIMAL(10,2) NULL,
  `unit_label` VARCHAR(50) NULL COMMENT 'e.g., days, hours, times',
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `school_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`template_id`),
  KEY `idx_school_active` (`school_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Insert sample templates
INSERT INTO `onetime_item_templates` 
  (`template_name`, `item_type`, `calculation_type`, `amount_per_unit`, `fixed_amount`, `unit_label`, `description`, `school_id`, `is_active`)
VALUES
  ('Overtime Pay', 'allowance', 'per_unit', 500.00, NULL, 'hours', 'Overtime compensation per hour', 'SCH/20', 1),
  ('Weekend Duty', 'allowance', 'per_unit', 2000.00, NULL, 'days', 'Weekend duty allowance per day', 'SCH/20', 1),
  ('Performance Bonus', 'allowance', 'fixed', NULL, 0.00, NULL, 'One-time performance bonus', 'SCH/20', 1),
  ('Absenteeism Fine', 'deduction', 'per_unit', 1000.00, NULL, 'days', 'Fine per day absent without notice', 'SCH/20', 1),
  ('Late Coming Fine', 'deduction', 'per_unit', 500.00, NULL, 'times', 'Fine per late arrival', 'SCH/20', 1),
  ('Disciplinary Fine', 'deduction', 'fixed', NULL, 0.00, NULL, 'One-time disciplinary fine', 'SCH/20', 1);

-- 3. Create generic one-time allowance type
INSERT INTO `allowance_types` 
  (`allowance_name`, `allowance_code`, `calculation_type`, `default_amount`, `description`, `school_id`, `is_active`, `created_at`, `updated_at`)
VALUES 
  ('One-Time Allowance', 'ONETIME-A', 'fixed', 0.00, 'Generic one-time allowance (overtime, bonus, etc)', 'SCH/20', 1, NOW(), NOW());

-- 4. Create generic one-time deduction type
INSERT INTO `deduction_types` 
  (`deduction_name`, `deduction_code`, `calculation_type`, `default_amount`, `description`, `school_id`, `is_active`, `created_at`, `updated_at`)
VALUES 
  ('One-Time Deduction', 'ONETIME-D', 'fixed', 0.00, 'Generic one-time deduction (fines, penalties, etc)', 'SCH/20', 1, NOW(), NOW());

-- 5. Add notes column to staff_allowances
ALTER TABLE `staff_allowances` 
  ADD COLUMN IF NOT EXISTS `notes` TEXT NULL AFTER `end_date`;

-- 6. Add notes column to staff_deductions
ALTER TABLE `staff_deductions` 
  ADD COLUMN IF NOT EXISTS `notes` TEXT NULL AFTER `end_date`;

-- 7. Add percentage column to staff_allowances (if not exists)
ALTER TABLE `staff_allowances` 
  ADD COLUMN IF NOT EXISTS `percentage` DECIMAL(5,2) NULL AFTER `amount`;

-- 8. Add percentage column to staff_deductions (if not exists)
ALTER TABLE `staff_deductions` 
  ADD COLUMN IF NOT EXISTS `percentage` DECIMAL(5,2) NULL AFTER `amount`;

-- 9. Make amount nullable in staff_allowances (for percentage-based)
ALTER TABLE `staff_allowances` 
  MODIFY COLUMN `amount` DECIMAL(10,2) NULL;

-- 10. Make amount nullable in staff_deductions (for percentage-based)
ALTER TABLE `staff_deductions` 
  MODIFY COLUMN `amount` DECIMAL(10,2) NULL;

-- =====================================================
-- Migration Complete
-- =====================================================
