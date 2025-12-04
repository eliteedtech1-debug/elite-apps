#!/bin/bash

# Test script for backdated attendance settings API
# Make sure to replace YOUR_JWT_TOKEN with an actual token

API_URL="http://localhost:34567"
JWT_TOKEN="YOUR_JWT_TOKEN"
SCHOOL_ID="SCH/1"
BRANCH_ID="BRCH00001"

echo "================================="
echo "Testing Backdated Attendance API"
echo "================================="
echo ""

# Test 1: GET school-setup
echo "Test 1: GET /school-setup"
echo "Fetching current settings..."
curl -X GET \
  "${API_URL}/school-setup?query_type=select&school_id=${SCHOOL_ID}&branch_id=${BRANCH_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# Test 2: POST school-setup (Enable with 7 days)
echo "Test 2: POST /school-setup (Enable with 7 days)"
curl -X POST \
  "${API_URL}/school-setup" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "'"${SCHOOL_ID}"'",
    "branch_id": "'"${BRANCH_ID}"'",
    "allow_backdated_attendance": 1,
    "backdated_days": 7
  }' | jq '.'
echo ""
echo "---"
echo ""

# Test 3: POST school-setup (Update to 42 days - 6 weeks)
echo "Test 3: POST /school-setup (Update to 42 days)"
curl -X POST \
  "${API_URL}/school-setup" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "'"${SCHOOL_ID}"'",
    "branch_id": "'"${BRANCH_ID}"'",
    "allow_backdated_attendance": 1,
    "backdated_days": 42
  }' | jq '.'
echo ""
echo "---"
echo ""

# Test 4: POST school-setup (Disable backdating)
echo "Test 4: POST /school-setup (Disable backdating)"
curl -X POST \
  "${API_URL}/school-setup" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "'"${SCHOOL_ID}"'",
    "branch_id": "'"${BRANCH_ID}"'",
    "allow_backdated_attendance": 0,
    "backdated_days": 7
  }' | jq '.'
echo ""
echo "---"
echo ""

# Test 5: Invalid backdated_days (400 - should fail)
echo "Test 5: POST /school-setup (Invalid days - should fail)"
curl -X POST \
  "${API_URL}/school-setup" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "'"${SCHOOL_ID}"'",
    "branch_id": "'"${BRANCH_ID}"'",
    "allow_backdated_attendance": 1,
    "backdated_days": 400
  }' | jq '.'
echo ""
echo "---"
echo ""

# Test 6: GET school-setup again to verify changes
echo "Test 6: GET /school-setup (Verify final state)"
curl -X GET \
  "${API_URL}/school-setup?query_type=select&school_id=${SCHOOL_ID}&branch_id=${BRANCH_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "================================="
echo "Testing Complete!"
echo "================================="
