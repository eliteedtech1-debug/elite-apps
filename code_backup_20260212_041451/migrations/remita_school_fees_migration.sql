-- =====================================================
-- Remita School Fees Payment System Migration
-- Date: 2026-02-07
-- Description: Extends existing payment gateway infrastructure for school fees
-- =====================================================

-- Step 1: Extend payment_gateway_transactions for school fees
ALTER TABLE payment_gateway_transactions
ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50) NULL COMMENT 'Student admission number' AFTER staff_id,
ADD COLUMN IF NOT EXISTS parent_id VARCHAR(25) NULL COMMENT 'Parent ID who made payment' AFTER admission_no,
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) NULL COMMENT 'Academic year for payment' AFTER parent_id,
ADD COLUMN IF NOT EXISTS term VARCHAR(20) NULL COMMENT 'Term for payment' AFTER academic_year,
ADD COLUMN IF NOT EXISTS payment_items JSON NULL COMMENT 'Array of payment_entry item_ids' AFTER term;

-- Add indexes for performance
ALTER TABLE payment_gateway_transactions
ADD INDEX IF NOT EXISTS idx_admission (admission_no),
ADD INDEX IF NOT EXISTS idx_parent (parent_id),
ADD INDEX IF NOT EXISTS idx_academic_term (academic_year, term);

-- Step 2: Link payment_entries to gateway transactions
ALTER TABLE payment_entries 
ADD COLUMN IF NOT EXISTS gateway_transaction_id INT NULL COMMENT 'Links to payment_gateway_transactions' AFTER ref_no,
ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(100) NULL COMMENT 'RRR or gateway reference' AFTER gateway_transaction_id;

-- Add indexes
ALTER TABLE payment_entries
ADD INDEX IF NOT EXISTS idx_gateway_transaction (gateway_transaction_id),
ADD INDEX IF NOT EXISTS idx_gateway_ref (gateway_reference);

-- Step 3: Create school_bank_accounts table if not exists
CREATE TABLE IF NOT EXISTS school_bank_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  bank_code VARCHAR(10) NOT NULL COMMENT 'CBN bank code for Remita',
  bank_name VARCHAR(100),
  account_type ENUM('revenue', 'platform_fee', 'other') DEFAULT 'revenue',
  is_default BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_account (school_id, account_number),
  INDEX idx_school (school_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Insert platform fee account (global)
INSERT INTO school_bank_accounts 
  (school_id, account_name, account_number, bank_code, bank_name, account_type, is_default)
VALUES 
  ('PLATFORM', 'ELITE SCHOLAR PLATFORM FEE', '0502544320', '232', 'Sterling Bank', 'platform_fee', 1)
ON DUPLICATE KEY UPDATE 
  account_name = VALUES(account_name),
  bank_code = VALUES(bank_code);

-- Step 5: Verification queries
SELECT 'Migration completed successfully!' as status;

SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('payment_gateway_transactions', 'payment_entries', 'school_bank_accounts')
  AND COLUMN_NAME IN ('admission_no', 'parent_id', 'gateway_transaction_id', 'gateway_reference')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
