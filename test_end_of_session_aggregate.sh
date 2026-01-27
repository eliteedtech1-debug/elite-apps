#!/bin/bash

# Test script for end_of_session_aggregate endpoint
# Usage: ./test_end_of_session_aggregate.sh

API_BASE="http://localhost:3000"
TOKEN="your_jwt_token_here"

echo "Testing End of Session Aggregate Report Endpoint"
echo "================================================"

# Test 1: Class report
echo "Test 1: Class Report"
curl -X POST "${API_BASE}/reports/end_of_session_aggregate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "academic_year": "2024/2025",
    "class_code": "JSS1A",
    "queryType": "class"
  }' | jq '.'

echo -e "\n\n"

# Test 2: Student report
echo "Test 2: Student Report"
curl -X POST "${API_BASE}/reports/end_of_session_aggregate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "academic_year": "2024/2025",
    "class_code": "JSS1A",
    "queryType": "student",
    "admissionNo": "STU001"
  }' | jq '.'

echo -e "\n\n"

# Test 3: Invalid parameters
echo "Test 3: Invalid Parameters"
curl -X POST "${API_BASE}/reports/end_of_session_aggregate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "academic_year": "2024/2025"
  }' | jq '.'

echo -e "\n\nTest completed!"