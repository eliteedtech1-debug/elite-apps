-- Migrate notice_board to elite_logs database
USE elite_logs;

CREATE TABLE IF NOT EXISTS `notice_board` (
  `id` char(36) NOT NULL DEFAULT (UUID()),
  `title` varchar(255) NOT NULL,
  `description` text,
  `content` longtext,
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `due_date` date DEFAULT NULL,
  `publish_date` datetime DEFAULT NULL,
  `category` enum('Notice','Announcement','Event','Alert','General') DEFAULT 'Notice',
  `audience` json DEFAULT NULL COMMENT '["student","teacher","parent","staff","all"]',
  `attachments` json DEFAULT NULL,
  `views_count` int DEFAULT 0,
  `school_id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `created_by` int NOT NULL,
  `created_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_school_branch` (`school_id`, `branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data
INSERT INTO elite_logs.notice_board 
  (id, title, description, status, due_date, category, school_id, branch_id, created_by, created_at)
SELECT 
  UUID() as id,
  title,
  description,
  CASE 
    WHEN status = 'Active' THEN 'published'
    WHEN status = 'Inactive' THEN 'archived'
    ELSE 'draft'
  END as status,
  due_date,
  category,
  school_id,
  branch_id,
  created_by,
  created_at
FROM full_skcooly.notice_board;
