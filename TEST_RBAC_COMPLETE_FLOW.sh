#!/bin/bash

# RBAC Complete Flow Test
# Tests: Developer login -> Create SuperAdmin -> SuperAdmin creates school -> Developer creates school

API_URL="http://localhost:34567"

echo "=========================================="
echo "RBAC COMPLETE FLOW TEST"
echo "=========================================="
echo ""

# Step 1: Developer Login
echo "Step 1: Developer Login"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Elite Developer",
    "password": "123456",
    "school_id": "SCH/1"
  }')

echo "Login Response: $LOGIN_RESPONSE"
DEV_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//' | sed 's/^Bearer //')
echo "Developer Token: $DEV_TOKEN"
echo ""

if [ -z "$DEV_TOKEN" ]; then
  echo "❌ Developer login failed!"
  exit 1
fi

# Step 2: Create SuperAdmin
echo "Step 2: Create SuperAdmin using Developer account"
echo "----------------------------------------"
SUPERADMIN_EMAIL="superadmin_test_$(date +%s)@elite.com"
CREATE_SA_RESPONSE=$(curl -s -X POST "${API_URL}/api/rbac/developer/create-superadmin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d "{
    \"name\": \"Test SuperAdmin\",
    \"email\": \"$SUPERADMIN_EMAIL\",
    \"password\": \"123456\"
  }")

echo "Create SuperAdmin Response: $CREATE_SA_RESPONSE"
echo ""

# Step 3: SuperAdmin Login
echo "Step 3: SuperAdmin Login"
echo "----------------------------------------"
SA_LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/users/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$SUPERADMIN_EMAIL\",
    \"password\": \"123456\",
    \"school_id\": \"SCH/1\"
  }")

echo "SuperAdmin Login Response: $SA_LOGIN_RESPONSE"
SA_TOKEN=$(echo $SA_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//' | sed 's/^Bearer //')
echo "SuperAdmin Token: $SA_TOKEN"
echo ""

if [ -z "$SA_TOKEN" ]; then
  echo "❌ SuperAdmin login failed!"
  exit 1
fi

# Step 4: SuperAdmin Creates School
echo "Step 4: SuperAdmin Creates School"
echo "----------------------------------------"
SA_SCHOOL_NAME="SA School $(date +%s)"
SA_SCHOOL_SHORT="sasch$(date +%s | tail -c 6)"
SA_SCHOOL_RESPONSE=$(curl -s -X POST "${API_URL}/school-setup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -d "{
    \"school_name\": \"$SA_SCHOOL_NAME\",
    \"short_name\": \"$SA_SCHOOL_SHORT\",
    \"email\": \"${SA_SCHOOL_SHORT}@school.com\",
    \"phone\": \"08012345678\",
    \"address\": \"123 Test Street\",
    \"state\": \"Lagos\",
    \"lga\": \"Ikeja\",
    \"country\": \"Nigeria\",
    \"school_motto\": \"Excellence in Education\",
    \"package_id\": 1,
    \"student_count\": 100,
    \"admin_name\": \"SA Admin\",
    \"admin_email\": \"admin_${SA_SCHOOL_SHORT}@school.com\",
    \"admin_password\": \"admin123\"
  }")

echo "SuperAdmin School Creation Response: $SA_SCHOOL_RESPONSE"
echo ""

# Step 5: Developer Creates School
echo "Step 5: Developer Creates School"
echo "----------------------------------------"
DEV_SCHOOL_NAME="Dev School $(date +%s)"
DEV_SCHOOL_SHORT="devsch$(date +%s | tail -c 6)"
DEV_SCHOOL_RESPONSE=$(curl -s -X POST "${API_URL}/school-setup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d "{
    \"school_name\": \"$DEV_SCHOOL_NAME\",
    \"short_name\": \"$DEV_SCHOOL_SHORT\",
    \"email\": \"${DEV_SCHOOL_SHORT}@school.com\",
    \"phone\": \"08087654321\",
    \"address\": \"456 Dev Avenue\",
    \"state\": \"Abuja\",
    \"lga\": \"Gwagwalada\",
    \"country\": \"Nigeria\",
    \"school_motto\": \"Innovation and Growth\",
    \"package_id\": 2,
    \"student_count\": 200,
    \"admin_name\": \"Dev Admin\",
    \"admin_email\": \"admin_${DEV_SCHOOL_SHORT}@school.com\",
    \"admin_password\": \"admin123\"
  }")

echo "Developer School Creation Response: $DEV_SCHOOL_RESPONSE"
echo ""

# Step 6: Verify Schools Created
echo "Step 6: Verify Schools in RBAC System"
echo "----------------------------------------"
echo "Getting schools accessible by SuperAdmin:"
SA_SCHOOLS=$(curl -s -X GET "${API_URL}/api/rbac/super-admin/schools-subscriptions" \
  -H "Authorization: Bearer $SA_TOKEN")
echo "SuperAdmin Schools: $SA_SCHOOLS"
echo ""

echo "Getting schools accessible by Developer:"
DEV_SCHOOLS=$(curl -s -X GET "${API_URL}/api/rbac/super-admin/schools-subscriptions" \
  -H "Authorization: Bearer $DEV_TOKEN")
echo "Developer Schools: $DEV_SCHOOLS"
echo ""

echo "=========================================="
echo "TEST COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "- SuperAdmin Email: $SUPERADMIN_EMAIL"
echo "- SuperAdmin School: $SA_SCHOOL_NAME ($SA_SCHOOL_SHORT)"
echo "- Developer School: $DEV_SCHOOL_NAME ($DEV_SCHOOL_SHORT)"
echo ""
echo "Expected Results:"
echo "✓ SuperAdmin should only see their created school"
echo "✓ Developer should see ALL schools (both SA and Dev created)"
