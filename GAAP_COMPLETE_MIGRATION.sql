-- =====================================================
-- GAAP COMPLIANCE - COMPLETE SQL MIGRATION
-- Elite Scholar - All GAAP Tables and Procedures
-- Date: 2026-01-22
-- =====================================================

-- STEP 1: Add GAAP columns to payment_entries (backward compatible)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'payment_entries' AND COLUMN_NAME = 'payment_status') = 0,
  'ALTER TABLE payment_entries ADD COLUMN payment_status ENUM(''Pending'', ''Partial'', ''Paid'', ''Overdue'', ''Written_Off'') DEFAULT ''Pending'' COMMENT ''GAAP: Track payment status for accrual accounting''',
  'SELECT "payment_status column already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'payment_entries' AND COLUMN_NAME = 'cash_received_date') = 0,
  'ALTER TABLE payment_entries ADD COLUMN cash_received_date DATE NULL COMMENT ''GAAP: When cash actually received''',
  'SELECT "cash_received_date column already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'payment_entries' AND COLUMN_NAME = 'accrued_revenue_date') = 0,
  'ALTER TABLE payment_entries ADD COLUMN accrued_revenue_date DATE NOT NULL DEFAULT (CURDATE()) COMMENT ''GAAP: When revenue was earned/charged''',
  'SELECT "accrued_revenue_date column already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'payment_entries' AND COLUMN_NAME = 'days_outstanding') = 0,
  'ALTER TABLE payment_entries ADD COLUMN days_outstanding INT DEFAULT 0 COMMENT ''GAAP: Calculate aging for bad debt analysis''',
  'SELECT "days_outstanding column already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- STEP 2: Add credit_balance to students table (backward compatible)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'students' AND COLUMN_NAME = 'credit_balance') = 0,
  'ALTER TABLE students ADD COLUMN credit_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT ''Student credit balance for future bill settlements''',
  'SELECT "credit_balance column already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- STEP 3: Create bad_debt_allowance table (if not exists)
CREATE TABLE IF NOT EXISTS bad_debt_allowance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  academic_year VARCHAR(50) NOT NULL,
  term VARCHAR(50) NOT NULL,
  total_receivables DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  estimated_uncollectible_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0200 COMMENT '2% default rate',
  estimated_uncollectible_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  actual_writeoffs DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  allowance_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  last_calculated DATE NOT NULL DEFAULT (CURDATE()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_bad_debt_school_year (school_id, academic_year),
  INDEX idx_bad_debt_calculation (last_calculated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='GAAP: Allowance for doubtful accounts - uncollectible student fees';

-- STEP 4: Create deferred_revenue table (if not exists)
CREATE TABLE IF NOT EXISTS deferred_revenue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  admission_no VARCHAR(50) NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  payment_entry_id VARCHAR(50),
  original_amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  service_period_start DATE NOT NULL,
  service_period_end DATE NOT NULL,
  recognition_method ENUM('Monthly', 'Daily', 'Term_Based') DEFAULT 'Monthly',
  recognition_status ENUM('Deferred', 'Recognizing', 'Fully_Recognized') DEFAULT 'Deferred',
  last_recognition_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_deferred_student (student_id),
  INDEX idx_deferred_school (school_id, branch_id),
  INDEX idx_deferred_recognition (recognition_status, last_recognition_date),
  INDEX idx_deferred_period (service_period_start, service_period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='GAAP: Deferred revenue for prepaid student fees';

-- STEP 5: Create period_adjustments table (if not exists)
CREATE TABLE IF NOT EXISTS period_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  adjustment_type ENUM(
    'Bad_Debt_Allowance', 
    'Deferred_Revenue_Recognition', 
    'Accrued_Expenses', 
    'Prepaid_Expenses',
    'Depreciation'
  ) NOT NULL,
  period_year VARCHAR(4) NOT NULL,
  period_month VARCHAR(2) NOT NULL,
  adjustment_amount DECIMAL(15,2) NOT NULL,
  debit_account VARCHAR(10) NOT NULL,
  credit_account VARCHAR(10) NOT NULL,
  description TEXT,
  journal_entry_id VARCHAR(50),
  status ENUM('Pending', 'Posted', 'Reversed') DEFAULT 'Pending',
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  posted_at TIMESTAMP NULL,
  
  INDEX idx_adjustments_school_period (school_id, period_year, period_month),
  INDEX idx_adjustments_type (adjustment_type),
  INDEX idx_adjustments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='GAAP: Period-end adjusting entries for accrual accounting';

-- STEP 6: Create student_ledger table (if not exists)
CREATE TABLE IF NOT EXISTS student_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL COMMENT 'Reference to students table',
  admission_no VARCHAR(50) NOT NULL COMMENT 'Student admission number',
  school_id VARCHAR(20) NOT NULL COMMENT 'School identifier',
  branch_id VARCHAR(20) NOT NULL COMMENT 'Branch identifier',
  transaction_type ENUM('credit', 'debit', 'settlement') NOT NULL COMMENT 'Type of ledger transaction',
  amount DECIMAL(10,2) NOT NULL COMMENT 'Transaction amount',
  description TEXT COMMENT 'Transaction description',
  term VARCHAR(50) NOT NULL COMMENT 'Academic term',
  academic_year VARCHAR(50) NOT NULL COMMENT 'Academic year',
  reference_id VARCHAR(100) COMMENT 'Reference to payment or bill ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_student_ledger_student (student_id),
  INDEX idx_student_ledger_admission (admission_no),
  INDEX idx_student_ledger_school (school_id, branch_id),
  INDEX idx_student_ledger_type (transaction_type),
  INDEX idx_student_ledger_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- STEP 7: Update existing payment_entries with default values
UPDATE payment_entries 
SET payment_status = CASE 
  WHEN dr > 0 AND cr > 0 AND dr >= cr THEN 'Paid'
  WHEN dr > 0 AND cr > 0 AND dr < cr THEN 'Partial'
  WHEN dr = 0 AND cr > 0 THEN 'Pending'
  ELSE 'Pending'
END,
accrued_revenue_date = COALESCE(created_at, CURDATE());

-- STEP 8: Create performance indexes (if not exists)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_NAME = 'payment_entries' AND INDEX_NAME = 'idx_payment_entries_status') = 0,
  'CREATE INDEX idx_payment_entries_status ON payment_entries(payment_status)',
  'SELECT "idx_payment_entries_status already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_NAME = 'payment_entries' AND INDEX_NAME = 'idx_payment_entries_aging') = 0,
  'CREATE INDEX idx_payment_entries_aging ON payment_entries(days_outstanding)',
  'SELECT "idx_payment_entries_aging already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_NAME = 'payment_entries' AND INDEX_NAME = 'idx_payment_entries_accrual_date') = 0,
  'CREATE INDEX idx_payment_entries_accrual_date ON payment_entries(accrued_revenue_date)',
  'SELECT "idx_payment_entries_accrual_date already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_NAME = 'payment_entries' AND INDEX_NAME = 'idx_payment_entries_cash_date') = 0,
  'CREATE INDEX idx_payment_entries_cash_date ON payment_entries(cash_received_date)',
  'SELECT "idx_payment_entries_cash_date already exists"'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- STEP 9: Bad debt calculation stored procedure (if not exists)
DROP PROCEDURE IF EXISTS CalculateBadDebtAllowance;

DELIMITER //

CREATE PROCEDURE CalculateBadDebtAllowance(
  IN p_school_id VARCHAR(20),
  IN p_branch_id VARCHAR(20),
  IN p_academic_year VARCHAR(50),
  IN p_term VARCHAR(50)
)
BEGIN
  DECLARE v_total_receivables DECIMAL(15,2) DEFAULT 0.00;
  DECLARE v_estimated_rate DECIMAL(5,4) DEFAULT 0.0200;
  DECLARE v_estimated_amount DECIMAL(15,2) DEFAULT 0.00;
  
  -- Calculate total outstanding receivables
  SELECT COALESCE(SUM(cr - dr), 0.00) INTO v_total_receivables
  FROM payment_entries 
  WHERE school_id = p_school_id 
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND academic_year = p_academic_year
    AND term = p_term
    AND payment_status IN ('Pending', 'Partial', 'Overdue');
  
  -- Calculate estimated uncollectible amount
  SET v_estimated_amount = v_total_receivables * v_estimated_rate;
  
  -- Insert or update bad debt allowance
  INSERT INTO bad_debt_allowance (
    school_id, branch_id, academic_year, term,
    total_receivables, estimated_uncollectible_rate, 
    estimated_uncollectible_amount, allowance_balance,
    last_calculated
  ) VALUES (
    p_school_id, p_branch_id, p_academic_year, p_term,
    v_total_receivables, v_estimated_rate,
    v_estimated_amount, v_estimated_amount,
    CURDATE()
  ) ON DUPLICATE KEY UPDATE
    total_receivables = v_total_receivables,
    estimated_uncollectible_amount = v_estimated_amount,
    allowance_balance = v_estimated_amount,
    last_calculated = CURDATE();
    
  -- Create journal entry for bad debt expense (if journal_entries table exists)
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'journal_entries') THEN
    INSERT INTO journal_entries (
      entry_date, reference_no, account_name, account_type,
      debit_amount, credit_amount, description,
      school_id, branch_id, academic_year, term,
      created_at, updated_at
    ) VALUES 
    (
      CURDATE(), 
      CONCAT('BDA-', p_school_id, '-', DATE_FORMAT(NOW(), '%Y%m%d')),
      'Bad Debt Expense', 'Expense',
      v_estimated_amount, 0.00,
      CONCAT('Bad debt allowance for ', p_term, ' ', p_academic_year),
      p_school_id, p_branch_id, p_academic_year, p_term,
      NOW(), NOW()
    ),
    (
      CURDATE(),
      CONCAT('BDA-', p_school_id, '-', DATE_FORMAT(NOW(), '%Y%m%d')),
      'Allowance for Doubtful Accounts', 'Contra-Asset',
      0.00, v_estimated_amount,
      CONCAT('Bad debt allowance for ', p_term, ' ', p_academic_year),
      p_school_id, p_branch_id, p_academic_year, p_term,
      NOW(), NOW()
    );
  END IF;
  
END //

DELIMITER ;

-- STEP 10: Deferred revenue recognition stored procedure (if not exists)
DROP PROCEDURE IF EXISTS RecognizeDeferredRevenue;

DELIMITER //

CREATE PROCEDURE RecognizeDeferredRevenue(
  IN p_school_id VARCHAR(20),
  IN p_recognition_date DATE
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_deferred_id INT;
  DECLARE v_monthly_amount DECIMAL(10,2);
  DECLARE v_student_id VARCHAR(50);
  DECLARE v_admission_no VARCHAR(50);
  
  DECLARE deferred_cursor CURSOR FOR
    SELECT id, student_id, admission_no,
           remaining_amount / DATEDIFF(service_period_end, service_period_start) * 30 as monthly_amount
    FROM deferred_revenue 
    WHERE school_id = p_school_id
      AND recognition_status = 'Deferred'
      AND service_period_start <= p_recognition_date
      AND service_period_end >= p_recognition_date;
      
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN deferred_cursor;
  
  recognition_loop: LOOP
    FETCH deferred_cursor INTO v_deferred_id, v_student_id, v_admission_no, v_monthly_amount;
    
    IF done THEN
      LEAVE recognition_loop;
    END IF;
    
    -- Create journal entry to recognize revenue (if journal_entries table exists)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'journal_entries') THEN
      INSERT INTO journal_entries (
        entry_date, reference_no, account_name, account_type,
        debit_amount, credit_amount, description,
        school_id, created_at, updated_at
      ) VALUES 
      (
        p_recognition_date,
        CONCAT('DRR-', v_student_id, '-', DATE_FORMAT(p_recognition_date, '%Y%m%d')),
        'Deferred Revenue', 'Liability',
        v_monthly_amount, 0.00,
        CONCAT('Revenue recognition for student ', v_admission_no),
        p_school_id, NOW(), NOW()
      ),
      (
        p_recognition_date,
        CONCAT('DRR-', v_student_id, '-', DATE_FORMAT(p_recognition_date, '%Y%m%d')),
        'Tuition Revenue', 'Revenue',
        0.00, v_monthly_amount,
        CONCAT('Revenue recognition for student ', v_admission_no),
        p_school_id, NOW(), NOW()
      );
    END IF;
    
    -- Update deferred revenue record
    UPDATE deferred_revenue 
    SET remaining_amount = remaining_amount - v_monthly_amount,
        last_recognition_date = p_recognition_date,
        recognition_status = CASE 
          WHEN remaining_amount - v_monthly_amount <= 0 THEN 'Fully_Recognized'
          ELSE 'Recognizing'
        END
    WHERE id = v_deferred_id;
    
  END LOOP;
  
  CLOSE deferred_cursor;
  
END //

DELIMITER ;

-- STEP 11: Sync existing overpayments to credit balance system (safe execution)
INSERT IGNORE INTO student_ledger (
  student_id, admission_no, school_id, branch_id, transaction_type, amount,
  description, term, academic_year, reference_id, created_at, updated_at
)
SELECT 
  s.admission_no,
  s.admission_no,
  s.school_id,
  s.branch_id,
  'credit',
  ABS(pe_balance.balance),
  CONCAT('Overpayment migration from existing payments - ', pe_balance.latest_term),
  pe_balance.latest_term,
  pe_balance.latest_academic_year,
  CONCAT('MIGRATION-', s.admission_no, '-', UNIX_TIMESTAMP()),
  NOW(),
  NOW()
FROM students s
JOIN (
  SELECT 
    admission_no,
    SUM(dr) - SUM(cr) as balance,
    MAX(term) as latest_term,
    MAX(academic_year) as latest_academic_year
  FROM payment_entries 
  GROUP BY admission_no, school_id, branch_id
  HAVING balance < 0
) pe_balance ON s.admission_no = pe_balance.admission_no
WHERE s.credit_balance = 0.00
  AND NOT EXISTS (
    SELECT 1 FROM student_ledger sl 
    WHERE sl.admission_no = s.admission_no 
    AND sl.reference_id LIKE CONCAT('MIGRATION-', s.admission_no, '%')
  );

-- STEP 12: Update student credit balances (safe execution)
UPDATE students s
JOIN (
  SELECT 
    admission_no,
    ABS(SUM(dr) - SUM(cr)) as overpayment_amount
  FROM payment_entries 
  GROUP BY admission_no, school_id, branch_id
  HAVING SUM(dr) - SUM(cr) < 0
) pe_overpay ON s.admission_no = pe_overpay.admission_no
SET s.credit_balance = pe_overpay.overpayment_amount
WHERE s.credit_balance = 0.00;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check new columns
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'payment_entries' 
  AND COLUMN_NAME IN ('payment_status', 'cash_received_date', 'accrued_revenue_date', 'days_outstanding');

-- Check new tables
SHOW TABLES LIKE '%bad_debt%';
SHOW TABLES LIKE '%deferred_revenue%';
SHOW TABLES LIKE '%period_adjustments%';
SHOW TABLES LIKE '%student_ledger%';

-- Migration summary
SELECT 
  'Students with Credit Balance' as report_type,
  COUNT(*) as count,
  SUM(credit_balance) as total_amount
FROM students 
WHERE credit_balance > 0;

SELECT 
  'Ledger Entries Created' as report_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM student_ledger 
WHERE reference_id LIKE 'MIGRATION-%';

-- =====================================================
-- GAAP COMPLIANCE COMPLETE
-- =====================================================
