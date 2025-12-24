-- Migration: Rename unclear columns in school_applicants table
-- Date: 2025-12-14
-- Description: Rename columns with unclear labels to more readable names

USE elite_db;

-- Rename name1 to parent_name
ALTER TABLE school_applicants CHANGE name1 parent_name VARCHAR(255);

-- Rename home_address1 to parent_address
ALTER TABLE school_applicants CHANGE home_address1 parent_address TEXT;

-- Rename state_of_origin variants
ALTER TABLE school_applicants CHANGE state_of_origin1 father_state_of_origin VARCHAR(100);
ALTER TABLE school_applicants CHANGE state_of_origin2 mother_state_of_origin VARCHAR(100);
ALTER TABLE school_applicants CHANGE state_of_origin3 guardian_state_of_origin VARCHAR(100);

-- Rename date_of_birth1 to guardian_date_of_birth
ALTER TABLE school_applicants CHANGE date_of_birth1 guardian_date_of_birth DATE;

-- Rename examination_number1 to exam_seat_number
ALTER TABLE school_applicants CHANGE examination_number1 exam_seat_number VARCHAR(50);

-- Rename time1 to exam_time
ALTER TABLE school_applicants CHANGE time1 exam_time TIME;

-- Rename venue1 to exam_venue
ALTER TABLE school_applicants CHANGE venue1 exam_venue VARCHAR(255);

-- Fix typo: last_school_atterded to last_school_attended
ALTER TABLE school_applicants CHANGE last_school_atterded last_school_attended VARCHAR(100);

-- Fix typo: father_occapation to father_occupation
ALTER TABLE school_applicants CHANGE father_occapation father_occupation VARCHAR(100);

-- Rename telephone_address to parent_phone
ALTER TABLE school_applicants CHANGE telephone_address parent_phone VARCHAR(20);

-- Rename office_marker_address to parent_office_address
ALTER TABLE school_applicants CHANGE office_marker_address parent_office_address TEXT;

-- Rollback script (if needed):
/*
ALTER TABLE school_applicants CHANGE parent_name name1 VARCHAR(255);
ALTER TABLE school_applicants CHANGE parent_address home_address1 TEXT;
ALTER TABLE school_applicants CHANGE father_state_of_origin state_of_origin1 VARCHAR(100);
ALTER TABLE school_applicants CHANGE mother_state_of_origin state_of_origin2 VARCHAR(100);
ALTER TABLE school_applicants CHANGE guardian_state_of_origin state_of_origin3 VARCHAR(100);
ALTER TABLE school_applicants CHANGE guardian_date_of_birth date_of_birth1 DATE;
ALTER TABLE school_applicants CHANGE exam_seat_number examination_number1 VARCHAR(50);
ALTER TABLE school_applicants CHANGE exam_time time1 TIME;
ALTER TABLE school_applicants CHANGE exam_venue venue1 VARCHAR(255);
ALTER TABLE school_applicants CHANGE last_school_attended last_school_atterded VARCHAR(100);
ALTER TABLE school_applicants CHANGE father_occupation father_occapation VARCHAR(100);
ALTER TABLE school_applicants CHANGE parent_phone telephone_address VARCHAR(20);
ALTER TABLE school_applicants CHANGE parent_office_address office_marker_address TEXT;
*/
