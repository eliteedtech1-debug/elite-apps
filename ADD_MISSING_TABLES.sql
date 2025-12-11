-- ============================================================================
-- Add Missing Tables to elite_db
-- Tables: recitations, assets, teachers, lesson_plans
-- ============================================================================

USE elite_db;

-- ============================================================================
-- 1. RECITATIONS MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recitations (
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
    INDEX idx_due_date (due_date)
);

CREATE TABLE IF NOT EXISTS recitation_replies (
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
    INDEX idx_recitation_id (recitation_id),
    INDEX idx_student_id (student_id),
    UNIQUE KEY unique_student_recitation (recitation_id, student_id)
);

CREATE TABLE IF NOT EXISTS recitation_feedbacks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reply_id CHAR(36) NOT NULL,
    teacher_id INT NOT NULL,
    grade INT NOT NULL CHECK (grade >= 0 AND grade <= 100),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reply_id) REFERENCES recitation_replies(id) ON DELETE CASCADE,
    INDEX idx_reply_id (reply_id),
    INDEX idx_teacher_id (teacher_id)
);

-- ============================================================================
-- 2. ASSET MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_categories (
  category_id VARCHAR(20) PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_rooms (
  room_id VARCHAR(20) PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  room_code VARCHAR(10) NOT NULL,
  description TEXT,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id VARCHAR(20) PRIMARY KEY,
  asset_name VARCHAR(100) NOT NULL,
  asset_code VARCHAR(20) NOT NULL,
  category_id VARCHAR(20),
  room_id VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive', 'Under Maintenance', 'Damaged') DEFAULT 'Active',
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  expected_life_years INT DEFAULT 5,
  depreciation_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES asset_categories(category_id),
  FOREIGN KEY (room_id) REFERENCES facility_rooms(room_id)
);

-- ============================================================================
-- 3. TEACHERS & TEACHER_CLASSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school (school_id),
  INDEX idx_status (status, is_deleted)
);

CREATE TABLE IF NOT EXISTS teacher_classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  class_id VARCHAR(50) NOT NULL,
  subject_code VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
  INDEX idx_teacher (teacher_id),
  INDEX idx_class (class_id),
  INDEX idx_active (is_active)
);

-- ============================================================================
-- 4. SCHOOL_SETUP (for lesson plans)
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_setup (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL UNIQUE,
  school_name VARCHAR(200) NOT NULL,
  default_lang VARCHAR(10) DEFAULT 'en',
  second_lang VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'Missing Tables Added Successfully!' AS '';
SELECT '========================================' AS '';

SELECT 
  IF(COUNT(*) > 0, '✓ recitations', '✗ recitations') AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recitations';

SELECT 
  IF(COUNT(*) > 0, '✓ assets', '✗ assets') AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assets';

SELECT 
  IF(COUNT(*) > 0, '✓ teachers', '✗ teachers') AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teachers';

SELECT 
  IF(COUNT(*) > 0, '✓ teacher_classes', '✗ teacher_classes') AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teacher_classes';

SELECT 
  IF(COUNT(*) > 0, '✓ school_setup', '✗ school_setup') AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_setup';

SELECT '========================================' AS '';
