# Normalization Plan - school_applicants Table

**Date:** 2025-12-13  
**DBA Expert:** Normalization Strategy for Admission Module  
**Project:** Elite Core - Production-Ready Admission Application Module

---

## 🎯 NORMALIZATION OBJECTIVES

1. **MAXIMIZE** reuse of existing `school_applicants` table
2. **EXTRACT** only clearly distinct entities to reduce redundancy
3. **PRESERVE** all existing data and workflows
4. **MAINTAIN** backward compatibility during transition
5. **ENSURE** multi-tenant isolation (school_id, branch_id)

---

## 📋 PROPOSED TABLE STRUCTURE

### **1. school_applicants (MODIFIED - Primary Table)**

**Purpose:** Core admission application data  
**Changes:** Minimal - fix typos, add indexes, deprecate unused fields

```sql
-- Core fields (KEEP AS-IS)
id INT AUTO_INCREMENT PRIMARY KEY,
applicant_id VARCHAR(50) UNIQUE NOT NULL,
school_id VARCHAR(20) NOT NULL,
branch_id VARCHAR(20) NOT NULL,
academic_year VARCHAR(20) NOT NULL,

-- Applicant data (KEEP AS-IS)
name_of_applicant VARCHAR(255) NOT NULL,
date_of_birth DATE,
gender VARCHAR(10), -- RENAMED from 'sex'
home_address TEXT,
type_of_application VARCHAR(50),

-- Location data (KEEP AS-IS)
state_of_origin VARCHAR(100),
local_government_area VARCHAR(100), -- RENAMED from 'l_g_a'
nationality VARCHAR(100),

-- Previous education (KEEP AS-IS)
last_school_attended VARCHAR(255), -- FIXED typo from 'last_school_atterded'
last_class VARCHAR(100),

-- Exam scores (KEEP AS-IS)
mathematics VARCHAR(5),
english VARCHAR(5),
other_score INT(11),
other_subjects VARCHAR(100), -- RENAMED from 'others'

-- Health data (KEEP AS-IS)
special_health_needs TEXT,
medical_condition VARCHAR(100),
blood_group VARCHAR(100),

-- Administrative (KEEP AS-IS)
admission_no VARCHAR(50),
status VARCHAR(20) DEFAULT 'pending',
current_class VARCHAR(100),

-- Documents (KEEP AS-IS)
upload VARCHAR(255),
upload_transfer_certificate VARCHAR(255),

-- Guardian/Parent references (NEW - Foreign Keys)
primary_guardian_id INT,
primary_parent_id INT,

-- Audit fields (NEW)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
created_by VARCHAR(50),
updated_by VARCHAR(50),

-- Legacy fields (DEPRECATED - Keep for compatibility)
guardian_id VARCHAR(50), -- Keep but deprecate
guardian_name VARCHAR(255), -- Keep but deprecate
guardian_phone VARCHAR(20), -- Keep but deprecate
guardian_email VARCHAR(100), -- Keep but deprecate
guardian_address TEXT, -- Keep but deprecate
guardian_relationship VARCHAR(50), -- Keep but deprecate
parent_id VARCHAR(50), -- Keep but deprecate
parent_fullname VARCHAR(255), -- Keep but deprecate
parent_phone VARCHAR(20), -- Keep but deprecate
parent_email VARCHAR(100), -- Keep but deprecate
parent_address TEXT, -- Keep but deprecate
parent_occupation VARCHAR(100), -- Keep but deprecate

-- Other legacy fields (DEPRECATED)
religion VARCHAR(100),
tribe VARCHAR(100),
caste VARCHAR(100),
mother_tongue VARCHAR(100),
language_known VARCHAR(100),
-- ... (keep all existing fields for compatibility)

-- Indexes
INDEX idx_school_branch (school_id, branch_id),
INDEX idx_applicant_id (applicant_id),
INDEX idx_status (status),
INDEX idx_academic_year (academic_year),
INDEX idx_admission_no (admission_no),

-- Foreign Keys (NEW)
FOREIGN KEY (primary_guardian_id) REFERENCES admission_guardians(id),
FOREIGN KEY (primary_parent_id) REFERENCES admission_parents(id)
```

### **2. admission_guardians (NEW - Extracted Entity)**

**Purpose:** Normalized guardian information  
**Justification:** Multiple guardians per applicant, cleaner data management

```sql
CREATE TABLE admission_guardians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guardian_code VARCHAR(50) UNIQUE NOT NULL, -- GUR/SCHOOL/00001
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
    
    -- Foreign Keys
    FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE
);
```

### **3. admission_parents (NEW - Extracted Entity)**

**Purpose:** Normalized parent information  
**Justification:** Separate from guardians, multiple parents per applicant

```sql
CREATE TABLE admission_parents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_code VARCHAR(50) UNIQUE NOT NULL, -- PAR/SCHOOL/00001
    applicant_id VARCHAR(50) NOT NULL,
    school_id VARCHAR(20) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    
    -- Parent details
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    home_address TEXT,
    relationship_to_applicant ENUM('father', 'mother', 'step_father', 'step_mother', 'adoptive_father', 'adoptive_mother'),
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
    
    -- Foreign Keys
    FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE
);
```

### **4. admission_documents (NEW - Document Management)**

**Purpose:** File upload and document tracking  
**Justification:** Better document management, multiple files per applicant

```sql
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
    
    -- Foreign Keys
    FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE
);
```

### **5. admission_status_history (NEW - Audit Trail)**

**Purpose:** Track all status changes for compliance  
**Justification:** Required for audit trail and workflow tracking

```sql
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
    INDEX idx_changed_at (changed_at),
    
    -- Foreign Keys
    FOREIGN KEY (applicant_id) REFERENCES school_applicants(applicant_id) ON DELETE CASCADE
);
```

---

## 🔄 MIGRATION STRATEGY

### **Phase 1: Preparation (Day 1)**
```sql
-- 1. Backup existing data
CREATE TABLE school_applicants_backup AS SELECT * FROM school_applicants;

-- 2. Add new columns to existing table
ALTER TABLE school_applicants 
ADD COLUMN primary_guardian_id INT,
ADD COLUMN primary_parent_id INT,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN created_by VARCHAR(50),
ADD COLUMN updated_by VARCHAR(50);

-- 3. Fix typos
ALTER TABLE school_applicants 
CHANGE COLUMN last_school_atterded last_school_attended VARCHAR(255),
CHANGE COLUMN l_g_a local_government_area VARCHAR(100),
CHANGE COLUMN sex gender VARCHAR(10),
CHANGE COLUMN others other_subjects VARCHAR(100);

-- 4. Add essential indexes
CREATE INDEX idx_school_branch ON school_applicants(school_id, branch_id);
CREATE INDEX idx_applicant_id ON school_applicants(applicant_id);
CREATE INDEX idx_status ON school_applicants(status);
CREATE INDEX idx_academic_year ON school_applicants(academic_year);
```

### **Phase 2: Create New Tables (Day 2-3)**
```sql
-- Create all new tables
CREATE TABLE admission_guardians (...);
CREATE TABLE admission_parents (...);
CREATE TABLE admission_documents (...);
CREATE TABLE admission_status_history (...);
```

### **Phase 3: Data Migration (Day 4-5)**
```sql
-- Migrate guardian data
INSERT INTO admission_guardians (
    guardian_code, applicant_id, school_id, branch_id,
    full_name, phone_number, email_address, home_address, 
    relationship_to_applicant, is_primary_contact
)
SELECT 
    guardian_id, applicant_id, school_id, branch_id,
    guardian_name, guardian_phone, guardian_email, guardian_address,
    guardian_relationship, TRUE
FROM school_applicants 
WHERE guardian_name IS NOT NULL AND guardian_name != '';

-- Migrate parent data
INSERT INTO admission_parents (
    parent_code, applicant_id, school_id, branch_id,
    full_name, phone_number, email_address, home_address,
    occupation, is_guardian
)
SELECT 
    parent_id, applicant_id, school_id, branch_id,
    parent_fullname, parent_phone, parent_email, parent_address,
    parent_occupation, FALSE
FROM school_applicants 
WHERE parent_fullname IS NOT NULL AND parent_fullname != '';

-- Update foreign key references
UPDATE school_applicants sa
SET primary_guardian_id = (
    SELECT id FROM admission_guardians ag 
    WHERE ag.applicant_id = sa.applicant_id 
    AND ag.is_primary_contact = TRUE 
    LIMIT 1
);

UPDATE school_applicants sa
SET primary_parent_id = (
    SELECT id FROM admission_parents ap 
    WHERE ap.applicant_id = sa.applicant_id 
    LIMIT 1
);
```

### **Phase 4: Add Constraints (Day 6)**
```sql
-- Add foreign key constraints
ALTER TABLE school_applicants 
ADD CONSTRAINT fk_primary_guardian 
FOREIGN KEY (primary_guardian_id) REFERENCES admission_guardians(id);

ALTER TABLE school_applicants 
ADD CONSTRAINT fk_primary_parent 
FOREIGN KEY (primary_parent_id) REFERENCES admission_parents(id);
```

---

## 🔒 ROLLBACK PROCEDURES

### **Emergency Rollback**
```sql
-- 1. Drop new constraints
ALTER TABLE school_applicants DROP FOREIGN KEY fk_primary_guardian;
ALTER TABLE school_applicants DROP FOREIGN KEY fk_primary_parent;

-- 2. Drop new columns
ALTER TABLE school_applicants 
DROP COLUMN primary_guardian_id,
DROP COLUMN primary_parent_id,
DROP COLUMN created_at,
DROP COLUMN updated_at,
DROP COLUMN created_by,
DROP COLUMN updated_by;

-- 3. Restore original column names
ALTER TABLE school_applicants 
CHANGE COLUMN last_school_attended last_school_atterded VARCHAR(255),
CHANGE COLUMN local_government_area l_g_a VARCHAR(100),
CHANGE COLUMN gender sex VARCHAR(10),
CHANGE COLUMN other_subjects others VARCHAR(100);

-- 4. Drop new tables
DROP TABLE admission_status_history;
DROP TABLE admission_documents;
DROP TABLE admission_parents;
DROP TABLE admission_guardians;

-- 5. Restore from backup if needed
-- TRUNCATE school_applicants;
-- INSERT INTO school_applicants SELECT * FROM school_applicants_backup;
```

---

## ✅ VALIDATION QUERIES

### **Data Integrity Checks**
```sql
-- Check all applicants have guardian/parent references
SELECT COUNT(*) as orphaned_applicants
FROM school_applicants 
WHERE primary_guardian_id IS NULL AND primary_parent_id IS NULL;

-- Check guardian data migration
SELECT 
    COUNT(DISTINCT sa.applicant_id) as total_applicants,
    COUNT(DISTINCT ag.applicant_id) as with_guardians,
    COUNT(DISTINCT ap.applicant_id) as with_parents
FROM school_applicants sa
LEFT JOIN admission_guardians ag ON sa.applicant_id = ag.applicant_id
LEFT JOIN admission_parents ap ON sa.applicant_id = ap.applicant_id;

-- Check multi-tenant isolation
SELECT school_id, branch_id, COUNT(*) as applicant_count
FROM school_applicants 
GROUP BY school_id, branch_id
ORDER BY school_id, branch_id;
```

---

## 📊 IMPACT ASSESSMENT

### **Benefits:**
- ✅ Cleaner data structure
- ✅ Better guardian/parent management
- ✅ Proper audit trail
- ✅ Document management system
- ✅ Maintains backward compatibility

### **Risks:**
- ⚠️ Temporary performance impact during migration
- ⚠️ Need to update application code gradually
- ⚠️ Increased complexity for simple queries

### **Mitigation:**
- 🛡️ Gradual migration approach
- 🛡️ Comprehensive rollback procedures
- 🛡️ Keep legacy fields during transition
- 🛡️ Extensive testing before production

---

## 🎯 SUCCESS CRITERIA

1. **Zero Data Loss:** All existing data preserved
2. **Backward Compatibility:** Existing APIs continue to work
3. **Performance:** No degradation in query performance
4. **Multi-Tenant:** All new tables properly isolated
5. **Audit Trail:** All status changes tracked
6. **Clean Structure:** Reduced redundancy and improved maintainability

This normalization plan provides a solid foundation for the admission module while preserving all existing functionality and data.
