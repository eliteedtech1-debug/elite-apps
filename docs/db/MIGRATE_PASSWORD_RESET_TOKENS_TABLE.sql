-- Migration for password_reset_tokens table
-- Adds school_id, otp_code, and contact fields for enhanced password reset functionality

USE skcooly_db;

-- Step 1: Add new columns
ALTER TABLE `password_reset_tokens`
  ADD COLUMN IF NOT EXISTS `school_id` VARCHAR(255) NULL AFTER `user_type`,
  ADD COLUMN IF NOT EXISTS `contact` VARCHAR(255) NULL COMMENT 'Email or phone number where reset link/OTP was sent' AFTER `email`,
  ADD COLUMN IF NOT EXISTS `otp_code` VARCHAR(10) NULL COMMENT 'OTP code for password reset' AFTER `token`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Step 2: Copy email values to contact column for existing records
UPDATE `password_reset_tokens`
SET `contact` = `email`
WHERE `contact` IS NULL AND `email` IS NOT NULL;

-- Step 3: Add indexes for better performance
ALTER TABLE `password_reset_tokens`
  ADD INDEX IF NOT EXISTS `idx_school_id` (`school_id`),
  ADD INDEX IF NOT EXISTS `idx_contact` (`contact`),
  ADD INDEX IF NOT EXISTS `idx_otp_code` (`otp_code`),
  ADD INDEX IF NOT EXISTS `idx_expires_at` (`expires_at`);

-- Step 4: Update user_type column to use ENUM (optional but recommended)
ALTER TABLE `password_reset_tokens`
  MODIFY COLUMN `user_type` ENUM('admin', 'superadmin', 'teacher', 'student', 'parent') NOT NULL;

-- Note: We keep the email column for backward compatibility
-- The contact column will be used for new password reset requests (email or phone)

-- Verify the changes
DESCRIBE `password_reset_tokens`;

-- Show sample of updated table
SELECT 'Migration completed successfully!' as status;
