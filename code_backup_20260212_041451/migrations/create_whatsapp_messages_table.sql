-- Updating school setup

ALTER TABLE `school_setup` ADD `sms_subscription` BOOLEAN NOT NULL DEFAULT FALSE AFTER `cbt_stand_alone`, 
ADD `whatsapp_subscription` BOOLEAN NOT NULL DEFAULT FALSE AFTER `sms_subscription`,
ADD `email_subscription` BOOLEAN NOT NULL DEFAULT FALSE AFTER `whatsapp_subscription`; 
-- WhatsApp Messages Tracking Table
-- This table logs all WhatsApp messages sent through the system for cost tracking

CREATE TABLE IF NOT EXISTS `whatsapp_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `total_sent` INT NOT NULL DEFAULT 0,
  `total_failed` INT NOT NULL DEFAULT 0,
  `message_text` TEXT NOT NULL,
  `recipients` JSON DEFAULT NULL COMMENT 'Array of recipient phone numbers',
  `results` JSON DEFAULT NULL COMMENT 'Detailed send results',
  `cost` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost in local currency',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(50) DEFAULT NULL,
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_school_created` (`school_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp Connection Settings Table
-- Stores WhatsApp connection status and metadata for each school

CREATE TABLE IF NOT EXISTS `whatsapp_connections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL UNIQUE,
  `phone_number` VARCHAR(20) DEFAULT NULL COMMENT 'Connected WhatsApp number',
  `status` ENUM('connected', 'disconnected', 'pending', 'error') DEFAULT 'disconnected',
  `connected_at` TIMESTAMP NULL DEFAULT NULL,
  `disconnected_at` TIMESTAMP NULL DEFAULT NULL,
  `last_activity` TIMESTAMP NULL DEFAULT NULL,
  `total_messages_sent` INT DEFAULT 0,
  `total_cost` DECIMAL(10, 2) DEFAULT 0.00,
  `metadata` JSON DEFAULT NULL COMMENT 'Additional connection metadata',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SMS Messages Tracking Table (for comparison and unified reporting)
CREATE TABLE IF NOT EXISTS `sms_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `total_sent` INT NOT NULL DEFAULT 0,
  `total_failed` INT NOT NULL DEFAULT 0,
  `sender_name` VARCHAR(11) NOT NULL,
  `message_text` TEXT NOT NULL,
  `recipients` JSON DEFAULT NULL,
  `results` JSON DEFAULT NULL,
  `cost` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost in SMS units',
  `provider` VARCHAR(50) DEFAULT 'ebulksms',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(50) DEFAULT NULL,
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_school_created` (`school_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messaging Cost Configuration Table
CREATE TABLE IF NOT EXISTS `messaging_costs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_type` ENUM('sms', 'whatsapp') NOT NULL,
  `cost_per_message` DECIMAL(10, 4) DEFAULT 0.0000,
  `currency` VARCHAR(10) DEFAULT 'NGN',
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_service` (`service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default cost configuration
INSERT INTO `messaging_costs` (`service_type`, `cost_per_message`, `currency`, `description`)
VALUES
  ('sms', 4.0000, 'NGN', 'Cost per SMS message via eBulkSMS'),
  ('whatsapp', 0.0000, 'NGN', 'WhatsApp messages are free (only connection setup cost)')
ON DUPLICATE KEY UPDATE
  `cost_per_message` = VALUES(`cost_per_message`),
  `description` = VALUES(`description`);
