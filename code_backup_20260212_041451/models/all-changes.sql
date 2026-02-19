-- Every body's changes to be paste here with dates

-- ============================== 26 july 2025

DROP TABLE IF EXISTS `Academic_weeks`;
CREATE TABLE `Academic_weeks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `academic_year` varchar(50) NOT NULL,
  `term` varchar(20) NOT NULL,
  `weeks` varchar(10) NOT NULL,
  `begin` date NOT NULL,
  `end` date NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `academic_calendar`;
CREATE TABLE `academic_calendar` (
  `academic_year` varchar(50) NOT NULL,
  `term` varchar(50) NOT NULL,
  `begin_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `total_weeks` int(14) NOT NULL,
  `school_id` varchar(50) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`academic_year`,`term`,`school_id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `idx_school_term_year` (`school_id`,`term`,`academic_year`),
  KEY `fk_section_id` (`id`),
  KEY `school_id` (`school_id`),
  CONSTRAINT `school_id_fk` FOREIGN KEY (`school_id`) REFERENCES `school_setup` (`school_id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_c

DROP PROCEDURE IF EXISTS `generate_academic_weeks`$$
DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `generate_academic_weeks`(
  IN p_academic_year VARCHAR(50),
  IN p_term VARCHAR(20),
  IN p_begin_date DATE,
  IN p_end_date DATE
)
BEGIN
  DECLARE start_date DATE;
  DECLARE end_date DATE;
  DECLARE week_num INT DEFAULT 1;

  DELETE FROM Academic_weeks 
  WHERE academic_year = p_academic_year AND term = p_term;

  SET start_date = p_begin_date;

  WHILE start_date <= p_end_date DO
    SET end_date = LEAST(DATE_ADD(start_date, INTERVAL 6 DAY), p_end_date);

    INSERT INTO Academic_weeks (academic_year, term, weeks, begin, end)
    VALUES (p_academic_year, p_term, CONCAT('Week ', week_num), start_date, end_date);

    SET start_date = DATE_ADD(end_date, INTERVAL 1 DAY);
    SET week_num = week_num + 1;
  END WHILE;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `academic_year`$$
DELIMITER $$
CREATE  PROCEDURE `academic_year`(IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_year` VARCHAR(50), IN `in_begin_date` VARCHAR(50), IN `in_end_date` VARCHAR(50), IN `in_status` VARCHAR(20), IN `in_total_weeks` INT(14))
BEGIN
  DECLARE v_begin DATE;
  DECLARE v_end DATE;

  -- Convert input strings to dates
  SET v_begin = DATE(in_begin_date);
  SET v_end = DATE(in_end_date);

  IF in_query_type = 'create' THEN

    INSERT INTO `academic_calendar` (
      `academic_year`, `term`, `begin_date`, `end_date`, `status`, `school_id`, `total_weeks`
    ) VALUES (
      in_year, in_term, v_begin, v_end, 'Inactive', in_school_id, in_total_weeks
    )
    ON DUPLICATE KEY UPDATE
      `begin_date` = VALUES(`begin_date`),
      `end_date` = VALUES(`end_date`),
      `total_weeks` = VALUES(`total_weeks`);

    
    CALL generate_academic_weeks(in_year, in_term, v_begin, v_end);


  ELSEIF in_query_type = 'select' THEN

    SELECT * FROM academic_calendar WHERE school_id = in_school_id;


  ELSEIF in_query_type = 'selectByid' THEN

    SELECT * FROM academic_calendar WHERE school_id = in_school_id;


  ELSEIF in_query_type = 'update-status' THEN

    IF in_status = 'Active' THEN
      UPDATE academic_calendar SET status = 'Inactive' WHERE school_id = in_school_id;
    END IF;
    UPDATE academic_calendar SET status = in_status WHERE id = in_id;

 ELSEIF in_query_type = 'delete' THEN
  DELETE FROM academic_calendar 
  WHERE academic_year = in_year AND term = in_term;
  DELETE FROM Academic_weeks 
  WHERE academic_year = in_year AND term = in_term;
 
 
  ELSEIF in_query_type = 'update' THEN

    UPDATE `academic_calendar`
    SET 
      `academic_year` = in_year,
      `term` = in_term,
      `begin_date` = v_begin,
      `end_date` = v_end,
      `total_weeks` = in_total_weeks
    WHERE id = in_id;

   
    CALL generate_academic_weeks(in_year, in_term, v_begin, v_end);

  END IF;

END$$
DELIMITER ;

-- ===============end of 26 july 2025 changes


-- Ishaq 26/7/2025
ALTER TABLE `class_role` DROP `id`;
ALTER TABLE `class_role` ADD `class_role_id` VARCHAR(30) NOT NULL FIRST;

-- Attendance Records Table
CREATE TABLE `attendance_records` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `admission_no` VARCHAR(20) NOT NULL,
  `class_code` VARCHAR(20) NOT NULL,
  `academic_week_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `day_of_week` TINYINT NOT NULL COMMENT '1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday',
  `status` ENUM('P', 'A', 'L', 'E', 'D') NOT NULL COMMENT 'P=Present, A=Absent, L=Late, E=Excused, D=Dismissed',
  `marked_by` VARCHAR(20) NOT NULL COMMENT 'Teacher/Staff ID who marked attendance',
  `marked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_attendance` (`admission_no`, `attendance_date`),
  INDEX `idx_student_class` (`admission_no`, `class_code`),
  INDEX `idx_attendance_date` (`attendance_date`),
  INDEX `idx_week` (`academic_week_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_marked_by` (`marked_by`),

  FOREIGN KEY (`admission_no`) REFERENCES `students`(`admission_no`) ON DELETE CASCADE,
  FOREIGN KEY (`class_code`) REFERENCES `classes`(`class_code`) ON DELETE CASCADE,
  FOREIGN KEY (`academic_week_id`) REFERENCES `academic_weeks`(`id`) ON DELETE CASCADE
);


-- 5. Attendance Summary Table (for quick reporting)
-- Attendance Summary Table
CREATE TABLE `attendance_summary` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `admission_no` VARCHAR(20) NOT NULL,
  `class_code` VARCHAR(20) NOT NULL,
  `month` DATE NOT NULL COMMENT 'First day of the month',
  `total_days` INT DEFAULT 0,
  `present_days` INT DEFAULT 0,
  `absent_days` INT DEFAULT 0,
  `late_days` INT DEFAULT 0,
  `excused_days` INT DEFAULT 0,
  `dismissed_days` INT DEFAULT 0,
  `attendance_percentage` DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_days > 0 THEN ROUND((present_days / total_days) * 100, 2)
      ELSE 0 
    END
  ) STORED,
  `last_updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_summary` (`admission_no`, `class_code`, `month`),
  INDEX `idx_month` (`month`),
  INDEX `idx_percentage` (`attendance_percentage`),

  FOREIGN KEY (`admission_no`) REFERENCES `students`(`admission_no`) ON DELETE CASCADE,
  FOREIGN KEY (`class_code`) REFERENCES `classes`(`class_code`) ON DELETE CASCADE
);

-- =====================================================
-- STORED PROCEDURES
-- =====================================================
DELIMITER //

-- 1. Get Academic Weeks By Month
CREATE PROCEDURE GetAcademicWeeksByMonth(
  IN p_year INT,
  IN p_month INT
)
BEGIN
  SELECT 
    aw.id AS week_id,
    aw.week_number,
    aw.begin,
    aw.end,
    CONCAT(
      LEFT(DAYNAME(aw.begin), 1), '|',
      LEFT(DAYNAME(DATE_ADD(aw.begin, INTERVAL 1 DAY)), 1), '|',
      LEFT(DAYNAME(DATE_ADD(aw.begin, INTERVAL 2 DAY)), 1), '|',
      LEFT(DAYNAME(DATE_ADD(aw.begin, INTERVAL 3 DAY)), 1), '|',
      LEFT(DAYNAME(DATE_ADD(aw.begin, INTERVAL 4 DAY)), 1)
    ) AS day_letters,
    CONCAT(
      DAY(aw.begin), '|',
      DAY(DATE_ADD(aw.begin, INTERVAL 1 DAY)), '|',
      DAY(DATE_ADD(aw.begin, INTERVAL 2 DAY)), '|',
      DAY(DATE_ADD(aw.begin, INTERVAL 3 DAY)), '|',
      DAY(DATE_ADD(aw.begin, INTERVAL 4 DAY))
    ) AS day_numbers,
    CONCAT(
      DATE_FORMAT(aw.begin, '%Y-%m-%d'), '|',
      DATE_FORMAT(DATE_ADD(aw.begin, INTERVAL 1 DAY), '%Y-%m-%d'), '|',
      DATE_FORMAT(DATE_ADD(aw.begin, INTERVAL 2 DAY), '%Y-%m-%d'), '|',
      DATE_FORMAT(DATE_ADD(aw.begin, INTERVAL 3 DAY), '%Y-%m-%d'), '|',
      DATE_FORMAT(DATE_ADD(aw.begin, INTERVAL 4 DAY), '%Y-%m-%d')
    ) AS full_dates
  FROM academic_weeks aw
  WHERE aw.status = 'active'
    AND (
      (YEAR(aw.begin) = p_year AND MONTH(aw.begin) = p_month)
      OR (YEAR(aw.end) = p_year AND MONTH(aw.end) = p_month)
      OR (aw.begin <= LAST_DAY(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d'))
          AND aw.end >= STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d'))
    )
  ORDER BY aw.begin;
END //

-- 2. Get Students By Class
DROP PROCEDURE GetStudentsByClass;

DELIMITER //
CREATE PROCEDURE GetStudentsByClass(
  IN p_class_code VARCHAR(20)
)
BEGIN
  SELECT 
    s.student_name AS name,
    s.admission_no,
    c.class_name,
    c.level AS grade_level,
    c.section
  FROM students s
  JOIN classes c ON s.current_class = c.class_code
  WHERE s.current_class = p_class_code 
    AND c.status = 'Active'
  ORDER BY s.student_name;
END //

-- 3. Submit Attendance
CREATE PROCEDURE SubmitAttendance(
  IN p_class_code VARCHAR(20),
  IN p_academic_week_id INT,
  IN p_attendance_date DATE,
  IN p_day_of_week TINYINT,
  IN p_marked_by VARCHAR(20),
  IN p_attendance_data JSON
)
BEGIN
  DECLARE v_admission_no VARCHAR(20);
  DECLARE v_status VARCHAR(1);
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
      day_of_week, status, marked_by, notes
    ) VALUES (
      v_admission_no, p_class_code, p_academic_week_id, p_attendance_date,
      p_day_of_week, v_status, p_marked_by, v_notes
    )
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      marked_by = VALUES(marked_by),
      notes = VALUES(notes),
      marked_at = CURRENT_TIMESTAMP;

    SET i = i + 1;
  END WHILE;

  CALL UpdateAttendanceSummary(p_class_code, YEAR(p_attendance_date), MONTH(p_attendance_date));

  COMMIT;

  SELECT 'Attendance submitted successfully' AS message, array_length AS records_processed;
END //

-- 4. Get Attendance By Month
CREATE PROCEDURE GetAttendanceByMonth(
  IN p_class_code VARCHAR(20),
  IN p_year INT,
  IN p_month INT
)
BEGIN
  SELECT 
    ar.admission_no,
    s.full_name AS student_name,
    s.roll_number,
    ar.attendance_date,
    ar.day_of_week,
    ar.status,
    ar.notes,
    ar.marked_at,
    aw.week_number,
    aw.begin AS week_start,
    aw.end AS week_end
  FROM attendance_records ar
  JOIN students s ON ar.admission_no = s.admission_no
  JOIN academic_weeks aw ON ar.academic_week_id = aw.id
  WHERE ar.class_code = p_class_code
    AND YEAR(ar.attendance_date) = p_year
    AND MONTH(ar.attendance_date) = p_month
  ORDER BY s.full_name, ar.attendance_date;
END //

-- 5. Update Attendance Summary
CREATE PROCEDURE UpdateAttendanceSummary(
  IN p_class_code VARCHAR(20),
  IN p_year INT,
  IN p_month INT
)
BEGIN
  DECLARE v_month_start DATE;
  SET v_month_start = STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d');

  INSERT INTO attendance_summary (
    admission_no, class_code, month, total_days, present_days, absent_days, 
    late_days, excused_days, dismissed_days
  )
  SELECT 
    s.admission_no,
    p_class_code,
    v_month_start,
    COUNT(*) AS total_days,
    SUM(CASE WHEN ar.status = 'P' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'A' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'L' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'E' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'D' THEN 1 ELSE 0 END)
  FROM students s
  LEFT JOIN attendance_records ar 
    ON s.admission_no = ar.admission_no 
    AND ar.class_code = p_class_code
    AND YEAR(ar.attendance_date) = p_year 
    AND MONTH(ar.attendance_date) = p_month
  WHERE s.class_code = p_class_code AND s.status = 'active'
  GROUP BY s.admission_no

  ON DUPLICATE KEY UPDATE
    total_days = VALUES(total_days),
    present_days = VALUES(present_days),
    absent_days = VALUES(absent_days),
    late_days = VALUES(late_days),
    excused_days = VALUES(excused_days),
    dismissed_days = VALUES(dismissed_days);
END //

-- 6. Get Attendance Summary Report
CREATE PROCEDURE GetAttendanceSummaryReport(
  IN p_class_code VARCHAR(20),
  IN p_year INT,
  IN p_month INT
)
BEGIN
  DECLARE v_month_start DATE;
  SET v_month_start = STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d');

  SELECT 
    s.admission_no,
    s.full_name AS student_name,
    s.roll_number,
    COALESCE(asum.total_days, 0),
    COALESCE(asum.present_days, 0),
    COALESCE(asum.absent_days, 0),
    COALESCE(asum.late_days, 0),
    COALESCE(asum.excused_days, 0),
    COALESCE(asum.dismissed_days, 0),
    COALESCE(asum.attendance_percentage, 0)
  FROM students s
  LEFT JOIN attendance_summary asum 
    ON s.admission_no = asum.admission_no 
    AND asum.class_code = p_class_code 
    AND asum.month = v_month_start
  WHERE s.class_code = p_class_code AND s.status = 'active'
  ORDER BY s.full_name;
END //

DELIMITER ;


DROP PROCEDURE IF EXISTS `generate_academic_weeks`;
DELIMITER $$

CREATE  PROCEDURE `generate_academic_weeks`(
  IN p_academic_year VARCHAR(50),
  IN p_term VARCHAR(20),
  IN p_begin_date DATE,
  IN p_end_date DATE
)
BEGIN
  DECLARE start_date DATE;
  DECLARE end_date DATE;
  DECLARE week_num INT DEFAULT 1;

  DELETE FROM Academic_weeks 
  WHERE academic_year = p_academic_year AND term = p_term;

  SET start_date = p_begin_date;

  WHILE start_date <= p_end_date DO
    SET end_date = LEAST(DATE_ADD(start_date, INTERVAL 6 DAY), p_end_date);

    INSERT INTO Academic_weeks (week_number, academic_year, term, weeks, begin, end)
    VALUES (week_num, p_academic_year, p_term, CONCAT('Week ', week_num), start_date, end_date);

    SET start_date = DATE_ADD(end_date, INTERVAL 1 DAY);
    SET week_num = week_num + 1;
  END WHILE;
END$$


DELIMITER ;

DROP PROCEDURE IF EXISTS `GetAttendanceByMonth`;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetAttendanceByMonth`(
  IN p_class_code VARCHAR(20),
  IN p_year INT,
  IN p_month INT
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
    aw.begin AS week_start,
    aw.end AS week_end
  FROM attendance_records ar
  JOIN students s ON ar.admission_no = s.admission_no
  JOIN academic_weeks aw ON ar.academic_week_id = aw.id
  WHERE ar.class_code = p_class_code
    AND YEAR(ar.attendance_date) = p_year
    AND MONTH(ar.attendance_date) = p_month
  ORDER BY s.student_name, ar.attendance_date;
END$$
DELIMITER ;


-- 27 July 2025

ALTER TABLE `Academic_weeks` ADD `school_id` VARCHAR(20) NULL AFTER `end`, ADD `branch_id` VARCHAR(20) NOT NULL AFTER `school_id`, ADD `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' AFTER `branch_id`, ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `status`, ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `classes` ADD `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' AFTER `level`;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetStudentsByClass`(IN `p_class_code` VARCHAR(20))
BEGIN
  SELECT 
    s.admission_no,
    s.student_name AS name,
    s.current_class as class_code,
    c.class_name,
    c.level AS grade_level,
    c.section
  FROM students s
  JOIN classes c ON s.current_class = c.class_code
  WHERE s.current_class = p_class_code 
    AND s.status = 'active'
    AND c.status = 'active'
  ORDER BY s.student_name;
END$$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS `SubmitAttendance`$$
CREATE   PROCEDURE `SubmitAttendance`(
  IN p_class_code VARCHAR(20),
  IN p_academic_week_id INT,
  IN p_attendance_date DATE,
  IN p_day_of_week TINYINT,
  IN p_marked_by VARCHAR(20),
  IN p_attendance_data JSON
)
BEGIN
  DECLARE v_admission_no VARCHAR(20);
  DECLARE v_status VARCHAR(1);
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
      day_of_week, status, marked_by, notes
    ) VALUES (
      v_admission_no, p_class_code, p_academic_week_id, p_attendance_date,
      p_day_of_week, v_status, p_marked_by, v_notes
    )
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      marked_by = VALUES(marked_by),
      notes = VALUES(notes),
      marked_at = CURRENT_TIMESTAMP;

    SET i = i + 1;
  END WHILE;

  CALL UpdateAttendanceSummary(p_class_code, YEAR(p_attendance_date), MONTH(p_attendance_date));

  COMMIT;

  SELECT 'Attendance submitted successfully' AS message, array_length AS records_processed;
END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `UpdateAttendanceSummary`$$
CREATE  PROCEDURE `UpdateAttendanceSummary`(
  IN p_class_code VARCHAR(20),
  IN p_year INT,
  IN p_month INT
)
BEGIN
  DECLARE v_month_start DATE;
  SET v_month_start = STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d');

  INSERT INTO attendance_summary (
    admission_no, class_code, month, total_days, present_days, absent_days, 
    late_days, excused_days, dismissed_days
  )
  SELECT 
    s.admission_no,
    p_class_code,
    v_month_start,
    COUNT(*) AS total_days,
    SUM(CASE WHEN ar.status = 'P' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'A' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'L' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'E' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'D' THEN 1 ELSE 0 END)
  FROM students s
  LEFT JOIN attendance_records ar 
    ON s.admission_no = ar.admission_no 
    AND ar.class_code = p_class_code
    AND YEAR(ar.attendance_date) = p_year 
    AND MONTH(ar.attendance_date) = p_month
  WHERE s.current_class = p_class_code AND s.status = 'active'
  GROUP BY s.admission_no

  ON DUPLICATE KEY UPDATE
    total_days = VALUES(total_days),
    present_days = VALUES(present_days),
    absent_days = VALUES(absent_days),
    late_days = VALUES(late_days),
    excused_days = VALUES(excused_days),
    dismissed_days = VALUES(dismissed_days);
END$$
DELIMITER ;


SELECT DISTINCT admission_no, COUNT(status), status   FROM `attendance_records` GROUP BY admission_no, status ORDER BY admission_no;