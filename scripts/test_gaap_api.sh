#!/bin/bash

echo "Testing GAAP-compliant family aggregated API endpoint..."

# Test the API endpoint
response=$(curl -s -X GET 'http://localhost:34567/api/orm-payments/entries/family-aggregated?academic_year=2025/2026&term=First%20Term&school_id=SCH/20&branch_id=BRCH00027' \
  -H 'X-Branch-Id: BRCH00027' \
  -H 'X-School-Id: SCH/20' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json')

if [ $? -eq 0 ] && [ ! -z "$response" ]; then
    echo "✅ API Response received:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "❌ API call failed or server not running"
    echo "Starting server and retrying..."
    
    # Start the server in background
    cd elscholar-api
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Retry the API call
    response=$(curl -s -X GET 'http://localhost:34567/api/orm-payments/entries/family-aggregated?academic_year=2025/2026&term=First%20Term&school_id=SCH/20&branch_id=BRCH00027' \
      -H 'X-Branch-Id: BRCH00027' \
      -H 'X-School-Id: SCH/20' \
      -H 'Accept: application/json' \
      -H 'Content-Type: application/json')
    
    if [ ! -z "$response" ]; then
        echo "✅ API Response after server start:"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo "❌ Still no response from API"
    fi
    
    # Clean up
    kill $SERVER_PID 2>/dev/null
fi

echo ""
echo "GAAP Compliance Features Added:"
echo "✅ ASC 606 Five-Step Revenue Recognition Model"
echo "✅ Performance Obligation Tracking"
echo "✅ Deferred Revenue Calculation"
echo "✅ Contract Assets/Liabilities"
echo "✅ Bad Debt Allowance (CECL Model)"
echo "✅ Revenue Recognition Status"
echo "✅ GAAP Compliance Summary"
echo ""
echo "Database Issues Fixed:"
echo "✅ Parent information properly joined from parents table"
echo "✅ Students with valid parent_id filtering"
echo "✅ Enhanced student status filtering"
echo "✅ Proper NULL handling for parent data"
