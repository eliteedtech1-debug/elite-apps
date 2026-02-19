-- ============================================================================
-- PRODUCTION SCRIPT: Remove Administrative Items from Default Teacher Menu
-- ============================================================================
-- Date: 2026-02-18
-- Purpose: Restrict administrative/configuration features from teacher role
-- Items to remove:
--   1. Reports Generator (ID: 54)
--   2. Broad Sheet (ID: 55)
--   3. Report Template (ID: 57)
--   4. Print Answer Sheets (ID: 1086)
--   5. Subject Mapping (ID: 121)
--   6. Syllabus Dashboard (ID: 1068)
--   7. Syllabus & Curriculum (ID: 21)
-- ============================================================================

-- BACKUP: View current state before changes
SELECT 'BEFORE CHANGES - Current Access' as status;
SELECT m.id, m.label, GROUP_CONCAT(DISTINCT ma.user_type ORDER BY ma.user_type) as user_types
FROM rbac_menu_items m
LEFT JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.id IN (54, 55, 57, 1086, 21, 121, 1068)
GROUP BY m.id, m.label
ORDER BY m.id;

-- ============================================================================
-- STEP 1: Remove direct teacher access
-- ============================================================================

-- Broad Sheet (ID: 55)
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 55 AND user_type = 'teacher';

-- Print Answer Sheets (ID: 1086)
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 1086 AND user_type = 'teacher';

-- Syllabus & Curriculum (ID: 21)
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 21 AND user_type = 'teacher';

-- Subject Mapping (ID: 121)
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 121 AND LOWER(user_type) = 'teacher';

-- Syllabus Dashboard (ID: 1068) - Remove both teacher and form_master
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 1068 AND LOWER(user_type) IN ('teacher', 'form_master');

-- ============================================================================
-- STEP 2: Remove form_master access (inherited by teacher)
-- ============================================================================

-- Reports Generator (ID: 54)
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 54 AND user_type = 'form_master';

-- Report Template (ID: 57)
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 57 AND user_type = 'form_master';

-- ============================================================================
-- VERIFICATION: View final state
-- ============================================================================

SELECT 'AFTER CHANGES - Final Access' as status;
SELECT m.id, m.label, 
       GROUP_CONCAT(DISTINCT ma.user_type ORDER BY ma.user_type) as user_types,
       CASE 
         WHEN GROUP_CONCAT(DISTINCT ma.user_type) LIKE '%teacher%' THEN '❌ TEACHER STILL HAS ACCESS'
         WHEN GROUP_CONCAT(DISTINCT ma.user_type) LIKE '%form_master%' THEN '⚠️ FORM_MASTER HAS ACCESS'
         ELSE '✅ TEACHER REMOVED'
       END as status
FROM rbac_menu_items m
LEFT JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.id IN (54, 55, 57, 1086, 21, 121, 1068)
GROUP BY m.id, m.label
ORDER BY m.id;

-- ============================================================================
-- AFFECTED RECORDS SUMMARY
-- ============================================================================
SELECT 'Summary: 7 menu items restricted from teacher role' as summary;
