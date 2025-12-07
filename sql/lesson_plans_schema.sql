-- Lesson Plans and Notes Module - Database Schema
-- Generated for Elite Scholar School Management System

-- Create lesson_plans table
CREATE TABLE IF NOT EXISTS lesson_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    school_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    class_code VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    objectives TEXT,
    content TEXT NOT NULL,
    teaching_methods TEXT,
    resources_needed TEXT,
    assessment_methods TEXT,
    homework_assignment TEXT,
    lesson_date DATE NOT NULL,
    duration_minutes INT DEFAULT 40,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    admin_feedback TEXT,
    submission_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_school_branch (school_id, branch_id),
    INDEX idx_subject_class (subject_code, class_code),
    INDEX idx_lesson_date (lesson_date),
    INDEX idx_status (status),
    INDEX idx_submission_date (submission_date)
);

-- Create lesson_notes table
CREATE TABLE IF NOT EXISTS lesson_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_plan_id INT,
    teacher_id INT NOT NULL,
    school_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    class_code VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    lesson_summary TEXT NOT NULL,
    student_participation TEXT,
    challenges_faced TEXT,
    improvements_needed TEXT,
    next_lesson_preparation TEXT,
    lesson_date DATE NOT NULL,
    actual_duration_minutes INT,
    attendance_count INT,
    status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
    admin_feedback TEXT,
    submission_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE SET NULL,
    INDEX idx_lesson_plan_id (lesson_plan_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_school_branch (school_id, branch_id),
    INDEX idx_subject_class (subject_code, class_code),
    INDEX idx_lesson_date (lesson_date),
    INDEX idx_status (status),
    INDEX idx_submission_date (submission_date)
);

-- Add lesson plans module to school_setup if not exists
INSERT IGNORE INTO school_setup (school_id, module_name, is_active, settings, created_at, updated_at)
SELECT DISTINCT school_id, 'lesson_plans', 1, 
JSON_OBJECT(
    'require_approval', true,
    'submission_deadline_hours', 24,
    'reminder_frequency_hours', 12,
    'auto_notifications', true
), 
NOW(), NOW()
FROM schools;

-- Create indexes for performance
CREATE INDEX idx_lesson_plans_teacher_date ON lesson_plans(teacher_id, lesson_date);
CREATE INDEX idx_lesson_notes_teacher_date ON lesson_notes(teacher_id, lesson_date);
CREATE INDEX idx_lesson_plans_school_status ON lesson_plans(school_id, status);
CREATE INDEX idx_lesson_notes_school_status ON lesson_notes(school_id, status);
