#!/bin/bash

echo "🔄 Forcing frontend refresh..."
echo ""

# Add a timestamp comment to force rebuild
TIMESTAMP=$(date +%s)
FILE="/Users/apple/Downloads/apps/elite/elscholar-ui/src/feature-module/academic/examinations/exam-results/EndOfTermReport.tsx"

# Add a comment at the end to trigger rebuild
echo "// Build timestamp: $TIMESTAMP" >> "$FILE"

echo "✅ Frontend file modified - Vite will auto-reload"
echo ""
echo "📋 Next steps:"
echo "1. Wait 2-3 seconds for Vite to rebuild"
echo "2. Go to browser"
echo "3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "4. Generate report again"
echo ""
echo "If still not working:"
echo "- Close all browser tabs for localhost:3000"
echo "- Clear browser cache completely"
echo "- Reopen the page"
