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