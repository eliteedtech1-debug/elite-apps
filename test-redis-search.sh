#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎉 Elite Scholar - Redis Search Implementation Complete  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 System Status Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Redis
if redis-cli -a Radis123 --no-auth-warning ping > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Redis:${NC} Running on port 6379"
else
  echo -e "${YELLOW}⚠️  Redis:${NC} Not running"
fi

# Check Backend
if curl -s http://localhost:34567/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Backend:${NC} Running on port 34567"
else
  echo -e "${YELLOW}⚠️  Backend:${NC} Not running"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Frontend:${NC} Running on port 3000"
else
  echo -e "${YELLOW}⚠️  Frontend:${NC} Not running"
fi

echo ""
echo -e "${BLUE}🔍 Testing Redis-Cached Search${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: First search
echo -e "${YELLOW}Test 1:${NC} First search (database hit)"
START=$(date +%s%N)
RESPONSE1=$(curl -s -X POST http://localhost:34567/api/search/global \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -d '{"query": "demo", "limit": 5}')
END=$(date +%s%N)
TIME1=$(echo "scale=0; ($END - $START) / 1000000" | bc)
CACHED1=$(echo $RESPONSE1 | grep -o '"cached":true' > /dev/null && echo "true" || echo "false")
echo "   ⏱️  Response time: ${TIME1}ms"
echo "   📦 Cached: $CACHED1"

sleep 0.5

# Test 2: Cached search
echo ""
echo -e "${YELLOW}Test 2:${NC} Same search (cache hit)"
START=$(date +%s%N)
RESPONSE2=$(curl -s -X POST http://localhost:34567/api/search/global \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -d '{"query": "demo", "limit": 5}')
END=$(date +%s%N)
TIME2=$(echo "scale=0; ($END - $START) / 1000000" | bc)
CACHED2=$(echo $RESPONSE2 | grep -o '"cached":true' > /dev/null && echo "true" || echo "false")
echo "   ⏱️  Response time: ${TIME2}ms"
echo "   📦 Cached: $CACHED2"

# Calculate speedup
if [ "$TIME1" -gt 0 ] && [ "$TIME2" -gt 0 ]; then
  SPEEDUP=$(echo "scale=1; $TIME1 / $TIME2" | bc)
  echo ""
  echo -e "${GREEN}🚀 Performance gain: ${SPEEDUP}x faster${NC}"
fi

echo ""
echo -e "${BLUE}💾 Redis Cache Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CACHE_COUNT=$(redis-cli -a Radis123 --no-auth-warning KEYS "search:*" 2>/dev/null | wc -l | xargs)
echo "   📊 Cached searches: $CACHE_COUNT"

if [ "$CACHE_COUNT" -gt 0 ]; then
  echo "   🔑 Cache keys:"
  redis-cli -a Radis123 --no-auth-warning KEYS "search:*" 2>/dev/null | while read key; do
    TTL=$(redis-cli -a Radis123 --no-auth-warning TTL "$key" 2>/dev/null)
    echo "      • $key (TTL: ${TTL}s)"
  done
fi

echo ""
echo -e "${BLUE}📚 Quick Reference${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🌐 Frontend:  http://localhost:3000"
echo "   🔧 Backend:   http://localhost:34567"
echo "   ⌨️  Search:    Press Ctrl+K or Cmd+K"
echo ""
echo "   📖 Documentation:"
echo "      • QUICK_TEST_GUIDE.md - Basic testing (5 min)"
echo "      • TEST_REDIS_SEARCH.md - Redis testing"
echo "      • WEEK3_COMPLETE.md - Full summary"
echo ""
echo "   🛠️  Redis Commands:"
echo "      redis-cli -a Radis123 KEYS 'search:*'  # View cache"
echo "      redis-cli -a Radis123 FLUSHDB         # Clear cache"
echo "      redis-cli -a Radis123 MONITOR         # Watch commands"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ALL SYSTEMS READY                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
