#!/bin/bash
# RBAC Migration Test - Hybrid Approach
# Uses current development RBAC data to simulate production

echo "🧪 RBAC Migration Test - Production Simulation"
echo "============================================="

# Step 1: Create test database with current RBAC data
echo "📋 Step 1: Creating test database with current RBAC data..."
mysql -u root -e "DROP DATABASE IF EXISTS rbac_production_sim;"
mysql -u root -e "CREATE DATABASE rbac_production_sim;"

# Step 2: Copy RBAC tables from current development
echo "📋 Step 2: Copying RBAC tables from development..."
mysqldump -u root full_skcooly rbac_menu_items rbac_menu_access > rbac_current_state.sql
mysql -u root rbac_production_sim < rbac_current_state.sql

# Step 3: Analyze current state (before migration)
echo "📋 Step 3: Analyzing BEFORE migration state..."
mysql -u root rbac_production_sim -e "
SELECT '=== BEFORE MIGRATION ANALYSIS ===' as status;

-- Current menu items count
SELECT 'Active Menu Items' as metric, COUNT(*) as count 
FROM rbac_menu_items WHERE is_active = 1;

-- Current access records count  
SELECT 'Access Records' as metric, COUNT(*) as count 
FROM rbac_menu_access;

-- Current admin sidebar count (this should be high - the problem we're fixing)
SELECT 'Admin Sidebar Items' as metric, COUNT(DISTINCT ma.menu_item_id) as count 
FROM rbac_menu_access ma 
JOIN rbac_menu_items m ON ma.menu_item_id = m.id 
WHERE ma.user_type = 'admin' AND m.is_active = 1;

-- Check for contamination (student/parent items in admin sidebar)
SELECT 'Contamination Issues' as metric, COUNT(*) as count
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1
  AND m.id IN (32, 33, 34, 35, 36, 1085, 30) -- Student/parent items
  AND ma.user_type IN ('admin', 'branchadmin', 'director', 'principal');

-- Current sidebar distribution
SELECT 'CURRENT SIDEBAR DISTRIBUTION' as status;
SELECT ma.user_type, COUNT(DISTINCT ma.menu_item_id) as items
FROM rbac_menu_access ma
JOIN rbac_menu_items m ON ma.menu_item_id = m.id
WHERE m.is_active = 1 AND ma.user_type IN ('admin', 'student', 'parent', 'teacher')
GROUP BY ma.user_type
ORDER BY items DESC;

-- Check if new columns already exist (should be NO)
SELECT 'New Columns Check' as test_name,
CASE 
  WHEN COUNT(*) > 0 THEN 'ALREADY EXISTS: Migration may have been run'
  ELSE 'READY: No new columns found'
END as result
FROM information_schema.columns 
WHERE table_schema = 'rbac_production_sim' 
  AND table_name = 'rbac_menu_access'
  AND column_name IN ('access_type', 'is_removable');
"

echo ""
echo "✅ Production simulation database 'rbac_production_sim' ready!"
echo "🎯 This represents the current production state"
echo ""
echo "📊 MIGRATION TEST STEPS:"
echo "1. Review the BEFORE analysis above"
echo "2. Run migration: mysql -u root rbac_production_sim < RBAC_PRODUCTION_MIGRATION.sql"
echo "3. Compare BEFORE vs AFTER results"
echo "4. If successful, apply to actual production"
echo ""
echo "Expected improvements after migration:"
echo "• Admin sidebar: Should reduce from current count"
echo "• Contamination: Should drop to 0"
echo "• New columns: Should be added safely"
echo "• Notice Board: Should be split into management/view"
