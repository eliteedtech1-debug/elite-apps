-- =====================================================
-- Enhanced Time Slot Configuration - Production Migration Script
-- Version: 1.0
-- Date: December 31, 2025
-- Description: Complete database migration for AI-powered Nigerian school timetable system
-- =====================================================

-- =====================================================
-- SECTION 1: BACKUP AND SAFETY
-- =====================================================

-- Create backup of existing tables before migration
CREATE TABLE class_timing_backup AS SELECT * FROM class_timing;
CREATE TABLE schedules_backup AS SELECT * FROM schedules;
CREATE TABLE lesson_time_table_backup AS SELECT * FROM lesson_time_table;

-- Log migration start
INSERT INTO system_config (config_key, config_value, description, created_at) 
VALUES ('migration_enhanced_timeslots_start', NOW(), 'Enhanced Time Slots Migration Started', NOW());

-- =====================================================
-- SECTION 2: ENHANCE EXISTING TABLES
-- =====================================================

-- Transform class_timing to enhanced_time_slots
-- Step 1: Add new columns to existing class_timing table
ALTER TABLE class_timing 
ADD COLUMN slot_id VARCHAR(50) UNIQUE AFTER id,
ADD COLUMN slot_name VARCHAR(100) AFTER section,
ADD COLUMN duration_minutes INT AFTER end_time,
ADD COLUMN slot_type ENUM('Academic', 'Break', 'Prayer', 'Assembly', 'Lunch', 'Activity', 'Study') DEFAULT 'Academic' AFTER activities,
ADD COLUMN subject_types JSON AFTER slot_type,
ADD COLUMN is_flexible BOOLEAN DEFAULT TRUE AFTER subject_types,
ADD COLUMN priority INT DEFAULT 5 AFTER is_flexible,
ADD COLUMN cultural_significance ENUM('prayer', 'cultural', 'national', 'none') DEFAULT 'none' AFTER priority,
ADD COLUMN weather_dependent BOOLEAN DEFAULT FALSE AFTER cultural_significance,
ADD COLUMN template_id VARCHAR(50) AFTER weather_dependent,
ADD COLUMN day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') AFTER template_id,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER day_of_week;

-- Step 2: Add indexes for performance
ALTER TABLE class_timing
ADD INDEX idx_slot_id (slot_id),
ADD INDEX idx_template_id (template_id),
ADD INDEX idx_slot_type (slot_type),
ADD INDEX idx_school_section_day (school_id, section, day_of_week),
ADD INDEX idx_cultural_significance (cultural_significance),
ADD INDEX idx_active_slots (is_active);

-- Step 3: Update existing data with calculated values
UPDATE class_timing SET 
  slot_id = CONCAT('SLOT_', id, '_', UNIX_TIMESTAMP()),
  slot_name = CASE 
    WHEN activities = 'Break' THEN CONCAT('Break - ', start_time)
    WHEN activities = 'Lunch' THEN CONCAT('Lunch - ', start_time)
    WHEN activities = 'Assembly' THEN CONCAT('Assembly - ', start_time)
    ELSE CONCAT('Period - ', start_time)
  END,
  duration_minutes = CASE 
    WHEN start_time REGEXP '^[0-9]{1,2}:[0-9]{2}$' AND end_time REGEXP '^[0-9]{1,2}:[0-9]{2}$' 
    THEN TIME_TO_SEC(TIMEDIFF(STR_TO_DATE(end_time, '%H:%i'), STR_TO_DATE(start_time, '%H:%i'))) / 60
    ELSE 40
  END,
  slot_type = CASE 
    WHEN activities = 'Break' THEN 'Break'
    WHEN activities = 'Lunch' THEN 'Lunch'
    WHEN activities = 'Assembly' THEN 'Assembly'
    ELSE 'Academic'
  END,
  subject_types = CASE 
    WHEN activities = 'Lesson' THEN JSON_ARRAY('Mathematics', 'English', 'Science', 'Social Studies')
    ELSE NULL
  END;

-- Step 4: Rename table for clarity
RENAME TABLE class_timing TO enhanced_time_slots;

-- =====================================================
-- SECTION 3: ENHANCE SCHEDULES TABLE
-- =====================================================

-- Enhance schedules table for cultural and religious scheduling
ALTER TABLE schedules
ADD COLUMN rule_type ENUM('prayer', 'cultural', 'seasonal', 'weather', 'event') DEFAULT 'event' AFTER event_categry,
ADD COLUMN rule_data JSON AFTER content,
ADD COLUMN school_id VARCHAR(20) AFTER user_id,
ADD COLUMN effective_from DATE AFTER rule_data,
ADD COLUMN effective_to DATE AFTER effective_from,
ADD COLUMN recurrence_pattern ENUM('daily', 'weekly', 'monthly', 'yearly', 'once') DEFAULT 'once' AFTER effective_to;

-- Add indexes for enhanced schedules
ALTER TABLE schedules
ADD INDEX idx_school_rule_type (school_id, rule_type),
ADD INDEX idx_effective_dates (effective_from, effective_to),
ADD INDEX idx_recurrence (recurrence_pattern);

-- Update existing data
UPDATE schedules SET rule_type = 'event' WHERE rule_type IS NULL;

-- =====================================================
-- SECTION 4: ENHANCE TEACHER_CLASSES INTEGRATION
-- =====================================================

-- Add indexes to existing teacher_classes table for better performance
ALTER TABLE teacher_classes
ADD INDEX idx_teacher_class (teacher_id, class_code),
ADD INDEX idx_subject_class (subject_code, class_code),
ADD INDEX idx_school_teacher (school_id, teacher_id),
ADD INDEX idx_class_subject (class_code, subject_code);

-- Add additional columns for AI optimization
ALTER TABLE teacher_classes
ADD COLUMN preferred_time_slots JSON AFTER subject,
ADD COLUMN max_periods_per_day INT DEFAULT 6 AFTER preferred_time_slots,
ADD COLUMN max_periods_per_week INT DEFAULT 25 AFTER max_periods_per_day,
ADD COLUMN subject_priority ENUM('high', 'medium', 'low') DEFAULT 'medium' AFTER max_periods_per_week,
ADD COLUMN is_morning_preferred BOOLEAN DEFAULT FALSE AFTER subject_priority,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER is_morning_preferred,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Update existing data with intelligent defaults based on subjects
UPDATE teacher_classes SET 
  subject_priority = CASE 
    WHEN subject IN ('Mathematics', 'Further Mathematics', 'General Mathematics', 'Physics', 'Chemistry', 'English') THEN 'high'
    WHEN subject IN ('Biology', 'Geography', 'Economics', 'Accounting') THEN 'medium'
    ELSE 'low'
  END,
  is_morning_preferred = CASE 
    WHEN subject IN ('Mathematics', 'Further Mathematics', 'General Mathematics', 'Physics', 'Chemistry', 'Biology', 'English') THEN TRUE
    ELSE FALSE
  END,
  max_periods_per_day = CASE 
    WHEN subject IN ('Physical Education', 'Fine Arts', 'Music') THEN 2
    WHEN subject IN ('Mathematics', 'English', 'Physics', 'Chemistry') THEN 1
    ELSE 1
  END,
  max_periods_per_week = CASE 
    WHEN subject IN ('Mathematics', 'English') THEN 6
    WHEN subject IN ('Physics', 'Chemistry', 'Biology') THEN 5
    WHEN subject IN ('Geography', 'History', 'Economics') THEN 4
    WHEN subject IN ('Physical Education', 'Fine Arts', 'Music') THEN 2
    ELSE 3
  END;

-- =====================================================
-- SECTION 5: CREATE NEW SUPPORTING TABLES
-- =====================================================

-- Create time slot templates table
CREATE TABLE time_slot_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  school_level ENUM('primary', 'secondary', 'both') NOT NULL,
  region ENUM('northern', 'southern', 'middle-belt', 'all') DEFAULT 'all',
  total_duration_minutes INT NOT NULL,
  school_start_time TIME NOT NULL DEFAULT '08:00:00',
  school_end_time TIME NOT NULL DEFAULT '15:00:00',
  template_data JSON NOT NULL,
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(50),
  school_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_level (school_level),
  INDEX idx_region (region),
  INDEX idx_school_id (school_id),
  INDEX idx_active (is_active),
  INDEX idx_system_template (is_system_template)
);

-- Create school time configurations table
CREATE TABLE school_time_configurations (
  id VARCHAR(50) PRIMARY KEY,
  school_id VARCHAR(20) NOT NULL,
  config_name VARCHAR(100) NOT NULL,
  template_id VARCHAR(50),
  school_start_time TIME NOT NULL,
  school_end_time TIME NOT NULL,
  prayer_times JSON,
  cultural_events JSON,
  seasonal_adjustments JSON,
  break_preferences JSON,
  subject_duration_rules JSON,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_config (school_id, config_name),
  INDEX idx_school_id (school_id),
  INDEX idx_template_id (template_id),
  INDEX idx_effective_dates (effective_from, effective_to),
  FOREIGN KEY (template_id) REFERENCES time_slot_templates(id) ON DELETE SET NULL
);

-- Create AI optimization rules table
CREATE TABLE timetable_optimization_rules (
  id VARCHAR(50) PRIMARY KEY,
  school_id VARCHAR(20) NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_type ENUM('subject_priority', 'teacher_workload', 'cognitive_load', 'cultural', 'weather') NOT NULL,
  rule_data JSON NOT NULL,
  priority INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_rule_type (school_id, rule_type),
  INDEX idx_priority (priority),
  INDEX idx_active (is_active)
);

-- =====================================================
-- SECTION 5: INSERT NIGERIAN SCHOOL TEMPLATES
-- =====================================================

-- Insert Nigerian Primary School Standard Template
INSERT INTO time_slot_templates (id, name, description, school_level, region, total_duration_minutes, school_start_time, school_end_time, template_data, is_system_template) VALUES
('NGR_PRIMARY_STD', 'Nigerian Primary Standard', 'Standard Nigerian primary school schedule (8:00 AM - 2:30 PM)', 'primary', 'all', 390, '08:00:00', '14:30:00', 
 JSON_OBJECT(
   'periods', JSON_ARRAY(
     JSON_OBJECT('name', 'Assembly', 'start', '08:00', 'end', '08:15', 'type', 'Assembly', 'duration', 15),
     JSON_OBJECT('name', 'Period 1', 'start', '08:15', 'end', '08:55', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Period 2', 'start', '08:55', 'end', '09:35', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Short Break', 'start', '09:35', 'end', '09:50', 'type', 'Break', 'duration', 15),
     JSON_OBJECT('name', 'Period 3', 'start', '09:50', 'end', '10:30', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Period 4', 'start', '10:30', 'end', '11:10', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Long Break', 'start', '11:10', 'end', '11:40', 'type', 'Break', 'duration', 30),
     JSON_OBJECT('name', 'Period 5', 'start', '11:40', 'end', '12:20', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Period 6', 'start', '12:20', 'end', '13:00', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Lunch', 'start', '13:00', 'end', '13:30', 'type', 'Lunch', 'duration', 30),
     JSON_OBJECT('name', 'Period 7', 'start', '13:30', 'end', '14:10', 'type', 'Academic', 'duration', 40),
     JSON_OBJECT('name', 'Closing', 'start', '14:10', 'end', '14:30', 'type', 'Activity', 'duration', 20)
   ),
   'total_periods', 7,
   'academic_periods', 7,
   'break_periods', 3
 ), TRUE);

-- Insert Nigerian Secondary School Standard Template
INSERT INTO time_slot_templates (id, name, description, school_level, region, total_duration_minutes, school_start_time, school_end_time, template_data, is_system_template) VALUES
('NGR_SECONDARY_STD', 'Nigerian Secondary Standard', 'Standard Nigerian secondary school schedule (7:30 AM - 3:00 PM)', 'secondary', 'all', 450, '07:30:00', '15:00:00',
 JSON_OBJECT(
   'periods', JSON_ARRAY(
     JSON_OBJECT('name', 'Assembly', 'start', '07:30', 'end', '07:45', 'type', 'Assembly', 'duration', 15),
     JSON_OBJECT('name', 'Period 1', 'start', '07:45', 'end', '08:30', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 2', 'start', '08:30', 'end', '09:15', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 3', 'start', '09:15', 'end', '10:00', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Short Break', 'start', '10:00', 'end', '10:20', 'type', 'Break', 'duration', 20),
     JSON_OBJECT('name', 'Period 4', 'start', '10:20', 'end', '11:05', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 5', 'start', '11:05', 'end', '11:50', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 6', 'start', '11:50', 'end', '12:35', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Lunch Break', 'start', '12:35', 'end', '13:20', 'type', 'Lunch', 'duration', 45),
     JSON_OBJECT('name', 'Period 7', 'start', '13:20', 'end', '14:05', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 8', 'start', '14:05', 'end', '14:50', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Closing', 'start', '14:50', 'end', '15:00', 'type', 'Activity', 'duration', 10)
   ),
   'total_periods', 8,
   'academic_periods', 8,
   'break_periods', 3
 ), TRUE);

-- Insert Islamic School Template with Prayer Times
INSERT INTO time_slot_templates (id, name, description, school_level, region, total_duration_minutes, school_start_time, school_end_time, template_data, is_system_template) VALUES
('NGR_ISLAMIC_STD', 'Nigerian Islamic School', 'Islamic school schedule with integrated prayer times', 'both', 'northern', 420, '07:30:00', '14:30:00',
 JSON_OBJECT(
   'periods', JSON_ARRAY(
     JSON_OBJECT('name', 'Fajr Prayer', 'start', '06:00', 'end', '06:30', 'type', 'Prayer', 'duration', 30),
     JSON_OBJECT('name', 'Assembly', 'start', '07:30', 'end', '07:45', 'type', 'Assembly', 'duration', 15),
     JSON_OBJECT('name', 'Period 1', 'start', '07:45', 'end', '08:30', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 2', 'start', '08:30', 'end', '09:15', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Short Break', 'start', '09:15', 'end', '09:30', 'type', 'Break', 'duration', 15),
     JSON_OBJECT('name', 'Period 3', 'start', '09:30', 'end', '10:15', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 4', 'start', '10:15', 'end', '11:00', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 5', 'start', '11:00', 'end', '11:45', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Dhuhr Prayer', 'start', '12:00', 'end', '12:30', 'type', 'Prayer', 'duration', 30),
     JSON_OBJECT('name', 'Period 6', 'start', '12:30', 'end', '13:15', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Period 7', 'start', '13:15', 'end', '14:00', 'type', 'Academic', 'duration', 45),
     JSON_OBJECT('name', 'Closing', 'start', '14:00', 'end', '14:30', 'type', 'Activity', 'duration', 30)
   ),
   'total_periods', 7,
   'academic_periods', 7,
   'prayer_periods', 2,
   'break_periods', 2
 ), TRUE);

-- =====================================================
-- SECTION 6: INSERT DEFAULT OPTIMIZATION RULES
-- =====================================================

-- Insert Nigerian Education Optimization Rules
INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_MORNING_MATH', 'DEFAULT', 'Mathematics Morning Priority', 'subject_priority', 
 JSON_OBJECT(
   'subjects', JSON_ARRAY('Mathematics', 'Further Mathematics', 'General Mathematics'),
   'preferred_time', 'morning',
   'time_range', JSON_OBJECT('start', '08:00', 'end', '11:00'),
   'weight', 0.9,
   'reason', 'Mathematical subjects require high cognitive function best achieved in morning hours'
 ), 9);

INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_MORNING_SCIENCE', 'DEFAULT', 'Science Morning Priority', 'subject_priority',
 JSON_OBJECT(
   'subjects', JSON_ARRAY('Physics', 'Chemistry', 'Biology', 'Basic Science'),
   'preferred_time', 'morning',
   'time_range', JSON_OBJECT('start', '08:00', 'end', '11:30'),
   'weight', 0.8,
   'reason', 'Science subjects benefit from morning alertness and concentration'
 ), 8);

INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_AFTERNOON_ARTS', 'DEFAULT', 'Arts Afternoon Suitable', 'subject_priority',
 JSON_OBJECT(
   'subjects', JSON_ARRAY('Fine Arts', 'Music', 'Physical Education', 'Cultural and Creative Arts'),
   'preferred_time', 'afternoon',
   'time_range', JSON_OBJECT('start', '13:00', 'end', '15:00'),
   'weight', 0.7,
   'reason', 'Creative and physical subjects are suitable for afternoon when energy is more relaxed'
 ), 7);

-- Insert AI optimization rule for teacher workload based on teacher_classes
INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_TEACHER_ASSIGNMENT', 'DEFAULT', 'Teacher Assignment Optimization', 'teacher_workload',
 JSON_OBJECT(
   'use_teacher_classes_table', true,
   'respect_subject_assignments', true,
   'max_periods_per_day_override', false,
   'balance_across_days', true,
   'avoid_back_to_back_same_subject', true,
   'weight', 0.9,
   'description', 'Optimize based on actual teacher-class-subject assignments from teacher_classes table'
 ), 9);

-- Insert rule for subject-specific scheduling based on teacher_classes data
INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_SUBJECT_SPECIFIC', 'DEFAULT', 'Subject-Specific Time Allocation', 'subject_priority',
 JSON_OBJECT(
   'use_teacher_classes_priorities', true,
   'high_priority_morning_slots', JSON_ARRAY('07:30-08:15', '08:15-09:00', '09:00-09:45'),
   'medium_priority_mid_slots', JSON_ARRAY('10:00-10:45', '10:45-11:30', '11:30-12:15'),
   'low_priority_afternoon_slots', JSON_ARRAY('13:00-13:45', '13:45-14:30', '14:30-15:15'),
   'respect_weekly_allocation', true,
   'weight', 0.8
 ), 8);

INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_COGNITIVE_LOAD', 'DEFAULT', 'Age-Appropriate Cognitive Load', 'cognitive_load',
 JSON_OBJECT(
   'primary_attention_span', 30,
   'secondary_attention_span', 45,
   'max_consecutive_academic', JSON_OBJECT('primary', 2, 'secondary', 3),
   'break_frequency_minutes', JSON_OBJECT('primary', 90, 'secondary', 120),
   'high_cognitive_subjects', JSON_ARRAY('Mathematics', 'Physics', 'Chemistry', 'English'),
   'weight', 0.7
 ), 7);

INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_CULTURAL_PRAYER', 'DEFAULT', 'Islamic Prayer Time Integration', 'cultural',
 JSON_OBJECT(
   'prayer_times', JSON_OBJECT(
     'fajr', '06:00',
     'dhuhr', '12:30',
     'asr', '15:30',
     'maghrib', '18:00',
     'isha', '19:30',
     'jummah', '12:00'
   ),
   'prayer_duration', 30,
   'buffer_time', 15,
   'mandatory_for_islamic_schools', true,
   'weight', 1.0
 ), 10);

-- =====================================================
-- SECTION 7: CREATE VIEWS FOR EASY ACCESS
-- =====================================================

-- Create view for active time slots
CREATE VIEW active_time_slots AS
SELECT 
  slot_id,
  school_id,
  section,
  slot_name,
  start_time,
  end_time,
  duration_minutes,
  slot_type,
  subject_types,
  cultural_significance,
  template_id,
  day_of_week
FROM enhanced_time_slots 
WHERE is_active = TRUE
ORDER BY school_id, section, 
  FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
  start_time;

-- Create view for teacher assignments with AI optimization data
CREATE VIEW teacher_subject_assignments AS
SELECT 
  tc.id,
  tc.teacher_id,
  tc.class_code,
  tc.class_name,
  tc.subject_code,
  tc.subject as subject_name,
  tc.school_id,
  tc.subject_priority,
  tc.is_morning_preferred,
  tc.max_periods_per_day,
  tc.max_periods_per_week,
  tc.preferred_time_slots,
  CASE 
    WHEN tc.subject IN ('Mathematics', 'Further Mathematics', 'Physics', 'Chemistry') THEN 'STEM'
    WHEN tc.subject IN ('English', 'Literature', 'History') THEN 'Languages'
    WHEN tc.subject IN ('Fine Arts', 'Music', 'Physical Education') THEN 'Creative'
    ELSE 'General'
  END as subject_category
FROM teacher_classes tc
ORDER BY tc.school_id, tc.teacher_id, tc.subject_priority DESC;

-- Create view for Nigerian templates
CREATE VIEW nigerian_templates AS
SELECT 
  id,
  name,
  description,
  school_level,
  region,
  total_duration_minutes,
  school_start_time,
  school_end_time,
  template_data
FROM time_slot_templates 
WHERE is_system_template = TRUE AND is_active = TRUE
ORDER BY school_level, region;

-- Create view for school configurations
CREATE VIEW school_configurations AS
SELECT 
  stc.id,
  stc.school_id,
  stc.config_name,
  tst.name as template_name,
  stc.school_start_time,
  stc.school_end_time,
  stc.prayer_times,
  stc.cultural_events,
  stc.is_active
FROM school_time_configurations stc
LEFT JOIN time_slot_templates tst ON stc.template_id = tst.id
WHERE stc.is_active = TRUE;

-- =====================================================
-- SECTION 8: UPDATE EXISTING PROCEDURES (IF ANY)
-- =====================================================

-- Drop old ClassTiming procedure if exists
DROP PROCEDURE IF EXISTS ClassTiming;

-- Create new enhanced procedure
DELIMITER //
CREATE PROCEDURE EnhancedTimeSlots(
  IN p_query_type VARCHAR(20),
  IN p_slot_id VARCHAR(50),
  IN p_school_id VARCHAR(20),
  IN p_section VARCHAR(50),
  IN p_slot_name VARCHAR(100),
  IN p_start_time VARCHAR(20),
  IN p_end_time VARCHAR(20),
  IN p_slot_type VARCHAR(20),
  IN p_template_id VARCHAR(50),
  IN p_day_of_week VARCHAR(20)
)
BEGIN
  CASE p_query_type
    WHEN 'create' THEN
      INSERT INTO enhanced_time_slots (
        slot_id, school_id, section, slot_name, start_time, end_time, 
        duration_minutes, slot_type, template_id, day_of_week, is_active
      ) VALUES (
        COALESCE(p_slot_id, CONCAT('SLOT_', UNIX_TIMESTAMP(), '_', FLOOR(RAND() * 1000))),
        p_school_id, p_section, p_slot_name, p_start_time, p_end_time,
        TIME_TO_SEC(TIMEDIFF(STR_TO_DATE(p_end_time, '%H:%i'), STR_TO_DATE(p_start_time, '%H:%i'))) / 60,
        COALESCE(p_slot_type, 'Academic'), p_template_id, p_day_of_week, TRUE
      );
      SELECT 'Time slot created successfully' as message;
      
    WHEN 'select' THEN
      SELECT * FROM enhanced_time_slots 
      WHERE (p_school_id IS NULL OR school_id = p_school_id)
        AND (p_section IS NULL OR section = p_section)
        AND is_active = TRUE
      ORDER BY 
        FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        start_time;
        
    WHEN 'update' THEN
      UPDATE enhanced_time_slots 
      SET 
        slot_name = COALESCE(p_slot_name, slot_name),
        start_time = COALESCE(p_start_time, start_time),
        end_time = COALESCE(p_end_time, end_time),
        duration_minutes = CASE 
          WHEN p_start_time IS NOT NULL AND p_end_time IS NOT NULL 
          THEN TIME_TO_SEC(TIMEDIFF(STR_TO_DATE(p_end_time, '%H:%i'), STR_TO_DATE(p_start_time, '%H:%i'))) / 60
          ELSE duration_minutes
        END,
        slot_type = COALESCE(p_slot_type, slot_type),
        template_id = COALESCE(p_template_id, template_id),
        day_of_week = COALESCE(p_day_of_week, day_of_week),
        updated_at = NOW()
      WHERE slot_id = p_slot_id;
      SELECT 'Time slot updated successfully' as message;
      
    WHEN 'delete' THEN
      UPDATE enhanced_time_slots 
      SET is_active = FALSE, updated_at = NOW()
      WHERE slot_id = p_slot_id;
      SELECT 'Time slot deactivated successfully' as message;
      
    ELSE
      SELECT 'Invalid query type' as error;
  END CASE;
END //
DELIMITER ;

-- =====================================================
-- SECTION 9: DATA VALIDATION AND CLEANUP
-- =====================================================

-- Validate migrated data
SELECT 
  'enhanced_time_slots' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN slot_id IS NOT NULL THEN 1 END) as records_with_slot_id,
  COUNT(CASE WHEN duration_minutes > 0 THEN 1 END) as records_with_valid_duration,
  COUNT(CASE WHEN slot_type IS NOT NULL THEN 1 END) as records_with_slot_type
FROM enhanced_time_slots;

-- Check for any data inconsistencies
SELECT 
  slot_id,
  school_id,
  section,
  start_time,
  end_time,
  duration_minutes,
  'Invalid duration' as issue
FROM enhanced_time_slots 
WHERE duration_minutes <= 0 OR duration_minutes > 300;

-- =====================================================
-- SECTION 10: MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO system_config (config_key, config_value, description, created_at) 
VALUES ('migration_enhanced_timeslots_complete', NOW(), 'Enhanced Time Slots Migration Completed Successfully', NOW());

-- Create migration summary
SELECT 
  'MIGRATION SUMMARY' as status,
  (SELECT COUNT(*) FROM enhanced_time_slots) as enhanced_time_slots_count,
  (SELECT COUNT(*) FROM time_slot_templates) as templates_count,
  (SELECT COUNT(*) FROM timetable_optimization_rules) as optimization_rules_count,
  NOW() as completed_at;

-- =====================================================
-- SECTION 11: POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify all tables exist
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN (
    'enhanced_time_slots',
    'time_slot_templates', 
    'school_time_configurations',
    'timetable_optimization_rules'
  );

-- Verify indexes are created
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN (
    'enhanced_time_slots',
    'time_slot_templates',
    'school_time_configurations',
    'timetable_optimization_rules'
  )
ORDER BY TABLE_NAME, INDEX_NAME;

-- Final success message
SELECT 
  '✅ MIGRATION COMPLETED SUCCESSFULLY' as status,
  'Enhanced Time Slot Configuration system is now ready for Nigerian schools' as message,
  'Please run application tests to verify functionality' as next_step;

-- =====================================================
-- END OF MIGRATION SCRIPT
-- =====================================================
