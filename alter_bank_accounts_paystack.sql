-- ALTER TABLE commands to add Paystack integration to existing school_bank_accounts table
-- Date: 2025-12-24

-- Add Paystack subaccount code column
ALTER TABLE `school_bank_accounts`
ADD COLUMN `paystack_subaccount_code` VARCHAR(50) NULL COMMENT 'Paystack subaccount code for settlements' AFTER `branch_address`;

-- Add percentage charge column
ALTER TABLE `school_bank_accounts`
ADD COLUMN `percentage_charge` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage charge for transactions' AFTER `paystack_subaccount_code`;

-- Add index for faster lookups
ALTER TABLE `school_bank_accounts`
ADD KEY `idx_paystack_subaccount` (`paystack_subaccount_code`);
