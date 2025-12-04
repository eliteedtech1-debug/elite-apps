#!/bin/bash

echo "=========================================="
echo "Applying Chatbot Fixes"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Backend restart
echo -e "${YELLOW}Step 1: Restarting Backend (Elite API)${NC}"
cd /Users/apple/Downloads/apps/elite/elscholar-api

# Check if pm2 is running
if pm2 list | grep -q "elite"; then
    echo "Found PM2 process 'elite', restarting..."
    pm2 restart elite
    echo -e "${GREEN}✓ Backend restarted${NC}"
else
    echo -e "${RED}PM2 process 'elite' not found. Please start manually with: pm2 start ecosystem.config.js${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Verifying Backend Changes${NC}"
if grep -q "needsTicketCreation" /Users/apple/Downloads/apps/elite/elscholar-api/src/controllers/ChatbotController.js; then
    echo -e "${GREEN}✓ ChatbotController.js updated${NC}"

    # Check if the bad keyword 'ticket' alone is still there
    if grep -A 15 "needsTicketCreation" /Users/apple/Downloads/apps/elite/elscholar-api/src/controllers/ChatbotController.js | grep -q "'ticket',"; then
        echo -e "${RED}⚠ Warning: Old code detected (standalone 'ticket' keyword found)${NC}"
        echo "Please verify the file was saved correctly"
    else
        echo -e "${GREEN}✓ Ticket keyword detection updated correctly${NC}"
    fi
else
    echo -e "${RED}✗ ChatbotController.js not found or not updated${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Checking Frontend Changes${NC}"
if grep -q "handleSuggestionClick" /Users/apple/Downloads/apps/elite/elscholar-ui/src/feature-module/application/support/ChatbotWidget.tsx; then
    echo -e "${GREEN}✓ ChatbotWidget.tsx found${NC}"

    if grep -A 5 "handleSuggestionClick" /Users/apple/Downloads/apps/elite/elscholar-ui/src/feature-module/application/support/ChatbotWidget.tsx | grep -q "sendMessage(suggestion)"; then
        echo -e "${GREEN}✓ Suggestion click handler updated correctly${NC}"
    else
        echo -e "${RED}⚠ Warning: sendMessage(suggestion) not found in handleSuggestionClick${NC}"
    fi
else
    echo -e "${RED}✗ ChatbotWidget.tsx not found${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Chatbot fixes applied!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clear your browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)"
echo "2. Or use Incognito/Private window for testing"
echo "3. Test the chatbot with these scenarios:"
echo "   - Click suggestion buttons (should send directly)"
echo "   - Type 'create ticket' (should show ticket options)"
echo "   - Click 'Create Support Ticket' (should open modal, no loops)"
echo ""
echo "If frontend is running with 'npm start', restart it:"
echo "   cd /Users/apple/Downloads/apps/elite/elscholar-ui"
echo "   # Press Ctrl+C to stop, then:"
echo "   npm start"
echo ""
echo "Check browser console (F12) for debug logs:"
echo "   'Sending suggestion as message: ...'"
echo ""
