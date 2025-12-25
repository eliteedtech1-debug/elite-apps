-- Create school_bank_accounts table
CREATE TABLE `school_bank_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` varchar(50) NOT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `bank_code` varchar(10) DEFAULT NULL,
  `swift_code` varchar(20) DEFAULT NULL,
  `branch_address` text DEFAULT NULL,
  `paystack_subaccount_code` varchar(50) DEFAULT NULL COMMENT 'Paystack subaccount code for settlements',
  `percentage_charge` decimal(5,2) DEFAULT 0.00 COMMENT 'Percentage charge for transactions',
  `is_default` tinyint(1) DEFAULT 0,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_paystack_subaccount` (`paystack_subaccount_code`),
  UNIQUE KEY `unique_account_per_school` (`school_id`, `account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
