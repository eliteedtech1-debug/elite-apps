#!/bin/bash

# Test Billing API Endpoints

echo "🧪 Testing Messaging Billing System"
echo "===================================="
echo ""

SCHOOL_ID="${1:-SCH/1}"

echo "📊 1. Getting billing report for school: $SCHOOL_ID"
echo "---------------------------------------------------"
curl -s "http://localhost:34567/api/messaging-billing?school_id=$SCHOOL_ID" | jq '.'
echo ""

echo "📅 2. Getting monthly billing breakdown"
echo "---------------------------------------"
curl -s "http://localhost:34567/api/messaging-billing?school_id=$SCHOOL_ID&group_by=month" | jq '.'
echo ""

echo "📈 3. Getting messaging statistics"
echo "----------------------------------"
curl -s "http://localhost:34567/api/messaging-stats?school_id=$SCHOOL_ID" | jq '.'
echo ""

echo "📋 4. Getting message history"
echo "-----------------------------"
curl -s "http://localhost:34567/api/messaging-history?school_id=$SCHOOL_ID&limit=5" | jq '.'
echo ""

echo "✅ All tests completed!"
