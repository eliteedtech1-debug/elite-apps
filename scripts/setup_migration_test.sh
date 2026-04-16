#!/bin/bash
# RBAC Migration Test Simulation Script
# Creates a safe test environment to validate migration

echo "🧪 RBAC Migration Simulation Setup"
echo "=================================="

# Step 1: Create test database
echo "📋 Step 1: Creating test database..."
mysql -u root -e "DROP DATABASE IF EXISTS rbac_test_simulation;"
mysql -u root -e "CREATE DATABASE rbac_test_simulation;"

# Step 2: Copy current structure and data
echo "📋 Step 2: Copying current database structure..."
mysqldump -u root --no-data full_skcooly rbac_menu_items rbac_menu_access > rbac_structure.sql
mysqldump -u root --no-create-info full_skcooly rbac_menu_items rbac_menu_access > rbac_data.sql

# Step 3: Import to test database
echo "📋 Step 3: Importing to test database..."
mysql -u root rbac_test_simulation < rbac_structure.sql
mysql -u root rbac_test_simulation < rbac_data.sql

# Step 4: Show current state
echo "📋 Step 4: Current state analysis..."
mysql -u root rbac_test_simulation -e "
SELECT 'BEFORE MIGRATION' as status;
SELECT 'Menu Items' as table_name, COUNT(*) as count FROM rbac_menu_items WHERE is_active = 1;
SELECT 'Access Records' as table_name, COUNT(*) as count FROM rbac_menu_access;
SELECT 'Admin Sidebar' as metric, COUNT(DISTINCT ma.menu_item_id) as count 
FROM rbac_menu_access ma 
JOIN rbac_menu_items m ON ma.menu_item_id = m.id 
WHERE ma.user_type = 'admin' AND m.is_active = 1;
"

echo ""
echo "✅ Test database 'rbac_test_simulation' created successfully!"
echo "🎯 Ready to test migration safely"
echo ""
echo "Next steps:"
echo "1. Run: mysql -u root rbac_test_simulation < RBAC_PRODUCTION_MIGRATION.sql"
echo "2. Validate results"
echo "3. If successful, apply to production"
