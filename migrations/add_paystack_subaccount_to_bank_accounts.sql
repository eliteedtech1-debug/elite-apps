-- ========================================================================
-- ADD PAYSTACK SUBACCOUNT CODE TO SCHOOL BANK ACCOUNTS
-- ========================================================================
-- This migration adds paystack_subaccount_code column for settlement
-- Date: 2025-12-16
-- ========================================================================

ALTER TABLE `school_bank_accounts`
ADD COLUMN `paystack_subaccount_code` VARCHAR(50) NULL COMMENT 'Paystack subaccount code for settlements' AFTER `branch_address`,
ADD COLUMN `percentage_charge` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage charge for transactions' AFTER `paystack_subaccount_code`;

-- Add index for faster lookups
ALTER TABLE `school_bank_accounts`
ADD KEY `idx_paystack_subaccount` (`paystack_subaccount_code`);
