#!/bin/bash

API_URL="http://localhost:34567"
EMAIL="developer@elitescholar.ng"
PASSWORD="123456"
SCHOOL_ID="SCH/1"
SHORT_NAME="213232"

echo "========================================="
echo "ELITE SCHOLAR API TEST - RBAC SYSTEM"
echo "========================================="
echo ""

# Step 1: Login as Developer
echo "1. Login as Developer..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"short_name\":\"$SHORT_NAME\",\"school_id\":\"$SCHOOL_ID\"}")

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Get All SuperAdmins
echo "2. Get All SuperAdmins..."
SUPERADMINS=$(curl -s -X GET "$API_URL/api/developer/super-admins" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $SUPERADMINS"
echo ""

# Step 3: Create SuperAdmin
echo "3. Create SuperAdmin..."
CREATE_SA=$(curl -s -X POST "$API_URL/api/developer/create-superadmin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test SuperAdmin",
    "email": "superadmin.test@elitescholar.ng",
    "password": "test123456"
  }')

echo "Response: $CREATE_SA"
echo ""

# Step 4: Get All Packages
echo "4. Get All Subscription Packages..."
PACKAGES=$(curl -s -X GET "$API_URL/api/super-admin/packages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $PACKAGES"
echo ""

# Step 5: Get Schools with Subscriptions
echo "5. Get Schools with Subscriptions..."
SCHOOLS=$(curl -s -X GET "$API_URL/api/super-admin/schools-subscriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $SCHOOLS"
echo ""

echo "========================================="
echo "TEST COMPLETED"
echo "========================================="
