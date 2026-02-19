-- Audit Trails Table Migration
-- Run this SQL to create the audit_trails table
-- Production Ready - Includes all fixes

CREATE TABLE IF NOT EXISTS `audit_trails` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `user_type` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(255) NOT NULL,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PAYMENT', 'REFUND', 'GRADE_CHANGE', 'PROMOTION') NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` VARCHAR(100) NOT NULL,
  `school_id` VARCHAR(10) NOT NULL,
  `branch_id` VARCHAR(20) NULL,
  `description` TEXT NOT NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `changes` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `request_id` VARCHAR(100) NULL,
  `is_rolled_back` BOOLEAN DEFAULT FALSE,
  `rolled_back_at` DATETIME NULL,
  `rolled_back_by` INT NULL,
  `rollback_reason` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for performance
ALTER TABLE `audit_trails` 
  ADD INDEX `idx_user_created` (`user_id`, `createdAt`),
  ADD INDEX `idx_entity` (`entity_type`, `entity_id`),
  ADD INDEX `idx_school_created` (`school_id`, `createdAt`),
  ADD INDEX `idx_action_created` (`action`, `createdAt`),
  ADD INDEX `idx_request` (`request_id`),
  ADD INDEX `idx_rolled_back` (`is_rolled_back`);

