-- Migration: Add elective course support to subjects table
-- Date: 2025-09-16
-- Description: Adds columns to support elective courses and enhanced subject management

-- Add new columns for elective support
ALTER TABLE `subjects` 
ADD COLUMN `is_elective` BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Indicates if this subject is an elective course' AFTER `sub_section`,
ADD COLUMN `elective_group` VARCHAR(50) NULL COMMENT 'Group identifier for elective subjects (e.g., Science, Arts, Commercial)' AFTER `is_elective`,
ADD COLUMN `min_students` INT NULL COMMENT 'Minimum number of students required to run this elective' AFTER `elective_group`,
ADD COLUMN `max_students` INT NULL COMMENT 'Maximum number of students allowed for this elective' AFTER `min_students`,
ADD COLUMN `prerequisite_subjects` TEXT NULL COMMENT 'JSON array of prerequisite subject codes' AFTER `max_students`,
ADD COLUMN `description` TEXT NULL COMMENT 'Detailed description of the subject' AFTER `prerequisite_subjects`,
ADD COLUMN `credit_hours` INT DEFAULT 1 COMMENT 'Number of credit hours for this subject' AFTER `description`,
ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp' AFTER `credit_hours`,
ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp' AFTER `created_at`;

-- Add indexes for better performance
CREATE INDEX `idx_subjects_school_section` ON `subjects` (`school_id`, `section`);
CREATE INDEX `idx_subjects_is_elective` ON `subjects` (`is_elective`);
CREATE INDEX `idx_subjects_elective_group` ON `subjects` (`elective_group`);
CREATE INDEX `idx_subjects_status` ON `subjects` (`status`);
CREATE INDEX `idx_subjects_school_section_elective` ON `subjects` (`school_id`, `section`, `is_elective`);

-- Insert some sample elective subjects for testing
INSERT INTO `subjects` (
    `subject_code`, `subject`, `school_id`, `status`, `section`, `sub_section`,
    `is_elective`, `elective_group`, `min_students`, `max_students`, 
    `description`, `credit_hours`
) VALUES 
-- NURSERY electives
('NUR_ELE001', 'Creative Arts', 1, 'Active', 'NURSERY', NULL, TRUE, 'Creative', 5, 15, 'Introduction to creative arts and crafts', 1),
('NUR_ELE002', 'Music & Movement', 1, 'Active', 'NURSERY', NULL, TRUE, 'Creative', 5, 20, 'Basic music and movement activities', 1),

-- PRIMARY electives  
('PRI_ELE001', 'Computer Studies', 1, 'Active', 'PRIMARY', NULL, TRUE, 'Technology', 8, 25, 'Basic computer literacy and skills', 2),
('PRI_ELE002', 'French Language', 1, 'Active', 'PRIMARY', NULL, TRUE, 'Languages', 10, 30, 'Introduction to French language', 2),
('PRI_ELE003', 'Art & Design', 1, 'Active', 'PRIMARY', NULL, TRUE, 'Creative', 5, 20, 'Visual arts and design fundamentals', 1),

-- JUNIOR SECONDARY electives
('JUN_ELE001', 'Computer Science', 1, 'Active', 'JUNIOR SECONDARY', NULL, TRUE, 'Technology', 10, 30, 'Programming and computer science basics', 3),
('JUN_ELE002', 'French Language', 1, 'Active', 'JUNIOR SECONDARY', NULL, TRUE, 'Languages', 8, 25, 'Intermediate French language', 2),
('JUN_ELE003', 'Fine Arts', 1, 'Active', 'JUNIOR SECONDARY', NULL, TRUE, 'Creative', 5, 20, 'Advanced visual arts and creativity', 2),
('JUN_ELE004', 'Business Studies', 1, 'Active', 'JUNIOR SECONDARY', NULL, TRUE, 'Commercial', 10, 35, 'Introduction to business concepts', 3),

-- SENIOR SECONDARY electives
('SEN_ELE001', 'Further Mathematics', 1, 'Active', 'SENIOR SECONDARY', 'Science', TRUE, 'Science', 5, 20, 'Advanced mathematics for science students', 4),
('SEN_ELE002', 'Literature in English', 1, 'Active', 'SENIOR SECONDARY', 'Arts', TRUE, 'Arts', 8, 30, 'Advanced literature studies', 3),
('SEN_ELE003', 'Economics', 1, 'Active', 'SENIOR SECONDARY', 'Commercial', TRUE, 'Commercial', 10, 35, 'Economic principles and applications', 3),
('SEN_ELE004', 'Technical Drawing', 1, 'Active', 'SENIOR SECONDARY', 'Science', TRUE, 'Technology', 5, 15, 'Engineering drawing and design', 2);

-- Update some existing subjects to mark them as core (non-elective)
UPDATE `subjects` SET `is_elective` = FALSE, `credit_hours` = 3 WHERE `subject` IN ('English Language', 'General Mathematics', 'Basic Science');
UPDATE `subjects` SET `is_elective` = FALSE, `credit_hours` = 2 WHERE `subject` IN ('Social Studies', 'Civic Education');
UPDATE `subjects` SET `is_elective` = FALSE, `credit_hours` = 1 WHERE `section` = 'NURSERY' AND `is_elective` = FALSE;

-- Add some prerequisite examples (JSON format)
UPDATE `subjects` SET `prerequisite_subjects` = '["JUN004"]' WHERE `subject_code` = 'SEN_ELE001'; -- Further Math requires Basic Science
UPDATE `subjects` SET `prerequisite_subjects` = '["PRI_ELE001"]' WHERE `subject_code` = 'JUN_ELE001'; -- Computer Science requires basic computer studies

COMMIT;"