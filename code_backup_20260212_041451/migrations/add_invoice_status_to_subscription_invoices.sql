-- Add invoice_status column to subscription_invoices table
-- This allows invoices to be in draft state until published/sent
-- Values: 'draft' (default, not visible to clients), 'published' (visible in sidebar), 'sent' (visible in sidebar)

ALTER TABLE subscription_invoices
ADD COLUMN IF NOT EXISTS invoice_status ENUM('draft', 'published', 'sent') DEFAULT 'draft' AFTER payment_status;

-- Add index for invoice_status to improve query performance
ALTER TABLE subscription_invoices
ADD INDEX IF NOT EXISTS idx_invoice_status (invoice_status);

-- Update existing invoices to 'published' status (so they remain visible)
UPDATE subscription_invoices
SET invoice_status = 'draft'
WHERE invoice_status IS NULL OR invoice_status = 'draft';

