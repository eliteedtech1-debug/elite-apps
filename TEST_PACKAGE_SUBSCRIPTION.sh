#!/bin/bash

API_URL="http://localhost:34567"

echo "=== Package Subscription Test ==="
echo ""

# Login as Developer
echo "1. Developer Login..."
DEV_TOKEN=$(curl -s -X POST "${API_URL}/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"Elite Developer","password":"123456","school_id":"SCH/1"}' \
  | grep -o '"token":"[^"]*' | sed 's/"token":"Bearer //')

echo "Token: ${DEV_TOKEN:0:50}..."
echo ""

# Assign Standard Package to SCH/1
echo "2. Assign Standard Package to SCH/1..."
curl -s -X POST "${API_URL}/api/rbac/super-admin/assign-package" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d '{
    "school_id": "SCH/1",
    "package_id": 1,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  }'
echo ""
echo ""

# Assign Premium Package to SCH/10
echo "3. Assign Premium Package to SCH/10..."
curl -s -X POST "${API_URL}/api/rbac/super-admin/assign-package" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d '{
    "school_id": "SCH/10",
    "package_id": 2,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  }'
echo ""
echo ""

# Assign Elite Package to SCH/11
echo "4. Assign Elite Package to SCH/11..."
curl -s -X POST "${API_URL}/api/rbac/super-admin/assign-package" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d '{
    "school_id": "SCH/11",
    "package_id": 3,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  }'
echo ""
echo ""

# Get schools with packages
echo "5. View Schools with Packages..."
curl -s -X GET "${API_URL}/api/rbac/super-admin/schools-subscriptions" \
  -H "Authorization: Bearer $DEV_TOKEN" | python3 -m json.tool 2>/dev/null || echo "Done"
echo ""

echo "=== Test Complete ==="
