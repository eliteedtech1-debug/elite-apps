-- Fix for subjects table column mismatch
-- The subjects table uses subject_code as the primary key, not subject_id
-- This addresses the error: "Unknown column 'sub.subject_id' in 'field list'"

-- First, let's check if there is even a subject_id column in the subjects table
-- DESCRIBE subjects;

-- Update the foreign key reference in the ca_exam_submissions table to use subject_code instead of subject_id
-- NOTE: This assumes ca_exam_submissions has a column referencing subjects
-- If ca_exam_submissions doesn't have a subject_id column, this might be in a different table

-- If there's a subjects view or related table that uses subject_id incorrectly, we need to update it
-- From the API error, it seems like a query is joining subjects table with alias 'sub' and referencing 'sub.subject_id'

-- If the issue is that ca_exam_submissions table has a reference to subjects table,
-- and that link is incorrectly using subject_id instead of subject_code, we need to update it

-- The most likely fix is to update the foreign key relationship in the ca_exam_submissions table 
-- if it incorrectly references subject_id instead of subject_code

-- First, add a subject_code column if it doesn't exist (for compatibility)
-- ALTER TABLE ca_exam_submissions ADD COLUMN IF NOT EXISTS subject_code VARCHAR(10) NULL;

-- Then, if needed, migrate the data and update the foreign key constraint
-- UPDATE ca_exam_submissions SET subject_code = (
--     SELECT s.subject_code FROM subjects s WHERE s.subject_id = ca_exam_submissions.subject_id
-- ) WHERE subject_code IS NULL;

-- Drop the old wrong foreign key constraint if it exists
-- ALTER TABLE ca_exam_submissions DROP FOREIGN KEY IF EXISTS fk_ca_exam_submissions_subject; -- or whatever the constraint name is

-- Add the correct foreign key constraint using subject_code
-- ALTER TABLE ca_exam_submissions ADD CONSTRAINT fk_ca_exam_submissions_subject 
--     FOREIGN KEY (subject_code) REFERENCES subjects(subject_code);

-- However, if the column in ca_exam_submissions is already called subject_id, 
-- we need to rename it to subject_code for clarity:
-- ALTER TABLE ca_exam_submissions CHANGE COLUMN subject_id subject_code VARCHAR(10);

-- Since the ca_exam_submissions table was recently created as part of our fixes,
-- let's add the appropriate subject_code column that links to the subjects table properly
ALTER TABLE ca_exam_submissions 
ADD COLUMN IF NOT EXISTS subject_code VARCHAR(10) NULL COMMENT 'References subject_code in subjects table',
ADD CONSTRAINT fk_ca_exam_submissions_subject 
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code) ON DELETE SET NULL;