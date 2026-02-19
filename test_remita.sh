#!/bin/bash

# Remita Integration Test Script
# Date: 2026-02-07
# School: SCH/20

echo "=================================="
echo "Remita Integration Test - SCH/20"
echo "=================================="
echo ""

# Configuration
API_URL="http://localhost:34567"
SCHOOL_ID="SCH/20"
TEST_STAFF_ID="358"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Note: You need to provide a valid JWT token${NC}"
echo "Please enter your JWT token:"
read -r JWT_TOKEN
echo ""

# Test 1: Check Gateway Configuration
echo "Test 1: Checking Gateway Configuration..."
RESPONSE=$(curl -s -X GET "${API_URL}/payroll/payment-gateway/config" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-School-Id: ${SCHOOL_ID}")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Gateway configuration found${NC}"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}✗ Failed to get gateway configuration${NC}"
  echo "$RESPONSE"
fi
echo ""

# Test 2: Process Test Payment
echo "Test 2: Processing Test Payment for Staff ID ${TEST_STAFF_ID}..."
echo -e "${YELLOW}Warning: This will attempt to process a payment via Remita${NC}"
echo "Continue? (y/n)"
read -r CONTINUE

if [ "$CONTINUE" = "y" ]; then
  RESPONSE=$(curl -s -X POST "${API_URL}/payroll/staff/${TEST_STAFF_ID}/pay-via-gateway" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "X-School-Id: ${SCHOOL_ID}" \
    -H "Content-Type: application/json")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Payment processed successfully${NC}"
    echo "$RESPONSE" | jq '.'
    
    # Extract reference if available
    REFERENCE=$(echo "$RESPONSE" | jq -r '.data.reference // empty')
    
    if [ -n "$REFERENCE" ]; then
      echo ""
      echo "Test 3: Checking Payment Status..."
      sleep 2
      
      STATUS_RESPONSE=$(curl -s -X GET "${API_URL}/payroll/payment-status/${REFERENCE}" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -H "X-School-Id: ${SCHOOL_ID}")
      
      if echo "$STATUS_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Payment status retrieved${NC}"
        echo "$STATUS_RESPONSE" | jq '.'
      else
        echo -e "${RED}✗ Failed to get payment status${NC}"
        echo "$STATUS_RESPONSE"
      fi
    fi
  else
    echo -e "${RED}✗ Payment processing failed${NC}"
    echo "$RESPONSE"
  fi
else
  echo "Test 2 skipped"
fi

echo ""
echo "=================================="
echo "Test Complete"
echo "=================================="
echo ""
echo "To check database records:"
echo "mysql -u root full_skcooly -e \"SELECT * FROM payment_gateway_transactions WHERE school_id='${SCHOOL_ID}' ORDER BY created_at DESC LIMIT 5;\""
