-- ============================================================
-- School Billing & Subscription Management System
-- ============================================================
-- This script creates tables for managing school subscriptions,
-- pricing, and billing for ElScholar platform
-- ============================================================

-- ============================================================
-- 1. SUBSCRIPTION PRICING CONFIGURATION TABLE
-- ============================================================
-- Stores base pricing and add-on costs for school subscriptions

CREATE TABLE IF NOT EXISTS `subscription_pricing` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pricing_name` VARCHAR(100) NOT NULL COMMENT 'e.g., "Basic Plan", "Premium Plan"',
  `base_price_per_student_term` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Base cost per student per term',
  `base_price_per_student_annum` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Base cost per student per annum',
  `annual_discount_percentage` DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Discount % if paying annually (e.g., 15.00 for 15%)',

  -- Add-on feature costs (per term)
  `cbt_stand_alone_cost_term` DECIMAL(10, 2) DEFAULT 0.00,
  `sms_subscription_cost_term` DECIMAL(10, 2) DEFAULT 0.00,
  `whatsapp_subscription_cost_term` DECIMAL(10, 2) DEFAULT 0.00,
  `email_subscription_cost_term` DECIMAL(10, 2) DEFAULT 0.00,
  `express_finance_cost_term` DECIMAL(10, 2) DEFAULT 0.00,

  -- Add-on feature costs (per annum)
  `cbt_stand_alone_cost_annum` DECIMAL(10, 2) DEFAULT 0.00,
  `sms_subscription_cost_annum` DECIMAL(10, 2) DEFAULT 0.00,
  `whatsapp_subscription_cost_annum` DECIMAL(10, 2) DEFAULT 0.00,
  `email_subscription_cost_annum` DECIMAL(10, 2) DEFAULT 0.00,
  `express_finance_cost_annum` DECIMAL(10, 2) DEFAULT 0.00,

  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. SCHOOL SUBSCRIPTIONS TABLE
-- ============================================================
-- Tracks active subscriptions for each school

CREATE TABLE IF NOT EXISTS `school_subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(20) NOT NULL,
  `subscription_type` ENUM('termly', 'annually') NOT NULL DEFAULT 'termly',
  `pricing_plan_id` INT NOT NULL COMMENT 'References subscription_pricing table',

  -- Subscription period
  `subscription_start_date` DATE NOT NULL,
  `subscription_end_date` DATE NOT NULL,
  `current_term` ENUM('First term', 'Second term', 'Third term') DEFAULT NULL,
  `academic_year` VARCHAR(20) DEFAULT NULL,

  -- Student count at time of subscription
  `active_students_count` INT NOT NULL DEFAULT 0 COMMENT 'Count of active + suspended students',

  -- Enabled add-on features (copied from school_setup at subscription time)
  `cbt_stand_alone_enabled` TINYINT(1) DEFAULT 0,
  `sms_subscription_enabled` TINYINT(1) DEFAULT 0,
  `whatsapp_subscription_enabled` TINYINT(1) DEFAULT 0,
  `email_subscription_enabled` TINYINT(1) DEFAULT 0,
  `express_finance_enabled` TINYINT(1) DEFAULT 0,

  -- Calculated costs
  `base_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Base subscription cost',
  `addon_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total add-on features cost',
  `discount_amount` DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Discount applied (for annual)',
  `total_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Final cost = base + addon - discount',

  -- Payment tracking
  `payment_status` ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  `amount_paid` DECIMAL(12, 2) DEFAULT 0.00,
  `balance` DECIMAL(12, 2) DEFAULT 0.00,

  `status` ENUM('active', 'expired', 'cancelled', 'suspended') DEFAULT 'active',
  `created_by` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`school_id`) REFERENCES `school_setup`(`school_id`) ON DELETE CASCADE,
  FOREIGN KEY (`pricing_plan_id`) REFERENCES `subscription_pricing`(`id`) ON DELETE RESTRICT,

  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_subscription_type` (`subscription_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_dates` (`subscription_start_date`, `subscription_end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. SUBSCRIPTION INVOICES TABLE
-- ============================================================
-- Stores generated invoices for school subscriptions

CREATE TABLE IF NOT EXISTS `subscription_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g., INV-2025-001',
  `school_id` VARCHAR(20) NOT NULL,
  `subscription_id` INT NOT NULL,

  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,

  `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12, 2) DEFAULT 0.00,
  `tax` DECIMAL(12, 2) DEFAULT 0.00,
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

  `payment_status` ENUM('unpaid', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'unpaid',
  `amount_paid` DECIMAL(12, 2) DEFAULT 0.00,
  `balance` DECIMAL(12, 2) DEFAULT 0.00,

  `payment_method` VARCHAR(50) DEFAULT NULL COMMENT 'Bank Transfer, Card, etc.',
  `payment_date` DATE DEFAULT NULL,
  `payment_reference` VARCHAR(100) DEFAULT NULL,

  `notes` TEXT DEFAULT NULL,
  `created_by` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`school_id`) REFERENCES `school_setup`(`school_id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscription_id`) REFERENCES `school_subscriptions`(`id`) ON DELETE CASCADE,

  INDEX `idx_invoice_number` (`invoice_number`),
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_dates` (`invoice_date`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. PAYMENT HISTORY TABLE
-- ============================================================
-- Tracks all payments made towards subscriptions

CREATE TABLE IF NOT EXISTS `subscription_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_reference` VARCHAR(100) NOT NULL UNIQUE,
  `school_id` VARCHAR(20) NOT NULL,
  `subscription_id` INT NOT NULL,
  `invoice_id` INT DEFAULT NULL,

  `payment_date` DATE NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL COMMENT 'Bank Transfer, Card, Cash, etc.',

  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `bank_name` VARCHAR(100) DEFAULT NULL,
  `depositor_name` VARCHAR(200) DEFAULT NULL,

  `notes` TEXT DEFAULT NULL,
  `receipt_url` VARCHAR(500) DEFAULT NULL,

  `verified_by` VARCHAR(20) DEFAULT NULL,
  `verified_at` TIMESTAMP DEFAULT NULL,
  `verification_status` ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',

  `created_by` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`school_id`) REFERENCES `school_setup`(`school_id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscription_id`) REFERENCES `school_subscriptions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`invoice_id`) REFERENCES `subscription_invoices`(`id`) ON DELETE SET NULL,

  INDEX `idx_payment_reference` (`payment_reference`),
  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_verification_status` (`verification_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. INSERT SAMPLE PRICING PLANS
-- ============================================================

INSERT INTO `subscription_pricing` (
  `pricing_name`,
  `base_price_per_student_term`,
  `base_price_per_student_annum`,
  `annual_discount_percentage`,
  `cbt_stand_alone_cost_term`,
  `sms_subscription_cost_term`,
  `whatsapp_subscription_cost_term`,
  `email_subscription_cost_term`,
  `express_finance_cost_term`,
  `cbt_stand_alone_cost_annum`,
  `sms_subscription_cost_annum`,
  `whatsapp_subscription_cost_annum`,
  `email_subscription_cost_annum`,
  `express_finance_cost_annum`,
  `is_active`
) VALUES
(
  'Standard Plan',
  100.00,  -- ₦100 per student per term
  300.00,  -- ₦300 per student per annum (3 terms)
  15.00,   -- 15% discount for annual payment

  -- Add-on costs per term
  25000.00,  -- CBT Stand Alone (flat rate per term)
  5000.00,   -- SMS Subscription (flat rate per term)
  3000.00,   -- WhatsApp Subscription (flat rate per term)
  2000.00,   -- Email Subscription (flat rate per term)
  15000.00,  -- Express Finance (flat rate per term)

  -- Add-on costs per annum
  60000.00,  -- CBT Stand Alone (flat rate per annum, ~20% discount)
  12000.00,  -- SMS Subscription (flat rate per annum, ~20% discount)
  7200.00,   -- WhatsApp Subscription (flat rate per annum, ~20% discount)
  4800.00,   -- Email Subscription (flat rate per annum, ~20% discount)
  36000.00,  -- Express Finance (flat rate per annum, ~20% discount)

  1  -- Active
);

-- ============================================================
-- 6. VERIFICATION QUERIES
-- ============================================================

-- Check pricing plans
SELECT * FROM subscription_pricing;

-- Check school subscriptions
SELECT
  ss.*,
  sch.school_name,
  sp.pricing_name
FROM school_subscriptions ss
JOIN school_setup sch ON ss.school_id = sch.school_id
JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
ORDER BY ss.created_at DESC;

-- Check invoices
SELECT
  si.*,
  sch.school_name,
  ss.subscription_type
FROM subscription_invoices si
JOIN school_setup sch ON si.school_id = sch.school_id
JOIN school_subscriptions ss ON si.subscription_id = ss.id
ORDER BY si.invoice_date DESC;

-- ============================================================
-- 7. USAGE NOTES
-- ============================================================

/*
BILLING CALCULATION FORMULA:

For TERMLY subscription:
  base_cost = active_students_count * base_price_per_student_term
  addon_cost = SUM of enabled add-on features' _cost_term values
  discount = 0
  total_cost = base_cost + addon_cost

For ANNUALLY subscription:
  base_cost = active_students_count * base_price_per_student_annum
  addon_cost = SUM of enabled add-on features' _cost_annum values
  discount = (base_cost + addon_cost) * (annual_discount_percentage / 100)
  total_cost = base_cost + addon_cost - discount

EXAMPLE:
School with 500 students, Annual subscription, Standard Plan
- All add-ons enabled (CBT, SMS, WhatsApp, Email, Express Finance)

base_cost = 500 * ₦300 = ₦150,000
addon_cost = ₦60,000 + ₦12,000 + ₦7,200 + ₦4,800 + ₦36,000 = ₦120,000
subtotal = ₦150,000 + ₦120,000 = ₦270,000
discount = ₦270,000 * 15% = ₦40,500
total_cost = ₦270,000 - ₦40,500 = ₦229,500

WORKFLOW:
1. Super Admin creates subscription pricing plans
2. Super Admin creates subscription for a school (selects plan, type, features)
3. System automatically:
   - Counts active + suspended students
   - Calculates costs based on formula
   - Generates invoice
4. School makes payment
5. Super Admin verifies payment
6. Subscription becomes active
*/

-- ============================================================
-- END OF SCRIPT
-- ============================================================
