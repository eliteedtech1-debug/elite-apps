-- =====================================================
-- DATA VALIDATION QUERIES
-- Date: 2025-12-13
-- Purpose: Validate data integrity after migration
-- =====================================================

-- =====================================================
-- SECTION 1: BASIC DATA COUNTS
-- =====================================================

SELECT '=== BASIC DATA COUNTS ===' as section;

-- Total applicants
SELECT 
    'Total Applicants' as metric,
    COUNT(*) as count,
    COUNT(DISTINCT applicant_id) as unique_applicants
FROM school_applicants;

-- Applicants by status
SELECT 
    'Applicants by Status' as metric,
    status,
    COUNT(*) as count
FROM school_applicants 
GROUP BY status
ORDER BY count DESC;

-- Applicants by school and branch
SELECT 
    'Applicants by School/Branch' as metric,
    school_id,
    branch_id,
    COUNT(*) as count
FROM school_applicants 
GROUP BY school_id, branch_id
ORDER BY school_id, branch_id;

-- Applicants by academic year
SELECT 
    'Applicants by Academic Year' as metric,
    academic_year,
    COUNT(*) as count
FROM school_applicants 
GROUP BY academic_year
ORDER BY academic_year DESC;

-- =====================================================
-- SECTION 2: NORMALIZED TABLE COUNTS
-- =====================================================

SELECT '=== NORMALIZED TABLE COUNTS ===' as section;

-- Guardian records
SELECT 
    'Guardian Records' as metric,
    COUNT(*) as total_guardians,
    COUNT(DISTINCT applicant_id) as applicants_with_guardians,
    COUNT(CASE WHEN is_primary_contact = TRUE THEN 1 END) as primary_guardians
FROM admission_guardians;

-- Parent records
SELECT 
    'Parent Records' as metric,
    COUNT(*) as total_parents,
    COUNT(DISTINCT applicant_id) as applicants_with_parents,
    COUNT(CASE WHEN is_guardian = TRUE THEN 1 END) as parents_who_are_guardians
FROM admission_parents;

-- Document records
SELECT 
    'Document Records' as metric,
    COUNT(*) as total_documents,
    COUNT(DISTINCT applicant_id) as applicants_with_documents
FROM admission_documents;

-- Document types breakdown
SELECT 
    'Documents by Type' as metric,
    document_type,
    COUNT(*) as count
FROM admission_documents 
GROUP BY document_type
ORDER BY count DESC;

-- Status history records
SELECT 
    'Status History Records' as metric,
    COUNT(*) as total_status_changes,
    COUNT(DISTINCT applicant_id) as applicants_with_history
FROM admission_status_history;

-- =====================================================
-- SECTION 3: DATA INTEGRITY CHECKS
-- =====================================================

SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for orphaned applicants (no guardian or parent)
SELECT 
    'Orphaned Applicants' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS' 
        ELSE 'FAIL - Some applicants have no guardian or parent' 
    END as status
FROM school_applicants 
WHERE primary_guardian_id IS NULL AND primary_parent_id IS NULL;

-- Check for invalid foreign key references
SELECT 
    'Invalid Guardian References' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS' 
        ELSE 'FAIL - Invalid guardian references found' 
    END as status
FROM school_applicants sa
LEFT JOIN admission_guardians ag ON sa.primary_guardian_id = ag.id
WHERE sa.primary_guardian_id IS NOT NULL AND ag.id IS NULL;

SELECT 
    'Invalid Parent References' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS' 
        ELSE 'FAIL - Invalid parent references found' 
    END as status
FROM school_applicants sa
LEFT JOIN admission_parents ap ON sa.primary_parent_id = ap.id
WHERE sa.primary_parent_id IS NOT NULL AND ap.id IS NULL;

-- Check for duplicate applicant IDs
SELECT 
    'Duplicate Applicant IDs' as check_name,
    COUNT(*) as duplicates,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS' 
        ELSE 'FAIL - Duplicate applicant IDs found' 
    END as status
FROM (
    SELECT applicant_id, COUNT(*) as cnt
    FROM school_applicants 
    GROUP BY applicant_id
    HAVING cnt > 1
) duplicates;

-- Check for missing required fields
SELECT 
    'Missing Required Fields' as check_name,
    SUM(CASE WHEN name_of_applicant IS NULL OR name_of_applicant = '' THEN 1 ELSE 0 END) as missing_names,
    SUM(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 ELSE 0 END) as missing_school_id,
    SUM(CASE WHEN applicant_id IS NULL OR applicant_id = '' THEN 1 ELSE 0 END) as missing_applicant_id,
    CASE 
        WHEN SUM(CASE WHEN name_of_applicant IS NULL OR name_of_applicant = '' THEN 1 ELSE 0 END) = 0
         AND SUM(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 ELSE 0 END) = 0
         AND SUM(CASE WHEN applicant_id IS NULL OR applicant_id = '' THEN 1 ELSE 0 END) = 0
        THEN 'PASS' 
        ELSE 'FAIL - Missing required fields found' 
    END as status
FROM school_applicants;

-- =====================================================
-- SECTION 4: MULTI-TENANT ISOLATION VALIDATION
-- =====================================================

SELECT '=== MULTI-TENANT ISOLATION VALIDATION ===' as section;

-- Check all tables have proper school_id and branch_id
SELECT 
    'school_applicants Multi-tenant' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 END) as missing_school_id,
    COUNT(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 END) as missing_branch_id,
    CASE 
        WHEN COUNT(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 END) = 0
         AND COUNT(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 END) = 0
        THEN 'PASS' 
        ELSE 'FAIL - Missing tenant identifiers' 
    END as status
FROM school_applicants;

SELECT 
    'admission_guardians Multi-tenant' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 END) as missing_school_id,
    COUNT(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 END) as missing_branch_id,
    CASE 
        WHEN COUNT(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 END) = 0
         AND COUNT(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 END) = 0
        THEN 'PASS' 
        ELSE 'FAIL - Missing tenant identifiers' 
    END as status
FROM admission_guardians;

SELECT 
    'admission_parents Multi-tenant' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 END) as missing_school_id,
    COUNT(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 END) as missing_branch_id,
    CASE 
        WHEN COUNT(CASE WHEN school_id IS NULL OR school_id = '' THEN 1 END) = 0
         AND COUNT(CASE WHEN branch_id IS NULL OR branch_id = '' THEN 1 END) = 0
        THEN 'PASS' 
        ELSE 'FAIL - Missing tenant identifiers' 
    END as status
FROM admission_parents;

-- Cross-table tenant consistency check
SELECT 
    'Cross-table Tenant Consistency' as check_name,
    COUNT(*) as inconsistent_records,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS' 
        ELSE 'FAIL - Tenant inconsistency between tables' 
    END as status
FROM school_applicants sa
LEFT JOIN admission_guardians ag ON sa.applicant_id = ag.applicant_id
WHERE ag.applicant_id IS NOT NULL 
  AND (sa.school_id != ag.school_id OR sa.branch_id != ag.branch_id);

-- =====================================================
-- SECTION 5: PERFORMANCE VALIDATION
-- =====================================================

SELECT '=== PERFORMANCE VALIDATION ===' as section;

-- Check if indexes exist
SELECT 
    'Required Indexes' as check_name,
    table_name,
    index_name,
    column_name,
    'EXISTS' as status
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name IN ('school_applicants', 'admission_guardians', 'admission_parents', 'admission_documents', 'admission_status_history')
  AND index_name IN ('idx_school_branch', 'idx_applicant_id', 'idx_status', 'idx_academic_year', 'idx_applicant', 'idx_guardian_code', 'idx_parent_code')
ORDER BY table_name, index_name;

-- Query performance test (basic)
SELECT 
    'Query Performance Test' as test_name,
    'SELECT with school_id filter' as query_type,
    COUNT(*) as result_count,
    'Check execution time manually' as note
FROM school_applicants 
WHERE school_id = (SELECT school_id FROM school_applicants LIMIT 1);

-- =====================================================
-- SECTION 6: MIGRATION COMPLETENESS
-- =====================================================

SELECT '=== MIGRATION COMPLETENESS ===' as section;

-- Compare record counts before and after
SELECT 
    'Migration Completeness' as check_name,
    (SELECT COUNT(*) FROM school_applicants) as current_count,
    (SELECT COUNT(*) FROM school_applicants_backup) as backup_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM school_applicants) = (SELECT COUNT(*) FROM school_applicants_backup)
        THEN 'PASS - No data lost' 
        ELSE 'FAIL - Data count mismatch' 
    END as status;

-- Check migration log
SELECT 
    'Migration Log Status' as check_name,
    migration_name,
    phase,
    status,
    started_at,
    completed_at
FROM migration_log 
WHERE migration_name = 'admission_module_normalization'
ORDER BY started_at;

-- =====================================================
-- SECTION 7: SAMPLE DATA VERIFICATION
-- =====================================================

SELECT '=== SAMPLE DATA VERIFICATION ===' as section;

-- Show sample applicant with related data
SELECT 'Sample Applicant Data' as sample_type;

SELECT 
    sa.applicant_id,
    sa.name_of_applicant,
    sa.status,
    sa.school_id,
    sa.branch_id,
    ag.full_name as guardian_name,
    ap.full_name as parent_name,
    COUNT(ad.id) as document_count,
    COUNT(ash.id) as status_changes
FROM school_applicants sa
LEFT JOIN admission_guardians ag ON sa.primary_guardian_id = ag.id
LEFT JOIN admission_parents ap ON sa.primary_parent_id = ap.id
LEFT JOIN admission_documents ad ON sa.applicant_id = ad.applicant_id
LEFT JOIN admission_status_history ash ON sa.applicant_id = ash.applicant_id
GROUP BY sa.applicant_id, sa.name_of_applicant, sa.status, sa.school_id, sa.branch_id, ag.full_name, ap.full_name
LIMIT 5;

-- =====================================================
-- SECTION 8: FINAL VALIDATION SUMMARY
-- =====================================================

SELECT '=== FINAL VALIDATION SUMMARY ===' as section;

-- Overall validation status
SELECT 
    'Overall Migration Status' as summary,
    CASE 
        WHEN (
            -- Check all critical validations pass
            (SELECT COUNT(*) FROM school_applicants WHERE primary_guardian_id IS NULL AND primary_parent_id IS NULL) = 0
            AND (SELECT COUNT(*) FROM school_applicants sa LEFT JOIN admission_guardians ag ON sa.primary_guardian_id = ag.id WHERE sa.primary_guardian_id IS NOT NULL AND ag.id IS NULL) = 0
            AND (SELECT COUNT(*) FROM school_applicants sa LEFT JOIN admission_parents ap ON sa.primary_parent_id = ap.id WHERE sa.primary_parent_id IS NOT NULL AND ap.id IS NULL) = 0
            AND (SELECT COUNT(*) FROM school_applicants) = (SELECT COUNT(*) FROM school_applicants_backup)
        ) THEN 'SUCCESS - Migration completed successfully'
        ELSE 'WARNING - Some validation checks failed, review above results'
    END as status;

-- Recommendations based on validation
SELECT 
    'Recommendations' as category,
    CASE 
        WHEN (SELECT COUNT(*) FROM school_applicants WHERE primary_guardian_id IS NULL AND primary_parent_id IS NULL) > 0
        THEN 'Action Required: Some applicants have no guardian or parent assigned'
        WHEN (SELECT COUNT(*) FROM school_applicants sa LEFT JOIN admission_guardians ag ON sa.primary_guardian_id = ag.id WHERE sa.primary_guardian_id IS NOT NULL AND ag.id IS NULL) > 0
        THEN 'Action Required: Invalid guardian references found'
        WHEN (SELECT COUNT(*) FROM school_applicants sa LEFT JOIN admission_parents ap ON sa.primary_parent_id = ap.id WHERE sa.primary_parent_id IS NOT NULL AND ap.id IS NULL) > 0
        THEN 'Action Required: Invalid parent references found'
        ELSE 'No immediate action required - Migration appears successful'
    END as recommendation;

-- =====================================================
-- END OF VALIDATION
-- =====================================================

SELECT 'DATA VALIDATION COMPLETED' as status;
SELECT CURRENT_TIMESTAMP as validation_completed_at;
