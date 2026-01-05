-- Enhanced Time Slots Migration - Simplified Version
-- Execute step by step for production safety

-- Step 1: Backup existing data
CREATE TABLE class_timing_backup AS SELECT * FROM class_timing;

-- Step 2: Add new columns one by one
ALTER TABLE class_timing ADD COLUMN slot_id VARCHAR(50) UNIQUE;
ALTER TABLE class_timing ADD COLUMN slot_name VARCHAR(100);
ALTER TABLE class_timing ADD COLUMN duration_minutes INT;
ALTER TABLE class_timing ADD COLUMN slot_type ENUM('Academic', 'Break', 'Prayer', 'Assembly', 'Lunch', 'Activity', 'Study') DEFAULT 'Academic';
ALTER TABLE class_timing ADD COLUMN subject_types JSON;
ALTER TABLE class_timing ADD COLUMN is_flexible BOOLEAN DEFAULT TRUE;
ALTER TABLE class_timing ADD COLUMN priority INT DEFAULT 5;
ALTER TABLE class_timing ADD COLUMN cultural_significance ENUM('prayer', 'cultural', 'national', 'none') DEFAULT 'none';
ALTER TABLE class_timing ADD COLUMN weather_dependent BOOLEAN DEFAULT FALSE;
ALTER TABLE class_timing ADD COLUMN template_id VARCHAR(50);
ALTER TABLE class_timing ADD COLUMN day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
ALTER TABLE class_timing ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Step 3: Update existing data
UPDATE class_timing SET 
  slot_id = CONCAT('SLOT_', id, '_', UNIX_TIMESTAMP()),
  slot_name = CASE 
    WHEN activities = 'Break' THEN CONCAT('Break - ', start_time)
    WHEN activities = 'Lunch' THEN CONCAT('Lunch - ', start_time)
    WHEN activities = 'Assembly' THEN CONCAT('Assembly - ', start_time)
    ELSE CONCAT('Period - ', start_time)
  END,
  duration_minutes = 40,
  slot_type = CASE 
    WHEN activities = 'Break' THEN 'Break'
    WHEN activities = 'Lunch' THEN 'Lunch'
    WHEN activities = 'Assembly' THEN 'Assembly'
    ELSE 'Academic'
  END;

-- Step 4: Add indexes
ALTER TABLE class_timing ADD INDEX idx_slot_id (slot_id);
ALTER TABLE class_timing ADD INDEX idx_slot_type (slot_type);
ALTER TABLE class_timing ADD INDEX idx_school_section_day (school_id, section, day_of_week);

-- Step 5: Rename table
RENAME TABLE class_timing TO enhanced_time_slots;

-- Step 6: Create time slot templates table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Step 7: Insert Nigerian templates
INSERT INTO time_slot_templates (id, name, description, school_level, region, total_duration_minutes, template_data, is_system_template) VALUES
('NGR_PRIMARY_STD', 'Nigerian Primary Standard', 'Standard Nigerian primary school schedule', 'primary', 'all', 390, 
 '{"periods":[{"name":"Assembly","start":"08:00","end":"08:15","type":"Assembly"},{"name":"Period 1","start":"08:15","end":"08:55","type":"Academic"},{"name":"Period 2","start":"08:55","end":"09:35","type":"Academic"},{"name":"Short Break","start":"09:35","end":"09:50","type":"Break"},{"name":"Period 3","start":"09:50","end":"10:30","type":"Academic"},{"name":"Period 4","start":"10:30","end":"11:10","type":"Academic"},{"name":"Long Break","start":"11:10","end":"11:40","type":"Break"},{"name":"Period 5","start":"11:40","end":"12:20","type":"Academic"},{"name":"Period 6","start":"12:20","end":"13:00","type":"Academic"},{"name":"Lunch","start":"13:00","end":"13:30","type":"Lunch"},{"name":"Period 7","start":"13:30","end":"14:10","type":"Academic"}]}', TRUE);

INSERT INTO time_slot_templates (id, name, description, school_level, region, total_duration_minutes, template_data, is_system_template) VALUES
('NGR_SECONDARY_STD', 'Nigerian Secondary Standard', 'Standard Nigerian secondary school schedule', 'secondary', 'all', 450,
 '{"periods":[{"name":"Assembly","start":"07:30","end":"07:45","type":"Assembly"},{"name":"Period 1","start":"07:45","end":"08:30","type":"Academic"},{"name":"Period 2","start":"08:30","end":"09:15","type":"Academic"},{"name":"Period 3","start":"09:15","end":"10:00","type":"Academic"},{"name":"Short Break","start":"10:00","end":"10:20","type":"Break"},{"name":"Period 4","start":"10:20","end":"11:05","type":"Academic"},{"name":"Period 5","start":"11:05","end":"11:50","type":"Academic"},{"name":"Period 6","start":"11:50","end":"12:35","type":"Academic"},{"name":"Lunch Break","start":"12:35","end":"13:20","type":"Lunch"},{"name":"Period 7","start":"13:20","end":"14:05","type":"Academic"},{"name":"Period 8","start":"14:05","end":"14:50","type":"Academic"}]}', TRUE);

-- Step 8: Enhance teacher_classes table
ALTER TABLE teacher_classes ADD COLUMN subject_priority ENUM('high', 'medium', 'low') DEFAULT 'medium';
ALTER TABLE teacher_classes ADD COLUMN is_morning_preferred BOOLEAN DEFAULT FALSE;
ALTER TABLE teacher_classes ADD COLUMN max_periods_per_day INT DEFAULT 6;
ALTER TABLE teacher_classes ADD COLUMN max_periods_per_week INT DEFAULT 25;

-- Step 9: Update teacher_classes with intelligent defaults
UPDATE teacher_classes SET 
  subject_priority = CASE 
    WHEN subject IN ('Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'English') THEN 'high'
    WHEN subject IN ('Biology', 'Geography', 'Economics') THEN 'medium'
    ELSE 'low'
  END,
  is_morning_preferred = CASE 
    WHEN subject IN ('Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'English') THEN TRUE
    ELSE FALSE
  END;

-- Step 10: Create optimization rules table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Step 11: Insert optimization rules
INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_MORNING_MATH', 'DEFAULT', 'Mathematics Morning Priority', 'subject_priority', 
 '{"subjects":["Mathematics","Further Mathematics","Physics","Chemistry"],"preferred_time":"morning","weight":0.9}', 9);

INSERT INTO timetable_optimization_rules (id, school_id, rule_name, rule_type, rule_data, priority) VALUES
('NGR_TEACHER_BALANCE', 'DEFAULT', 'Teacher Workload Balance', 'teacher_workload',
 '{"max_periods_per_day":6,"max_consecutive_periods":4,"use_teacher_classes":true,"weight":0.8}', 8);

-- Success message
SELECT 'Enhanced Time Slots Migration Completed Successfully!' as status;
