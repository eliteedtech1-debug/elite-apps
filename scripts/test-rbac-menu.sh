#!/bin/bash

# Test RBAC menu endpoint
echo "Testing RBAC menu endpoint..."

# First, let's try to get a token by logging in
echo "Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:34567/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Elite Developer",
    "password": "password123"
  }')

echo "Login response: $TOKEN_RESPONSE"

# Extract token (assuming it's in response.token)
TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "Got token: ${TOKEN:0:20}..."
  
  # Test menu endpoint
  echo "Testing menu endpoint..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:34567/api/rbac/menu | jq '.'
else
  echo "Failed to get token"
fi
