-- ============================================
-- Migration: Add Backdated Attendance Control
-- Table: school_setup
-- Date: 2025-01-06
-- Description: Adds columns to control teacher's ability to edit past attendance records
-- ============================================

-- Add columns for backdated attendance control
ALTER TABLE `school_locations`
ADD COLUMN `allow_backdated_attendance` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Allow teachers to edit past attendance: 0=Disabled (only today), 1=Enabled'
  AFTER `email`,
ADD COLUMN `backdated_days` SMALLINT UNSIGNED NOT NULL DEFAULT 7
  COMMENT 'Number of days teachers can go back to edit attendance (1-365 days). Examples: 7=1 week, 42=6 weeks, 90=3 months, 180=6 months'
  AFTER `allow_backdated_attendance`;

-- Add index for faster queries on settings
CREATE INDEX `idx_backdated_settings` ON `school_locations`(`school_id`, `branch_id`, `allow_backdated_attendance`);

-- Update existing records with default values (disabled by default for security)
UPDATE `school_locations`
SET
  `allow_backdated_attendance` = 0,
  `backdated_days` = 7
WHERE `allow_backdated_attendance` IS NULL;

-- ============================================
-- HOW IT WORKS:
-- ============================================
-- When allow_backdated_attendance = 0:
--   - Teachers can ONLY mark attendance for TODAY
--   - All past dates are locked and show lock icon
--   - Click on past date shows: "Backdated attendance editing is disabled"
--
-- When allow_backdated_attendance = 1:
--   - Teachers can mark attendance for TODAY + past N days (where N = backdated_days)
--   - Examples:
--     * backdated_days = 7  → Last 1 week (7 days)
--     * backdated_days = 14 → Last 2 weeks (14 days)
--     * backdated_days = 30 → Last 1 month (30 days)
--     * backdated_days = 42 → Last 6 weeks (42 days)
--     * backdated_days = 90 → Last 3 months (90 days)
--     * backdated_days = 180 → Last 6 months (180 days)
--   - Dates older than N days are locked
--   - Click on too-old date shows: "You can only edit attendance for the past N days"
--
-- Future dates are ALWAYS locked regardless of settings
-- Maximum allowed: 365 days (1 year)
-- ============================================

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Example 1: Enable 1 week backdating (common scenario)
-- UPDATE `school_setup`
-- SET `allow_backdated_attendance` = 1, `backdated_days` = 7
-- WHERE `school_id` = 'SCH/1' AND `branch_id` = 'BRCH00001';

-- Example 2: Enable 6 weeks backdating (for schools catching up)
-- UPDATE `school_setup`
-- SET `allow_backdated_attendance` = 1, `backdated_days` = 42
-- WHERE `school_id` = 'SCH/1' AND `branch_id` = 'BRCH00001';

-- Example 3: Enable 3 months backdating (for term data entry)
-- UPDATE `school_setup`
-- SET `allow_backdated_attendance` = 1, `backdated_days` = 90
-- WHERE `school_id` = 'SCH/1' AND `branch_id` = 'BRCH00001';

-- Example 4: Enable 6 months backdating (for historical data)
-- UPDATE `school_setup`
-- SET `allow_backdated_attendance` = 1, `backdated_days` = 180
-- WHERE `school_id` = 'SCH/1' AND `branch_id` = 'BRCH00001';

-- Example 5: Disable backdating (strict attendance policy)
-- UPDATE `school_setup`
-- SET `allow_backdated_attendance` = 0
-- WHERE `school_id` = 'SCH/1' AND `branch_id` = 'BRCH00001';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To undo this migration, run:
-- DROP INDEX `idx_backdated_settings` ON `school_setup`;
-- ALTER TABLE `school_setup`
-- DROP COLUMN `allow_backdated_attendance`,
-- DROP COLUMN `backdated_days`;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check if columns were added successfully
-- SELECT
--   COLUMN_NAME,
--   COLUMN_TYPE,
--   COLUMN_DEFAULT,
--   COLUMN_COMMENT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'school_setup'
-- AND COLUMN_NAME IN ('allow_backdated_attendance', 'backdated_days');

-- View all school settings with backdated configurationx
-- SELECT
--   school_id,
--   branch_id,
--   school_name,
--   allow_backdated_attendance,
--   backdated_days,
--   CASE
--     WHEN allow_backdated_attendance = 1 THEN CONCAT('Enabled (', backdated_days, ' days)')
--     ELSE 'Disabled (Today only)'
--   END AS attendance_policy
-- FROM school_setup;

DELIMITER $$

CREATE PROCEDURE `attendance_setup`(
  IN action VARCHAR(50),
    IN p_school_id VARCHAR(50),
    IN p_branch_id VARCHAR(50),
    IN p_allow_backdated_attendance TINYINT,
    IN p_backdated_days SMALLINT
)
BEGIN
    IF action = 'UPDATE' THEN
      UPDATE `school_locations`
      SET
          `allow_backdated_attendance` = p_allow_backdated_attendance,
          `backdated_days` = p_backdated_days
      WHERE
          `school_id` = p_school_id AND
          `branch_id` = p_branch_id;
    ELSEIF action = 'SELECT' THEN
      SELECT
          `allow_backdated_attendance`,
          `backdated_days`
      FROM `school_locations`
      WHERE
          `school_id` = p_school_id AND
          `branch_id` = p_branch_id;
    END IF;
END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `GetAcademicWeeksByDateRange`$$
CREATE PROCEDURE `GetAcademicWeeksByDateRange`(
    IN `p_start_date` DATE,
    IN `p_end_date` DATE,
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(50)
)
BEGIN
  SELECT 
    aw.id AS week_id,
    aw.week_number,
    aw.begin_date,
    aw.end_date,

    -- Generate day letters (U for Sunday, otherwise first letter of weekday)
    CONCAT_WS('|',
      CASE WHEN DAYNAME(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 1 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 1 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 2 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 2 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 3 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 3 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 4 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 4 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 5 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 5 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 6 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 6 DAY)), 1) END
    ) AS day_letters,

    -- Generate day numbers
    CONCAT_WS('|',
      DAY(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY))
    ) AS day_numbers,

    -- Generate full date list
    CONCAT_WS('|',
      DATE_FORMAT(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY), '%Y-%m-%d')
    ) AS full_dates

  FROM academic_weeks aw
  WHERE aw.status = 'Active'
    AND aw.school_id = p_school_id
    AND aw.branch_id = p_branch_id
    AND aw.begin_date <= p_end_date
    AND aw.end_date >= p_start_date
  ORDER BY aw.begin_date;
END$$

DROP PROCEDURE IF EXISTS `GetAttendanceByDateRange`$$
CREATE PROCEDURE `GetAttendanceByDateRange`(
    IN `p_class_code` VARCHAR(20),
    IN `p_start_date` DATE,
    IN `p_end_date` DATE
)
BEGIN
  SELECT 
    ar.admission_no,
    s.student_name,
    s.admission_no,
    ar.attendance_date,
    ar.day_of_week,
    ar.status,
    ar.notes,
    ar.marked_at,
    aw.week_number,
    aw.begin_date AS week_start,
    aw.end_date AS week_end
  FROM attendance_records ar
  JOIN students s ON ar.admission_no = s.admission_no
  JOIN academic_weeks aw ON ar.academic_week_id = aw.id
  WHERE ar.class_code = p_class_code
    AND ar.attendance_date BETWEEN p_start_date AND p_end_date
  ORDER BY s.student_name, ar.attendance_date;
END$$

DELIMITER $$
DROP PROCEDURE `SubmitAttendance`$$
CREATE  PROCEDURE `SubmitAttendance`(
  IN `p_class_code` VARCHAR(20),
  IN `p_academic_week_id` INT,
  IN `p_attendance_date` DATE,
  IN `p_day_of_week` TINYINT,
  IN `p_marked_by` VARCHAR(20),
  IN `p_attendance_data` JSON,
  IN `p_branch_id` VARCHAR(50),
  IN `p_school_id` VARCHAR(50)
)
BEGIN
  DECLARE v_admission_no VARCHAR(20);
  DECLARE v_status VARCHAR(10);
  DECLARE v_notes TEXT;
  DECLARE i INT DEFAULT 0;
  DECLARE array_length INT;

  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SET array_length = JSON_LENGTH(p_attendance_data);

  WHILE i < array_length DO
    SET v_admission_no = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].admission_no')));
    SET v_status = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].status')));
    SET v_notes = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].notes')));

    INSERT INTO attendance_records (
      admission_no, class_code, academic_week_id, attendance_date,
      day_of_week, status, marked_by, notes, branch_id, school_id
    ) VALUES (
      v_admission_no, p_class_code, p_academic_week_id, p_attendance_date,
      p_day_of_week, v_status, p_marked_by, v_notes, p_branch_id, p_school_id
    )
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      marked_by = VALUES(marked_by),
      notes = VALUES(notes),
      marked_at = CURRENT_TIMESTAMP;

    SET i = i + 1;
  END WHILE;

  COMMIT;

  -- ✅ Call summary AFTER commit (reduces deadlock risk)
  CALL UpdateAttendanceSummary(
    p_class_code,
    YEAR(p_attendance_date),
    MONTH(p_attendance_date)
  );

  SELECT 'Attendance submitted successfully' AS message, array_length AS records_processed;
END$$

DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetAttendanceByDateRange`(
    IN `p_class_code` VARCHAR(20),
    IN `p_start_date` DATE,
    IN `p_end_date` DATE
)
BEGIN
  SELECT 
    ar.admission_no,
    s.student_name,
    s.admission_no,
    ar.attendance_date,
    ar.day_of_week,
    ar.status,
    ar.notes,
    ar.marked_at,
    aw.week_number,
    aw.begin_date AS week_start,
    aw.end_date AS week_end
  FROM attendance_records ar
  JOIN students s ON ar.admission_no = s.admission_no
  JOIN academic_weeks aw ON ar.academic_week_id = aw.id
  WHERE ar.class_code = p_class_code
    AND ar.attendance_date BETWEEN p_start_date AND p_end_date
  ORDER BY s.student_name, ar.attendance_date;
END$$
DELIMITER ;