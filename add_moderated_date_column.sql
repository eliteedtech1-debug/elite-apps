-- Add moderated_date column to ca_exam_submissions table
-- This column tracks when a submission was moderated, addressing the error:
-- "Unknown column 'ces.moderated_date' in 'field list'"

ALTER TABLE `ca_exam_submissions` 
ADD COLUMN `moderated_date` DATETIME NULL DEFAULT NULL COMMENT 'Date when the submission was moderated/approved';