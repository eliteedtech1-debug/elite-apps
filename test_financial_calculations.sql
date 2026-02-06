-- Test Financial Calculations with Realistic Data
-- This script creates test scenarios for refunds, scholarships, discounts

USE full_skcooly;

-- Clear existing test data for clean testing
DELETE FROM payment_entries WHERE school_id = 'SCH/TEST' AND branch_id = 'BRCH/TEST';

-- Test Scenario 1: Student Bills (Expected Revenue)
INSERT INTO payment_entries (
  school_id, branch_id, admission_no, class_code, ref_no,
  item_category, description, cr, dr, payment_status, 
  academic_year, term, created_at, updated_at
) VALUES
-- Student A: Full payment
('SCH/TEST', 'BRCH/TEST', 'ADM001', 'JSS1', 'REF001', 'Fees', 'School Fees', 50000, 0, 'Pending', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM001', 'JSS1', 'REF001P', 'Fees', 'School Fees Payment', 0, 50000, 'Confirmed', '2025', 'First Term', NOW(), NOW()),

-- Student B: Partial payment with outstanding
('SCH/TEST', 'BRCH/TEST', 'ADM002', 'JSS1', 'REF002', 'Fees', 'School Fees', 45000, 0, 'Pending', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM002', 'JSS1', 'REF002P', 'Fees', 'Partial Payment', 0, 25000, 'Confirmed', '2025', 'First Term', NOW(), NOW()),

-- Student C: Scholarship recipient
('SCH/TEST', 'BRCH/TEST', 'ADM003', 'JSS1', 'REF003', 'Fees', 'School Fees', 40000, 0, 'Pending', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM003', 'JSS1', 'REF003S', 'Fees', 'Merit Scholarship', 15000, 0, 'Scholarship', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM003', 'JSS1', 'REF003P', 'Fees', 'Remaining Payment', 0, 25000, 'Confirmed', '2025', 'First Term', NOW(), NOW()),

-- Student D: Discount + Refund scenario
('SCH/TEST', 'BRCH/TEST', 'ADM004', 'JSS1', 'REF004', 'Fees', 'School Fees', 35000, 0, 'Pending', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM004', 'JSS1', 'REF004D', 'Fees', 'Early Payment Discount', 5000, 0, 'Discount', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM004', 'JSS1', 'REF004P', 'Fees', 'Payment', 0, 30000, 'Confirmed', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', 'ADM004', 'JSS1', 'REF004R', 'Fees', 'Overpayment Refund', 2000, 0, 'Refund', '2025', 'First Term', NOW(), NOW()),

-- Student E: Cancelled bill
('SCH/TEST', 'BRCH/TEST', 'ADM005', 'JSS1', 'REF005', 'Fees', 'School Fees', 30000, 0, 'Cancelled', '2025', 'First Term', NOW(), NOW()),

-- Expenses (Expenditure)
('SCH/TEST', 'BRCH/TEST', NULL, NULL, 'EXP001', 'Expense', 'Electricity Bill', 0, 15000, 'Confirmed', '2025', 'First Term', NOW(), NOW()),
('SCH/TEST', 'BRCH/TEST', NULL, NULL, 'EXP002', 'Operational Cost', 'Office Supplies', 0, 8000, 'Confirmed', '2025', 'First Term', NOW(), NOW());

-- Test the calculations
SELECT '=== EXPECTED REVENUE CALCULATION ===' as test_section;

SELECT 
  'Expected Revenue (Bills - Scholarships - Discounts)' as calculation,
  SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) as total_bills,
  SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END) as scholarships_discounts,
  SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) -
  SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END) as expected_revenue
FROM payment_entries 
WHERE school_id = 'SCH/TEST' AND item_category = 'Fees';

SELECT '=== COLLECTED REVENUE CALCULATION ===' as test_section;

SELECT 
  'Collected Revenue (Payments - Refunds)' as calculation,
  SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) as total_payments,
  SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END) as refunds,
  SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) -
  SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END) as collected_revenue
FROM payment_entries 
WHERE school_id = 'SCH/TEST' AND item_category = 'Fees';

SELECT '=== OUTSTANDING BALANCE CALCULATION ===' as test_section;

SELECT 
  'Outstanding Balance (Expected - Collected)' as calculation,
  -- Expected Revenue
  (SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) -
   SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END)) as expected_revenue,
  -- Collected Revenue  
  (SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) -
   SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END)) as collected_revenue,
  -- Outstanding
  (SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) -
   SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END)) -
  (SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) -
   SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END)) as outstanding_balance
FROM payment_entries 
WHERE school_id = 'SCH/TEST' AND item_category = 'Fees';

SELECT '=== EXPENDITURE CALCULATION ===' as test_section;

SELECT 
  'Total Expenditure (Expenses + Scholarships + Discounts + Refunds)' as calculation,
  SUM(CASE WHEN item_category IN ('Expense', 'Operational Cost') AND dr > 0 THEN dr ELSE 0 END) as expenses,
  SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship', 'Refund') AND cr > 0 THEN cr ELSE 0 END) as scholarships_discounts_refunds,
  SUM(CASE WHEN item_category IN ('Expense', 'Operational Cost') AND dr > 0 THEN dr ELSE 0 END) +
  SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship', 'Refund') AND cr > 0 THEN cr ELSE 0 END) as total_expenditure
FROM payment_entries 
WHERE school_id = 'SCH/TEST';

SELECT '=== DETAILED BREAKDOWN BY STUDENT ===' as test_section;

SELECT 
  admission_no,
  SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) as billed,
  SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END) as discounts_scholarships,
  SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) as paid,
  SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END) as refunded,
  -- Net Expected
  SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) -
  SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END) as net_expected,
  -- Net Collected
  SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) -
  SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END) as net_collected,
  -- Outstanding
  (SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) -
   SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END)) -
  (SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) -
   SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END)) as outstanding
FROM payment_entries 
WHERE school_id = 'SCH/TEST' AND item_category = 'Fees' AND admission_no IS NOT NULL
GROUP BY admission_no
ORDER BY admission_no;
