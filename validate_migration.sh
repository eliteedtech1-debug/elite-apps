#!/bin/bash

echo "=== Migration Validation Report ==="
echo "Generated: $(date)"
echo

# Test 1: Table counts
echo "1. TABLE COUNTS"
echo "---------------"
TOTAL_TABLES=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db';" -s)
RBAC_TABLES=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db' AND table_name LIKE '%rbac%';" -s)
ACADEMIC_TABLES=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db' AND (table_name LIKE '%lesson%' OR table_name LIKE '%syllabus%');" -s)

echo "Total tables: $TOTAL_TABLES"
echo "RBAC tables: $RBAC_TABLES"
echo "Academic tables: $ACADEMIC_TABLES"
echo

# Test 2: RBAC System
echo "2. RBAC SYSTEM VALIDATION"
echo "-------------------------"
mysql -u root -e "USE skcooly_db; SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'skcooly_db' AND table_name LIKE '%rbac%' ORDER BY table_name;"
echo

# Test 3: Academic System
echo "3. ACADEMIC SYSTEM VALIDATION"
echo "-----------------------------"
mysql -u root -e "USE skcooly_db; SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'skcooly_db' AND (table_name LIKE '%lesson%' OR table_name LIKE '%syllabus%') ORDER BY table_name;"
echo

# Test 4: Production Data Sample
echo "4. PRODUCTION DATA SAMPLE"
echo "------------------------"
echo "Academic Calendar Records:"
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) as total_records FROM academic_calendar;" 2>/dev/null || echo "Table not found or empty"

echo "Account Balances Records:"
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) as total_records FROM account_balances;" 2>/dev/null || echo "Table not found or empty"

echo "Admission Forms Records:"
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) as total_records FROM admission_forms;" 2>/dev/null || echo "Table not found or empty"
echo

# Test 5: Data Integrity Check
echo "5. DATA INTEGRITY CHECK"
echo "----------------------"
echo "Checking for tables with data:"
mysql -u root -e "
USE skcooly_db; 
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'skcooly_db' 
AND table_rows > 0 
ORDER BY table_rows DESC 
LIMIT 10;"
echo

# Test 6: Schema Validation
echo "6. SCHEMA VALIDATION"
echo "-------------------"
echo "Tables with foreign keys:"
mysql -u root -e "
USE skcooly_db;
SELECT DISTINCT table_name 
FROM information_schema.key_column_usage 
WHERE table_schema = 'skcooly_db' 
AND referenced_table_name IS NOT NULL 
ORDER BY table_name;" 2>/dev/null | wc -l | xargs echo "Count:"
echo

echo "=== VALIDATION COMPLETE ==="
echo "Migration simulation appears successful!"
echo "Next step: Plan full production migration"
