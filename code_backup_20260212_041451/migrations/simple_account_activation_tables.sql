-- Simple Account Activation Tables Migration
-- Creates tables needed for the simplified account activation API

-- Table to store OTPs
CREATE TABLE IF NOT EXISTS `account_activation_otps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `school_id` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_otp` (`user_id`, `user_type`, `school_id`),
  KEY `idx_user_school` (`user_id`, `school_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for rate limiting
CREATE TABLE IF NOT EXISTS `account_activation_rate_limits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `user_type`, `created_at`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for activation logs (if not exists)
CREATE TABLE IF NOT EXISTS `account_activation_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL,
  `school_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`, `user_type`, `action`),
  KEY `idx_school_branch` (`school_id`, `branch_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add cleanup job for expired OTPs (optional)
-- This can be run as a scheduled job to clean up expired OTPs
-- DELETE FROM account_activation_otps WHERE expires_at < NOW();

-- Add cleanup job for old rate limit records (optional)
-- DELETE FROM account_activation_rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 DAY);

-- Add cleanup job for old logs (optional, keep last 30 days)
-- DELETE FROM account_activation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);