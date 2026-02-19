-- Migration: System Notifications in elite_logs database
-- Database: elite_logs
-- Purpose: Store all system notifications separately from main database

USE elite_logs;

CREATE TABLE IF NOT EXISTS `system_notifications` (
  `id` char(36) NOT NULL DEFAULT (UUID()),
  `user_id` int DEFAULT NULL,
  `school_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(500) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `type` enum('info','success','warning','error','notification') DEFAULT 'notification',
  `category` varchar(50) DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT 0,
  `is_bulk` tinyint(1) DEFAULT 0,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_school` (`user_id`, `school_id`),
  KEY `idx_school_created` (`school_id`, `created_at`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
