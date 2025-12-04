-- ============================================================
-- Sample Messaging Packages for ElScholar Communication Setup
-- ============================================================
-- This script creates sample messaging packages for testing
-- the Communication Setup feature in ElScholar.
--
-- Tables created/populated:
-- 1. messaging_packages - Available packages for SMS/WhatsApp
-- 2. messaging_subscriptions - School subscriptions to packages
-- 3. messaging_usage - Usage tracking table
-- 4. messaging_history - Already exists, for message history
--
-- Usage:
-- Run this script in your MySQL database to populate test data
-- ============================================================

-- ============================================================
-- 1. CREATE TABLES (if not exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS `messaging_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `package_name` VARCHAR(100) NOT NULL,
  `service_type` ENUM('sms', 'whatsapp', 'email') NOT NULL,
  `package_type` ENUM('payg', 'termly', 'annual') NOT NULL COMMENT 'payg = pay-as-you-go, termly = term package, annual = annual package',
  `messages_per_term` INT DEFAULT NULL COMMENT 'Total messages for termly packages, NULL for payg',
  `unit_cost` DECIMAL(10, 2) NOT NULL COMMENT 'Cost per message for payg, or per-message rate for termly',
  `package_cost` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Total package cost for termly packages',
  `currency` VARCHAR(10) DEFAULT '₦',
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_service_type` (`service_type`),
  INDEX `idx_package_type` (`package_type`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `messaging_subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `package_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `total_messages` INT DEFAULT 0,
  `messages_used` INT DEFAULT 0,
  `status` ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`package_id`) REFERENCES `messaging_packages`(`id`) ON DELETE CASCADE,
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `messaging_usage` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `subscription_id` INT DEFAULT NULL,
  `service_type` ENUM('sms', 'whatsapp', 'email') NOT NULL,
  `message_count` INT DEFAULT 1,
  `cost` DECIMAL(10, 2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subscription_id`) REFERENCES `messaging_subscriptions`(`id`) ON DELETE SET NULL,
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_service_type` (`service_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. INSERT SAMPLE MESSAGING PACKAGES
-- ============================================================

-- Clear existing sample packages (optional, comment out if you want to keep existing data)
-- DELETE FROM messaging_packages WHERE id < 1000;

-- -----------------------------------------------------------
-- SMS PACKAGES
-- -----------------------------------------------------------

-- SMS Pay-As-You-Go (0% discount - Base rate ₦5.00)
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('SMS Pay-As-You-Go', 'sms', 'payg', NULL, 5.00, NULL, '₦', 'Pay per message at ₦5.00 per SMS. No commitment, no discount.', 1);

-- SMS Termly Packages
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('SMS Standard - 500 Messages/Term', 'sms', 'termly', 500, 5.00, 2500.00, '₦', 'Standard plan: 500 SMS per term at ₦5.00/msg (0% discount) - Total: ₦2,500', 1),
  ('SMS Premium - 1,500 Messages/Term', 'sms', 'termly', 1500, 4.75, 7125.00, '₦', 'Premium plan: 1,500 SMS per term at ₦4.75/msg (5% discount) - Total: ₦7,125', 1),
  ('SMS Elite - 3,000 Messages/Term', 'sms', 'termly', 3000, 4.75, 14250.00, '₦', 'Elite plan: 3,000 SMS per term at ₦4.75/msg (5% discount) - Total: ₦14,250', 1);

-- SMS Annual Packages (15% discount for all tiers)
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('SMS Standard - 1,500 Messages/Year', 'sms', 'annual', 1500, 4.25, 6375.00, '₦', 'Standard annual: 1,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦6,375', 1),
  ('SMS Premium - 4,500 Messages/Year', 'sms', 'annual', 4500, 4.25, 19125.00, '₦', 'Premium annual: 4,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦19,125', 1),
  ('SMS Elite - 9,000 Messages/Year', 'sms', 'annual', 9000, 4.25, 38250.00, '₦', 'Elite annual: 9,000 SMS per year at ₦4.25/msg (15% discount) - Total: ₦38,250', 1);

-- -----------------------------------------------------------
-- WHATSAPP PACKAGES
-- -----------------------------------------------------------

-- WhatsApp Pay-As-You-Go (0% discount - Base rate ₦2.00)
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('WhatsApp Pay-As-You-Go', 'whatsapp', 'payg', NULL, 2.00, NULL, '₦', 'Pay per message at ₦2.00 per WhatsApp message. No commitment, no discount.', 1);

-- WhatsApp Termly Packages
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('WhatsApp Standard - 500 Messages/Term', 'whatsapp', 'termly', 500, 2.00, 1000.00, '₦', 'Standard plan: 500 WhatsApp per term at ₦2.00/msg (0% discount) - Total: ₦1,000', 1),
  ('WhatsApp Premium - 1,500 Messages/Term', 'whatsapp', 'termly', 1500, 1.90, 2850.00, '₦', 'Premium plan: 1,500 WhatsApp per term at ₦1.90/msg (5% discount) - Total: ₦2,850', 1),
  ('WhatsApp Elite - 3,000 Messages/Term', 'whatsapp', 'termly', 3000, 1.90, 5700.00, '₦', 'Elite plan: 3,000 WhatsApp per term at ₦1.90/msg (5% discount) - Total: ₦5,700', 1);

-- WhatsApp Annual Packages (15% discount for all tiers)
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('WhatsApp Standard - 1,500 Messages/Year', 'whatsapp', 'annual', 1500, 1.70, 2550.00, '₦', 'Standard annual: 1,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦2,550', 1),
  ('WhatsApp Premium - 4,500 Messages/Year', 'whatsapp', 'annual', 4500, 1.70, 7650.00, '₦', 'Premium annual: 4,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦7,650', 1),
  ('WhatsApp Elite - 9,000 Messages/Year', 'whatsapp', 'annual', 9000, 1.70, 15300.00, '₦', 'Elite annual: 9,000 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦15,300', 1);

-- -----------------------------------------------------------
-- EMAIL PACKAGES (Optional - if you want to add email support)
-- -----------------------------------------------------------

-- Email Pay-As-You-Go Package
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('Email Pay-As-You-Go', 'email', 'payg', NULL, 0.50, NULL, '₦', 'Pay only for emails you send. Ideal for official communications.', 1);

-- Email Termly Packages
INSERT INTO `messaging_packages`
  (`package_name`, `service_type`, `package_type`, `messages_per_term`, `unit_cost`, `package_cost`, `currency`, `description`, `is_active`)
VALUES
  ('Email Standard - 1,000 Emails', 'email', 'termly', 1000, 0.40, 400.00, '₦', 'Perfect for newsletters and announcements. 1,000 emails per term at ₦0.40 per email (Total: ₦400).', 1),
  ('Email Premium - 5,000 Emails', 'email', 'termly', 5000, 0.30, 1500.00, '₦', 'Best for frequent email communication. 5,000 emails per term at ₦0.30 per email (Total: ₦1,500).', 1),
  ('Email Elite - Unlimited', 'email', 'termly', 999999, 0.00, 3000.00, '₦', 'Unlimited emails for comprehensive school communication (Flat rate: ₦3,000).', 1);

-- ============================================================
-- 3. INSERT SAMPLE SUBSCRIPTIONS (for testing)
-- ============================================================

-- Example: Subscribe a test school to SMS Silver package
-- Replace 'TEST_SCHOOL_001' with your actual school_id

-- Get the package_id for SMS Premium (Termly)
SET @sms_premium_id = (SELECT id FROM messaging_packages WHERE package_name = 'SMS Premium - 1,500 Messages/Term' LIMIT 1);

-- Insert sample subscription (adjust dates and school_id as needed)
INSERT INTO `messaging_subscriptions`
  (`school_id`, `package_id`, `start_date`, `end_date`, `total_messages`, `messages_used`, `status`)
VALUES
  ('TEST_SCHOOL_001', @sms_premium_id, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 1500, 150, 'active');

-- Example: Subscribe test school to WhatsApp Premium (Termly)
SET @whatsapp_premium_id = (SELECT id FROM messaging_packages WHERE package_name = 'WhatsApp Premium - 1,500 Messages/Term' LIMIT 1);

INSERT INTO `messaging_subscriptions`
  (`school_id`, `package_id`, `start_date`, `end_date`, `total_messages`, `messages_used`, `status`)
VALUES
  ('TEST_SCHOOL_001', @whatsapp_premium_id, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 1500, 45, 'active');

-- ============================================================
-- 4. VERIFY DATA
-- ============================================================

-- Check packages
SELECT
  id,
  package_name,
  service_type,
  package_type,
  messages_per_term,
  unit_cost,
  package_cost,
  is_active
FROM messaging_packages
ORDER BY service_type, package_type, messages_per_term;

-- Check subscriptions
SELECT
  ms.id as subscription_id,
  ms.school_id,
  mp.package_name,
  mp.service_type,
  ms.start_date,
  ms.end_date,
  ms.total_messages,
  ms.messages_used,
  ms.status,
  DATEDIFF(ms.end_date, CURDATE()) as days_remaining
FROM messaging_subscriptions ms
JOIN messaging_packages mp ON ms.package_id = mp.id
WHERE ms.school_id = 'TEST_SCHOOL_001';

-- ============================================================
-- 5. USAGE NOTES
-- ============================================================

/*
After running this script:

1. Update TEST_SCHOOL_001 to your actual school_id in the subscriptions

2. Enable subscriptions in school_setup table:
   UPDATE school_setup
   SET sms_subscription = 1, whatsapp_subscription = 1
   WHERE school_id = 'YOUR_SCHOOL_ID';

3. Test the Communication Setup page:
   - Navigate to Settings → Communication Setup
   - You should see the available packages
   - Current packages should show the active subscriptions
   - You can subscribe to new packages

4. Package Types:
   - PAYG (Pay-As-You-Go): Pay per message sent
   - Termly: Buy a bulk package for the term

5. To add more subscriptions for testing:
   - Use the frontend UI to subscribe
   - Or manually insert using the pattern above

6. To expire a subscription:
   UPDATE messaging_subscriptions
   SET status = 'expired', end_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
   WHERE id = [subscription_id];

7. To track usage:
   Use the /api/messaging-usage endpoint when sending messages
   This will automatically deduct from termly packages
*/

-- ============================================================
-- END OF SCRIPT
-- ============================================================
