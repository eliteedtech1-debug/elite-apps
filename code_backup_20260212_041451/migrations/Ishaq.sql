-- Migration: Allow anonymous users to create support tickets
-- This allows users on login page or not logged in to create tickets

-- Step 1: Add anonymous user fields
ALTER TABLE `support_tickets`
ADD COLUMN `anonymous_name` VARCHAR(255) NULL AFTER `user_id`,
ADD COLUMN `anonymous_email` VARCHAR(255) NULL AFTER `anonymous_name`,
ADD COLUMN `anonymous_phone` VARCHAR(255) NULL AFTER `anonymous_email`;

-- Step 2: Modify user_id to allow NULL (allow anonymous tickets)
ALTER TABLE `support_tickets`
MODIFY COLUMN `user_id` INT NULL;

-- Step 3: Add comment to explain the fields
ALTER TABLE `support_tickets`
COMMENT = 'Support tickets table - user_id can be NULL for anonymous users. Use anonymous_* fields to contact them.';

-- Verification query
-- Run this to check the table structure after migration:
-- DESCRIBE support_tickets;

-- Sample anonymous ticket creation test:
-- INSERT INTO support_tickets (title, description, category, priority, status, anonymous_name, anonymous_email, anonymous_phone, created_at, updated_at)
-- VALUES ('Test Anonymous Ticket', 'Testing anonymous ticket creation', 'technical', 'medium', 'open', 'Test User', 'test@example.com', '1234567890', NOW(), NOW());
-- Remove the incorrect unique constraint on subscription_id from subscription_payments table
-- A single subscription can have multiple payments, so this constraint is invalid

ALTER TABLE subscription_payments DROP INDEX IF EXISTS subscription_id;

-- Modify subscription_pricing table to simplify structure
-- Remove term/annual distinctions and add discount_per_annum column

-- Rename the existing table temporarily
ALTER TABLE subscription_pricing RENAME TO subscription_pricing_old;

-- Create the new simplified subscription_pricing table
CREATE TABLE subscription_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_name VARCHAR(255) NOT NULL,
    base_price_per_student DECIMAL(10, 2) NOT NULL, -- Combined price per student (annual)
    discount_per_annum DECIMAL(5, 2) DEFAULT 0, -- New column for annual discount
    cbt_stand_alone_cost DECIMAL(10, 2) DEFAULT 0,
    sms_subscription_cost DECIMAL(10, 2) DEFAULT 0,
    whatsapp_subscription_cost DECIMAL(10, 2) DEFAULT 0,
    email_subscription_cost DECIMAL(10, 2) DEFAULT 0,
    express_finance_cost DECIMAL(10, 2) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migrate data from the old table to the new table
-- Using annual values as the new base prices since they're typically the main pricing model
INSERT INTO subscription_pricing (
    pricing_name,
    base_price_per_student,
    discount_per_annum,
    cbt_stand_alone_cost,
    sms_subscription_cost,
    whatsapp_subscription_cost,
    email_subscription_cost,
    express_finance_cost,
    is_active,
    created_at,
    updated_at
)
SELECT 
    pricing_name,
    base_price_per_student_annum as base_price_per_student,
    annual_discount_percentage as discount_per_annum,
    cbt_stand_alone_cost_annum as cbt_stand_alone_cost,
    sms_subscription_cost_annum as sms_subscription_cost,
    whatsapp_subscription_cost_annum as whatsapp_subscription_cost,
    email_subscription_cost_annum as email_subscription_cost,
    express_finance_cost_annum as express_finance_cost,
    is_active,
    created_at,
    updated_at
FROM subscription_pricing_old;

-- Drop the old table
DROP TABLE subscription_pricing_old;

-- Update the foreign key reference in subscription_plan_features table if needed
-- (This should remain the same since we're keeping the id primary key)

-- Update any related tables that might reference the old structure
-- This might include school_subscriptions table which references pricing plan
-- Fix the subscription_payments table schema
-- Remove incorrect unique constraint on subscription_id and add proper indexing

-- First, drop the incorrect unique constraint on subscription_id
ALTER TABLE subscription_payments DROP INDEX IF EXISTS `subscription_id`;

-- Create a proper composite index for invoice-based tracking (allowing multiple payments per subscription)
-- This ensures we can have multiple payments for the same subscription but track them properly
CREATE INDEX IF NOT EXISTS idx_subscription_invoice ON subscription_payments (subscription_id, invoice_id);

-- Add proper indexing for payment tracking
CREATE INDEX IF NOT EXISTS idx_reference_number ON subscription_payments (reference_number);
CREATE INDEX IF NOT EXISTS idx_paystack_reference ON subscription_payments (paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payment_status ON subscription_payments (payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_id ON subscription_payments (invoice_id);

-- Also, we need to make sure the bank transfer fields exist if they haven't been added already
ALTER TABLE subscription_payments 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL DEFAULT NULL;


-- Fix the subscription_payments table schema
-- Remove incorrect unique constraint on subscription_id and add proper indexing

-- First, drop the incorrect unique constraint on subscription_id
ALTER TABLE subscription_payments DROP INDEX IF EXISTS `subscription_id`;

-- Create a proper composite index for invoice-based tracking (allowing multiple payments per subscription)
-- This ensures we can have multiple payments for the same subscription but track them properly
CREATE INDEX IF NOT EXISTS idx_subscription_invoice ON subscription_payments (subscription_id, invoice_id);

-- Add proper indexing for payment tracking
CREATE INDEX IF NOT EXISTS idx_reference_number ON subscription_payments (reference_number);
CREATE INDEX IF NOT EXISTS idx_paystack_reference ON subscription_payments (paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payment_status ON subscription_payments (payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_id ON subscription_payments (invoice_id);

-- Also, we need to make sure the bank transfer fields exist if they haven't been added already
ALTER TABLE subscription_payments 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL DEFAULT NULL;

-- Fix subscription_payments table structure for proper payment handling

-- Remove the incorrect unique constraint on subscription_id (single subscription can have multiple payments)
ALTER TABLE subscription_payments DROP INDEX IF EXISTS `subscription_id`;

-- Add proper indexing for efficient lookups
ALTER TABLE subscription_payments 
ADD INDEX IF NOT EXISTS idx_subscription_invoice (subscription_id, invoice_id),
ADD INDEX IF NOT EXISTS idx_reference_number (reference_number),
ADD INDEX IF NOT EXISTS idx_paystack_reference (paystack_reference),
ADD INDEX IF NOT EXISTS idx_payment_status (payment_status),
ADD INDEX IF NOT EXISTS idx_invoice_id (invoice_id);

-- Ensure all necessary bank transfer fields exist
ALTER TABLE subscription_payments 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL DEFAULT NULL;

-- Add channel field if not exists (for tracking payment channel)
ALTER TABLE subscription_payments 
ADD COLUMN IF NOT EXISTS channel VARCHAR(50);

-- Migration to enhance Paystack integration for split payments
-- This update modifies the vendor_payment_configs table and adds necessary fields for split payment functionality

-- Add new columns to vendor_payment_configs for Paystack split payment support
ALTER TABLE vendor_payment_configs 
ADD COLUMN IF NOT EXISTS paystack_subaccount_code VARCHAR(255) NULL COMMENT 'Paystack subaccount code for vendor-specific payments',
ADD COLUMN IF NOT EXISTS paystack_split_code VARCHAR(255) NULL COMMENT 'Paystack split code for predetermined revenue splits',
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of revenue that goes to the vendor (the rest goes to platform)',
ADD COLUMN IF NOT EXISTS transaction_charge_type ENUM('vendor', 'platform') DEFAULT 'vendor' COMMENT 'Who bears the transaction charges - vendor or platform',
ADD COLUMN IF NOT EXISTS split_type ENUM('percentage', 'flat') DEFAULT 'percentage' COMMENT 'Type of split calculation to use';

-- Update the subscription_payments table to store additional Paystack information
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS paystack_transfer_code VARCHAR(255) NULL COMMENT 'Paystack transfer code for split payment settlements',
ADD COLUMN IF NOT EXISTS split_payment_data JSON NULL COMMENT 'JSON data storing split payment details',
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Commission amount retained by the platform',
ADD COLUMN IF NOT EXISTS vendor_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Amount transferred to vendor after commission';

-- Add foreign key constraint for vendor_payment_configs referencing users table if not exists
-- First check if the foreign key exists to avoid duplication
SET @fk_check = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'vendor_payment_configs' 
      AND COLUMN_NAME = 'user_id' 
      AND REFERENCED_TABLE_NAME = 'users'
);

-- Only add the foreign key if it doesn't exist
SET @sql = IF(@fk_check = 0, 
    'ALTER TABLE vendor_payment_configs ADD CONSTRAINT fk_vendor_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', 
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert or update a default configuration for the main platform if needed
-- This ensures there's always a default payment configuration
INSERT INTO vendor_payment_configs (
    user_id, 
    paystack_subaccount_code, 
    paystack_split_code, 
    commission_percentage, 
    transaction_charge_type, 
    split_type, 
    is_active
) 
SELECT 
    u.id,
    NULL as paystack_subaccount_code,
    CONCAT('SPL_', u.username, '_', UNIX_TIMESTAMP()) as paystack_split_code,
    80.00 as commission_percentage,  -- Platform takes 20% as commission
    'vendor' as transaction_charge_type,
    'percentage' as split_type,
    1 as is_active
FROM users u
WHERE u.user_type IN ('superadmin', 'admin', 'branchadmin') 
  AND u.id NOT IN (SELECT DISTINCT user_id FROM vendor_payment_configs WHERE user_id IS NOT NULL)
LIMIT 1
ON DUPLICATE KEY UPDATE
    paystack_split_code = VALUES(paystack_split_code),
    commission_percentage = 80.00,
    updated_at = NOW();

-- Create an index on the paystack_transfer_code for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_payments_paystack_transfer ON subscription_payments(paystack_transfer_code);

-- Create an index on the verification_status for payment processing
CREATE INDEX IF NOT EXISTS idx_subscription_payments_verification_status ON subscription_payments(verification_status);

-- Add a view for easier access to split payment information
CREATE OR REPLACE VIEW view_split_payment_summary AS
SELECT 
    sp.id,
    sp.subscription_id,
    sp.invoice_id,
    sp.amount_paid,
    sp.platform_commission,
    sp.vendor_amount,
    sp.payment_method,
    sp.payment_status,
    sp.verification_status,
    sp.created_at,
    u.username as user_name,
    u.user_type,
    vpc.paystack_subaccount_code,
    vpc.commission_percentage
FROM subscription_payments sp
LEFT JOIN users u ON sp.created_by = u.id
LEFT JOIN vendor_payment_configs vpc ON u.id = vpc.user_id;

-- Add Paystack and bank transfer fields to subscription_payments table

-- Add fields for Paystack integration
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS paystack_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS gateway_response TEXT,
ADD COLUMN IF NOT EXISTS channel VARCHAR(50),
ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL DEFAULT NULL;

-- Add vendor-specific payment configuration table
CREATE TABLE IF NOT EXISTS vendor_payment_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- The super admin/vendor ID
    paystack_secret_key VARCHAR(255),
    paystack_public_key VARCHAR(255),
    paystack_subaccount_code VARCHAR(255), -- For split payment functionality
    paystack_split_code VARCHAR(255),       -- For predefined split configuration
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_name VARCHAR(255),
    commission_percentage DECIMAL(5,2) DEFAULT 0.00, -- Vendor's commission percentage (e.g., 80.00 for 80%)
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_id (user_id)
);

-- Insert default configuration for the super admin (assuming user id 1 is super admin)
INSERT IGNORE INTO vendor_payment_configs (user_id, bank_name, account_number, account_name, commission_percentage)
VALUES (1, 'Keystone Bank', '1013842384', 'Elite Edutech system LTD', 80.00);