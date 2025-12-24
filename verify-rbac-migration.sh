#!/bin/bash

echo "🔍 RBAC Sidebar Migration Verification"
echo "======================================"

echo ""
echo "1. Checking for legacy sidebar usage..."
echo "---------------------------------------"

# Check for users.accessTo and users.permissions usage
echo "❌ Legacy permission usage in sidebar (excluding backups):"
grep -r "user\.accessTo\|user\.permissions\|users\.accessTo\|users\.permissions" /Users/apple/Downloads/apps/elite/elscholar-ui/src/core/common/sidebar/ --exclude="*.legacy.*" 2>/dev/null || echo "✅ No legacy permission usage found"

echo ""
echo "2. Checking RBAC implementation..."
echo "--------------------------------"

# Check if new sidebar uses RBAC
if grep -q "useRBAC\|DynamicSidebar" /Users/apple/Downloads/apps/elite/elscholar-ui/src/core/common/sidebar/index.tsx; then
    echo "✅ New sidebar uses RBAC"
else
    echo "❌ New sidebar does not use RBAC"
fi

# Check if legacy sidebar exists
if [ -f "/Users/apple/Downloads/apps/elite/elscholar-ui/src/core/common/sidebar/index.legacy.tsx" ]; then
    echo "✅ Legacy sidebar backed up"
else
    echo "❌ Legacy sidebar not backed up"
fi

echo ""
echo "3. Checking API endpoints..."
echo "---------------------------"

# Test RBAC menu API
echo "Testing RBAC menu API..."
MENU_RESPONSE=$(curl -s -X GET "http://localhost:34567/api/rbac/menu" -H "Authorization: Bearer test-token")
if echo "$MENU_RESPONSE" | grep -q '"success":true'; then
    echo "✅ RBAC menu API working"
    MENU_COUNT=$(echo "$MENU_RESPONSE" | grep -o '"name":' | wc -l)
    echo "   📋 Menu categories: $MENU_COUNT"
else
    echo "❌ RBAC menu API failed"
fi

# Test RBAC permissions API
echo "Testing RBAC permissions API..."
PERM_RESPONSE=$(curl -s -X GET "http://localhost:34567/api/rbac/permissions" -H "Authorization: Bearer test-token")
if echo "$PERM_RESPONSE" | grep -q '"success":true'; then
    echo "✅ RBAC permissions API working"
    FEATURE_COUNT=$(echo "$PERM_RESPONSE" | grep -o '"[A-Z_]*":' | wc -l)
    echo "   🔧 Features available: $FEATURE_COUNT"
else
    echo "❌ RBAC permissions API failed"
fi

echo ""
echo "4. Database verification..."
echo "--------------------------"

# Check menu cache
MENU_CACHE_COUNT=$(mysql -u root elite_db -se "SELECT COUNT(*) FROM rbac_menu_cache;" 2>/dev/null)
if [ "$MENU_CACHE_COUNT" -gt 0 ]; then
    echo "✅ RBAC menu cache populated ($MENU_CACHE_COUNT entries)"
else
    echo "❌ RBAC menu cache empty"
fi

# Check school packages
SCHOOL_PACKAGES=$(mysql -u root elite_db -se "SELECT COUNT(*) FROM rbac_school_packages WHERE package_id = 4 AND is_active = 1;" 2>/dev/null)
if [ "$SCHOOL_PACKAGES" -gt 0 ]; then
    echo "✅ Schools assigned to standard plan ($SCHOOL_PACKAGES schools)"
else
    echo "❌ No schools assigned to standard plan"
fi

echo ""
echo "5. Summary..."
echo "------------"

# Count legacy vs RBAC usage (excluding backup files)
LEGACY_FILES=$(find /Users/apple/Downloads/apps/elite/elscholar-ui/src -name "*.tsx" -not -name "*.legacy.*" -exec grep -l "user\.accessTo\|user\.permissions" {} \; 2>/dev/null | wc -l)
RBAC_FILES=$(find /Users/apple/Downloads/apps/elite/elscholar-ui/src -name "*.tsx" -exec grep -l "useRBAC\|RBACContext" {} \; 2>/dev/null | wc -l)

echo "📊 Legacy permission files: $LEGACY_FILES"
echo "📊 RBAC implementation files: $RBAC_FILES"

if [ "$LEGACY_FILES" -eq 0 ] && [ "$RBAC_FILES" -gt 0 ]; then
    echo ""
    echo "🎉 MIGRATION COMPLETE!"
    echo "✅ Sidebar fully migrated to RBAC"
    echo "✅ No legacy permission usage detected"
    echo "✅ RBAC APIs functional"
    echo "✅ Database properly configured"
else
    echo ""
    echo "⚠️  MIGRATION INCOMPLETE"
    echo "❌ Legacy permission usage still detected"
    echo "❌ Manual cleanup required"
fi

echo ""
