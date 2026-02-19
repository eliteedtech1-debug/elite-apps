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