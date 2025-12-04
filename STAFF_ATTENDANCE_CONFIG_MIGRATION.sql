-- =====================================================
-- STAFF ATTENDANCE CONFIGURATION SYSTEM
-- =====================================================
-- This migration creates a comprehensive attendance configuration
-- system that supports:
-- - Check-in/Check-out time periods
-- - Overtime rewards (per hour, supports decimals like 0.5)
-- - Late penalties (per hour, supports decimals)
-- - Grace periods
-- - Flexible decimal hour calculations
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- =====================================================
-- 1. CREATE attendance_config TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `attendance_config` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(50) NOT NULL COMMENT 'School identifier',
  `branch_id` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Branch identifier (NULL = school-wide)',

  -- Working Hours Configuration
  `check_in_start` TIME NOT NULL DEFAULT '07:00:00' COMMENT 'Earliest valid check-in time',
  `check_in_end` TIME NOT NULL DEFAULT '09:00:00' COMMENT 'Latest on-time check-in (after = late)',
  `check_out_start` TIME NOT NULL DEFAULT '13:00:00' COMMENT 'Earliest valid check-out time',
  `check_out_end` TIME NOT NULL DEFAULT '17:00:00' COMMENT 'Latest expected check-out time',

  -- Standard Working Hours (for overtime calculation)
  `standard_hours_per_day` DECIMAL(4,2) NOT NULL DEFAULT 8.00 COMMENT 'Standard working hours per day (e.g., 8.00, 6.50)',
  `standard_hours_per_week` DECIMAL(5,2) NOT NULL DEFAULT 40.00 COMMENT 'Standard working hours per week',

  -- Grace Periods (in minutes)
  `late_grace_period` INT(11) NOT NULL DEFAULT 15 COMMENT 'Minutes grace for late (0-15 min late = on time)',
  `early_departure_grace` INT(11) NOT NULL DEFAULT 15 COMMENT 'Minutes grace for early departure',

  -- Overtime Configuration
  `enable_overtime` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Enable overtime tracking',
  `overtime_rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Overtime reward per hour (e.g., 500.00)',
  `overtime_currency` VARCHAR(10) NOT NULL DEFAULT 'NGN' COMMENT 'Currency for overtime (NGN, USD, etc)',
  `overtime_calculation_method` ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'daily'
    COMMENT 'How to calculate overtime: beyond daily hours, weekly hours, or monthly hours',

  -- Late Penalty Configuration
  `enable_late_penalty` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Enable late penalty',
  `late_penalty_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Penalty for late per hour (e.g., 200.00)',
  `late_penalty_currency` VARCHAR(10) NOT NULL DEFAULT 'NGN' COMMENT 'Currency for penalty',
  `late_penalty_method` ENUM('deduction', 'warning', 'both') NOT NULL DEFAULT 'deduction'
    COMMENT 'How to handle lateness: salary deduction, warning only, or both',

  -- Absence Penalty Configuration
  `enable_absence_penalty` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Enable absence penalty',
  `absence_penalty_per_day` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Penalty for absence per day',
  `absence_penalty_currency` VARCHAR(10) NOT NULL DEFAULT 'NGN',

  -- Half-Day Configuration
  `half_day_threshold_hours` DECIMAL(4,2) NOT NULL DEFAULT 4.00 COMMENT 'Hours worked to count as half-day',
  `half_day_penalty` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Penalty for half-day',

  -- Calculation Settings
  `round_overtime_to` ENUM('nearest_15min', 'nearest_30min', 'nearest_hour', 'exact')
    NOT NULL DEFAULT 'nearest_15min' COMMENT 'How to round overtime hours',
  `minimum_overtime_hours` DECIMAL(4,2) NOT NULL DEFAULT 0.25 COMMENT 'Minimum overtime to count (e.g., 0.25 = 15 minutes)',

  -- Status
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Is this configuration active',
  `effective_from` DATE NULL DEFAULT NULL COMMENT 'Configuration effective from date',
  `effective_to` DATE NULL DEFAULT NULL COMMENT 'Configuration effective until date',

  -- Audit
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT(11) NULL DEFAULT NULL COMMENT 'User ID who created',
  `updated_by` INT(11) NULL DEFAULT NULL COMMENT 'User ID who last updated',

  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_unique_config` (`school_id`, `branch_id`, `effective_from`),
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_active` (`is_active`, `effective_from`, `effective_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Staff attendance configuration with overtime rewards and penalties';

-- =====================================================
-- 2. CREATE attendance_penalties TABLE
-- =====================================================
-- Track individual penalty/reward instances

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

  -- Calculation Details
  `hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Hours involved (overtime hours, late hours, etc)',
  `rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Rate per hour at time of calculation',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Total amount (can be negative for penalty)',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NGN',

  -- Status
  `status` ENUM('pending', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `approved_by` INT(11) NULL DEFAULT NULL COMMENT 'User ID who approved',
  `approved_at` DATETIME NULL DEFAULT NULL,
  `paid_at` DATETIME NULL DEFAULT NULL,

  -- Notes
  `remarks` TEXT NULL DEFAULT NULL COMMENT 'Additional notes or reason',
  `calculation_details` JSON NULL DEFAULT NULL COMMENT 'Detailed calculation breakdown',

  -- Audit
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT(11) NULL DEFAULT NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_staff_date` (`staff_id`, `date`),
  INDEX `idx_attendance` (`attendance_id`),
  INDEX `idx_school_branch_date` (`school_id`, `branch_id`, `date`),
  INDEX `idx_type_status` (`type`, `status`),
  INDEX `idx_pending` (`status`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Track penalties and rewards for staff attendance';

-- =====================================================
-- 3. ADD CALCULATED FIELDS TO staff_attendance
-- =====================================================
-- Enhance existing staff_attendance table with calculated fields

ALTER TABLE `staff_attendance`
ADD COLUMN IF NOT EXISTS `hours_worked` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Total hours worked (from check-in to check-out)',
ADD COLUMN IF NOT EXISTS `overtime_hours` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Overtime hours beyond standard',
ADD COLUMN IF NOT EXISTS `late_hours` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Hours late for check-in',
ADD COLUMN IF NOT EXISTS `early_departure_hours` DECIMAL(5,2) NULL DEFAULT NULL
  COMMENT 'Hours left early before check-out time',
ADD COLUMN IF NOT EXISTS `penalty_amount` DECIMAL(10,2) NULL DEFAULT NULL
  COMMENT 'Total penalty amount for this attendance',
ADD COLUMN IF NOT EXISTS `reward_amount` DECIMAL(10,2) NULL DEFAULT NULL
  COMMENT 'Total reward amount for this attendance',
ADD COLUMN IF NOT EXISTS `is_calculated` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Has penalty/reward been calculated',
ADD COLUMN IF NOT EXISTS `calculated_at` DATETIME NULL DEFAULT NULL
  COMMENT 'When calculation was done';

-- Add indexes for performance
ALTER TABLE `staff_attendance`
ADD INDEX IF NOT EXISTS `idx_calculated` (`is_calculated`, `date`),
ADD INDEX IF NOT EXISTS `idx_overtime` (`overtime_hours`),
ADD INDEX IF NOT EXISTS `idx_penalties` (`penalty_amount`, `reward_amount`);

-- =====================================================
-- 4. INSERT DEFAULT CONFIGURATION
-- =====================================================
-- Insert default configuration for existing schools

INSERT INTO `attendance_config` (
  `school_id`,
  `branch_id`,
  `check_in_start`,
  `check_in_end`,
  `check_out_start`,
  `check_out_end`,
  `standard_hours_per_day`,
  `standard_hours_per_week`,
  `late_grace_period`,
  `early_departure_grace`,
  `enable_overtime`,
  `overtime_rate_per_hour`,
  `enable_late_penalty`,
  `late_penalty_per_hour`,
  `enable_absence_penalty`,
  `absence_penalty_per_day`,
  `half_day_threshold_hours`,
  `is_active`,
  `effective_from`
)
SELECT DISTINCT
  school_id,
  NULL as branch_id,  -- School-wide default
  '07:00:00' as check_in_start,
  '09:00:00' as check_in_end,
  '13:00:00' as check_out_start,
  '17:00:00' as check_out_end,
  8.00 as standard_hours_per_day,
  40.00 as standard_hours_per_week,
  15 as late_grace_period,
  15 as early_departure_grace,
  1 as enable_overtime,
  0.00 as overtime_rate_per_hour,  -- To be configured per school
  1 as enable_late_penalty,
  0.00 as late_penalty_per_hour,  -- To be configured per school
  1 as enable_absence_penalty,
  0.00 as absence_penalty_per_day,
  4.00 as half_day_threshold_hours,
  1 as is_active,
  CURDATE() as effective_from
FROM school_setup
WHERE school_id NOT IN (
  SELECT school_id FROM attendance_config WHERE branch_id IS NULL
);

-- =====================================================
-- 5. CREATE HELPER VIEWS
-- =====================================================

-- View: Active Attendance Configuration
CREATE OR REPLACE VIEW `v_active_attendance_config` AS
SELECT
  ac.*,
  ss.school_name,
  sl.branch_name,
  sl.location as branch_location
FROM attendance_config ac
LEFT JOIN school_setup ss ON ac.school_id = ss.school_id
LEFT JOIN school_locations sl ON ac.branch_id = sl.branch_id
WHERE ac.is_active = 1
  AND (ac.effective_from IS NULL OR ac.effective_from <= CURDATE())
  AND (ac.effective_to IS NULL OR ac.effective_to >= CURDATE());

-- View: Pending Penalties and Rewards
CREATE OR REPLACE VIEW `v_pending_penalties` AS
SELECT
  ap.*,
  t.name as staff_name,
  t.email as staff_email,
  sa.date as attendance_date,
  sa.check_in_time,
  sa.check_out_time,
  sa.status as attendance_status
FROM attendance_penalties ap
LEFT JOIN teachers t ON ap.staff_id = t.id
LEFT JOIN staff_attendance sa ON ap.attendance_id = sa.id
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
  ac.standard_hours_per_day,
  ac.overtime_rate_per_hour,
  ac.late_penalty_per_hour,
  -- Calculate if overtime/penalty applies
  CASE
    WHEN sa.hours_worked > ac.standard_hours_per_day THEN sa.hours_worked - ac.standard_hours_per_day
    ELSE 0
  END as calculated_overtime,
  CASE
    WHEN sa.late_hours > 0 THEN sa.late_hours * ac.late_penalty_per_hour
    ELSE 0
  END as calculated_late_penalty,
  CASE
    WHEN sa.overtime_hours > 0 THEN sa.overtime_hours * ac.overtime_rate_per_hour
    ELSE 0
  END as calculated_overtime_reward
FROM staff_attendance sa
LEFT JOIN teachers t ON sa.staff_id = t.id
LEFT JOIN attendance_config ac ON sa.school_id = ac.school_id
  AND (ac.branch_id IS NULL OR ac.branch_id = sa.branch_id)
  AND ac.is_active = 1
  AND (ac.effective_from IS NULL OR ac.effective_from <= sa.date)
  AND (ac.effective_to IS NULL OR ac.effective_to >= sa.date);

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SHOW TABLES LIKE 'attendance_%';

-- Check attendance_config structure
DESCRIBE attendance_config;

-- Check attendance_penalties structure
DESCRIBE attendance_penalties;

-- Check enhanced staff_attendance columns
SHOW COLUMNS FROM staff_attendance LIKE '%hours%';
SHOW COLUMNS FROM staff_attendance LIKE '%penalty%';
SHOW COLUMNS FROM staff_attendance LIKE '%reward%';

-- Check default configurations
SELECT
  school_id,
  branch_id,
  check_in_start,
  check_in_end,
  standard_hours_per_day,
  overtime_rate_per_hour,
  late_penalty_per_hour,
  is_active
FROM attendance_config
LIMIT 5;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Configure overtime rates and penalties per school
-- 2. Set up attendance calculation cron job
-- 3. Test with sample attendance records
-- 4. Create reports for penalties and rewards
-- =====================================================
