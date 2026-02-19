CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE `account_chart` CHANGE `head` `head` VARCHAR(50) NOT NULL, CHANGE `sub_head` `sub_head` VARCHAR(50) NOT NULL;

-- Grade Levels Table
CREATE TABLE `grade_levels` (
  `grade_id` int(11) NOT NULL AUTO_INCREMENT,
  `grade_name` varchar(50) NOT NULL,
  `grade_code` varchar(10) NOT NULL UNIQUE,
  `description` text,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`grade_id`)
);

-- Grade Steps Table
CREATE TABLE `grade_steps` (
  `step_id` int(11) NOT NULL AUTO_INCREMENT,
  `grade_id` int(11) NOT NULL,
  `step_number` int(11) NOT NULL,
  `basic_salary` decimal(15,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`step_id`),
  KEY `idx_grade_step` (`grade_id`, `step_number`),
  FOREIGN KEY (`grade_id`) REFERENCES `grade_levels`(`grade_id`)
);

-- Add grade and step to staff table
ALTER TABLE `staff` 
ADD COLUMN `grade_id` int(11) DEFAULT NULL,
ADD COLUMN `step_id` int(11) DEFAULT NULL,
ADD COLUMN `payroll_status` enum('enrolled','suspended') DEFAULT 'enrolled',
ADD COLUMN `date_enrolled` date DEFAULT NULL,
ADD COLUMN `date_suspended` date DEFAULT NULL,
ADD KEY `idx_staff_grade` (`grade_id`),
ADD KEY `idx_staff_step` (`step_id`),
ADD FOREIGN KEY (`grade_id`) REFERENCES `grade_levels`(`grade_id`),
ADD FOREIGN KEY (`step_id`) REFERENCES `grade_steps`(`step_id`);


-- Allowance Types Table
CREATE TABLE `allowance_types` (
  `allowance_id` int(11) NOT NULL AUTO_INCREMENT,
  `allowance_name` varchar(100) NOT NULL,
  `allowance_code` varchar(20) NOT NULL UNIQUE,
  `calculation_type` enum('fixed','percentage') NOT NULL,
  `default_amount` decimal(15,2) DEFAULT 0.00,
  `default_percentage` decimal(5,2) DEFAULT 0.00,
  `is_taxable` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`allowance_id`)
);

-- Deduction Types Table
CREATE TABLE `deduction_types` (
  `deduction_id` int(11) NOT NULL AUTO_INCREMENT,
  `deduction_name` varchar(100) NOT NULL,
  `deduction_code` varchar(20) NOT NULL UNIQUE,
  `calculation_type` enum('fixed','percentage') NOT NULL,
  `default_amount` decimal(15,2) DEFAULT 0.00,
  `default_percentage` decimal(5,2) DEFAULT 0.00,
  `is_mandatory` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`deduction_id`)
);

-- Staff Allowances (Assigned)
CREATE TABLE `staff_allowances` (
  `staff_allowance_id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `allowance_id` int(11) NOT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_allowance_id`),
  KEY `idx_staff_allowance` (`staff_id`, `allowance_id`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`),
  FOREIGN KEY (`allowance_id`) REFERENCES `allowance_types`(`allowance_id`)
);

-- Staff Deductions (Assigned)
CREATE TABLE `staff_deductions` (
  `staff_deduction_id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `deduction_id` int(11) NOT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_deduction_id`),
  KEY `idx_staff_deduction` (`staff_id`, `deduction_id`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`),
  FOREIGN KEY (`deduction_id`) REFERENCES `deduction_types`(`deduction_id`)
);


CREATE TABLE `loans` (
  `loan_id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `loan_type` varchar(50) NOT NULL,
  `principal_amount` decimal(15,2) NOT NULL,
  `interest_rate` decimal(5,2) DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL,
  `monthly_deduction` decimal(15,2) NOT NULL,
  `balance_remaining` decimal(15,2) NOT NULL,
  `start_date` date NOT NULL,
  `expected_end_date` date NOT NULL,
  `actual_end_date` date DEFAULT NULL,
  `status` enum('active','completed','suspended') DEFAULT 'active',
  `notes` text,
  `approved_by` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`loan_id`),
  KEY `idx_staff_loan` (`staff_id`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`)
);

-- Allowance Packages Table
-- This allows grouping multiple allowances into packages (e.g., "Senior Staff Package")
CREATE TABLE IF NOT EXISTS `allowance_packages` (
  `package_id` int(11) NOT NULL AUTO_INCREMENT,
  `package_name` varchar(100) NOT NULL,
  `package_code` varchar(20) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT 1,
  `school_id` varchar(10) NOT NULL,
  `branch_id` varchar(10) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`package_id`),
  UNIQUE KEY `idx_package_code_school` (`package_code`, `school_id`, `branch_id`),
  KEY `idx_package_school` (`school_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Allowance Package Items (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS `allowance_package_items` (
  `package_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` int(11) NOT NULL,
  `allowance_id` int(11) NOT NULL,
  `amount_override` decimal(15,2) DEFAULT NULL,
  `percentage_override` decimal(5,2) DEFAULT NULL,
  `is_optional` tinyint(1) DEFAULT 0,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`package_item_id`),
  UNIQUE KEY `idx_package_allowance` (`package_id`, `allowance_id`),
  KEY `idx_package_id` (`package_id`),
  KEY `idx_allowance_id` (`allowance_id`),
  FOREIGN KEY (`package_id`) REFERENCES `allowance_packages`(`package_id`) ON DELETE CASCADE,
  FOREIGN KEY (`allowance_id`) REFERENCES `allowance_types`(`allowance_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payroll Periods
CREATE TABLE `payroll_periods` (
  `period_id` int(11) NOT NULL AUTO_INCREMENT,
  `period_month` varchar(7) NOT NULL, -- YYYY-MM format
  `period_year` int(4) NOT NULL,
  `period_month_num` int(2) NOT NULL,
  `status` enum('draft','initiated','approved','locked') DEFAULT 'draft',
  `total_staff` int(11) DEFAULT 0,
  `total_basic_salary` decimal(15,2) DEFAULT 0.00,
  `total_allowances` decimal(15,2) DEFAULT 0.00,
  `total_deductions` decimal(15,2) DEFAULT 0.00,
  `total_net_pay` decimal(15,2) DEFAULT 0.00,
  `initiated_by` int(11) DEFAULT NULL,
  `initiated_at` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  `school_id` varchar(10) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`period_id`),
  UNIQUE KEY `idx_period_school` (`period_month`, `school_id`)
);

-- Payroll Lines (Staff Payroll for Period)
CREATE TABLE `payroll_lines` (
  `payroll_line_id` int(11) NOT NULL AUTO_INCREMENT,
  `period_id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `basic_salary` decimal(15,2) NOT NULL,
  `total_allowances` decimal(15,2) DEFAULT 0.00,
  `total_deductions` decimal(15,2) DEFAULT 0.00,
  `gross_pay` decimal(15,2) NOT NULL,
  `net_pay` decimal(15,2) NOT NULL,
  `is_processed` tinyint(1) DEFAULT 0,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payroll_line_id`),
  UNIQUE KEY `idx_period_staff` (`period_id`, `staff_id`),
  FOREIGN KEY (`period_id`) REFERENCES `payroll_periods`(`period_id`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`)
);

-- Payroll Items (Individual Allowances/Deductions)
CREATE TABLE `payroll_items` (
  `payroll_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `payroll_line_id` int(11) NOT NULL,
  `item_type` enum('allowance','deduction','loan') NOT NULL,
  `item_id` int(11) NOT NULL, -- allowance_id, deduction_id, or loan_id
  `item_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `calculation_base` decimal(15,2) DEFAULT NULL,
  `rate` decimal(5,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payroll_item_id`),
  KEY `idx_payroll_line` (`payroll_line_id`),
  FOREIGN KEY (`payroll_line_id`) REFERENCES `payroll_lines`(`payroll_line_id`)
);

-- Payroll Adjustments (Manual Adjustments)
CREATE TABLE `payroll_adjustments` (
  `adjustment_id` int(11) NOT NULL AUTO_INCREMENT,
  `payroll_line_id` int(11) NOT NULL,
  `adjustment_type` enum('allowance','deduction') NOT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `reason` text,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adjustment_id`),
  KEY `idx_adjustment_line` (`payroll_line_id`),
  FOREIGN KEY (`payroll_line_id`) REFERENCES `payroll_lines`(`payroll_line_id`)
);

-- Payroll Approvals
CREATE TABLE `payroll_approvals` (
  `approval_id` int(11) NOT NULL AUTO_INCREMENT,
  `period_id` int(11) NOT NULL,
  `approved_by` int(11) NOT NULL,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approval_notes` text,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_id`),
  KEY `idx_period_approval` (`period_id`),
  FOREIGN KEY (`period_id`) REFERENCES `payroll_periods`(`period_id`)
);

-- Audit Trail
CREATE TABLE `payroll_audit` (
  `audit_id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `action` enum('create','update','delete','approve','initiate','suspend','promote') NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_table` (`table_name`, `record_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`)
);


DELIMITER //

CREATE PROCEDURE sp_initiate_payroll(
    IN p_period_month VARCHAR(7),
    IN p_actor_id INT,
    IN p_school_id VARCHAR(10)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_period_id INT;
    DECLARE v_staff_id INT;
    DECLARE v_basic_salary DECIMAL(15,2);
    DECLARE v_total_allowances DECIMAL(15,2);
    DECLARE v_total_deductions DECIMAL(15,2);
    DECLARE v_gross_pay DECIMAL(15,2);
    DECLARE v_net_pay DECIMAL(15,2);
    DECLARE v_payroll_line_id INT;
    
    -- Cursor for active staff
    DECLARE staff_cursor CURSOR FOR
        SELECT s.staff_id, COALESCE(gs.basic_salary, 0) as basic_salary
        FROM staff s
        LEFT JOIN grade_steps gs ON s.step_id = gs.step_id
        WHERE s.school_id = p_school_id 
        AND s.payroll_status = 'enrolled'
        AND (s.date_suspended IS NULL OR s.date_suspended > LAST_DAY(CONCAT(p_period_month, '-01')));
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Create or get period
    INSERT INTO payroll_periods (period_month, period_year, period_month_num, school_id, initiated_by, initiated_at, status)
    VALUES (
        p_period_month,
        YEAR(CONCAT(p_period_month, '-01')),
        MONTH(CONCAT(p_period_month, '-01')),
        p_school_id,
        p_actor_id,
        NOW(),
        'initiated'
    )
    ON DUPLICATE KEY UPDATE
        initiated_by = p_actor_id,
        initiated_at = NOW(),
        status = 'initiated';
        
    SELECT period_id INTO v_period_id 
    FROM payroll_periods 
    WHERE period_month = p_period_month AND school_id = p_school_id;
    
    -- Clear existing payroll lines for this period
    DELETE FROM payroll_items WHERE payroll_line_id IN (
        SELECT payroll_line_id FROM payroll_lines WHERE period_id = v_period_id
    );
    DELETE FROM payroll_adjustments WHERE payroll_line_id IN (
        SELECT payroll_line_id FROM payroll_lines WHERE period_id = v_period_id
    );
    DELETE FROM payroll_lines WHERE period_id = v_period_id;
    
    -- Process each staff member
    OPEN staff_cursor;
    staff_loop: LOOP
        FETCH staff_cursor INTO v_staff_id, v_basic_salary;
        IF done THEN
            LEAVE staff_loop;
        END IF;
        
        -- Calculate total allowances
        SELECT COALESCE(SUM(
            CASE 
                WHEN at.calculation_type = 'fixed' THEN COALESCE(sa.amount, at.default_amount)
                WHEN at.calculation_type = 'percentage' THEN v_basic_salary * (COALESCE(sa.percentage, at.default_percentage) / 100)
                ELSE 0
            END
        ), 0) INTO v_total_allowances
        FROM staff_allowances sa
        JOIN allowance_types at ON sa.allowance_id = at.allowance_id
        WHERE sa.staff_id = v_staff_id 
        AND sa.is_active = 1
        AND at.is_active = 1
        AND sa.effective_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
        AND (sa.end_date IS NULL OR sa.end_date >= CONCAT(p_period_month, '-01'));
        
        -- Calculate total deductions
        SELECT COALESCE(SUM(
            CASE 
                WHEN dt.calculation_type = 'fixed' THEN COALESCE(sd.amount, dt.default_amount)
                WHEN dt.calculation_type = 'percentage' THEN v_basic_salary * (COALESCE(sd.percentage, dt.default_percentage) / 100)
                ELSE 0
            END
        ), 0) INTO v_total_deductions
        FROM staff_deductions sd
        JOIN deduction_types dt ON sd.deduction_id = dt.deduction_id
        WHERE sd.staff_id = v_staff_id 
        AND sd.is_active = 1
        AND dt.is_active = 1
        AND sd.effective_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
        AND (sd.end_date IS NULL OR sd.end_date >= CONCAT(p_period_month, '-01'));
        
        -- Add loan deductions
        SET v_total_deductions = v_total_deductions + COALESCE((
            SELECT SUM(monthly_deduction)
            FROM loans
            WHERE staff_id = v_staff_id 
            AND status = 'active'
            AND start_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
            AND balance_remaining > 0
        ), 0);
        
        -- Calculate gross and net pay
        SET v_gross_pay = v_basic_salary + v_total_allowances;
        SET v_net_pay = GREATEST(0, v_gross_pay - v_total_deductions);
        
        -- Insert payroll line
        INSERT INTO payroll_lines (
            period_id, staff_id, basic_salary, total_allowances, 
            total_deductions, gross_pay, net_pay, is_processed
        ) VALUES (
            v_period_id, v_staff_id, v_basic_salary, v_total_allowances,
            v_total_deductions, v_gross_pay, v_net_pay, 1
        );
        
        SET v_payroll_line_id = LAST_INSERT_ID();
        
        -- Insert allowance items
        INSERT INTO payroll_items (payroll_line_id, item_type, item_id, item_name, amount, calculation_base, rate)
        SELECT 
            v_payroll_line_id,
            'allowance',
            at.allowance_id,
            at.allowance_name,
            CASE 
                WHEN at.calculation_type = 'fixed' THEN COALESCE(sa.amount, at.default_amount)
                WHEN at.calculation_type = 'percentage' THEN v_basic_salary * (COALESCE(sa.percentage, at.default_percentage) / 100)
                ELSE 0
            END,
            CASE WHEN at.calculation_type = 'percentage' THEN v_basic_salary ELSE NULL END,
            CASE WHEN at.calculation_type = 'percentage' THEN COALESCE(sa.percentage, at.default_percentage) ELSE NULL END
        FROM staff_allowances sa
        JOIN allowance_types at ON sa.allowance_id = at.allowance_id
        WHERE sa.staff_id = v_staff_id 
        AND sa.is_active = 1
        AND at.is_active = 1
        AND sa.effective_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
        AND (sa.end_date IS NULL OR sa.end_date >= CONCAT(p_period_month, '-01'));
        
        -- Insert deduction items
        INSERT INTO payroll_items (payroll_line_id, item_type, item_id, item_name, amount, calculation_base, rate)
        SELECT 
            v_payroll_line_id,
            'deduction',
            dt.deduction_id,
            dt.deduction_name,
            CASE 
                WHEN dt.calculation_type = 'fixed' THEN COALESCE(sd.amount, dt.default_amount)
                WHEN dt.calculation_type = 'percentage' THEN v_basic_salary * (COALESCE(sd.percentage, dt.default_percentage) / 100)
                ELSE 0
            END,
            CASE WHEN dt.calculation_type = 'percentage' THEN v_basic_salary ELSE NULL END,
            CASE WHEN dt.calculation_type = 'percentage' THEN COALESCE(sd.percentage, dt.default_percentage) ELSE NULL END
        FROM staff_deductions sd
        JOIN deduction_types dt ON sd.deduction_id = dt.deduction_id
        WHERE sd.staff_id = v_staff_id 
        AND sd.is_active = 1
        AND dt.is_active = 1
        AND sd.effective_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
        AND (sd.end_date IS NULL OR sd.end_date >= CONCAT(p_period_month, '-01'));
        
        -- Insert loan deduction items
        INSERT INTO payroll_items (payroll_line_id, item_type, item_id, item_name, amount)
        SELECT 
            v_payroll_line_id,
            'loan',
            loan_id,
            CONCAT(loan_type, ' Loan'),
            monthly_deduction
        FROM loans
        WHERE staff_id = v_staff_id 
        AND status = 'active'
        AND start_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
        AND balance_remaining > 0;
        
    END LOOP;
    CLOSE staff_cursor;
    
    -- Update period totals
    UPDATE payroll_periods pp
    SET 
        total_staff = (SELECT COUNT(*) FROM payroll_lines WHERE period_id = v_period_id),
        total_basic_salary = (SELECT COALESCE(SUM(basic_salary), 0) FROM payroll_lines WHERE period_id = v_period_id),
        total_allowances = (SELECT COALESCE(SUM(total_allowances), 0) FROM payroll_lines WHERE period_id = v_period_id),
        total_deductions = (SELECT COALESCE(SUM(total_deductions), 0) FROM payroll_lines WHERE period_id = v_period_id),
        total_net_pay = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_lines WHERE period_id = v_period_id)
    WHERE pp.period_id = v_period_id;
    
    -- Audit log
    INSERT INTO payroll_audit (table_name, record_id, action, new_values, user_id, user_name, notes)
    VALUES ('payroll_periods', v_period_id, 'initiate', JSON_OBJECT('period_month', p_period_month), p_actor_id, 'System', 'Payroll initiated');
    
    COMMIT;
    
    SELECT 'Payroll initiated successfully' as message, v_period_id as period_id;
    
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_approve_payroll(
    IN p_period_month VARCHAR(7),
    IN p_actor_id INT,
    IN p_school_id VARCHAR(10),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_period_id INT;
    DECLARE v_status VARCHAR(20);
    
    -- Get period details
    SELECT period_id, status INTO v_period_id, v_status
    FROM payroll_periods 
    WHERE period_month = p_period_month AND school_id = p_school_id;
    
    -- Check if period exists and is in correct status
    IF v_period_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payroll period not found';
    END IF;
    
    IF v_status NOT IN ('initiated') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payroll cannot be approved in current status';
    END IF;
    
    START TRANSACTION;
    
    -- Update period status
    UPDATE payroll_periods 
    SET 
        status = 'approved',
        approved_by = p_actor_id,
        approved_at = NOW(),
        notes = p_notes
    WHERE period_id = v_period_id;
    
    -- Insert approval record
    INSERT INTO payroll_approvals (period_id, approved_by, approval_status, approval_notes, approved_at)
    VALUES (v_period_id, p_actor_id, 'approved', p_notes, NOW());
    
    -- Update loan balances
    UPDATE loans l
    JOIN payroll_items pi ON l.loan_id = pi.item_id AND pi.item_type = 'loan'
    JOIN payroll_lines pl ON pi.payroll_line_id = pl.payroll_line_id
    SET 
        l.balance_remaining = GREATEST(0, l.balance_remaining - pi.amount),
        l.status = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN 'completed' ELSE 'active' END,
        l.actual_end_date = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN CURDATE() ELSE NULL END
    WHERE pl.period_id = v_period_id;
    
    -- Audit log
    INSERT INTO payroll_audit (table_name, record_id, action, new_values, user_id, user_name, notes)
    VALUES ('payroll_periods', v_period_id, 'approve', JSON_OBJECT('approved_by', p_actor_id, 'notes', p_notes), p_actor_id, 'System', 'Payroll approved');
    
    COMMIT;
    
    SELECT 'Payroll approved successfully' as message, v_period_id as period_id;
    
END //

DELIMITER ;


CREATE VIEW v_payroll_summary AS
SELECT 
    pp.period_id,
    pp.period_month,
    pp.period_year,
    pp.period_month_num,
    pp.status,
    pp.total_staff,
    pp.total_basic_salary,
    pp.total_allowances,
    pp.total_deductions,
    pp.total_net_pay,
    pp.school_id,
    CONCAT(initiator.name) as initiated_by_name,
    pp.initiated_at,
    CONCAT(approver.name) as approved_by_name,
    pp.approved_at,
    pp.notes
FROM payroll_periods pp
LEFT JOIN staff initiator ON pp.initiated_by = initiator.staff_id
LEFT JOIN staff approver ON pp.approved_by = approver.staff_id;

CREATE VIEW v_payroll_staff_breakdown AS
SELECT 
    pl.payroll_line_id,
    pp.period_month,
    pp.period_year,
    pp.status as period_status,
    s.staff_id,
    s.name as staff_name,
    s.email,
    s.mobile_no,
    s.staff_type,
    s.staff_role,
    gl.grade_name,
    gl.grade_code,
    gs.step_number,
    pl.basic_salary,
    pl.total_allowances,
    pl.total_deductions,
    pl.gross_pay,
    pl.net_pay,
    s.account_name,
    s.account_number,
    s.bank,
    s.school_id
FROM payroll_lines pl
JOIN payroll_periods pp ON pl.period_id = pp.period_id
JOIN staff s ON pl.staff_id = s.staff_id
LEFT JOIN grade_levels gl ON s.grade_id = gl.grade_id
LEFT JOIN grade_steps gs ON s.step_id = gs.step_id;


CREATE VIEW v_payroll_items_detail AS
SELECT 
    pi.payroll_item_id,
    pp.period_month,
    s.staff_id,
    s.name as staff_name,
    pi.item_type,
    pi.item_name,
    pi.amount,
    pi.calculation_base,
    pi.rate,
    CASE 
        WHEN pi.item_type = 'allowance' THEN pi.amount
        ELSE 0
    END as allowance_amount,
    CASE 
        WHEN pi.item_type = 'deduction' THEN pi.amount
        ELSE 0
    END as deduction_amount,
    CASE 
        WHEN pi.item_type = 'loan' THEN pi.amount
        ELSE 0
    END as loan_amount
FROM payroll_items pi
JOIN payroll_lines pl ON pi.payroll_line_id = pl.payroll_line_id
JOIN payroll_periods pp ON pl.period_id = pp.period_id
JOIN staff s ON pl.staff_id = s.staff_id;
