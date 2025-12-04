#!/bin/bash

# SMS API Test Script
# Tests phone number normalization with different formats

echo "🧪 Testing SMS API with various phone number formats..."
echo ""

# API endpoint
API_URL="http://localhost:34567/api/send-sms"

# Test phone numbers in different formats
echo "📞 Test Case 1: Nigerian format with leading 0 (07035384184)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
        "sender": "ELITEEDU",
        "messagetext": "Test SMS 1: Phone format with leading 0",
        "flash": "0"
    },
    "recipients": [
        {
            "msisdn": "07035384184"
        }
    ],
    "dndsender": 1
}' | jq '.'

echo ""
echo "---"
echo ""

echo "📞 Test Case 2: International format without + (2347035384184)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
        "sender": "ELITEEDU",
        "messagetext": "Test SMS 2: International format without +",
        "flash": "0"
    },
    "recipients": [
        {
            "msisdn": "2347035384184"
        }
    ],
    "dndsender": 1
}' | jq '.'

echo ""
echo "---"
echo ""

echo "📞 Test Case 3: International format with + (+2347035384184)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
        "sender": "ELITEEDU",
        "messagetext": "Test SMS 3: International format with +",
        "flash": "0"
    },
    "recipients": [
        {
            "msisdn": "+2347035384184"
        }
    ],
    "dndsender": 1
}' | jq '.'

echo ""
echo "---"
echo ""

echo "📞 Test Case 4: Multiple recipients with mixed formats"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
        "sender": "ELITEEDU",
        "messagetext": "Test SMS 4: Multiple recipients",
        "flash": "0"
    },
    "recipients": [
        {
            "msisdn": "07035384184"
        },
        {
            "msisdn": "2348012345678"
        },
        {
            "msisdn": "+2349087654321"
        }
    ],
    "dndsender": 1
}' | jq '.'

echo ""
echo "---"
echo ""

echo "📞 Test Case 5: Phone with spaces and dashes"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
        "sender": "ELITEEDU",
        "messagetext": "Test SMS 5: Phone with spaces",
        "flash": "0"
    },
    "recipients": [
        {
            "msisdn": "+234 703 538 4184"
        }
    ],
    "dndsender": 1
}' | jq '.'

echo ""
echo "✅ All test cases completed!"
echo ""
echo "Note: If you see 'SMS service not configured' error, please add your"
echo "EBulkSMS credentials to .env file:"
echo "  EBULKSMS_USERNAME=your_actual_username"
echo "  EBULKSMS_API_KEY=your_actual_api_key"
