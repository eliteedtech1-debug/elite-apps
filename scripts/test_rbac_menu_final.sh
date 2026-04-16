#!/bin/bash

# RBAC Menu Multi-Role Test Script
# Tests User 1212 with multiple roles: teacher + exam_officer + librarian

echo "🔍 RBAC Menu Multi-Role Validation Test"
echo "========================================"

# Test Configuration
USER_ID=1212
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIxMiwidXNlcl90eXBlIjoiVGVhY2hlciIsInNjaG9vbF9pZCI6IlNDSC8yMyIsImJyYW5jaF9pZCI6bnVsbCwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsImxhc3RBY3Rpdml0eSI6IjIwMjYtMDEtMjlUMTY6MzI6MTIuNjc3WiIsImlhdCI6MTc2OTcwNDMzMiwic2Vzc2lvbkNyZWF0ZWQiOiIyMDI2LTAxLTI5VDE2OjMyOjEyLjY3N1oiLCJyZW5ld2FsQ291bnQiOjAsImV4cCI6MTc2OTc5MDczMn0.0V2IB1s0lellTvrR_wptErvyrn5YQPxs0MMirJwpeOw"
API_BASE="http://localhost:34567"

echo "📋 Test 1: Database Role Verification"
echo "------------------------------------"
mysql -u root full_skcooly -e "
SELECT ur.user_id, ur.assigned_role_name, r.user_type, r.school_id 
FROM user_roles ur 
JOIN roles r ON ur.role_id = r.role_id 
WHERE ur.user_id = $USER_ID AND ur.is_active = 1
ORDER BY r.user_type;" 2>/dev/null

echo ""
echo "🌐 Test 2: Menu API Response"
echo "---------------------------"
MENU_RESPONSE=$(curl -s "$API_BASE/api/rbac/menu?compact=true" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-Branch-Id: BRCH/29" \
  -H "X-School-Id: SCH/23" \
  -H "X-User-Id: $USER_ID" \
  -H "X-User-Type: Teacher")

SECTION_COUNT=$(echo "$MENU_RESPONSE" | jq '.data | length' 2>/dev/null)
echo "Menu Sections Count: $SECTION_COUNT"

if [ "$SECTION_COUNT" -gt 4 ]; then
    echo "✅ SUCCESS: Multi-role menu detected ($SECTION_COUNT sections > 4 basic)"
else
    echo "❌ FAILED: Still showing basic menu only ($SECTION_COUNT sections)"
fi

echo ""
echo "📑 Test 3: Menu Sections List"
echo "-----------------------------"
echo "$MENU_RESPONSE" | jq -r '.data[].name' 2>/dev/null | nl

echo ""
echo "🔢 Test 4: Total Menu Items Count"
echo "---------------------------------"
TOTAL_ITEMS=$(echo "$MENU_RESPONSE" | jq '[.data[].items | length] | add' 2>/dev/null)
echo "Total Menu Items: $TOTAL_ITEMS"

if [ "$TOTAL_ITEMS" -gt 20 ]; then
    echo "✅ SUCCESS: Extended menu items detected ($TOTAL_ITEMS items > 20 basic)"
else
    echo "❌ FAILED: Limited menu items ($TOTAL_ITEMS items)"
fi

echo ""
echo "⚡ Test 5: Performance Check"
echo "---------------------------"
START_TIME=$(date +%s%3N)
curl -s "$API_BASE/api/rbac/menu?compact=true" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-School-Id: SCH/23" \
  -H "X-User-Id: $USER_ID" > /dev/null
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

echo "Response Time: ${RESPONSE_TIME}ms"

if [ "$RESPONSE_TIME" -lt 500 ]; then
    echo "✅ SUCCESS: Performance acceptable (<500ms)"
else
    echo "⚠️  WARNING: Slow response (${RESPONSE_TIME}ms)"
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo "User ID: $USER_ID"
echo "Expected Roles: teacher + exam_officer + librarian"
echo "Menu Sections: $SECTION_COUNT (Expected: >4)"
echo "Menu Items: $TOTAL_ITEMS (Expected: >20)"
echo "Response Time: ${RESPONSE_TIME}ms (Expected: <500ms)"

if [ "$SECTION_COUNT" -gt 4 ] && [ "$TOTAL_ITEMS" -gt 20 ]; then
    echo ""
    echo "🎉 OVERALL RESULT: ✅ PASSED"
    echo "Multi-role RBAC menu system is working correctly!"
else
    echo ""
    echo "❌ OVERALL RESULT: FAILED"
    echo "Multi-role RBAC menu system needs further investigation."
fi

echo ""
echo "Test completed: $(date)"
