-- QUICK FIX: Add missing columns to subjects table
-- Execute these statements one by one
-- IGNORE any "Duplicate column name" errors - they are normal!

-- 1. Add type column
ALTER TABLE subjects ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'core' AFTER sub_section;

-- 2. Add is_elective column  
ALTER TABLE subjects ADD COLUMN is_elective BOOLEAN NOT NULL DEFAULT FALSE AFTER type;

-- 3. Add elective_group column
ALTER TABLE subjects ADD COLUMN elective_group VARCHAR(50) NULL AFTER is_elective;

-- 4. Add weekly_hours column
ALTER TABLE subjects ADD COLUMN weekly_hours DECIMAL(3,1) DEFAULT 0.0 AFTER elective_group;

-- 5. Add branch_id column (CRITICAL)
ALTER TABLE subjects ADD COLUMN branch_id VARCHAR(20) NOT NULL DEFAULT '' AFTER weekly_hours;

-- 6. Add timestamps
ALTER TABLE subjects ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER branch_id;
ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- 7. Add primary key (ignore error if exists)
ALTER TABLE subjects ADD PRIMARY KEY (subject_code);

-- 8. Add essential indexes (ignore errors if they exist)
CREATE INDEX idx_subjects_type ON subjects(type);
CREATE INDEX idx_subjects_branch_id ON subjects(branch_id);

-- 9. CRITICAL: Update branch_id for existing subjects
-- REPLACE 'YOUR_BRANCH_ID' and 'YOUR_SCHOOL_ID' with actual values
-- Example:
-- UPDATE subjects SET branch_id = 'BRCH00001' WHERE school_id = 'SCH/1' AND branch_id = '';

-- Check what branches are available:
SELECT school_id, branch_id, branch_name FROM school_locations WHERE status = 'Active';


UPDATE subjects s
LEFT JOIN classes c 
  ON s.class_code = c.class_code 
 AND s.school_id = c.school_id
SET s.branch_id = c.branch_id
WHERE (s.branch_id IS NULL OR s.branch_id = '');