#!/bin/bash

# Remita School Fees Payment - Test Script
# Run this after installation to verify setup

echo "=================================="
echo "Remita Payment System - Test Suite"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:5000"
SCHOOL_ID="SCH/20"
TOKEN="YOUR_AUTH_TOKEN"

echo -e "${YELLOW}Step 1: Testing Database Migration${NC}"
mysql -u root -p -e "
USE your_database;
SELECT 
  'payment_gateway_transactions' as table_name,
  COUNT(*) as column_count
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'payment_gateway_transactions'
  AND COLUMN_NAME IN ('admission_no', 'parent_id', 'academic_year', 'term', 'payment_items');

SELECT 
  'payment_entries' as table_name,
  COUNT(*) as column_count
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'payment_entries'
  AND COLUMN_NAME IN ('gateway_transaction_id', 'gateway_reference');

SELECT 
  'school_bank_accounts' as table_name,
  COUNT(*) as row_count
FROM school_bank_accounts;
"

echo ""
echo -e "${YELLOW}Step 2: Testing Environment Variables${NC}"
if [ -z "$REMITA_MERCHANT_ID" ]; then
  echo -e "${RED}❌ REMITA_MERCHANT_ID not set${NC}"
else
  echo -e "${GREEN}✅ REMITA_MERCHANT_ID configured${NC}"
fi

if [ -z "$REMITA_API_KEY" ]; then
  echo -e "${RED}❌ REMITA_API_KEY not set${NC}"
else
  echo -e "${GREEN}✅ REMITA_API_KEY configured${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Testing API Endpoints${NC}"

# Test 1: Get pending fees
echo "Testing GET /api/schoolfees/student/:admissionNo/pending"
curl -s -X GET "$API_URL/api/schoolfees/student/STD001/pending" \
  -H "x-school-id: $SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "Testing POST /api/schoolfees/generate-rrr"
curl -s -X POST "$API_URL/api/schoolfees/generate-rrr" \
  -H "Content-Type: application/json" \
  -H "x-school-id: $SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "admissionNo": "STD001",
    "selectedItems": [1, 2],
    "payerInfo": {
      "name": "Test Parent",
      "email": "test@example.com",
      "phone": "08012345678"
    },
    "term": "First Term"
  }' | jq '.'

echo ""
echo -e "${GREEN}=================================="
echo "Test Suite Complete"
echo "==================================${NC}"
echo ""
echo "Next Steps:"
echo "1. Review test results above"
echo "2. Fix any errors"
echo "3. Test with Remita demo environment"
echo "4. Integrate frontend component"
