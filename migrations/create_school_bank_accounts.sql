-- ========================================================================
-- SCHOOL BANK ACCOUNTS TABLE - Creation Script
-- ========================================================================
-- This table stores bank account information for schools
-- Used in invoice and family invoice generation
-- Date: 2025-12-01
-- ========================================================================

CREATE TABLE IF NOT EXISTS `school_bank_accounts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(10) NOT NULL,
  `branch_id` VARCHAR(20) NULL,
  `account_name` VARCHAR(255) NOT NULL COMMENT 'Account holder name',
  `account_number` VARCHAR(50) NOT NULL COMMENT 'Bank account number',
  `bank_name` VARCHAR(100) NOT NULL COMMENT 'Name of the bank',
  `bank_code` VARCHAR(10) NULL COMMENT 'Bank code (e.g., for Nigerian banks)',
  `swift_code` VARCHAR(20) NULL COMMENT 'SWIFT/BIC code for international transfers',
  `branch_address` TEXT NULL COMMENT 'Bank branch address',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT 'Default account for invoices',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_per_school` (`school_id`, `account_number`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='School bank accounts for invoicing';

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify table creation
SHOW CREATE TABLE school_bank_accounts;

-- Check table structure
DESCRIBE school_bank_accounts;

-- ========================================================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================================================

-- INSERT INTO school_bank_accounts
-- (school_id, branch_id, account_name, account_number, bank_name, bank_code, is_default, status)
-- VALUES
-- ('SCH/1', 'default', 'Elite Core Academy', '0123456789', 'First Bank of Nigeria', '011', 1, 'Active');

-- ========================================================================
-- ROLLBACK SCRIPT (If needed)
-- ========================================================================
-- DROP TABLE IF EXISTS school_bank_accounts;
