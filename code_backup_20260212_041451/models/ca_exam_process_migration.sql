-- =====================================================
-- CA/Exam Process System Migration
-- =====================================================
-- This migration creates tables for the complete CA/Exam workflow:
-- - Question submission by teachers
-- - Moderation by exam officers
-- - Notification system
-- - Printing and CBT support
-- =====================================================

-- =====================================================
-- STEP 1: Ensure ca_setup table has required columns
-- =====================================================

-- Check if ca_setup table exists and has the required structure
-- The ca_setup table should already exist with these fields:
-- id, ca_type, week_number, max_score, overall_contribution_percent, 
-- is_active, school_id, branch_id, status, section, created_at, updated_at

-- Add scheduled_date column if not exists
SET @dbname = DATABASE();
SET @tablename = 'ca_setup';
SET @columnname = 'scheduled_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` DATE NULL COMMENT ''Auto-calculated scheduled date based on week_number'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add submission_deadline column if not exists
SET @columnname = 'submission_deadline';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` DATE NULL COMMENT ''Deadline for teachers to submit questions'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add notification_sent column if not exists
SET @columnname = 'notification_sent';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` TINYINT(1) DEFAULT 0 COMMENT ''Whether notification has been sent to teachers'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- STEP 2: Create ca_exam_submissions table
-- =====================================================

CREATE TABLE IF NOT EXISTS `ca_exam_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_code` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique submission identifier',
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `ca_setup_id` INT NOT NULL COMMENT 'Reference to ca_setup table',
  `ca_type` ENUM('CA1', 'CA2', 'CA3', 'CA4', 'EXAM') NOT NULL,
  `teacher_id` INT NOT NULL COMMENT 'User ID of submitting teacher',
  `subject_id` INT NOT NULL,
  `class_id` VARCHAR(50) NOT NULL,
  `academic_year` VARCHAR(20) NOT NULL,
  `term` VARCHAR(20) NOT NULL,
  
  -- Question file details
  `question_file_url` VARCHAR(500) NULL COMMENT 'Path to uploaded question file',
  `question_file_name` VARCHAR(255) NULL,
  `question_file_type` VARCHAR(50) NULL COMMENT 'PDF, DOC, DOCX',
  `question_file_size` INT NULL COMMENT 'File size in bytes',
  
  -- Submission details
  `comments` TEXT NULL COMMENT 'Teacher comments/notes',
  `status` ENUM('Draft', 'Submitted', 'Under Moderation', 'Approved', 'Rejected', 'Modification Requested') DEFAULT 'Draft',
  `submission_date` DATETIME NULL COMMENT 'When teacher submitted',
  `is_locked` TINYINT(1) DEFAULT 0 COMMENT 'Locked after approval',
  
  -- Moderation details
  `moderated_by` INT NULL COMMENT 'User ID of moderator',
  `moderation_date` DATETIME NULL,
  `moderation_comments` TEXT NULL,
  `rejection_reason` TEXT NULL,
  
  -- Replacement file (if moderator replaces)
  `replacement_file_url` VARCHAR(500) NULL,
  `replacement_file_name` VARCHAR(255) NULL,
  `replaced_by` INT NULL COMMENT 'User ID who replaced file',
  `replacement_date` DATETIME NULL,
  
  -- Printing status
  `is_printed` TINYINT(1) DEFAULT 0,
  `printed_by` INT NULL,
  `printed_date` DATETIME NULL,
  `print_count` INT DEFAULT 0,
  
  -- CBT support (future)
  `cbt_enabled` TINYINT(1) DEFAULT 0,
  `cbt_initiated_by` INT NULL,
  `cbt_initiated_date` DATETIME NULL,
  
  -- Audit fields
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  
  -- Indexes
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_ca_setup` (`ca_setup_id`),
  INDEX `idx_teacher` (`teacher_id`),
  INDEX `idx_subject_class` (`subject_id`, `class_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_academic` (`academic_year`, `term`),
  INDEX `idx_ca_type` (`ca_type`),
  
  -- Unique constraint: One submission per teacher per subject per class per CA
  UNIQUE KEY `unique_submission` (`school_id`, `branch_id`, `ca_setup_id`, `teacher_id`, `subject_id`, `class_id`, `academic_year`, `term`),
  
  -- Foreign key constraints
  FOREIGN KEY (`ca_setup_id`) REFERENCES `ca_setup`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Teacher question submissions for CA and Exams';

-- =====================================================
-- STEP 3: Create ca_exam_moderation_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS `ca_exam_moderation_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  
  -- Moderation action
  `action` ENUM('Submitted', 'Under Review', 'Approved', 'Rejected', 'Modification Requested', 'File Replaced', 'Locked', 'Unlocked', 'Printed') NOT NULL,
  `action_by` INT NOT NULL COMMENT 'User ID who performed action',
  `action_date` DATETIME NOT NULL,
  
  -- Details
  `previous_status` VARCHAR(50) NULL,
  `new_status` VARCHAR(50) NULL,
  `comments` TEXT NULL,
  `reason` TEXT NULL,
  
  -- File changes
  `file_changed` TINYINT(1) DEFAULT 0,
  `old_file_url` VARCHAR(500) NULL,
  `new_file_url` VARCHAR(500) NULL,
  
  -- Metadata
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX `idx_submission` (`submission_id`),
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_action_by` (`action_by`),
  INDEX `idx_action_date` (`action_date`),
  INDEX `idx_action` (`action`),
  
  -- Foreign key
  FOREIGN KEY (`submission_id`) REFERENCES `ca_exam_submissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit log for all moderation actions on CA/Exam submissions';

-- =====================================================
-- STEP 4: Create ca_exam_notifications table
-- =====================================================

CREATE TABLE IF NOT EXISTS `ca_exam_notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `notification_code` VARCHAR(50) UNIQUE NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `ca_setup_id` INT NOT NULL,
  
  -- Notification details
  `notification_type` ENUM('Upcoming Deadline', 'Deadline Reminder', 'Submission Received', 'Moderation Update', 'Approval', 'Rejection', 'Modification Request') NOT NULL,
  `recipient_type` ENUM('Teacher', 'Admin', 'Exam Officer', 'Moderation Committee', 'All') NOT NULL,
  `recipient_id` INT NULL COMMENT 'Specific user ID or NULL for broadcast',
  
  -- Message content
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `ca_type` VARCHAR(20) NULL,
  `subject_name` VARCHAR(100) NULL,
  `class_name` VARCHAR(100) NULL,
  `deadline_date` DATE NULL,
  
  -- Notification status
  `is_sent` TINYINT(1) DEFAULT 0,
  `sent_date` DATETIME NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_date` DATETIME NULL,
  
  -- Delivery channels
  `sent_via_email` TINYINT(1) DEFAULT 0,
  `sent_via_sms` TINYINT(1) DEFAULT 0,
  `sent_via_push` TINYINT(1) DEFAULT 0,
  `sent_via_in_app` TINYINT(1) DEFAULT 1,
  
  -- Related submission
  `submission_id` INT NULL,
  
  -- Priority
  `priority` ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_ca_setup` (`ca_setup_id`),
  INDEX `idx_recipient` (`recipient_id`),
  INDEX `idx_type` (`notification_type`),
  INDEX `idx_status` (`is_sent`, `is_read`),
  INDEX `idx_deadline` (`deadline_date`),
  INDEX `idx_submission` (`submission_id`),
  
  -- Foreign keys
  FOREIGN KEY (`ca_setup_id`) REFERENCES `ca_setup`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`submission_id`) REFERENCES `ca_exam_submissions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Notifications for CA/Exam process workflow';

-- =====================================================
-- STEP 5: Create ca_exam_print_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS `ca_exam_print_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  
  -- Print details
  `printed_by` INT NOT NULL,
  `print_date` DATETIME NOT NULL,
  `print_type` ENUM('Preview', 'Download', 'Print') NOT NULL,
  `copies_count` INT DEFAULT 1,
  
  -- PDF details
  `pdf_file_url` VARCHAR(500) NULL,
  `pdf_file_size` INT NULL,
  
  -- Metadata
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX `idx_submission` (`submission_id`),
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_printed_by` (`printed_by`),
  INDEX `idx_print_date` (`print_date`),
  
  -- Foreign key
  FOREIGN KEY (`submission_id`) REFERENCES `ca_exam_submissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log of all question paper printing activities';

-- =====================================================
-- STEP 6: Add CBT support column to school_setup
-- =====================================================

SET @tablename = 'school_setup';
SET @columnname = 'cbt_enabled';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` TINYINT(1) DEFAULT 0 COMMENT ''Enable Computer-Based Testing (CBT) for this school'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- STEP 7: Create views for reporting
-- =====================================================

-- View: Submission summary by status
CREATE OR REPLACE VIEW `v_ca_exam_submission_summary` AS
SELECT 
  ces.school_id,
  ces.branch_id,
  ces.academic_year,
  ces.term,
  ces.ca_type,
  ces.status,
  COUNT(*) as submission_count,
  COUNT(DISTINCT ces.teacher_id) as teacher_count,
  COUNT(DISTINCT ces.subject_id) as subject_count,
  COUNT(DISTINCT ces.class_id) as class_count,
  SUM(CASE WHEN ces.is_locked = 1 THEN 1 ELSE 0 END) as locked_count,
  SUM(CASE WHEN ces.is_printed = 1 THEN 1 ELSE 0 END) as printed_count
FROM ca_exam_submissions ces
GROUP BY ces.school_id, ces.branch_id, ces.academic_year, ces.term, ces.ca_type, ces.status;

-- View: Pending submissions (not yet submitted)
CREATE OR REPLACE VIEW `v_pending_submissions` AS
SELECT 
  cs.id as ca_setup_id,
  cs.school_id,
  cs.branch_id,
  cs.ca_type,
  cs.week_number,
  cs.scheduled_date,
  cs.submission_deadline,
  t.id as teacher_id,
  t.name as teacher_name,
  t.email as teacher_email,
  s.subject_id,
  s.subject as subject_name,
  c.class_code as class_id,
  c.class_name,
  DATEDIFF(cs.submission_deadline, CURDATE()) as days_remaining
FROM ca_setup cs
CROSS JOIN users t
CROSS JOIN subjects s
CROSS JOIN classes c
WHERE cs.is_active = 1
  AND cs.status = 'Active'
  AND t.user_type = 'Teacher'
  AND t.school_id = cs.school_id
  AND s.school_id = cs.school_id
  AND c.school_id = cs.school_id
  AND NOT EXISTS (
    SELECT 1 FROM ca_exam_submissions ces
    WHERE ces.ca_setup_id = cs.id
      AND ces.teacher_id = t.id
      AND ces.subject_id = s.subject_id
      AND ces.class_id = c.class_code
      AND ces.status != 'Draft'
  );

-- =====================================================
-- STEP 8: Create stored procedures
-- =====================================================

DELIMITER //

-- Procedure: Calculate scheduled date and deadline
CREATE PROCEDURE IF NOT EXISTS `sp_calculate_ca_dates`(
  IN p_ca_setup_id INT,
  IN p_academic_year_start DATE
)
BEGIN
  DECLARE v_week_number INT;
  DECLARE v_ca_type VARCHAR(20);
  DECLARE v_scheduled_date DATE;
  DECLARE v_submission_deadline DATE;
  DECLARE v_weeks_before INT;
  
  -- Get CA details
  SELECT week_number, ca_type 
  INTO v_week_number, v_ca_type
  FROM ca_setup 
  WHERE id = p_ca_setup_id;
  
  -- Calculate scheduled date (academic_year_start + week_number weeks)
  SET v_scheduled_date = DATE_ADD(p_academic_year_start, INTERVAL v_week_number WEEK);
  
  -- Calculate submission deadline
  -- CA: 2-3 weeks before (using 3 weeks)
  -- EXAM: 4 weeks before
  IF v_ca_type = 'EXAM' THEN
    SET v_weeks_before = 4;
  ELSE
    SET v_weeks_before = 3;
  END IF;
  
  SET v_submission_deadline = DATE_SUB(v_scheduled_date, INTERVAL v_weeks_before WEEK);
  
  -- Update ca_setup
  UPDATE ca_setup 
  SET scheduled_date = v_scheduled_date,
      submission_deadline = v_submission_deadline
  WHERE id = p_ca_setup_id;
  
  SELECT v_scheduled_date as scheduled_date, v_submission_deadline as submission_deadline;
END //

-- Procedure: Send notifications to teachers
CREATE PROCEDURE IF NOT EXISTS `sp_send_teacher_notifications`(
  IN p_school_id VARCHAR(50),
  IN p_branch_id VARCHAR(50)
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_ca_setup_id INT;
  DECLARE v_ca_type VARCHAR(20);
  DECLARE v_deadline DATE;
  DECLARE v_days_remaining INT;
  
  DECLARE cur CURSOR FOR
    SELECT id, ca_type, submission_deadline,
           DATEDIFF(submission_deadline, CURDATE()) as days_remaining
    FROM ca_setup
    WHERE school_id = p_school_id
      AND branch_id = p_branch_id
      AND is_active = 1
      AND status = 'Active'
      AND notification_sent = 0
      AND submission_deadline >= CURDATE()
      AND DATEDIFF(submission_deadline, CURDATE()) <= 21; -- 3 weeks
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN cur;
  
  read_loop: LOOP
    FETCH cur INTO v_ca_setup_id, v_ca_type, v_deadline, v_days_remaining;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- Insert notification for each teacher
    INSERT INTO ca_exam_notifications (
      notification_code,
      school_id,
      branch_id,
      ca_setup_id,
      notification_type,
      recipient_type,
      title,
      message,
      ca_type,
      deadline_date,
      priority
    )
    SELECT 
      CONCAT('NOTIF-', v_ca_setup_id, '-', t.id, '-', UNIX_TIMESTAMP()),
      p_school_id,
      p_branch_id,
      v_ca_setup_id,
      'Upcoming Deadline',
      'Teacher',
      CONCAT('Upcoming ', v_ca_type, ' Question Submission Deadline'),
      CONCAT('You have ', v_days_remaining, ' days remaining to submit questions for ', v_ca_type, '. Deadline: ', DATE_FORMAT(v_deadline, '%d %b %Y')),
      v_ca_type,
      v_deadline,
      CASE 
        WHEN v_days_remaining <= 7 THEN 'Urgent'
        WHEN v_days_remaining <= 14 THEN 'High'
        ELSE 'Normal'
      END
    FROM users t
    WHERE t.school_id = p_school_id
      AND t.user_type = 'Teacher'
      AND t.status = 'Active';
    
    -- Mark notification as sent
    UPDATE ca_setup 
    SET notification_sent = 1 
    WHERE id = v_ca_setup_id;
    
  END LOOP;
  
  CLOSE cur;
END //

DELIMITER ;

-- =====================================================
-- Migration Complete! ✅
-- =====================================================
-- 
-- TABLES CREATED:
-- 1. ca_exam_submissions - Teacher question submissions
-- 2. ca_exam_moderation_logs - Audit log for moderation
-- 3. ca_exam_notifications - Notification system
-- 4. ca_exam_print_logs - Printing activity log
--
-- VIEWS CREATED:
-- 1. v_ca_exam_submission_summary - Summary by status
-- 2. v_pending_submissions - Pending teacher submissions
--
-- STORED PROCEDURES:
-- 1. sp_calculate_ca_dates - Calculate dates automatically
-- 2. sp_send_teacher_notifications - Send notifications
--
-- NEXT STEPS:
-- 1. Configure CA/Exam setup in ca_setup table
-- 2. Run sp_calculate_ca_dates for each CA setup
-- 3. Set up cron job to run sp_send_teacher_notifications daily
-- 4. Implement backend controllers and routes
-- 5. Implement frontend pages
--
-- =====================================================
