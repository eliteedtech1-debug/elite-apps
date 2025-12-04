-- =====================================================
-- STAFF ATTENDANCE CONFIGURATION IN BRANCH TABLE
-- =====================================================
-- This migration adds attendance configuration columns
-- directly to the school_locations (branch) table:
-- - Check-in/Check-out time periods
-- - Overtime rewards (per hour, supports decimals like 0.5)
-- - Late penalties (per hour, supports decimals)
-- - Grace periods
-- - Flexible decimal hour calculations
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- =====================================================
-- 1. ADD ATTENDANCE CONFIG COLUMNS TO school_locations
-- =====================================================

ALTER TABLE `school_locations`

-- Working Hours Configuration
ADD COLUMN IF NOT EXISTS `check_in_start` TIME NOT NULL DEFAULT '07:00:00'
  COMMENT 'Earliest valid check-in time',
ADD COLUMN IF NOT EXISTS `check_in_end` TIME NOT NULL DEFAULT '09:00:00'
  COMMENT 'Latest on-time check-in (after this = late)',
ADD COLUMN IF NOT EXISTS `check_out_start` TIME NOT NULL DEFAULT '13:00:00'
  COMMENT 'Earliest valid check-out time',
ADD COLUMN IF NOT EXISTS `check_out_end` TIME NOT NULL DEFAULT '17:00:00'
  COMMENT 'Latest expected check-out time',

-- Standard Working Hours (for overtime calculation)
ADD COLUMN IF NOT EXISTS `standard_hours_per_day` DECIMAL(4,2) NOT NULL DEFAULT 8.00
  COMMENT 'Standard working hours per day (e.g., 8.00, 6.50, 5.75)',
ADD COLUMN IF NOT EXISTS `standard_hours_per_week` DECIMAL(5,2) NOT NULL DEFAULT 40.00
  COMMENT 'Standard working hours per week',

-- Grace Periods (in minutes)
ADD COLUMN IF NOT EXISTS `late_grace_period` INT(11) NOT NULL DEFAULT 15
  COMMENT 'Minutes grace for late (e.g., 0-15 min late = still on time)',
ADD COLUMN IF NOT EXISTS `early_departure_grace` INT(11) NOT NULL DEFAULT 15
  COMMENT 'Minutes grace for early departure',

-- Overtime Configuration
ADD COLUMN IF NOT EXISTS `enable_overtime` TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Enable overtime tracking: 1=yes, 0=no',
ADD COLUMN IF NOT EXISTS `overtime_rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Overtime reward amount per hour (supports decimals: 0.5hr = half rate)',
ADD COLUMN IF NOT EXISTS `overtime_currency` VARCHAR(10) NOT NULL DEFAULT 'NGN'
  COMMENT 'Currency for overtime (NGN, USD, GHS, etc)',
ADD COLUMN IF NOT EXISTS `overtime_calculation_method` ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'daily'
  COMMENT 'Calculate overtime: beyond daily hours, weekly hours, or monthly hours',

-- Late Penalty Configuration
ADD COLUMN IF NOT EXISTS `enable_late_penalty` TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Enable late penalty: 1=yes, 0=no',
ADD COLUMN IF NOT EXISTS `late_penalty_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Penalty amount for being late per hour (supports decimals: 0.5hr = half penalty)',
ADD COLUMN IF NOT EXISTS `late_penalty_currency` VARCHAR(10) NOT NULL DEFAULT 'NGN'
  COMMENT 'Currency for late penalty',
ADD COLUMN IF NOT EXISTS `late_penalty_method` ENUM('deduction', 'warning', 'both') NOT NULL DEFAULT 'deduction'
  COMMENT 'How to handle lateness: salary deduction, warning only, or both',

-- Absence Penalty Configuration
ADD COLUMN IF NOT EXISTS `enable_absence_penalty` TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Enable absence penalty: 1=yes, 0=no',
ADD COLUMN IF NOT EXISTS `absence_penalty_per_day` DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Penalty amount for full day absence',
ADD COLUMN IF NOT EXISTS `absence_penalty_currency` VARCHAR(10) NOT NULL DEFAULT 'NGN',

-- Half-Day Configuration
ADD COLUMN IF NOT EXISTS `half_day_threshold_hours` DECIMAL(4,2) NOT NULL DEFAULT 4.00
  COMMENT 'Minimum hours worked to count as half-day (e.g., 4.00, 3.50)',
ADD COLUMN IF NOT EXISTS `half_day_penalty` DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Penalty amount for half-day (less than full day but more than threshold)',

-- Calculation Settings
ADD COLUMN IF NOT EXISTS `round_overtime_to` ENUM('nearest_15min', 'nearest_30min', 'nearest_hour', 'exact')
  NOT NULL DEFAULT 'nearest_15min'
  COMMENT 'How to round overtime hours: 15min=0.25hr, 30min=0.50hr, etc',
ADD COLUMN IF NOT EXISTS `minimum_overtime_hours` DECIMAL(4,2) NOT NULL DEFAULT 0.25
  COMMENT 'Minimum overtime to count (e.g., 0.25=15min, 0.50=30min, 1.00=1hr)',

-- Auto-calculation
ADD COLUMN IF NOT EXISTS `auto_calculate_penalties` TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Automatically calculate penalties and rewards: 1=yes, 0=manual only';

-- Add indexes for performance
ALTER TABLE `school_locations`
ADD INDEX IF NOT EXISTS `idx_working_hours` (`check_in_start`, `check_in_end`, `check_out_start`, `check_out_end`),
ADD INDEX IF NOT EXISTS `idx_overtime_enabled` (`enable_overtime`, `overtime_rate_per_hour`),
ADD INDEX IF NOT EXISTS `idx_penalty_enabled` (`enable_late_penalty`, `late_penalty_per_hour`);

-- =====================================================
-- 2. CREATE attendance_penalties TABLE
-- =====================================================
-- Track individual penalty/reward instances calculated from attendance

CREATE TABLE IF NOT EXISTS `attendance_penalties` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staff_id` VARCHAR(50) NOT NULL COMMENT 'References teachers.id',
  `attendance_id` INT(11) NOT NULL COMMENT 'References staff_attendance.id',
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL DEFAULT NULL,
  `date` DATE NOT NULL,

  -- Penalty/Reward Type
  `type` ENUM('overtime_reward', 'late_penalty', 'absence_penalty', 'half_day_penalty', 'manual_adjustment')
    NOT NULL COMMENT 'Type of penalty or reward',

  -- Calculation Details (supports decimal hours like 0.5, 1.75, etc)
  `hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00
    COMMENT 'Hours involved - supports decimals (e.g., 0.5=30min, 1.75=1hr45min)',
  `rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Rate per hour at time of calculation',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Total amount = hours × rate (can be negative for penalty)',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NGN',

  -- Status Workflow
  `status` ENUM('pending', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `approved_by` INT(11) NULL DEFAULT NULL COMMENT 'User ID who approved',
  `approved_at` DATETIME NULL DEFAULT NULL,
  `paid_at` DATETIME NULL DEFAULT NULL,
  `payment_reference` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Payment reference/transaction ID',

  -- Notes
  `remarks` TEXT NULL DEFAULT NULL COMMENT 'Additional notes or reason',
  `calculation_details` JSON NULL DEFAULT NULL COMMENT 'Detailed calculation breakdown as JSON',

  -- Audit
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT(11) NULL DEFAULT NULL COMMENT 'User who created this record',

  PRIMARY KEY (`id`),
  INDEX `idx_staff_date` (`staff_id`, `date`),
  INDEX `idx_attendance` (`attendance_id`),
  INDEX `idx_school_branch_date` (`school_id`, `branch_id`, `date`),
  INDEX `idx_type_status` (`type`, `status`),
  INDEX `idx_pending_approval` (`status`, `date`) COMMENT 'Find pending items quickly',
  INDEX `idx_approved_unpaid` (`status`, `paid_at`) COMMENT 'Find approved but unpaid items'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Track penalties and rewards for staff attendance (supports decimal hours)';

-- =====================================================
-- 3. ENHANCE staff_attendance TABLE
-- =====================================================
-- Add calculated fields to track hours, penalties, and rewards

ALTER TABLE `staff_attendance`
ADD COLUMN IF NOT EXISTS `hours_worked` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Total hours worked (check-out minus check-in, supports decimals)',
ADD COLUMN IF NOT EXISTS `overtime_hours` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Overtime hours beyond standard (e.g., 0.5, 1.25, 2.75)',
ADD COLUMN IF NOT EXISTS `late_hours` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Hours late for check-in (e.g., 0.25=15min, 0.50=30min)',
ADD COLUMN IF NOT EXISTS `early_departure_hours` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Hours left early before check-out time',
ADD COLUMN IF NOT EXISTS `penalty_amount` DECIMAL(10,2) NULL DEFAULT NULL
  COMMENT 'Total penalty amount for this attendance',
ADD COLUMN IF NOT EXISTS `reward_amount` DECIMAL(10,2) NULL DEFAULT NULL
  COMMENT 'Total reward amount for this attendance',
ADD COLUMN IF NOT EXISTS `net_amount` DECIMAL(10,2) NULL DEFAULT NULL
  COMMENT 'Net amount = reward_amount - penalty_amount',
ADD COLUMN IF NOT EXISTS `is_calculated` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Has penalty/reward been calculated: 1=yes, 0=no',
ADD COLUMN IF NOT EXISTS `calculated_at` DATETIME NULL DEFAULT NULL
  COMMENT 'When calculation was done',
ADD COLUMN IF NOT EXISTS `calculation_note` TEXT NULL DEFAULT NULL
  COMMENT 'Notes about the calculation';

-- Add indexes for performance
ALTER TABLE `staff_attendance`
ADD INDEX IF NOT EXISTS `idx_calculated` (`is_calculated`, `date`),
ADD INDEX IF NOT EXISTS `idx_hours_worked` (`hours_worked`),
ADD INDEX IF NOT EXISTS `idx_overtime` (`overtime_hours`),
ADD INDEX IF NOT EXISTS `idx_late` (`late_hours`),
ADD INDEX IF NOT EXISTS `idx_amounts` (`penalty_amount`, `reward_amount`, `net_amount`);

-- =====================================================
-- 4. SET DEFAULT VALUES FOR EXISTING BRANCHES
-- =====================================================
-- Set reasonable defaults for existing branches

UPDATE `school_locations`
SET
  `check_in_start` = '07:00:00',
  `check_in_end` = '09:00:00',
  `check_out_start` = '13:00:00',
  `check_out_end` = '17:00:00',
  `standard_hours_per_day` = 8.00,
  `standard_hours_per_week` = 40.00,
  `late_grace_period` = 15,
  `early_departure_grace` = 15,
  `enable_overtime` = 1,
  `overtime_rate_per_hour` = 0.00,  -- School admin should configure
  `overtime_currency` = 'NGN',
  `overtime_calculation_method` = 'daily',
  `enable_late_penalty` = 1,
  `late_penalty_per_hour` = 0.00,  -- School admin should configure
  `late_penalty_currency` = 'NGN',
  `late_penalty_method` = 'deduction',
  `enable_absence_penalty` = 1,
  `absence_penalty_per_day` = 0.00,  -- School admin should configure
  `absence_penalty_currency` = 'NGN',
  `half_day_threshold_hours` = 4.00,
  `half_day_penalty` = 0.00,
  `round_overtime_to` = 'nearest_15min',
  `minimum_overtime_hours` = 0.25,
  `auto_calculate_penalties` = 1
WHERE check_in_start IS NULL;  -- Only update if not already set

-- =====================================================
-- 5. CREATE HELPER VIEWS FOR REPORTING
-- =====================================================

-- View: Branch Attendance Configuration
CREATE OR REPLACE VIEW `v_branch_attendance_config` AS
SELECT
  sl.school_id,
  sl.branch_id,
  sl.branch_name,
  sl.location,
  ss.school_name,

  -- Working Hours
  sl.check_in_start,
  sl.check_in_end,
  sl.check_out_start,
  sl.check_out_end,
  sl.standard_hours_per_day,
  sl.standard_hours_per_week,

  -- Grace Periods
  sl.late_grace_period,
  sl.early_departure_grace,

  -- Overtime
  sl.enable_overtime,
  sl.overtime_rate_per_hour,
  sl.overtime_currency,
  sl.overtime_calculation_method,

  -- Late Penalty
  sl.enable_late_penalty,
  sl.late_penalty_per_hour,
  sl.late_penalty_currency,
  sl.late_penalty_method,

  -- Absence Penalty
  sl.enable_absence_penalty,
  sl.absence_penalty_per_day,
  sl.absence_penalty_currency,

  -- Half-Day
  sl.half_day_threshold_hours,
  sl.half_day_penalty,

  -- Calculation Settings
  sl.round_overtime_to,
  sl.minimum_overtime_hours,
  sl.auto_calculate_penalties
FROM school_locations sl
JOIN school_setup ss ON sl.school_id = ss.school_id
WHERE sl.status = 'Active';

-- View: Pending Penalties and Rewards
CREATE OR REPLACE VIEW `v_pending_penalties` AS
SELECT
  ap.*,
  t.name as staff_name,
  t.email as staff_email,
  t.staff_role,
  sa.date as attendance_date,
  sa.check_in_time,
  sa.check_out_time,
  sa.status as attendance_status,
  sa.hours_worked,
  sl.branch_name,
  CASE
    WHEN ap.amount > 0 THEN 'REWARD'
    WHEN ap.amount < 0 THEN 'PENALTY'
    ELSE 'NEUTRAL'
  END as transaction_type
FROM attendance_penalties ap
LEFT JOIN teachers t ON ap.staff_id = t.id
LEFT JOIN staff_attendance sa ON ap.attendance_id = sa.id
LEFT JOIN school_locations sl ON ap.branch_id = sl.branch_id
WHERE ap.status = 'pending'
ORDER BY ap.date DESC, ap.created_at DESC;

-- View: Staff Attendance with Calculations
CREATE OR REPLACE VIEW `v_staff_attendance_detailed` AS
SELECT
  sa.*,
  t.name as staff_name,
  t.email as staff_email,
  t.staff_role,
  t.staff_type,
  sl.branch_name,

  -- Configuration from branch
  sl.standard_hours_per_day,
  sl.overtime_rate_per_hour,
  sl.late_penalty_per_hour,
  sl.check_in_start,
  sl.check_in_end,
  sl.check_out_start,
  sl.check_out_end,

  -- Calculated fields (if not already calculated)
  CASE
    WHEN sa.check_out_time IS NOT NULL AND sa.check_in_time IS NOT NULL
    THEN ROUND(TIMESTAMPDIFF(MINUTE, sa.check_in_time, sa.check_out_time) / 60, 2)
    ELSE NULL
  END as calculated_hours_worked,

  CASE
    WHEN sa.hours_worked > sl.standard_hours_per_day
    THEN ROUND(sa.hours_worked - sl.standard_hours_per_day, 2)
    ELSE 0.00
  END as calculated_overtime,

  CASE
    WHEN sa.late_hours > 0 THEN ROUND(sa.late_hours * sl.late_penalty_per_hour, 2)
    ELSE 0.00
  END as calculated_late_penalty,

  CASE
    WHEN sa.overtime_hours > 0 THEN ROUND(sa.overtime_hours * sl.overtime_rate_per_hour, 2)
    ELSE 0.00
  END as calculated_overtime_reward
FROM staff_attendance sa
LEFT JOIN teachers t ON sa.staff_id = t.id
LEFT JOIN school_locations sl ON sa.school_id = sl.school_id AND sa.branch_id = sl.branch_id
WHERE sl.status = 'Active';

-- View: Monthly Penalty/Reward Summary per Staff
CREATE OR REPLACE VIEW `v_staff_monthly_penalty_summary` AS
SELECT
  ap.school_id,
  ap.branch_id,
  ap.staff_id,
  t.name as staff_name,
  YEAR(ap.date) as year,
  MONTH(ap.date) as month,
  DATE_FORMAT(ap.date, '%Y-%m') as year_month,

  -- Counts
  COUNT(*) as total_transactions,
  SUM(CASE WHEN ap.type = 'overtime_reward' THEN 1 ELSE 0 END) as overtime_count,
  SUM(CASE WHEN ap.type = 'late_penalty' THEN 1 ELSE 0 END) as late_count,
  SUM(CASE WHEN ap.type = 'absence_penalty' THEN 1 ELSE 0 END) as absence_count,

  -- Hours
  SUM(CASE WHEN ap.type = 'overtime_reward' THEN ap.hours ELSE 0 END) as total_overtime_hours,
  SUM(CASE WHEN ap.type = 'late_penalty' THEN ap.hours ELSE 0 END) as total_late_hours,

  -- Amounts
  SUM(CASE WHEN ap.type = 'overtime_reward' THEN ap.amount ELSE 0 END) as total_rewards,
  SUM(CASE WHEN ap.type LIKE '%penalty%' THEN ABS(ap.amount) ELSE 0 END) as total_penalties,
  SUM(ap.amount) as net_amount,

  -- Status
  SUM(CASE WHEN ap.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN ap.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN ap.status = 'paid' THEN 1 ELSE 0 END) as paid_count,

  ap.currency
FROM attendance_penalties ap
LEFT JOIN teachers t ON ap.staff_id = t.id
GROUP BY ap.school_id, ap.branch_id, ap.staff_id, YEAR(ap.date), MONTH(ap.date), ap.currency
ORDER BY year DESC, month DESC, staff_name;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Check new columns in school_locations
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'school_locations'
  AND COLUMN_NAME LIKE '%check%'
     OR COLUMN_NAME LIKE '%overtime%'
     OR COLUMN_NAME LIKE '%penalty%'
     OR COLUMN_NAME LIKE '%standard_hours%'
ORDER BY ORDINAL_POSITION;

-- Check attendance_penalties table
DESCRIBE attendance_penalties;

-- Check enhanced staff_attendance columns
SHOW COLUMNS FROM staff_attendance WHERE Field LIKE '%hours%' OR Field LIKE '%penalty%' OR Field LIKE '%reward%';

-- Sample branch configuration
SELECT
  branch_id,
  branch_name,
  check_in_start,
  check_in_end,
  check_out_start,
  check_out_end,
  standard_hours_per_day,
  overtime_rate_per_hour,
  late_penalty_per_hour,
  enable_overtime,
  enable_late_penalty
FROM school_locations
WHERE status = 'Active'
LIMIT 5;

-- =====================================================
-- EXAMPLE: How to Calculate Overtime/Penalty
-- =====================================================

/*
EXAMPLE CALCULATION:

Staff Details:
- Check-in: 08:00 (on time, check_in_end is 09:00)
- Check-out: 18:30
- Standard hours: 8.00
- Overtime rate: 500.00 per hour

Calculation:
1. Hours worked = 18:30 - 08:00 = 10.5 hours
2. Overtime = 10.5 - 8.0 = 2.5 hours
3. Overtime reward = 2.5 × 500 = 1,250.00

If Late:
- Check-in: 09:30 (30 minutes late after 09:00 check_in_end)
- Late hours = 0.5 hours
- Late penalty = 0.5 × 200 = 100.00

Net Amount = Overtime Reward - Late Penalty = 1,250 - 100 = 1,150.00
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Configure overtime rates and penalties per branch in UI
-- 2. Implement backend calculation logic
-- 3. Create frontend attendance configuration page
-- 4. Test with sample attendance records
-- 5. Generate penalty/reward reports
-- =====================================================
