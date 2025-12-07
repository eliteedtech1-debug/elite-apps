-- Remote Qur'an Recitation Feature - Complete Database Schema
-- Generated for School SMS System

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS recitation_feedbacks;
DROP TABLE IF EXISTS recitation_replies;
DROP TABLE IF EXISTS recitations;

-- Create recitations table
CREATE TABLE recitations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id INT NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    audio_url VARCHAR(1024) NOT NULL,
    audio_public_id VARCHAR(255) NOT NULL,
    audio_format VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 0,
    allow_replies BOOLEAN DEFAULT TRUE,
    due_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_class_id (class_id),
    INDEX idx_due_date (due_date),
    INDEX idx_created_at (created_at)
);

-- Create recitation_replies table
CREATE TABLE recitation_replies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recitation_id CHAR(36) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    audio_url VARCHAR(1024) NOT NULL,
    audio_public_id VARCHAR(255) NOT NULL,
    audio_format VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 0,
    transcript TEXT NULL,
    ai_score FLOAT NULL,
    status ENUM('submitted', 'graded') DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recitation_id) REFERENCES recitations(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(admission_no) ON DELETE CASCADE,
    INDEX idx_recitation_id (recitation_id),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_student_recitation (recitation_id, student_id)
);

-- Create recitation_feedbacks table
CREATE TABLE recitation_feedbacks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reply_id CHAR(36) NOT NULL,
    teacher_id INT NOT NULL,
    grade INT NOT NULL CHECK (grade >= 0 AND grade <= 100),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reply_id) REFERENCES recitation_replies(id) ON DELETE CASCADE,
    INDEX idx_reply_id (reply_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_grade (grade),
    INDEX idx_created_at (created_at)
);

-- Add performance indexes
CREATE INDEX idx_recitations_teacher_class ON recitations(teacher_id, class_id);
CREATE INDEX idx_replies_recitation_student ON recitation_replies(recitation_id, student_id);
CREATE INDEX idx_feedbacks_reply_teacher ON recitation_feedbacks(reply_id, teacher_id);

-- Add full-text search indexes for better search performance
ALTER TABLE recitations ADD FULLTEXT(title, description);
ALTER TABLE recitation_feedbacks ADD FULLTEXT(comment);
