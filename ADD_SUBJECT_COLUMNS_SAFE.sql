-- SAFE ALTER TABLE statements to add missing columns to subjects table
-- This version checks if columns exist before adding them
-- Execute these statements in your MySQL database

-- Check and add 'type' column
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT "core" COMMENT "Subject type: core, science, art, commercial, technology, vocational, health, language, selective" AFTER sub_section;',
        'SELECT "Column type already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'type'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add 'is_elective' column
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN is_elective BOOLEAN NOT NULL DEFAULT FALSE COMMENT "Indicates if this subject is an elective course" AFTER type;',
        'SELECT "Column is_elective already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'is_elective'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add 'elective_group' column
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN elective_group VARCHAR(50) NULL COMMENT "Group identifier for elective subjects (e.g., Science, Arts, Commercial)" AFTER is_elective;',
        'SELECT "Column elective_group already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'elective_group'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add 'weekly_hours' column
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN weekly_hours DECIMAL(3,1) DEFAULT 0.0 COMMENT "Weekly teaching hours for this subject (optional)" AFTER elective_group;',
        'SELECT "Column weekly_hours already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'weekly_hours'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add 'branch_id' column (CRITICAL for multi-branch support)
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN branch_id VARCHAR(20) NOT NULL DEFAULT "" COMMENT "Branch identifier - REQUIRED for multi-branch support - references school_locations.branch_id" AFTER weekly_hours;',
        'SELECT "Column branch_id already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'branch_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add 'created_at' column
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT "Record creation timestamp" AFTER branch_id;',
        'SELECT "Column created_at already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'created_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add 'updated_at' column
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT "Record last update timestamp" AFTER created_at;',
        'SELECT "Column updated_at already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND COLUMN_NAME = 'updated_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes (these will fail silently if they already exist)
CREATE INDEX IF NOT EXISTS idx_subjects_type ON subjects(type);
CREATE INDEX IF NOT EXISTS idx_subjects_is_elective ON subjects(is_elective);
CREATE INDEX IF NOT EXISTS idx_subjects_elective_group ON subjects(elective_group);
CREATE INDEX IF NOT EXISTS idx_subjects_branch_id ON subjects(branch_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_branch_status ON subjects(school_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_subjects_branch_section_status ON subjects(branch_id, section, status);
CREATE INDEX IF NOT EXISTS idx_subjects_school_branch_section_status ON subjects(school_id, branch_id, section, status);

-- Add constraint for type validation (will fail if already exists, which is fine)
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE subjects ADD CONSTRAINT chk_subject_type CHECK (type IN ("core", "science", "art", "commercial", "technology", "vocational", "health", "language", "selective"));',
        'SELECT "Constraint chk_subject_type already exists" as message;'
    )
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'subjects' 
    AND CONSTRAINT_NAME = 'chk_subject_type'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show final table structure
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT, 
    COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'subjects' 
ORDER BY ORDINAL_POSITION;

-- Show message about branch_id update
SELECT 'IMPORTANT: After running these statements, update existing records with proper branch_id values!' as important_note;
SELECT 'Example: UPDATE subjects SET branch_id = "YOUR_DEFAULT_BRANCH_ID" WHERE branch_id = "" OR branch_id IS NULL;' as example_update;
"