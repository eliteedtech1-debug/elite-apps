#!/bin/bash

# Frontend Integration Test
# Test the React UI with Enhanced Time Slot API

echo "🚀 Frontend Integration Test"
echo "============================"
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend: http://localhost:34567"
echo ""

# Check both servers are running
echo "🔍 Checking servers..."
FRONTEND_STATUS=$(curl -s http://localhost:3000 > /dev/null && echo "✅ Running" || echo "❌ Not running")
BACKEND_STATUS=$(curl -s http://localhost:34567/health > /dev/null && echo "✅ Running" || echo "❌ Not running")

echo "   Frontend: $FRONTEND_STATUS"
echo "   Backend: $BACKEND_STATUS"
echo ""

if [[ "$FRONTEND_STATUS" == *"Running"* && "$BACKEND_STATUS" == *"Running"* ]]; then
    echo "🎯 Integration Test Instructions:"
    echo "================================="
    echo ""
    echo "1. Open browser: http://localhost:3000"
    echo "2. Login with: aakabir88@gmail.com / EliteSMS@2024!"
    echo "3. Navigate to: Academic > Class Timetable"
    echo "4. Click on: Time Slots tab"
    echo "5. Select: Primary section"
    echo ""
    echo "🧪 Test Features:"
    echo "   ✅ Nigerian Templates (should show 2 templates)"
    echo "   ✅ Teacher Assignments (should show 45 assignments)"
    echo "   ✅ Generate from Template (should create 55 slots)"
    echo "   ✅ AI Timetable Generation (should optimize slots)"
    echo "   ✅ Prayer Times Integration (should show Islamic times)"
    echo ""
    echo "🎉 Ready for testing!"
    echo "📱 Open: http://localhost:3000"
else
    echo "❌ Servers not ready. Please start both frontend and backend."
fi
