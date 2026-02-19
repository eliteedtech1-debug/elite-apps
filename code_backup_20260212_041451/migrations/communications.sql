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

-- Create messaging_packages table to store different service packages
CREATE TABLE IF NOT EXISTS messaging_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT 'Package name (e.g., Bronze, Silver, Gold)',
    service_type ENUM('sms', 'whatsapp', 'email') NOT NULL COMMENT 'Type of messaging service',
    package_type ENUM('payg', 'termly') NOT NULL COMMENT 'Pay-as-you-go (payg) or termly subscription',
    messages_per_term INT NOT NULL DEFAULT 0 COMMENT 'Number of messages included per term for termly packages',
    unit_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Cost per unit message for pay-as-you-go packages',
    package_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Total cost of the package for termly packages',
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN' COMMENT 'Currency code',
    description TEXT COMMENT 'Package description and features',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether package is currently available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_type (service_type),
    INDEX idx_package_type (package_type),
    INDEX idx_is_active (is_active)
);

-- Insert default packages
INSERT INTO messaging_packages (package_name, service_type, package_type, messages_per_term, unit_cost, package_cost, description) VALUES
-- SMS Pay-as-you-go packages
('Unit', 'sms', 'payg', 0, 4.0000, 0.0000, 'Pay per message at standard rate of ₦4 per SMS'),
('Bronze', 'sms', 'payg', 0, 3.5000, 0.0000, 'Discounted rate of ₦3.50 per SMS'),
('Silver', 'sms', 'payg', 0, 3.2000, 0.0000, 'Premium rate of ₦3.20 per SMS'),
('Gold', 'sms', 'payg', 0, 3.0000, 0.0000, 'Best rate of ₦3.00 per SMS'),

-- SMS Termly packages
('Bronze', 'sms', 'termly', 500, 0.0000, 1500.0000, '500 SMS messages per term for ₦1,500'),
('Silver', 'sms', 'termly', 1200, 0.0000, 3000.0000, '1,200 SMS messages per term for ₦3,000'),
('Gold', 'sms', 'termly', 2500, 0.0000, 5500.0000, '2,500 SMS messages per term for ₦5,500'),

-- WhatsApp Pay-as-you-go packages (free service, but we track usage)
('Unit', 'whatsapp', 'payg', 0, 0.0000, 0.0000, 'Free WhatsApp messages with connection setup required'),
('Bronze', 'whatsapp', 'payg', 0, 0.0000, 0.0000, 'Free WhatsApp messages with priority support'),
('Silver', 'whatsapp', 'payg', 0, 0.0000, 0.0000, 'Free WhatsApp messages with enhanced features'),
('Gold', 'whatsapp', 'payg', 0, 0.0000, 0.0000, 'Free WhatsApp messages with premium features'),

-- WhatsApp Termly packages
('Bronze', 'whatsapp', 'termly', 300, 0.0000, 500.0000, '300 WhatsApp messages per term for ₦500'),
('Silver', 'whatsapp', 'termly', 800, 0.0000, 1000.0000, '800 WhatsApp messages per term for ₦1,000'),
('Gold', 'whatsapp', 'termly', 1800, 0.0000, 1800.0000, '1,800 WhatsApp messages per term for ₦1,800');

-- Create messaging_subscriptions table to track school subscriptions
CREATE TABLE IF NOT EXISTS messaging_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(20) NOT NULL,
    package_id INT NOT NULL,
    start_date DATE NOT NULL COMMENT 'Start date of the subscription',
    end_date DATE NOT NULL COMMENT 'End date of the subscription (term end)',
    total_messages INT NOT NULL DEFAULT 0 COMMENT 'Total messages included in package',
    messages_used INT NOT NULL DEFAULT 0 COMMENT 'Number of messages already used',
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active' COMMENT 'Subscription status',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES messaging_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
    INDEX idx_school_id (school_id),
    INDEX idx_package_id (package_id),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
);

-- Create messaging_usage table to track individual message usage
CREATE TABLE IF NOT EXISTS messaging_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(20) NOT NULL,
    subscription_id INT,
    service_type ENUM('sms', 'whatsapp', 'email') NOT NULL,
    message_count INT NOT NULL DEFAULT 1,
    cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Cost of this message or batch',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES messaging_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_school_id (school_id),
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_service_type (service_type),
    INDEX idx_created_at (created_at)
);



-- Create messaging_history table to track all sent messages
CREATE TABLE IF NOT EXISTS messaging_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    sender_id VARCHAR(50) NOT NULL COMMENT 'ID of the user who sent the message',
    sender_type ENUM('admin', 'teacher', 'parent', 'student', 'system') DEFAULT 'admin',
    recipient_type ENUM('parent', 'teacher', 'student') NOT NULL,
    recipient_id VARCHAR(50) NOT NULL COMMENT 'ID of the recipient',
    recipient_name VARCHAR(255) NOT NULL COMMENT 'Name of the recipient',
    recipient_identifier VARCHAR(255) NOT NULL COMMENT 'Email, phone number, or WhatsApp number',
    channel ENUM('sms', 'whatsapp', 'email') NOT NULL COMMENT 'Channel used to send the message',
    message_text TEXT NOT NULL COMMENT 'The actual message content',
    message_subject VARCHAR(500) COMMENT 'Subject for email messages',
    status ENUM('sent', 'failed', 'delivered', 'read') DEFAULT 'sent' COMMENT 'Delivery status',
    cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost of the message if applicable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_school_id (school_id),
    INDEX idx_branch_id (branch_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_channel (channel),
    INDEX idx_created_at (created_at)
);

-- Insert sample data to test the table
INSERT INTO messaging_history (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name, recipient_identifier, channel, message_text, cost) VALUES
('SCH/1', 'BRCH00001', 'USR001', 'admin', 'parent', 'PARENT001', 'John Doe', '2348012345678', 'sms', 'Welcome to our school. This is a test message.', 4.00),
('SCH/1', 'BRCH00001', 'USR001', 'admin', 'teacher', 'TEACHER001', 'Jane Smith', '2348087654321', 'whatsapp', 'Your schedule has been updated for the week.', 0.00);

ALTER TABLE `school_setup` CHANGE `section_type` `section_type` ENUM('nigerian_curriculum','k12_curriculum') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'nigerian_curriculum';

