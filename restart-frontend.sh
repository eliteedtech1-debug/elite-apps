#!/bin/bash

echo "=========================================="
echo "Restarting Frontend (Vite)"
echo "=========================================="

# Find and kill existing Vite processes on port 3000
echo "Stopping existing frontend processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Clear Vite cache
echo "Clearing Vite cache..."
cd /Users/apple/Downloads/apps/elite/elscholar-ui
rm -rf node_modules/.vite
rm -rf dist/

# Start Vite dev server
echo "Starting Vite dev server..."
npm run dev &

sleep 3
echo ""
echo "=========================================="
echo "Frontend restarted!"
echo "=========================================="
echo ""
echo "IMPORTANT: You MUST do one of these:"
echo "1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Open Incognito/Private window"
echo "3. Clear browser cache completely"
echo ""
echo "Then check browser console (F12) for:"
echo "  'ChatbotWidget - User Type: YourUserType'"
echo ""
echo "If you see the chatbot widget, check the console to see"
echo "what user_type value is being detected."
echo ""
