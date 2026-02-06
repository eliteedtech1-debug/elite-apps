#!/bin/bash

# RBAC Menu System Test Script
# Tests the fixed getUserMenu function with user 1212's multiple roles

echo "🧪 Testing RBAC Menu System Fix"
echo "================================"

cd elscholar-api

echo "📋 Step 1: Verify user 1212's roles"
node -e "
const db = require('./src/models');
(async () => {
  try {
    const userRoles = await db.sequelize.query(
      'SELECT ur.*, r.user_type FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = 1212 AND ur.is_active = 1',
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    console.log('✅ User 1212 roles:', userRoles.map(r => r.user_type));
    console.log('📊 Total roles:', userRoles.length);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "📋 Step 2: Test role inheritance"
node -e "
const db = require('./src/models');
(async () => {
  try {
    const inheritance = await db.sequelize.query(
      'SELECT * FROM role_inheritance WHERE child_role IN (\"teacher\", \"branchadmin\", \"exam_officer\")',
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    console.log('✅ Role inheritance rules:');
    inheritance.forEach(rule => {
      console.log(\`  \${rule.child_role} → \${rule.parent_role}\`);
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "📋 Step 3: Test menu access counts by role"
node -e "
const db = require('./src/models');
(async () => {
  try {
    const roles = ['teacher', 'branchadmin', 'exam_officer', 'admin', 'vp_academic'];
    
    for (const role of roles) {
      const count = await db.sequelize.query(
        'SELECT COUNT(DISTINCT ma.menu_item_id) as count FROM rbac_menu_access ma WHERE ma.user_type = ?',
        { replacements: [role], type: db.Sequelize.QueryTypes.SELECT }
      );
      console.log(\`✅ \${role}: \${count[0].count} menu items\`);
    }
    
    // Test combined access
    const combined = await db.sequelize.query(
      'SELECT COUNT(DISTINCT ma.menu_item_id) as count FROM rbac_menu_access ma WHERE ma.user_type IN (\"teacher\", \"branchadmin\", \"exam_officer\", \"admin\", \"vp_academic\")',
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    console.log(\`✅ Combined access: \${combined[0].count} menu items\`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "📋 Step 4: Test the fixed getUserMenu function"
echo "This will make an API call to test the actual function..."

# Create a test API call
curl -s -X GET \
  "http://localhost:3001/api/rbac/user-menu?school_id=SCH/20" \
  -H "Content-Type: application/json" \
  -H "x-user-type: teacher" \
  -H "x-school-id: SCH/20" \
  -H "Authorization: Bearer test-token" \
  | jq '.debug.totalMenuItems, .debug.userRoles, .debug.expectedCount' 2>/dev/null || echo "⚠️  API test requires server to be running"

echo ""
echo "📋 Step 5: Verify expected results"
echo "Expected outcomes:"
echo "  ✅ User 1212 should have 3 roles: teacher, branchadmin, exam_officer"
echo "  ✅ Role inheritance should include: branchadmin → admin, exam_officer → vp_academic"
echo "  ✅ Final menu count should be ~124 items (combined access)"
echo "  ✅ All roles should be properly aggregated"

echo ""
echo "🎯 Test completed! Check the logs above for verification."
echo "If the API test failed, start the server with: npm run dev"