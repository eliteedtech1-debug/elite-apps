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