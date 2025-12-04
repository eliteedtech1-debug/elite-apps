#!/bin/bash

# Test forgot password endpoint

echo "Testing /auth/forgot-password endpoint..."
echo ""

# Test with email
curl -X POST http://localhost:34567/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "school_id": "test-school-123"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test with phone
curl -X POST http://localhost:34567/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "school_id": "test-school-123"
  }' | jq '.'
