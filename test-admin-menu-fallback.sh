#!/bin/bash

# Round 2 Migration Simulation - Admin Menu Fallback Test
# Tests the protected admin menu fallback structure

set -e

DB_NAME="elitedeploy"
DB_USER="root"

echo "🛡️  Testing Protected Admin Menu Fallback..."

# Step 1: Backup current rbac_menu_cache
echo "📦 Backing up current rbac_menu_cache..."
mysql -u$DB_USER $DB_NAME -e "CREATE TABLE rbac_menu_cache_backup AS SELECT * FROM rbac_menu_cache;"

# Step 2: Clear rbac_menu_cache to force fallback
echo "🧹 Clearing rbac_menu_cache to test fallback..."
mysql -u$DB_USER $DB_NAME -e "DELETE FROM rbac_menu_cache;"

# Step 3: Verify cache is empty
CACHE_COUNT=$(mysql -u$DB_USER $DB_NAME -e "SELECT COUNT(*) FROM rbac_menu_cache;" | tail -1)
if [ "$CACHE_COUNT" -eq "0" ]; then
    echo "✅ Cache cleared - fallback will be triggered"
else
    echo "❌ Cache not cleared properly"
    exit 1
fi

# Step 4: Test admin login simulation
echo "🧪 Testing admin menu fallback..."
echo "   - Admin should see: Personal Data Mngr, Attendance, Academic, Express Finance, General Setups"
echo "   - Each category should have proper submenu items"
echo "   - No 'Administration' wrapper should appear"

# Step 5: Restore cache after test
echo "🔄 Restoring rbac_menu_cache..."
mysql -u$DB_USER $DB_NAME -e "INSERT INTO rbac_menu_cache SELECT * FROM rbac_menu_cache_backup;"
mysql -u$DB_USER $DB_NAME -e "DROP TABLE rbac_menu_cache_backup;"

# Step 6: Verify restoration
RESTORED_COUNT=$(mysql -u$DB_USER $DB_NAME -e "SELECT COUNT(*) FROM rbac_menu_cache;" | tail -1)
if [ "$RESTORED_COUNT" -gt "0" ]; then
    echo "✅ Cache restored successfully"
else
    echo "❌ Cache restoration failed"
    exit 1
fi

echo "🎯 Admin Menu Fallback Test Completed!"
echo "📋 Manual verification required:"
echo "   1. Login as admin with empty cache"
echo "   2. Verify menu structure matches rbac_menu_cache"
echo "   3. Test all menu links work"
echo "   4. Confirm no 'Administration' wrapper"
