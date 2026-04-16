#!/bin/bash

# Test script for teacher soft delete functionality
# This script verifies that the soft delete mechanism works correctly

BASE_URL="http://localhost:34567"
SCHOOL_ID="SCH/1"
BRANCH_ID="default"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Teacher Soft Delete Test ===${NC}\n"

# Step 1: Get a valid JWT token (you'll need to replace this with actual login)
echo -e "${YELLOW}Step 1: Login to get JWT token${NC}"
echo "Please provide a valid JWT token:"
read -r JWT_TOKEN

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}Error: JWT token is required${NC}"
  exit 1
fi

# Step 2: Create a test teacher
echo -e "\n${YELLOW}Step 2: Creating a test teacher${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/teachers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-school-id: $SCHOOL_ID" \
  -H "x-branch-id: $BRANCH_ID" \
  -d '{
    "query_type": "create",
    "name": "Test Teacher For Deletion",
    "email": "test.delete.teacher@example.com",
    "mobile_no": "08099999999",
    "password": "TestPassword123!",
    "user_type": "Teacher",
    "sex": "Male"
  }')

echo "$CREATE_RESPONSE" | python3 -m json.tool
TEACHER_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('teacher_id', ''))")

if [ -z "$TEACHER_ID" ]; then
  echo -e "${RED}Failed to create test teacher${NC}"
  exit 1
fi

echo -e "${GREEN}Teacher created successfully with ID: $TEACHER_ID${NC}"

# Step 3: Verify teacher exists in the database
echo -e "\n${YELLOW}Step 3: Verifying teacher exists in database${NC}"
mysql -u root elite_yazid -e "SELECT id, name, email, is_deleted FROM teachers WHERE id = $TEACHER_ID"

# Step 4: Soft delete the teacher
echo -e "\n${YELLOW}Step 4: Soft deleting the teacher${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/teachers/$TEACHER_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-school-id: $SCHOOL_ID" \
  -H "x-branch-id: $BRANCH_ID")

echo "$DELETE_RESPONSE" | python3 -m json.tool

# Step 5: Verify teacher is soft deleted
echo -e "\n${YELLOW}Step 5: Verifying teacher is soft deleted in database${NC}"
mysql -u root elite_yazid -e "SELECT id, name, email, is_deleted, deleted_at, deleted_by FROM teachers WHERE id = $TEACHER_ID"

# Step 6: Verify associated user is soft deleted
echo -e "\n${YELLOW}Step 6: Verifying associated user is soft deleted${NC}"
mysql -u root elite_yazid -e "SELECT u.id, u.name, u.email, u.is_deleted, u.deleted_at FROM users u JOIN teachers t ON u.id = t.user_id WHERE t.id = $TEACHER_ID"

# Step 7: Verify teacher_classes are deleted
echo -e "\n${YELLOW}Step 7: Verifying teacher_classes are deleted${NC}"
TEACHER_CLASSES_COUNT=$(mysql -u root elite_yazid -se "SELECT COUNT(*) FROM teacher_classes WHERE teacher_id = $TEACHER_ID")
echo "Teacher classes count: $TEACHER_CLASSES_COUNT"
if [ "$TEACHER_CLASSES_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ Teacher classes successfully deleted${NC}"
else
  echo -e "${RED}✗ Teacher classes still exist${NC}"
fi

# Step 8: Verify class_role entries are deleted
echo -e "\n${YELLOW}Step 8: Verifying class_role entries are deleted${NC}"
CLASS_ROLE_COUNT=$(mysql -u root elite_yazid -se "SELECT COUNT(*) FROM class_role WHERE teacher_id = $TEACHER_ID")
echo "Class role count: $CLASS_ROLE_COUNT"
if [ "$CLASS_ROLE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ Class roles successfully deleted${NC}"
else
  echo -e "${RED}✗ Class roles still exist${NC}"
fi

# Step 9: Try to create a new teacher with the same email (should succeed)
echo -e "\n${YELLOW}Step 9: Testing email reuse - creating new teacher with same email${NC}"
REUSE_RESPONSE=$(curl -s -X POST "$BASE_URL/teachers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-school-id: $SCHOOL_ID" \
  -H "x-branch-id: $BRANCH_ID" \
  -d '{
    "query_type": "create",
    "name": "New Teacher Same Email",
    "email": "test.delete.teacher@example.com",
    "mobile_no": "08099999998",
    "password": "TestPassword123!",
    "user_type": "Teacher",
    "sex": "Female"
  }')

echo "$REUSE_RESPONSE" | python3 -m json.tool

if echo "$REUSE_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Email reuse successful - scoped uniqueness working!${NC}"
  NEW_TEACHER_ID=$(echo "$REUSE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('teacher_id', ''))")

  # Clean up the new teacher
  if [ -n "$NEW_TEACHER_ID" ]; then
    echo -e "\n${YELLOW}Cleaning up new teacher...${NC}"
    curl -s -X DELETE "$BASE_URL/teachers/$NEW_TEACHER_ID" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "x-school-id: $SCHOOL_ID" \
      -H "x-branch-id: $BRANCH_ID" > /dev/null
  fi
else
  echo -e "${RED}✗ Email reuse failed - scoped uniqueness not working${NC}"
fi

# Step 10: Verify teacher doesn't appear in GET request
echo -e "\n${YELLOW}Step 10: Verifying deleted teacher doesn't appear in teacher list${NC}"
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/teachers?query_type=select-all&school_id=$SCHOOL_ID&branch_id=$BRANCH_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-school-id: $SCHOOL_ID" \
  -H "x-branch-id: $BRANCH_ID")

if echo "$GET_RESPONSE" | grep -q "\"id\":$TEACHER_ID"; then
  echo -e "${RED}✗ Deleted teacher still appears in list${NC}"
else
  echo -e "${GREEN}✓ Deleted teacher correctly filtered from list${NC}"
fi

echo -e "\n${GREEN}=== Test Complete ===${NC}"
