#!/bin/bash

# Modularization Progress Reminder

echo ""
echo "📋 MODULARIZATION STATUS"
echo "========================"
echo ""

# Check current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
echo "📍 Current Branch: $BRANCH"

if [[ "$BRANCH" != "feature/modularization" ]]; then
  echo "   ⚠️  Not on implementation branch"
  echo "   Switch with: git checkout feature/modularization"
fi
echo ""

# Show progress
if [ -f "IMPLEMENTATION_TRACKER.md" ]; then
  # Count tasks
  TOTAL=$(grep -c "\[ \]" IMPLEMENTATION_TRACKER.md 2>/dev/null || echo "0")
  DONE=$(grep -c "\[x\]" IMPLEMENTATION_TRACKER.md 2>/dev/null || echo "0")
  
  if [ $((TOTAL + DONE)) -gt 0 ]; then
    PERCENT=$((DONE * 100 / (TOTAL + DONE)))
    echo "📊 Progress: $DONE completed, $TOTAL remaining ($PERCENT%)"
  else
    echo "📊 Progress: Just getting started!"
  fi
  echo ""
  
  # Show current week
  CURRENT_WEEK=$(grep "🟡" IMPLEMENTATION_TRACKER.md | head -1)
  if [ -n "$CURRENT_WEEK" ]; then
    echo "📅 Current Phase:"
    echo "   $CURRENT_WEEK"
    echo ""
  fi
  
  # Show next tasks
  echo "✅ Next 5 Tasks:"
  grep "\[ \]" IMPLEMENTATION_TRACKER.md | head -5 | sed 's/^/   /'
  echo ""
else
  echo "⚠️  IMPLEMENTATION_TRACKER.md not found"
  echo "   Run: git checkout feature/modularization"
  echo ""
fi

# Show reference docs
echo "📚 Reference Documents:"
echo "   - MODULARIZATION_PLAN.md (full plan)"
echo "   - MODULARIZATION_QUICKSTART.md (quick ref)"
echo "   - DATABASE_SEPARATION_PLAN.md (database plan)"
echo "   - IMPLEMENTATION_TRACKER.md (progress tracker)"
echo ""

# Show quick commands
echo "🔧 Quick Commands:"
echo "   - View tracker: cat IMPLEMENTATION_TRACKER.md"
echo "   - Edit tracker: vim IMPLEMENTATION_TRACKER.md"
echo "   - Run setup: ./scripts/setup-modularization.sh"
echo "   - Commit progress: git add . && git commit -m 'progress: [task]'"
echo ""

# Show timeline
echo "📅 Timeline (7 weeks):"
echo "   Week 1 (Feb 11-17): Preparation 🟡"
echo "   Week 2 (Feb 18-24): HR Module"
echo "   Week 3 (Feb 25-Mar 3): Finance Module"
echo "   Week 4 (Mar 4-10): Academic Module"
echo "   Week 5 (Mar 11-17): Content Module"
echo "   Week 6 (Mar 18-24): CBT Module"
echo "   Week 7 (Mar 25-31): Cleanup & Testing"
echo ""
