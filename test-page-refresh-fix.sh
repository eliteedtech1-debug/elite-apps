#!/bin/bash

# Test script for Smart Page Refresh Fix
# Tests the new NavigationLoaderContext behavior

echo "========================================="
echo "Smart Page Refresh Fix - Test Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Test Plan:${NC}"
echo "1. Verify timeout changes (10s → 30s)"
echo "2. Check page load detection logic"
echo "3. Verify error detection implementation"
echo "4. Check reload cancellation on success"
echo ""

# Test 1: Check timeout value
echo -e "${YELLOW}Test 1: Checking reload timeout value...${NC}"
TIMEOUT_LINE=$(grep -n "reloadTimeout = " /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx | head -1)
if echo "$TIMEOUT_LINE" | grep -q "30000"; then
    echo -e "${GREEN}✅ PASS: Reload timeout is 30 seconds (was 10 seconds)${NC}"
else
    echo -e "${RED}❌ FAIL: Reload timeout not set to 30000ms${NC}"
    echo "Found: $TIMEOUT_LINE"
fi
echo ""

# Test 2: Check for pageLoadedRef
echo -e "${YELLOW}Test 2: Checking for page load tracking...${NC}"
if grep -q "pageLoadedRef" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Page load tracking (pageLoadedRef) implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Page load tracking not found${NC}"
fi
echo ""

# Test 3: Check for error detection
echo -e "${YELLOW}Test 3: Checking for critical error detection...${NC}"
if grep -q "ChunkLoadError\|Failed to fetch\|NetworkError" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Critical error detection implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Critical error detection not found${NC}"
fi
echo ""

# Test 4: Check for reload cancellation
echo -e "${YELLOW}Test 4: Checking for reload timer cancellation...${NC}"
if grep -q "clearTimeout(reloadTimerRef.current)" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Reload timer cancellation implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Reload timer cancellation not found${NC}"
fi
echo ""

# Test 5: Check for page content detection
echo -e "${YELLOW}Test 5: Checking for page content detection...${NC}"
if grep -q "document.querySelector.*main-wrapper" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Page content detection (.main-wrapper) implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Page content detection not found${NC}"
fi
echo ""

# Test 6: Check for hasActualError state
echo -e "${YELLOW}Test 6: Checking for actual error tracking...${NC}"
if grep -q "hasActualError" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Actual error tracking (hasActualError) implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Actual error tracking not found${NC}"
fi
echo ""

# Test 7: Check for global error listeners
echo -e "${YELLOW}Test 7: Checking for global error listeners...${NC}"
if grep -q "window.addEventListener('error'" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Global error listener implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Global error listener not found${NC}"
fi
echo ""

# Test 8: Check for unhandledrejection listener
echo -e "${YELLOW}Test 8: Checking for promise rejection listener...${NC}"
if grep -q "window.addEventListener('unhandledrejection'" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Promise rejection listener implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Promise rejection listener not found${NC}"
fi
echo ""

# Test 9: Check reload attempt limit
echo -e "${YELLOW}Test 9: Checking reload attempt limit...${NC}"
if grep -q "reloadCount < 2" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx; then
    echo -e "${GREEN}✅ PASS: Reload attempt limit (max 2) implemented${NC}"
else
    echo -e "${RED}❌ FAIL: Reload attempt limit not found or incorrect${NC}"
fi
echo ""

# Test 10: Check for enhanced logging
echo -e "${YELLOW}Test 10: Checking for debug logging...${NC}"
LOGGING_COUNT=$(grep -c "console.log\|console.warn\|console.error" /Users/apple/Downloads/apps/elite/frontend/src/contexts/NavigationLoaderContext.tsx)
if [ "$LOGGING_COUNT" -gt 8 ]; then
    echo -e "${GREEN}✅ PASS: Enhanced logging implemented ($LOGGING_COUNT log statements)${NC}"
else
    echo -e "${RED}❌ FAIL: Insufficient logging (found $LOGGING_COUNT statements)${NC}"
fi
echo ""

echo "========================================="
echo -e "${BLUE}📊 Summary${NC}"
echo "========================================="
echo ""
echo -e "${GREEN}Key Improvements:${NC}"
echo "• Reload timeout increased: 10s → 30s"
echo "• Smart page load detection added"
echo "• Critical error detection implemented"
echo "• Reload timer cancellation on success"
echo "• Multi-layer page content detection"
echo "• Global error listeners for actual failures"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Rebuild the frontend: cd frontend && npm run build"
echo "2. Test on slow network (Chrome DevTools → Network → Slow 3G)"
echo "3. Navigate between pages and monitor console"
echo "4. Verify no reloads on normal slow loads"
echo "5. Test actual failure scenario (Network → Offline)"
echo ""
echo -e "${BLUE}Documentation:${NC} See SMART_PAGE_REFRESH_FIX.md for details"
echo ""

# Check if frontend needs rebuild
if [ -d "/Users/apple/Downloads/apps/elite/frontend/node_modules" ]; then
    echo -e "${YELLOW}💡 Tip: Run 'cd frontend && npm run build' to apply changes${NC}"
else
    echo -e "${YELLOW}⚠️ Warning: node_modules not found. Run 'npm install' first.${NC}"
fi
echo ""
