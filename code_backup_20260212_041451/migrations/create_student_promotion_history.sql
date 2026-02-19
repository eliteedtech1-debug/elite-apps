-- Student Promotion History Table
-- This table tracks all student promotions and graduations

CREATE TABLE IF NOT EXISTS `student_promotion_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `admission_no` VARCHAR(50) NOT NULL,
  `from_class` VARCHAR(50) NOT NULL,
  `from_section` VARCHAR(50) NOT NULL,
  `to_class` VARCHAR(50) NULL,
  `to_section` VARCHAR(50) NULL,
  `from_academic_year` VARCHAR(50) NOT NULL,
  `to_academic_year` VARCHAR(50) NOT NULL,
  `promotion_type` ENUM('promote', 'graduate') NOT NULL DEFAULT 'promote',
  `effective_date` DATE NOT NULL,
  `created_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_admission_no` (`admission_no`),
  INDEX `idx_academic_year` (`from_academic_year`, `to_academic_year`),
  INDEX `idx_promotion_type` (`promotion_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add promotion-related columns to students table if they don't exist
ALTER TABLE `students`
  ADD COLUMN IF NOT EXISTS `promoted_date` DATE NULL AFTER `updated_at`,
  ADD COLUMN IF NOT EXISTS `promoted_by` VARCHAR(50) NULL AFTER `promoted_date`,
  ADD COLUMN IF NOT EXISTS `graduation_date` DATE NULL AFTER `promoted_by`,
  ADD COLUMN IF NOT EXISTS `graduated_by` VARCHAR(50) NULL AFTER `graduation_date`;

-- Add index on status for quick filtering
ALTER TABLE `students`
  ADD INDEX IF NOT EXISTS `idx_status` (`status`);
