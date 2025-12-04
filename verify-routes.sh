#!/bin/bash

# Quick verification script to check if backend routes are accessible
# Usage: ./verify-routes.sh <JWT_TOKEN>

API_URL="http://localhost:34567"

if [ -z "$1" ]; then
    echo "❌ ERROR: JWT token required"
    echo "Usage: ./verify-routes.sh <JWT_TOKEN>"
    echo ""
    echo "Get your JWT token by:"
    echo "  1. Login to the app"
    echo "  2. Open Browser DevTools (F12)"
    echo "  3. Go to Application → Local Storage"
    echo "  4. Copy the value of '@@auth_token'"
    exit 1
fi

JWT_TOKEN="$1"

echo "================================="
echo "🔍 Verifying Backend Routes"
echo "================================="
echo ""

# Test 1: Check if server is running
echo "Test 1: Checking if server is running..."
if curl -s --max-time 5 "$API_URL" > /dev/null 2>&1; then
    echo "✅ Server is running at $API_URL"
else
    echo "❌ Server is NOT running or not accessible"
    echo "   Please start the server with: cd elscholar-api && npm start"
    exit 1
fi
echo ""

# Test 2: GET /school-setup
echo "Test 2: Testing GET /school-setup..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/school-setup?query_type=select&school_id=SCH/1&branch_id=BRCH00001" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if [ "$RESPONSE" == "200" ]; then
    echo "✅ GET /school-setup is working (HTTP $RESPONSE)"
elif [ "$RESPONSE" == "404" ]; then
    echo "❌ GET /school-setup NOT FOUND (HTTP $RESPONSE)"
    echo "   Action: Restart backend server to load route changes"
elif [ "$RESPONSE" == "401" ]; then
    echo "❌ GET /school-setup UNAUTHORIZED (HTTP $RESPONSE)"
    echo "   Action: Check your JWT token (it may be expired)"
else
    echo "⚠️  GET /school-setup returned HTTP $RESPONSE"
fi
echo ""

# Test 3: POST /school-setup (test with query_type)
echo "Test 3: Testing POST /school-setup..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/school-setup" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "SCH/1",
    "branch_id": "BRCH00001",
    "allow_backdated_attendance": 1,
    "backdated_days": 7
  }')

if [ "$RESPONSE" == "200" ]; then
    echo "✅ POST /school-setup is working (HTTP $RESPONSE)"
elif [ "$RESPONSE" == "404" ]; then
    echo "❌ POST /school-setup NOT FOUND (HTTP $RESPONSE)"
    echo "   Action: Restart backend server to load route changes"
elif [ "$RESPONSE" == "401" ]; then
    echo "❌ POST /school-setup UNAUTHORIZED (HTTP $RESPONSE)"
    echo "   Action: Check your JWT token (it may be expired)"
elif [ "$RESPONSE" == "400" ]; then
    echo "⚠️  POST /school-setup returned HTTP 400 (Bad Request)"
    echo "   This might be okay - check if school_id/branch_id exist in database"
else
    echo "⚠️  POST /school-setup returned HTTP $RESPONSE"
fi
echo ""

# Test 4: Check if school_setup table has the new columns
echo "Test 4: Database columns check..."
echo "   (This requires direct database access - skipping automated check)"
echo "   Manual check: Run this SQL query:"
echo "   SELECT allow_backdated_attendance, backdated_days FROM school_setup LIMIT 1;"
echo ""

echo "================================="
echo "📋 Summary"
echo "================================="
echo ""
echo "If all tests passed (✅):"
echo "  → Your backend is ready!"
echo "  → Test the frontend in Admin Dashboard"
echo ""
echo "If tests failed (❌):"
echo "  1. Restart backend server: cd elscholar-api && npm start"
echo "  2. Check JWT token is valid"
echo "  3. Verify database migration was run"
echo "  4. Check server logs for errors"
echo ""
