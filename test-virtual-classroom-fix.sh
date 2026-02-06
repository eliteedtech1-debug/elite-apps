#!/bin/bash

# Test script to verify virtual classroom notifications
echo "🧪 Testing Virtual Classroom Notifications"
echo "=========================================="

# Check if API server is running
echo "1. Checking API server..."
curl -s http://localhost:34567/api/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ API server is running"
else
    echo "❌ API server is not running on port 34567"
    exit 1
fi

# Check if frontend is running
echo "2. Checking frontend server..."
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Frontend server is running"
else
    echo "❌ Frontend server is not running on port 3000"
    exit 1
fi

echo ""
echo "🔍 Issue Analysis:"
echo "- Students see 'Test Notification' button on dashboard"
echo "- When Jitsi meeting starts, students should see 'Join Class' notification"
echo "- Problem: Real class notifications not reaching students"
echo ""
echo "🛠️  Applied Fixes:"
echo "1. Simplified notification filtering (removed class matching)"
echo "2. Fixed student ID format for socket connection"
echo "3. Added debug logging to socket service"
echo "4. Added test button for 'Join Class' notification"
echo ""
echo "📋 Next Steps:"
echo "1. Start the servers: npm run dev (API) and npm start (UI)"
echo "2. Login as a student"
echo "3. Click 'Test Join Class' button to verify notification works"
echo "4. Have a teacher start a virtual classroom to test real notifications"
echo ""
echo "🐛 Debug Tips:"
echo "- Check browser console for socket connection logs"
echo "- Check API logs for notification sending"
echo "- Verify student admission_no matches in database"
