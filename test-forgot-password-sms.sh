#!/bin/bash

# Test script for password reset OTP via SMS
# This tests the forgot password endpoint with phone number

# Configuration
API_URL="http://localhost:34567"
PHONE_NUMBER="08012345678"  # Replace with a valid test phone number
SCHOOL_ID="test-school-001"  # Replace with your test school ID

echo "========================================="
echo "Testing Password Reset OTP via SMS"
echo "========================================="
echo ""
echo "Testing with:"
echo "  Phone: $PHONE_NUMBER"
echo "  School ID: $SCHOOL_ID"
echo ""

# Test 1: Request OTP via phone number
echo "Test 1: Requesting OTP via phone..."
echo "--------------------------------------"

RESPONSE=$(curl -s -X POST "${API_URL}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"$PHONE_NUMBER\",
    \"school_id\": \"$SCHOOL_ID\"
  }")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ OTP request successful!"
  echo ""
  echo "Next steps:"
  echo "1. Check the phone for the SMS with OTP code"
  echo "2. Check server logs for [DEV ONLY] OTP: XXXXXX (if in development mode)"
  echo "3. Use the OTP to test password reset with:"
  echo ""
  echo "   curl -X POST ${API_URL}/auth/reset-password \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{"
  echo "       \"phone\": \"$PHONE_NUMBER\","
  echo "       \"otp_code\": \"XXXXXX\","
  echo "       \"new_password\": \"NewPassword123!\","
  echo "       \"school_id\": \"$SCHOOL_ID\""
  echo "     }'"
  echo ""
else
  echo "❌ OTP request failed!"
  echo ""
  echo "Possible issues:"
  echo "1. User with this phone number doesn't exist in the database"
  echo "2. Server is not running"
  echo "3. Database connection issue"
  echo ""
fi

echo "========================================="
echo "Checking SMS Queue Status..."
echo "========================================="

# Test 2: Check SMS queue stats (if endpoint exists)
QUEUE_RESPONSE=$(curl -s "${API_URL}/api/sms/queue-stats" 2>/dev/null)

if [ ! -z "$QUEUE_RESPONSE" ]; then
  echo "SMS Queue Status:"
  echo "$QUEUE_RESPONSE" | jq . 2>/dev/null || echo "$QUEUE_RESPONSE"
else
  echo "Queue stats endpoint not available or server not responding"
fi

echo ""
echo "========================================="
echo "Important Configuration Notes:"
echo "========================================="
echo ""
echo "1. Make sure these environment variables are set in .env:"
echo "   - EBULKSMS_USERNAME=your_username"
echo "   - EBULKSMS_API_KEY=your_api_key"
echo "   - SMS_SENDER_NAME=YourBrandName (optional)"
echo ""
echo "2. Ensure Redis is running for the SMS queue:"
echo "   redis-cli ping"
echo ""
echo "3. Check server logs for SMS sending status:"
echo "   npx pm2 logs elite  # if using PM2"
echo "   # OR check console output if running with npm run dev"
echo ""
echo "4. Verify user exists in database:"
echo "   SELECT * FROM users WHERE phone = '$PHONE_NUMBER' AND school_id = '$SCHOOL_ID';"
echo ""
