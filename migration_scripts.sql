-- =====================================================
-- ADMISSION MODULE MIGRATION SCRIPTS
-- Date: 2025-12-13
-- Purpose: Normalize school_applicants table structure
-- =====================================================

-- Set session variables for safety
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- =====================================================
-- PHASE 1: BACKUP AND PREPARATION
-- =====================================================

-- Create backup table
DROP TABLE IF EXISTS school_applicants_backup;
CREATE TABLE school_applicants_backup AS SELECT * FROM school_applicants;

-- Log migration start
INSERT INTO migration_log (migration_name, phase, status, started_at) 
VALUES ('admission_module_normalization', 'backup', 'started', NOW());

-- =====================================================
-- PHASE 2: ALTER EXISTING TABLE
-- =====================================================

-- Add new columns to school_applicants
ALTER TABLE school_applicants 
ADD COLUMN primary_guardian_id INT NULL AFTER upload_transfer_certificate,
ADD COLUMN primary_parent_id INT NULL AFTER primary_guardian_id,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER primary_parent_id,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
ADD COLUMN created_by VARCHAR(50) NULL AFTER updated_at,
ADD COLUMN updated_by VARCHAR(50) NULL AFTER created_by;

-- Fix typos in existing columns
ALTER TABLE school_applicants 
CHANGE COLUMN last_school_atterded last_school_attended VARCHAR(255);

-- Rename columns for clarity (optional - can be done later)
-- ALTER TABLE school_applicants 
-- CHANGE COLUMN l_g_a local_government_area VARCHAR(100),
-- CHANGE COLUMN sex gender VARCHAR(10),
-- CHANGE COLUMN others other_subjects VARCHAR(100);

-- Add essential indexes for performance
CREATE INDEX idx_school_branch ON school_applicants(school_id, branch_id);
CREATE INDEX idx_applicant_id ON school_applicants(applicant_id);
CREATE INDEX idx_status ON school_applicants(status);
CREATE INDEX idx_academic_year ON school_applicants(academic_year);
CREATE INDEX idx_admission_no ON school_applicants(admission_no);

-- Log phase completion
UPDATE migration_log SET status = 'completed', completed_at = NOW() 
WHERE migration_name = 'admission_module_normalization' AND phase = 'backup';

INSERT INTO migration_log (migration_name, phase, status, started_at) 
VALUES ('admission_module_normalization', 'alter_table', 'completed', NOW());

-- =====================================================
-- PHASE 3: CREATE NEW NORMALIZED TABLES
-- =====================================================

-- Create admission_guardians table
DROP TABLE IF EXISTS admission_guardians;
CREATE TABLE admission_guardians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guardian_code VARCHAR(50) UNIQUE NOT NULL,
    applicant_id VARCHAR(50) NOT NULL,
    school_id VARCHAR(20) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    
    -- Guardian details
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    home_address TEXT,
    relationship_to_applicant VARCHAR(50),
    occupation VARCHAR(100),
    workplace_address TEXT,
    
    -- Contact preferences
    is_primary_contact BOOLEAN DEFAULT FALSE,
    preferred_contact_method ENUM('phone', 'email', 'sms') DEFAULT 'phone',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    
    -- Indexes
    INDEX idx_applicant (applicant_id),
    INDEX idx_school_branch (school_id, branch_id),
    INDEX idx_guardian_code (guardian_code),
    INDEX idx_primary_contact (is_primary_contact)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admission_parents table
DROP TABLE IF EXISTS admission_parents;
CREATE TABLE admission_parents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_code VARCHAR(50) UNIQUE NOT NULL,
    applicant_id VARCHAR(50) NOT NULL,
    school_id VARCHAR(20) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    
    -- Parent details
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    home_address TEXT,
    relationship_to_applicant ENUM('father', 'mother', 'step_father', 'step_mother', 'adoptive_father', 'adoptive_mother', 'other'),
    occupation VARCHAR(100),
    workplace_name VARCHAR(255),
    workplace_address TEXT,
    
    -- Additional info
    is_guardian BOOLEAN DEFAULT FALSE,
    is_emergency_contact BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    
    -- Indexes
    INDEX idx_applicant (applicant_id),
    INDEX idx_school_branch (school_id, branch_id),
    INDEX idx_parent_code (parent_code),
    INDEX idx_relationship (relationship_to_applicant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admission_documents table
DROP TABLE IF EXISTS admission_documents;
CREATE TABLE admission_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    applicant_id VARCHAR(50) NOT NULL,
    school_id VARCHAR(20) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    
    -- Document details
    document_type ENUM('birth_certificate', 'transfer_certificate', 'passport_photo', 
                      'medical_report', 'previous_report_card', 'guardian_id', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(50),
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    
    -- Audit fields
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(50),
    
    -- Indexes
    INDEX idx_applicant (applicant_id),
    INDEX idx_school_branch (school_id, branch_id),
    INDEX idx_document_type (document_type),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admission_status_history table
DROP TABLE IF EXISTS admission_status_history;
CREATE TABLE admission_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    applicant_id VARCHAR(50) NOT NULL,
    school_id VARCHAR(20) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    
    -- Status change details
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason TEXT,
    notes TEXT,
    
    -- Exam details (if status change related to exam)
    exam_mathematics VARCHAR(5),
    exam_english VARCHAR(5),
    exam_other_score INT,
    exam_total_score INT,
    exam_percentage DECIMAL(5,2),
    
    -- Change tracking
    changed_by VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Indexes
    INDEX idx_applicant (applicant_id),
    INDEX idx_school_branch (school_id, branch_id),
    INDEX idx_status_change (old_status, new_status),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log phase completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_normalization', 'create_tables', 'completed', NOW(), NOW());

-- =====================================================
-- PHASE 4: DATA MIGRATION
-- =====================================================

-- Migrate guardian data
INSERT INTO admission_guardians (
    guardian_code, applicant_id, school_id, branch_id,
    full_name, phone_number, email_address, home_address, 
    relationship_to_applicant, is_primary_contact, created_at
)
SELECT 
    COALESCE(guardian_id, CONCAT('GUR/', school_id, '/', LPAD(ROW_NUMBER() OVER (ORDER BY id), 5, '0'))),
    applicant_id, 
    school_id, 
    COALESCE(branch_id, ''),
    guardian_name, 
    guardian_phone, 
    guardian_email, 
    guardian_address,
    COALESCE(guardian_relationship, 'guardian'), 
    TRUE,
    COALESCE(created_at, NOW())
FROM school_applicants 
WHERE guardian_name IS NOT NULL 
  AND guardian_name != '' 
  AND guardian_name != 'NULL';

-- Migrate parent data
INSERT INTO admission_parents (
    parent_code, applicant_id, school_id, branch_id,
    full_name, phone_number, email_address, home_address,
    relationship_to_applicant, occupation, is_guardian, created_at
)
SELECT 
    COALESCE(parent_id, CONCAT('PAR/', school_id, '/', LPAD(ROW_NUMBER() OVER (ORDER BY id), 5, '0'))),
    applicant_id, 
    school_id, 
    COALESCE(branch_id, ''),
    parent_fullname, 
    parent_phone, 
    parent_email, 
    parent_address,
    'other', -- Default relationship
    parent_occupation,
    FALSE,
    COALESCE(created_at, NOW())
FROM school_applicants 
WHERE parent_fullname IS NOT NULL 
  AND parent_fullname != '' 
  AND parent_fullname != 'NULL';

-- Update foreign key references in school_applicants
UPDATE school_applicants sa
SET primary_guardian_id = (
    SELECT id FROM admission_guardians ag 
    WHERE ag.applicant_id = sa.applicant_id 
    AND ag.is_primary_contact = TRUE 
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM admission_guardians ag 
    WHERE ag.applicant_id = sa.applicant_id
);

UPDATE school_applicants sa
SET primary_parent_id = (
    SELECT id FROM admission_parents ap 
    WHERE ap.applicant_id = sa.applicant_id 
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM admission_parents ap 
    WHERE ap.applicant_id = sa.applicant_id
);

-- Migrate existing document references
INSERT INTO admission_documents (
    applicant_id, school_id, branch_id, document_type, 
    document_name, file_path, uploaded_at
)
SELECT 
    applicant_id, 
    school_id, 
    COALESCE(branch_id, ''),
    'other',
    'Application Upload',
    upload,
    COALESCE(created_at, NOW())
FROM school_applicants 
WHERE upload IS NOT NULL 
  AND upload != '' 
  AND upload != 'NULL';

-- Migrate transfer certificates
INSERT INTO admission_documents (
    applicant_id, school_id, branch_id, document_type, 
    document_name, file_path, uploaded_at
)
SELECT 
    applicant_id, 
    school_id, 
    COALESCE(branch_id, ''),
    'transfer_certificate',
    'Transfer Certificate',
    upload_transfer_certificate,
    COALESCE(created_at, NOW())
FROM school_applicants 
WHERE upload_transfer_certificate IS NOT NULL 
  AND upload_transfer_certificate != '' 
  AND upload_transfer_certificate != 'NULL';

-- Create initial status history for existing records
INSERT INTO admission_status_history (
    applicant_id, school_id, branch_id, old_status, new_status,
    change_reason, changed_by, changed_at
)
SELECT 
    applicant_id, 
    school_id, 
    COALESCE(branch_id, ''),
    NULL,
    COALESCE(status, 'pending'),
    'Initial migration from existing data',
    'system_migration',
    COALESCE(created_at, NOW())
FROM school_applicants;

-- Log phase completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_normalization', 'data_migration', 'completed', NOW(), NOW());

-- =====================================================
-- PHASE 5: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraints (optional - can be added later)
-- ALTER TABLE school_applicants 
-- ADD CONSTRAINT fk_primary_guardian 
-- FOREIGN KEY (primary_guardian_id) REFERENCES admission_guardians(id) ON DELETE SET NULL;

-- ALTER TABLE school_applicants 
-- ADD CONSTRAINT fk_primary_parent 
-- FOREIGN KEY (primary_parent_id) REFERENCES admission_parents(id) ON DELETE SET NULL;

-- Add foreign keys to new tables
ALTER TABLE admission_guardians 
ADD CONSTRAINT fk_guardian_applicant 
FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE;

ALTER TABLE admission_parents 
ADD CONSTRAINT fk_parent_applicant 
FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE;

ALTER TABLE admission_documents 
ADD CONSTRAINT fk_document_applicant 
FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE;

ALTER TABLE admission_status_history 
ADD CONSTRAINT fk_status_applicant 
FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE;

-- Log phase completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_normalization', 'add_constraints', 'completed', NOW(), NOW());

-- =====================================================
-- PHASE 6: CREATE MIGRATION LOG TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(100) NOT NULL,
    phase VARCHAR(50) NOT NULL,
    status ENUM('started', 'completed', 'failed') NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- Check data integrity
SELECT 'Data Integrity Check' as check_type;

SELECT 
    'Total Applicants' as metric,
    COUNT(*) as count
FROM school_applicants;

SELECT 
    'Applicants with Guardians' as metric,
    COUNT(DISTINCT sa.applicant_id) as count
FROM school_applicants sa
INNER JOIN admission_guardians ag ON sa.applicant_id = ag.applicant_id;

SELECT 
    'Applicants with Parents' as metric,
    COUNT(DISTINCT sa.applicant_id) as count
FROM school_applicants sa
INNER JOIN admission_parents ap ON sa.applicant_id = ap.applicant_id;

SELECT 
    'Orphaned Applicants (No Guardian/Parent)' as metric,
    COUNT(*) as count
FROM school_applicants 
WHERE primary_guardian_id IS NULL AND primary_parent_id IS NULL;

SELECT 
    'Documents Migrated' as metric,
    COUNT(*) as count
FROM admission_documents;

SELECT 
    'Status History Records' as metric,
    COUNT(*) as count
FROM admission_status_history;

-- Multi-tenant isolation check
SELECT 
    'Multi-tenant Check' as check_type,
    school_id, 
    branch_id, 
    COUNT(*) as applicant_count
FROM school_applicants 
GROUP BY school_id, branch_id
ORDER BY school_id, branch_id;

-- Restore session variables
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- Final log entry
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_normalization', 'complete', 'completed', NOW(), NOW());

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- =====================================================

SELECT 'ADMISSION MODULE MIGRATION COMPLETED SUCCESSFULLY' as status;
SELECT 'Backup table: school_applicants_backup' as backup_info;
SELECT 'Check migration_log table for detailed status' as log_info;
