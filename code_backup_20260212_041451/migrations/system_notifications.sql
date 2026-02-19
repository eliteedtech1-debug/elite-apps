-- System Notifications Table
CREATE TABLE IF NOT EXISTS `system_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error','announcement') DEFAULT 'info',
  `category` enum('system','academic','finance','attendance','general') DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT 0,
  `is_pushed` tinyint(1) DEFAULT 0,
  `metadata` json DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_school` (`user_id`, `school_id`),
  KEY `idx_unread` (`is_read`, `created_at`),
  KEY `idx_type_category` (`type`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User FCM Tokens for Firebase Push
CREATE TABLE IF NOT EXISTS `user_fcm_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `device_type` enum('web','android','ios') DEFAULT 'web',
  `is_active` tinyint(1) DEFAULT 1,
  `last_used` timestamp DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_token` (`user_id`, `token`(255)),
  KEY `idx_active_tokens` (`user_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
