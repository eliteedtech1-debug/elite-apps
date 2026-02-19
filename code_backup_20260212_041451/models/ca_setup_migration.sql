-- CA Setup Table Migration
-- Creates the ca_setup table with all required columns

-- Drop table if exists (use with caution in production)
-- DROP TABLE IF EXISTS ca_setup;

-- Create ca_setup table
CREATE TABLE IF NOT EXISTS `ca_setup` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ca_type` ENUM('CA1', 'CA2', 'CA3', 'EXAM') NOT NULL,
  `week_number` INT NOT NULL COMMENT 'Week number in academic calendar',
  `max_score` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `overall_contribution_percent` DECIMAL(5,2) NOT NULL COMMENT 'Contribution to overall grade (%)',
  `is_active` TINYINT(1) DEFAULT 1,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `status` ENUM('Active', 'Inactive', 'Completed') DEFAULT 'Active',
  `section` VARCHAR(50) NULL COMMENT 'Section/Level if applicable',
  `academic_year` VARCHAR(20) NOT NULL,
  `term` VARCHAR(20) NOT NULL,
  `scheduled_date` DATE NULL COMMENT 'Calculated from week_number',
  `submission_deadline` DATE NULL COMMENT 'Deadline for question submission',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ca_setup_school_id_branch_id_academic_year_term_ca_type` (`school_id`, `branch_id`, `academic_year`, `term`, `ca_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table already exists, add missing columns
ALTER TABLE `ca_setup` 
  ADD COLUMN IF NOT EXISTS `academic_year` VARCHAR(20) NOT NULL AFTER `section`,
  ADD COLUMN IF NOT EXISTS `term` VARCHAR(20) NOT NULL AFTER `academic_year`,
  ADD COLUMN IF NOT EXISTS `scheduled_date` DATE NULL COMMENT 'Calculated from week_number' AFTER `term`,
  ADD COLUMN IF NOT EXISTS `submission_deadline` DATE NULL COMMENT 'Deadline for question submission' AFTER `scheduled_date`;

-- Add unique index if it doesn't exist
-- Note: This will fail if the index already exists, which is fine
ALTER TABLE `ca_setup` 
  ADD UNIQUE INDEX IF NOT EXISTS `ca_setup_school_id_branch_id_academic_year_term_ca_type` 
  (`school_id`, `branch_id`, `academic_year`, `term`, `ca_type`);
