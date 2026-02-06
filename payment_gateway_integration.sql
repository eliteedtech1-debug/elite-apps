-- =====================================================
-- Payment Gateway Integration for Payroll Disbursement
-- Date: 2026-02-06
-- Description: Generic payment gateway support for salary disbursement
-- =====================================================

-- 1. Payment Gateway Configuration Table (supports multiple gateways)
CREATE TABLE IF NOT EXISTS `payment_gateway_config` (
  `config_id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(20) NOT NULL,
  `gateway_name` VARCHAR(50) NOT NULL COMMENT 'remita, paystack, flutterwave, stripe, etc',
  `is_active` TINYINT(1) DEFAULT 0,
  `is_default` TINYINT(1) DEFAULT 0 COMMENT 'Default gateway for this school',
  `config_data` JSON NOT NULL COMMENT 'Gateway-specific credentials and settings',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `unique_school_gateway` (`school_id`, `gateway_name`),
  KEY `idx_school_active` (`school_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example config_data structure for different gateways:
-- Remita: {"merchant_id": "xxx", "api_key": "xxx", "service_type_id": "xxx"}
-- Paystack: {"secret_key": "xxx", "public_key": "xxx"}
-- Flutterwave: {"secret_key": "xxx", "public_key": "xxx", "encryption_key": "xxx"}

-- 2. Add payment tracking to payroll_lines
ALTER TABLE `payroll_lines` 
  ADD COLUMN IF NOT EXISTS `payment_method` ENUM('manual', 'gateway') DEFAULT 'manual' COMMENT 'manual or gateway',
  ADD COLUMN IF NOT EXISTS `gateway_name` VARCHAR(50) NULL COMMENT 'remita, paystack, etc',
  ADD COLUMN IF NOT EXISTS `payment_reference` VARCHAR(100) NULL COMMENT 'Transaction reference from gateway',
  ADD COLUMN IF NOT EXISTS `payment_status` ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS `payment_response` JSON NULL COMMENT 'Full response from gateway',
  ADD COLUMN IF NOT EXISTS `payment_initiated_at` TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS `payment_completed_at` TIMESTAMP NULL;

-- 3. Payment Gateway Transactions Log (for audit trail)
CREATE TABLE IF NOT EXISTS `payment_gateway_transactions` (
  `transaction_id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(20) NOT NULL,
  `gateway_name` VARCHAR(50) NOT NULL,
  `transaction_type` ENUM('disbursement', 'refund', 'reversal') DEFAULT 'disbursement',
  `reference` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(3) DEFAULT 'NGN',
  `status` ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending',
  `request_payload` JSON NULL,
  `response_payload` JSON NULL,
  `error_message` TEXT NULL,
  `payroll_line_id` INT(11) NULL COMMENT 'Link to payroll_lines',
  `staff_id` INT(11) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `unique_reference` (`reference`),
  KEY `idx_school_gateway` (`school_id`, `gateway_name`),
  KEY `idx_status` (`status`),
  KEY `idx_payroll_line` (`payroll_line_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Webhook Events Log (for gateway callbacks)
CREATE TABLE IF NOT EXISTS `payment_gateway_webhooks` (
  `webhook_id` INT(11) NOT NULL AUTO_INCREMENT,
  `gateway_name` VARCHAR(50) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL COMMENT 'payment.success, payment.failed, etc',
  `reference` VARCHAR(100) NULL,
  `payload` JSON NOT NULL,
  `processed` TINYINT(1) DEFAULT 0,
  `processed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`webhook_id`),
  KEY `idx_gateway_processed` (`gateway_name`, `processed`),
  KEY `idx_reference` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Sample Data: Configure Remita for a school
-- =====================================================
INSERT INTO `payment_gateway_config` 
  (`school_id`, `gateway_name`, `is_active`, `is_default`, `config_data`)
VALUES 
  ('SCH/20', 'remita', 1, 1, JSON_OBJECT(
    'merchant_id', 'DEMO_MERCHANT_ID',
    'api_key', 'DEMO_API_KEY',
    'service_type_id', 'DEMO_SERVICE_TYPE',
    'environment', 'test'
  ));

-- =====================================================
-- Migration Complete
-- =====================================================
