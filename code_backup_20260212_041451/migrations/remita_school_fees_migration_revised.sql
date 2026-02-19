-- =====================================================
-- Remita School Fees Payment System Migration (Revised)
-- Date: 2026-02-07
-- Description: Creates dedicated table for school fees transactions
-- =====================================================

-- Step 1: Create dedicated school_fees_transactions table
CREATE TABLE IF NOT EXISTS school_fees_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20) NOT NULL,
  admission_no VARCHAR(50) NOT NULL,
  parent_id VARCHAR(25) NOT NULL,
  payment_ref VARCHAR(50) UNIQUE NOT NULL COMMENT 'Internal reference',
  rrr VARCHAR(50) UNIQUE NULL COMMENT 'Remita Retrieval Reference',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  academic_year VARCHAR(20) NOT NULL,
  term VARCHAR(20) NOT NULL,
  payment_items JSON NOT NULL COMMENT 'Array of payment_entry item_ids',
  line_items JSON NOT NULL COMMENT 'Remita split payment details',
  remita_request JSON NULL,
  remita_response JSON NULL,
  payment_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school (school_id),
  INDEX idx_admission (admission_no),
  INDEX idx_parent (parent_id),
  INDEX idx_rrr (rrr),
  INDEX idx_status (status),
  INDEX idx_academic (academic_year, term),
  FOREIGN KEY (admission_no) REFERENCES students(admission_no),
  FOREIGN KEY (parent_id) REFERENCES parents(parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Link payment_entries to school fees transactions
ALTER TABLE payment_entries 
ADD COLUMN IF NOT EXISTS school_fees_transaction_id INT NULL COMMENT 'Links to school_fees_transactions' AFTER ref_no,
ADD COLUMN IF NOT EXISTS remita_rrr VARCHAR(50) NULL COMMENT 'Remita RRR reference' AFTER school_fees_transaction_id;

ALTER TABLE payment_entries
ADD INDEX IF NOT EXISTS idx_school_fees_txn (school_fees_transaction_id),
ADD INDEX IF NOT EXISTS idx_remita_rrr (remita_rrr);

-- Step 3: Create school_bank_accounts table
CREATE TABLE IF NOT EXISTS school_bank_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  bank_code VARCHAR(10) NOT NULL COMMENT 'CBN bank code',
  bank_name VARCHAR(100),
  account_type ENUM('revenue', 'platform_fee', 'payroll', 'other') DEFAULT 'revenue',
  is_default BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_account (school_id, account_number),
  INDEX idx_school (school_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create webhook log table
CREATE TABLE IF NOT EXISTS remita_webhooks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rrr VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  processed BOOLEAN DEFAULT 0,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rrr (rrr),
  INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 5: Insert platform fee account
INSERT INTO school_bank_accounts 
  (school_id, account_name, account_number, bank_code, bank_name, account_type, is_default)
VALUES 
  ('PLATFORM', 'ELITE SCHOLAR PLATFORM FEE', '0502544320', '232', 'Sterling Bank', 'platform_fee', 1)
ON DUPLICATE KEY UPDATE 
  account_name = VALUES(account_name);

-- Verification
SELECT 'Migration completed successfully!' as status;
