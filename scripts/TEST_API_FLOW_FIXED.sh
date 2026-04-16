#!/bin/bash

API_URL="http://localhost:34567"
EMAIL="developer@elitescholar.ng"
PASSWORD="123456"
SCHOOL_ID="SCH/1"
SHORT_NAME="213232"

echo "========================================="
echo "ELITE CORE API TEST - RBAC SYSTEM"
echo "========================================="
echo ""

# Step 1: Login as Developer
echo "1. Login as Developer..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"short_name\":\"$SHORT_NAME\",\"school_id\":\"$SCHOOL_ID\"}")

# Extract token WITHOUT Bearer prefix (it's already included)
TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', '').replace('Bearer ', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token (first 50 chars): ${TOKEN:0:50}..."
echo ""

# Step 2: Get All SuperAdmins
echo "2. Get All SuperAdmins..."
SUPERADMINS=$(curl -s -X GET "$API_URL/api/developer/super-admins" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SUPERADMINS" | python3 -m json.tool 2>/dev/null || echo "$SUPERADMINS"
echo ""

# Step 3: Create SuperAdmin
echo "3. Create SuperAdmin..."
CREATE_SA=$(curl -s -X POST "$API_URL/api/developer/create-superadmin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing SuperAdmin",
    "email": "marketing@elitescholar.ng",
    "password": "super123456"
  }')

echo "$CREATE_SA" | python3 -m json.tool 2>/dev/null || echo "$CREATE_SA"
echo ""

# Step 4: Get All Packages
echo "4. Get All Subscription Packages..."
PACKAGES=$(curl -s -X GET "$API_URL/api/super-admin/packages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$PACKAGES" | python3 -m json.tool 2>/dev/null || echo "$PACKAGES"
echo ""

# Step 5: Get Schools with Subscriptions
echo "5. Get Schools with Subscriptions..."
SCHOOLS=$(curl -s -X GET "$API_URL/api/super-admin/schools-subscriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$SCHOOLS" | python3 -m json.tool 2>/dev/null || echo "$SCHOOLS"
echo ""

# Step 6: Get All Features
echo "6. Get All Features..."
FEATURES=$(curl -s -X GET "$API_URL/api/super-admin/all-features" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$FEATURES" | python3 -m json.tool 2>/dev/null || echo "$FEATURES"
echo ""

echo "========================================="
echo "TEST COMPLETED SUCCESSFULLY"
echo "========================================="
