-- ALTER TABLE statements to add missing columns to subjects table
-- Execute these statements in your MySQL database

-- Add the 'type' column
ALTER TABLE subjects 
ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'core' 
COMMENT 'Subject type: core, science, art, commercial, technology, vocational, health, language, selective'
AFTER sub_section;

-- Add the 'is_elective' column
ALTER TABLE subjects 
ADD COLUMN is_elective BOOLEAN NOT NULL DEFAULT FALSE 
COMMENT 'Indicates if this subject is an elective course'
AFTER type;

-- Add the 'elective_group' column
ALTER TABLE subjects 
ADD COLUMN elective_group VARCHAR(50) NULL 
COMMENT 'Group identifier for elective subjects (e.g., Science, Arts, Commercial)'
AFTER is_elective;

-- Add the 'weekly_hours' column
ALTER TABLE subjects 
ADD COLUMN weekly_hours DECIMAL(3,1) DEFAULT 0.0 
COMMENT 'Weekly teaching hours for this subject (optional)'
AFTER elective_group;

-- Add the 'branch_id' column (CRITICAL for multi-branch support)
ALTER TABLE subjects 
ADD COLUMN branch_id VARCHAR(20) NOT NULL 
COMMENT 'Branch identifier - REQUIRED for multi-branch support - references school_locations.branch_id'
AFTER weekly_hours;

-- Add timestamps if they don't exist
ALTER TABLE subjects 
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP 
COMMENT 'Record creation timestamp'
AFTER branch_id;

ALTER TABLE subjects 
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
COMMENT 'Record last update timestamp'
AFTER created_at;

-- Add indexes for better performance
CREATE INDEX idx_subjects_type ON subjects(type);
CREATE INDEX idx_subjects_is_elective ON subjects(is_elective);
CREATE INDEX idx_subjects_elective_group ON subjects(elective_group);
CREATE INDEX idx_subjects_branch_id ON subjects(branch_id);
CREATE INDEX idx_subjects_school_branch_status ON subjects(school_id, branch_id, status);
CREATE INDEX idx_subjects_branch_section_status ON subjects(branch_id, section, status);
CREATE INDEX idx_subjects_school_branch_section_status ON subjects(school_id, branch_id, section, status);

-- Add constraint for type validation
ALTER TABLE subjects 
ADD CONSTRAINT chk_subject_type 
CHECK (type IN ('core', 'science', 'art', 'commercial', 'technology', 'vocational', 'health', 'language', 'selective'));

-- Update existing records to have a default branch_id if needed
-- IMPORTANT: Replace 'DEFAULT_BRANCH_ID' with your actual default branch ID
-- UPDATE subjects SET branch_id = 'DEFAULT_BRANCH_ID' WHERE branch_id IS NULL OR branch_id = '';

-- Verify the changes
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

