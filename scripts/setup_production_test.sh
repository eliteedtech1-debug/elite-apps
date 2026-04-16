#!/bin/bash
# RBAC Migration Test with Production Database
# Uses actual production backup: kirmaskngov_skcooly_db.sql

echo "🧪 RBAC Migration Test with Production Database"
echo "=============================================="

# Check if production backup exists
if [ ! -f "kirmaskngov_skcooly_db.sql" ]; then
    echo "❌ ERROR: kirmaskngov_skcooly_db.sql not found!"
    echo "Please ensure the production backup file is in the current directory."
    exit 1
fi

echo "✅ Found production backup: kirmaskngov_skcooly_db.sql"

# Step 1: Create test database
echo "📋 Step 1: Creating test database..."
mysql -u root -e "DROP DATABASE IF EXISTS rbac_production_test;"
mysql -u root -e "CREATE DATABASE rbac_production_test;"

# Step 2: Import production backup
echo "📋 Step 2: Importing production database..."
echo "   This may take a few minutes for large databases..."
mysql -u root rbac_production_test < kirmaskngov_skcooly_db.sql

# Step 3: Analyze current production state
echo "📋 Step 3: Analyzing current production state..."
mysql -u root rbac_production_test -e "
SELECT '=== PRODUCTION DATABASE ANALYSIS ===' as status;

-- Check if RBAC tables exist
SELECT 'RBAC Tables Check' as test_name,
CASE 
  WHEN COUNT(*) >= 2 THEN 'PASS: RBAC tables exist'
  ELSE 'FAIL: Missing RBAC tables'
END as result
FROM information_schema.tables 
WHERE table_schema = 'rbac_production_test' 
  AND table_name IN ('rbac_menu_items', 'rbac_menu_access');

-- Current menu items count
SELECT 'Menu Items' as metric, COUNT(*) as count 
FROM rbac_menu_items WHERE is_active = 1;

-- Current access records count  
SELECT 'Access Records' as metric, COUNT(*) as count 
FROM rbac_menu_access;

-- Current admin sidebar count
SELECT 'Admin Sidebar Items' as metric, COUNT(DISTINCT ma.menu_item_id) as count 
FROM rbac_menu_access ma 
JOIN rbac_menu_items m ON ma.menu_item_id = m.id 
WHERE ma.user_type = 'admin' AND m.is_active = 1;

-- Check for existing contamination
SELECT 'Current Contamination' as metric, COUNT(*) as count
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1
  AND m.id IN (32, 33, 34, 35, 36, 1085, 30) -- Student/parent items
  AND ma.user_type IN ('admin', 'branchadmin', 'director', 'principal');

-- Check current sidebar distribution
SELECT 'CURRENT SIDEBAR DISTRIBUTION' as status;
SELECT ma.user_type, COUNT(DISTINCT ma.menu_item_id) as items
FROM rbac_menu_access ma
JOIN rbac_menu_items m ON ma.menu_item_id = m.id
WHERE m.is_active = 1 AND ma.user_type IN ('admin', 'student', 'parent', 'teacher')
GROUP BY ma.user_type
ORDER BY items DESC;
"

echo ""
echo "✅ Production test database 'rbac_production_test' created successfully!"
echo "🎯 Ready to test migration on actual production data"
echo ""
echo "Next steps:"
echo "1. Review the analysis above"
echo "2. Run: mysql -u root rbac_production_test < RBAC_PRODUCTION_MIGRATION.sql"
echo "3. Validate results"
echo "4. If successful, apply to actual production"
