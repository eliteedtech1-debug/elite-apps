#!/bin/bash

# Test the fixed financial dashboard API with realistic data

echo "=== Testing Admin Dashboard Metrics API ==="

# Test with our test school data
curl -X GET "http://localhost:34567/admin-dashboard/metrics?startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/TEST" \
  -H "X-Branch-Id: BRCH/TEST" \
  | jq '.'

echo -e "\n=== Testing Revenue Expenditure Report API ==="

# Test the revenue expenditure report
curl -X POST "http://localhost:34567/payments/revenue-expenditure" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/TEST" \
  -H "X-Branch-Id: BRCH/TEST" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "school_id": "SCH/TEST",
    "branch_id": "BRCH/TEST"
  }' | jq '.'

echo -e "\n=== Expected Results Based on Test Data ==="
echo "Expected Revenue: ₦172,000 (Bills ₦192,000 - Scholarships/Discounts ₦20,000)"
echo "Collected Revenue: ₦128,000 (Payments ₦130,000 - Refunds ₦2,000)"
echo "Outstanding Balance: ₦44,000 (Expected ₦172,000 - Collected ₦128,000)"
echo "Total Expenditure: ₦45,000 (Expenses ₦23,000 + Scholarships/Discounts/Refunds ₦22,000)"

echo -e "\n=== Student Breakdown ==="
echo "ADM001: Fully paid (₦50,000 bill, ₦50,000 paid, ₦0 outstanding)"
echo "ADM002: Partial payment (₦45,000 bill, ₦25,000 paid, ₦20,000 outstanding)"
echo "ADM003: Scholarship (₦40,000 bill after ₦15,000 scholarship, ₦25,000 paid, ₦15,000 outstanding)"
echo "ADM004: Discount + Refund (₦35,000 bill - ₦5,000 discount = ₦30,000, paid ₦30,000 - ₦2,000 refund = ₦28,000, ₦9,000 outstanding)"
echo "ADM005: Cancelled bill (₦0 outstanding)"
