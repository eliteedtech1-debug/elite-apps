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

-- ============================================================
-- Updated school_setup stored procedure with missing fields
-- ============================================================
-- This adds support for:
-- - cbt_stand_alone
-- - sms_subscription, whatsapp_subscription, email_subscription
-- - assessmentType
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `school_setup`$$

CREATE PROCEDURE `school_setup`(
    IN `query_type` VARCHAR(50),
    IN `p_sch_id` VARCHAR(10),
    IN `p_school_name` VARCHAR(500),
    IN `p_short_name` VARCHAR(20),
    IN `p_academic_year` VARCHAR(20),
    IN `p_session_start_date` DATE,
    IN `p_session_end_date` DATE,
    IN `p_status` VARCHAR(20),
    IN `p_badge_url` VARCHAR(500),
    IN `p_mission` VARCHAR(500),
    IN `p_vission` VARCHAR(500),
    IN `p_about_us` VARCHAR(500),
    IN `p_school_motto` VARCHAR(300),
    IN `p_state` VARCHAR(100),
    IN `p_lga` VARCHAR(100),
    IN `p_address` VARCHAR(255),
    IN `p_primary_contact_number` VARCHAR(13),
    IN `p_secondary_contact_number` VARCHAR(13),
    IN `p_email` VARCHAR(70),
    IN `p_school_master` TINYINT(1),
    IN `p_express_finance` TINYINT(1),
    IN `p_cbt_center` TINYINT(1),
    IN `p_result_station` TINYINT(1),
    IN `p_nursery` TINYINT(1),
    IN `p_primary` TINYINT(1),
    IN `p_junior_secondary` TINYINT(1),
    IN `p_senior_secondary` TINYINT(1),
    IN `p_islamiyya` TINYINT(1),
    IN `p_tahfiz` TINYINT(1),
    IN `p_admin_name` VARCHAR(50),
    IN `p_admin_email` VARCHAR(50),
    IN `p_admin_password` VARCHAR(100),
    IN `p_domain` VARCHAR(100),
    IN `p_section_type` VARCHAR(30),
    IN `p_created_by` VARCHAR(20),
    IN `p_cbt_stand_alone` TINYINT(1),
    IN `p_sms_subscription` TINYINT(1),
    IN `p_whatsapp_subscription` TINYINT(1),
    IN `p_email_subscription` TINYINT(1),
    IN `p_assessmentType` VARCHAR(20)
)
BEGIN
    DECLARE in_sch_id VARCHAR(20);
    DECLARE current_id INT(8);
    DECLARE in_prefix VARCHAR(5);
    DECLARE brch_id INT;
    DECLARE brch_code VARCHAR(50);
    DECLARE p_cbt_url VARCHAR(50);
    DECLARE trimed_short_name VARCHAR(50);
    DECLARE got_school_lock, got_branch_lock INT DEFAULT 0;

    -- Trim short name
    SET trimed_short_name = TRIM(p_short_name);

    -- ============================================
    -- SAFE ID GENERATION SECTION
    -- ============================================
    IF query_type NOT LIKE '%select%' AND query_type != 'update' AND query_type != 'update_school' THEN
        -- Attempt to get school_code lock for 5 seconds
        SELECT GET_LOCK('school_code_lock', 5) INTO got_school_lock;
        IF got_school_lock = 1 THEN
            SELECT MAX(code) + 1 INTO current_id
            FROM number_generator
            WHERE description = 'school_code';

            SELECT prefix INTO in_prefix
            FROM number_generator
            WHERE description = 'school_code';

            SET in_sch_id = CONCAT(in_prefix, '/', current_id);

            -- Update the code safely
            UPDATE number_generator
            SET code = current_id
            WHERE description = 'school_code';

            -- Release the lock immediately
            SELECT RELEASE_LOCK('school_code_lock');
        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to acquire school_code lock';
        END IF;

        -- Now safely generate branch code
        SELECT GET_LOCK('branch_code_lock', 5) INTO got_branch_lock;
        IF got_branch_lock = 1 THEN
            SELECT code + 1 INTO brch_id
            FROM number_generator
            WHERE description = 'branch_code';

            SET brch_code = CONCAT('BRCH', LPAD(CAST(brch_id AS CHAR(5)), 5, '0'));

            UPDATE number_generator
            SET code = brch_id
            WHERE description = 'branch_code';

            SELECT RELEASE_LOCK('branch_code_lock');
        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to acquire branch_code lock';
        END IF;
    END IF;


    -- ============================================
    -- MAIN LOGIC
    -- ============================================

    IF query_type = 'CREATE' THEN
        -- Insert into school_locations
        INSERT INTO `school_locations`(`branch_id`, `school_id`, `branch_name`, `location`, `short_name`, `status`)
        VALUES (brch_code, in_sch_id, 'Main Branch', p_address, trimed_short_name, 'Active');

        -- Generate URLs
        SET @p_school_url = CONCAT('www.', trimed_short_name, '.elitescholar.ng');
        SET p_cbt_url = CONCAT('www.', trimed_short_name, '.elitecbt.ng');

        -- Insert into school_setup
        INSERT INTO `school_setup`(
            `school_id`, `school_name`, `short_name`, `school_motto`, `state`, `lga`, `address`,
            `primary_contact_number`, `secondary_contact_number`, `email_address`,
            `school_master`, `express_finance`, `cbt_center`, `result_station`,
            `academic_year`, `session_start_date`, `session_end_date`, `status`,
            `badge_url`, `mission`, `vission`, `about_us`, `nursery_section`,
            `primary_section`, `junior_secondary_section`, `senior_secondary_section`,
            `islamiyya`, `tahfiz`, `school_url`, `cbt_url`, `created_by`, `section_type`,
            `cbt_stand_alone`, `sms_subscription`, `whatsapp_subscription`, `email_subscription`, `assessmentType`
        ) VALUES (
            in_sch_id, p_school_name, trimed_short_name, p_school_motto, p_state, p_lga, p_address,
            p_primary_contact_number, p_secondary_contact_number, p_email,
            p_school_master, p_express_finance, p_cbt_center, p_result_station,
            p_academic_year, p_session_start_date, p_session_end_date, p_status,
            p_badge_url, p_mission, p_vission, p_about_us, p_nursery, p_primary,
            p_junior_secondary, p_senior_secondary, p_islamiyya, p_tahfiz,
            @p_school_url, p_cbt_url, p_created_by, p_section_type,
            COALESCE(p_cbt_stand_alone, 0), COALESCE(p_sms_subscription, 0),
            COALESCE(p_whatsapp_subscription, 0), COALESCE(p_email_subscription, 0),
            COALESCE(p_assessmentType, 'Fixed')
        );

        -- Insert admin user
        INSERT INTO `users` (`name`, `email`, `username`, `user_type`, `password`, `school_id`)
        VALUES (p_admin_name, p_admin_email, trimed_short_name, 'Admin', p_admin_password, in_sch_id);

        -- Return created ID
        SELECT in_sch_id AS school_id;


    -- ========================
    -- SELECT OPERATIONS
    -- ========================
    ELSEIF query_type = 'select' THEN
        IF CAST(p_created_by AS CHAR(20)) = '1' THEN
            SELECT * FROM school_setup ORDER BY school_id ASC;
        ELSE
            SELECT * FROM school_setup
            WHERE CAST(created_by AS CHAR(20)) = CAST(p_created_by AS CHAR(20))
            ORDER BY school_id ASC;
        END IF;

    ELSEIF query_type = 'select-school' THEN
        SELECT * FROM school_setup WHERE school_id = p_sch_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM school_setup;

    ELSEIF query_type = 'select-subjects' THEN
        SELECT * FROM subjects WHERE school_id = p_sch_id GROUP BY subject;

    ELSEIF query_type = 'select-class-names' THEN
        SELECT * FROM classes WHERE school_id = p_sch_id ORDER BY class_id ASC;

    ELSEIF query_type = 'select-section-classes' THEN
        SELECT * FROM classes
        WHERE school_id = p_sch_id
        AND branch_id = p_school_name
        ORDER BY class_code ASC;

    ELSEIF query_type = 'get_school_url' THEN
        SELECT school_url FROM school_setup WHERE school_id = p_sch_id;

    ELSEIF query_type = 'update' THEN
        UPDATE school_setup SET status = p_status WHERE school_id = p_sch_id;

    ELSEIF query_type = 'update_school' THEN
        UPDATE school_setup
        SET
            school_name               = COALESCE(p_school_name, school_name),
            short_name                = COALESCE(p_short_name, short_name),
            school_motto              = COALESCE(p_school_motto, school_motto),
            state                     = COALESCE(p_state, state),
            lga                       = COALESCE(p_lga, lga),
            address                   = COALESCE(p_address, address),
            primary_contact_number    = COALESCE(p_primary_contact_number, primary_contact_number),
            secondary_contact_number  = COALESCE(p_secondary_contact_number, secondary_contact_number),
            email_address             = COALESCE(p_email, email_address),
            school_master             = COALESCE(p_school_master, school_master),
            express_finance           = COALESCE(p_express_finance, express_finance),
            cbt_center                = COALESCE(p_cbt_center, cbt_center),
            cbt_stand_alone           = COALESCE(p_cbt_stand_alone, cbt_stand_alone),
            result_station            = COALESCE(p_result_station, result_station),
            nursery_section           = COALESCE(p_nursery, nursery_section),
            primary_section           = COALESCE(p_primary, primary_section),
            junior_secondary_section  = COALESCE(p_junior_secondary, junior_secondary_section),
            senior_secondary_section  = COALESCE(p_senior_secondary, senior_secondary_section),
            islamiyya                 = COALESCE(p_islamiyya, islamiyya),
            tahfiz                    = COALESCE(p_tahfiz, tahfiz),
            school_url                = COALESCE(p_domain, school_url),
            section_type              = COALESCE(p_section_type, section_type),
            sms_subscription          = COALESCE(p_sms_subscription, sms_subscription),
            whatsapp_subscription     = COALESCE(p_whatsapp_subscription, whatsapp_subscription),
            email_subscription        = COALESCE(p_email_subscription, email_subscription),
            assessmentType            = COALESCE(p_assessmentType, assessmentType)
        WHERE school_id = p_sch_id;

    ELSEIF query_type = 'get-branches' THEN
        SELECT * FROM school_locations WHERE school_id = p_sch_id ORDER BY branch_id ASC;

    ELSEIF query_type = 'get-sections' THEN
        SELECT * FROM school_section_table WHERE school_id = p_sch_id;

    ELSEIF query_type = 'select-academic-calendar' THEN
        SELECT * FROM academic_calendar WHERE school_id = p_sch_id ORDER BY status ASC;

    ELSEIF query_type = 'select-by-short-name' THEN
        SELECT * FROM school_setup WHERE LOWER(short_name) = LOWER(p_short_name);

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type';
    END IF;
END$$

DELIMITER ;

-- Create the subscription_pricing table
CREATE TABLE IF NOT EXISTS subscription_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_name VARCHAR(255) NOT NULL,
    base_price_per_student_term DECIMAL(10, 2) NOT NULL,
    base_price_per_student_annum DECIMAL(10, 2) NOT NULL,
    annual_discount_percentage DECIMAL(5, 2) DEFAULT 0,
    cbt_stand_alone_cost_term DECIMAL(10, 2) DEFAULT 0,
    sms_subscription_cost_term DECIMAL(10, 2) DEFAULT 0,
    whatsapp_subscription_cost_term DECIMAL(10, 2) DEFAULT 0,
    email_subscription_cost_term DECIMAL(10, 2) DEFAULT 0,
    express_finance_cost_term DECIMAL(10, 2) DEFAULT 0,
    cbt_stand_alone_cost_annum DECIMAL(10, 2) DEFAULT 0,
    sms_subscription_cost_annum DECIMAL(10, 2) DEFAULT 0,
    whatsapp_subscription_cost_annum DECIMAL(10, 2) DEFAULT 0,
    email_subscription_cost_annum DECIMAL(10, 2) DEFAULT 0,
    express_finance_cost_annum DECIMAL(10, 2) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the subscription_plan_features table
CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_plan_id INT NOT NULL,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE,
    INDEX idx_pricing_plan_id (pricing_plan_id)
);

-- Insert default pricing plans
INSERT IGNORE INTO subscription_pricing (
    pricing_name, 
    base_price_per_student_term, 
    base_price_per_student_annum, 
    annual_discount_percentage,
    cbt_stand_alone_cost_term,
    sms_subscription_cost_term,
    whatsapp_subscription_cost_term,
    email_subscription_cost_term,
    express_finance_cost_term,
    cbt_stand_alone_cost_annum,
    sms_subscription_cost_annum,
    whatsapp_subscription_cost_annum,
    email_subscription_cost_annum,
    express_finance_cost_annum,
    is_active
) VALUES 
('Basic Plan', 500.00, 1500.00, 0.00, 500.00, 300.00, 300.00, 300.00, 1000.00, 1500.00, 900.00, 900.00, 900.00, 3000.00, 1),
('Standard Plan', 700.00, 2100.00, 0.00, 500.00, 300.00, 300.00, 300.00, 1000.00, 1500.00, 900.00, 900.00, 900.00, 3000.00, 1),
('Premium Plan', 1000.00, 3000.00, 0.00, 500.00, 300.00, 300.00, 300.00, 1000.00, 1500.00, 900.00, 900.00, 900.00, 3000.00, 1);

-- Insert default features for each plan
INSERT IGNORE INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(1, JSON_OBJECT(
    'result_station', 1,
    'nursery_section', 1,
    'primary_section', 1,
    'junior_secondary_section', 0,
    'senior_secondary_section', 0,
    'islamiyya', 0,
    'tahfiz', 0,
    'cbt_stand_alone', 0,
    'sms_subscription', 0,
    'whatsapp_subscription', 0,
    'email_subscription', 0,
    'assessment_type', 'Fixed'
)),
(2, JSON_OBJECT(
    'result_station', 1,
    'nursery_section', 1,
    'primary_section', 1,
    'junior_secondary_section', 1,
    'senior_secondary_section', 1,
    'islamiyya', 0,
    'tahfiz', 0,
    'cbt_stand_alone', 1,
    'sms_subscription', 0,
    'whatsapp_subscription', 0,
    'email_subscription', 0,
    'assessment_type', 'Monthly'
)),
(3, JSON_OBJECT(
    'result_station', 1,
    'nursery_section', 1,
    'primary_section', 1,
    'junior_secondary_section', 1,
    'senior_secondary_section', 1,
    'islamiyya', 1,
    'tahfiz', 1,
    'cbt_stand_alone', 1,
    'sms_subscription', 1,
    'whatsapp_subscription', 1,
    'email_subscription', 1,
    'assessment_type', 'Monthly'
));



-- Create table for subscription plan features using JSON
CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_plan_id INT NOT NULL,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE,
    INDEX idx_pricing_plan_id (pricing_plan_id)
);

-- Insert default configurations for basic, standard, and premium plans using JSON
-- Basic Plan (id=1) - Core features only
INSERT INTO subscription_plan_features (
    pricing_plan_id, 
    features
) VALUES (
    1,  -- pricing_plan_id (Basic)
    JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 0,
        'senior_secondary_section', 0,
        'islamiyya', 0,
        'tahfiz', 0,
        'cbt_stand_alone', 0,
        'sms_subscription', 0,
        'whatsapp_subscription', 0,
        'email_subscription', 0,
        'assessment_type', 'Fixed'
    )
);

-- Standard Plan (id=2) - More features
INSERT INTO subscription_plan_features (
    pricing_plan_id, 
    features
) VALUES (
    2,  -- pricing_plan_id (Standard)
    JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 1,
        'senior_secondary_section', 1,
        'islamiyya', 0,
        'tahfiz', 0,
        'cbt_stand_alone', 1,
        'sms_subscription', 0,
        'whatsapp_subscription', 0,
        'email_subscription', 0,
        'assessment_type', 'Monthly'
    )
);

-- Premium Plan (id=3) - All features
INSERT INTO subscription_plan_features (
    pricing_plan_id, 
    features
) VALUES (
    3,  -- pricing_plan_id (Premium)
    JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 1,
        'senior_secondary_section', 1,
        'islamiyya', 1,
        'tahfiz', 1,
        'cbt_stand_alone', 1,
        'sms_subscription', 1,
        'whatsapp_subscription', 1,
        'email_subscription', 1,
        'assessment_type', 'Monthly'
    )
);

-- Create table for subscription payments
CREATE TABLE IF NOT EXISTS subscription_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    invoice_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- cash, bank_transfer, online, etc.
    reference_number VARCHAR(100), -- transaction ID or reference
    payment_status ENUM('completed', 'pending', 'failed', 'refunded') DEFAULT 'completed',
    notes TEXT,
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES school_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES subscription_invoices(id) ON DELETE CASCADE,
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_payment_date (payment_date)
);

-- Add payment tracking fields to subscription_invoices table
ALTER TABLE subscription_invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_payment_due DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add payment tracking fields to school_subscriptions table
ALTER TABLE school_subscriptions
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_payment_due DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

ALTER TABLE `subscription_payments` ADD UNIQUE(`subscription_id`);

ALTER TABLE `subscription_payments` ADD `school_id` VARCHAR(20) NOT NULL AFTER `created_by`; 

-- ============================================================
-- END OF SCRIPT
-- ============================================================

-- Migration to convert existing subscription_plan_features table to JSON structure
-- This script will preserve existing data while converting to the new JSON format

-- First, backup the existing table (optional but recommended)
-- CREATE TABLE subscription_plan_features_backup AS SELECT * FROM subscription_plan_features;

-- Modify the table to use JSON for features instead of individual columns
-- If the table already exists with the old structure, we need to recreate it properly
-- and migrate the data

-- Since we're changing the structure, we'll recreate the table appropriately
-- First, drop the existing table if needed
-- DROP TABLE IF EXISTS subscription_plan_features_new;

-- Create new table with JSON structure
CREATE TABLE IF NOT EXISTS subscription_plan_features_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_plan_id INT NOT NULL,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE,
    INDEX idx_pricing_plan_id (pricing_plan_id)
);

-- Migrate data from old structure (if exists) to new JSON structure
INSERT INTO subscription_plan_features_new (pricing_plan_id, features)
SELECT 
    pricing_plan_id,
    JSON_OBJECT(
        'result_station', COALESCE(result_station, 0),
        'nursery_section', COALESCE(nursery_section, 0),
        'primary_section', COALESCE(primary_section, 0),
        'junior_secondary_section', COALESCE(junior_secondary_section, 0),
        'senior_secondary_section', COALESCE(senior_secondary_section, 0),
        'islamiyya', COALESCE(islamiyya, 0),
        'tahfiz', COALESCE(tahfiz, 0),
        'cbt_stand_alone', COALESCE(cbt_stand_alone, 0),
        'sms_subscription', COALESCE(sms_subscription, 0),
        'whatsapp_subscription', COALESCE(whatsapp_subscription, 0),
        'email_subscription', COALESCE(email_subscription, 0),
        'assessment_type', COALESCE(assessment_type, 'Fixed')
    ) AS features
FROM subscription_plan_features
ON DUPLICATE KEY UPDATE
    features = VALUES(features);

-- Drop the old table
DROP TABLE subscription_plan_features;

-- Rename the new table to the original name
RENAME TABLE subscription_plan_features_new TO subscription_plan_features;


-- Initial data for subscription pricing plans
-- This script creates the basic, standard, and premium plans

-- Insert default pricing plans if they don't exist
INSERT IGNORE INTO subscription_pricing (
    pricing_name, 
    base_price_per_student_term, 
    base_price_per_student_annum, 
    annual_discount_percentage,
    cbt_stand_alone_cost_term,
    sms_subscription_cost_term,
    whatsapp_subscription_cost_term,
    email_subscription_cost_term,
    express_finance_cost_term,
    cbt_stand_alone_cost_annum,
    sms_subscription_cost_annum,
    whatsapp_subscription_cost_annum,
    email_subscription_cost_annum,
    express_finance_cost_annum,
    is_active
) VALUES 
('Basic Plan', 500, 1500, 0, 500, 300, 300, 300, 1000, 1500, 900, 900, 900, 3000, 1),
('Standard Plan', 700, 2100, 0, 500, 300, 300, 300, 1000, 1500, 900, 900, 900, 3000, 1),
('Premium Plan', 1000, 3000, 0, 500, 300, 300, 300, 1000, 1500, 900, 900, 900, 3000, 1);

-- Update the JSON feature data for each plan
-- First check if the features already exist for these plans
INSERT INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(1, JSON_OBJECT(
    'result_station', 1,
    'nursery_section', 1,
    'primary_section', 1,
    'junior_secondary_section', 0,
    'senior_secondary_section', 0,
    'islamiyya', 0,
    'tahfiz', 0,
    'cbt_stand_alone', 0,
    'sms_subscription', 0,
    'whatsapp_subscription', 0,
    'email_subscription', 0,
    'assessment_type', 'Fixed'
))
ON DUPLICATE KEY UPDATE
    features = JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 0,
        'senior_secondary_section', 0,
        'islamiyya', 0,
        'tahfiz', 0,
        'cbt_stand_alone', 0,
        'sms_subscription', 0,
        'whatsapp_subscription', 0,
        'email_subscription', 0,
        'assessment_type', 'Fixed'
    );

INSERT INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(2, JSON_OBJECT(
    'result_station', 1,
    'nursery_section', 1,
    'primary_section', 1,
    'junior_secondary_section', 1,
    'senior_secondary_section', 1,
    'islamiyya', 0,
    'tahfiz', 0,
    'cbt_stand_alone', 1,
    'sms_subscription', 0,
    'whatsapp_subscription', 0,
    'email_subscription', 0,
    'assessment_type', 'Monthly'
))
ON DUPLICATE KEY UPDATE
    features = JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 1,
        'senior_secondary_section', 1,
        'islamiyya', 0,
        'tahfiz', 0,
        'cbt_stand_alone', 1,
        'sms_subscription', 0,
        'whatsapp_subscription', 0,
        'email_subscription', 0,
        'assessment_type', 'Monthly'
    );

INSERT INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(3, JSON_OBJECT(
    'result_station', 1,
    'nursery_section', 1,
    'primary_section', 1,
    'junior_secondary_section', 1,
    'senior_secondary_section', 1,
    'islamiyya', 1,
    'tahfiz', 1,
    'cbt_stand_alone', 1,
    'sms_subscription', 1,
    'whatsapp_subscription', 1,
    'email_subscription', 1,
    'assessment_type', 'Monthly'
))
ON DUPLICATE KEY UPDATE
    features = JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 1,
        'senior_secondary_section', 1,
        'islamiyya', 1,
        'tahfiz', 1,
        'cbt_stand_alone', 1,
        'sms_subscription', 1,
        'whatsapp_subscription', 1,
        'email_subscription', 1,
        'assessment_type', 'Monthly'
    );


-- Fix Student Class Fields Inconsistency
-- This script synchronizes class_code and class_name based on current_class

-- Update students table to sync class fields with their current_class
UPDATE students s
INNER JOIN classes c ON s.current_class = c.class_code AND s.school_id = c.school_id
SET
  s.class_code = c.class_code,
  s.class_name = c.class_name,
  s.updated_at = NOW()
WHERE
  s.current_class IS NOT NULL
  AND s.current_class != ''
  AND (
    s.class_code != c.class_code
    OR s.class_name != c.class_name
    OR s.class_code IS NULL
    OR s.class_name IS NULL
  );

-- Show how many records were updated
SELECT
  COUNT(*) as fixed_records,
  'Student class fields synchronized' as message
FROM students s
INNER JOIN classes c ON s.current_class = c.class_code AND s.school_id = c.school_id
WHERE s.class_code = c.class_code AND s.class_name = c.class_name;


-- Student Promotion History Table
-- This table tracks all student promotions and graduations

CREATE TABLE IF NOT EXISTS `student_promotion_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `admission_no` VARCHAR(50) NOT NULL,
  `from_class` VARCHAR(50) NOT NULL,
  `from_section` VARCHAR(50) NOT NULL,
  `to_class` VARCHAR(50) NULL,
  `to_section` VARCHAR(50) NULL,
  `from_academic_year` VARCHAR(50) NOT NULL,
  `to_academic_year` VARCHAR(50) NOT NULL,
  `promotion_type` ENUM('promote', 'graduate') NOT NULL DEFAULT 'promote',
  `effective_date` DATE NOT NULL,
  `created_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_admission_no` (`admission_no`),
  INDEX `idx_academic_year` (`from_academic_year`, `to_academic_year`),
  INDEX `idx_promotion_type` (`promotion_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add promotion-related columns to students table if they don't exist
ALTER TABLE `students`
  ADD COLUMN IF NOT EXISTS `promoted_date` DATE NULL AFTER `updated_at`,
  ADD COLUMN IF NOT EXISTS `promoted_by` VARCHAR(50) NULL AFTER `promoted_date`,
  ADD COLUMN IF NOT EXISTS `graduation_date` DATE NULL AFTER `promoted_by`,
  ADD COLUMN IF NOT EXISTS `graduated_by` VARCHAR(50) NULL AFTER `graduation_date`;

-- Add index on status for quick filtering
ALTER TABLE `students`
  ADD INDEX IF NOT EXISTS `idx_status` (`status`);


-- Create table for company information
DROP TABLE IF EXISTS company_info;
CREATE TABLE IF NOT EXISTS company_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(100),
    logo_url VARCHAR(500),
    tax_id VARCHAR(100), -- Tax identification number
    business_reg_number VARCHAR(100), -- Business registration number
    default_currency VARCHAR(10) DEFAULT 'NGN',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company information
INSERT IGNORE INTO company_info (
    company_name, 
    address, 
    business_reg_number,
    tax_id,
    phone, 
    email, 
    website, 
    logo_url
) VALUES (
    'Elite Edutech LTD', 
    'F1 African Alliance building, Sani Abacha way, Airport road, Kano', 
    '8405916',
    '33070094-0001',
    '+234-912-4611-644', 
    'info@elitescholar.ng', 
    'https://elitescholar.ng', 
    'assets/img/elitescholar-logo.png'
);