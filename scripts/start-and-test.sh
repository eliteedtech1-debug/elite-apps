#!/bin/bash

echo "🚀 Elite Core - Redis Search Testing"
echo "========================================"
echo ""

# Check Redis
echo "1️⃣ Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
  echo "   ✅ Redis is running"
else
  echo "   ❌ Redis is not running"
  echo "   Starting Redis..."
  redis-server --daemonize yes --requirepass Radis123
  sleep 2
fi

echo ""
echo "2️⃣ Backend Status..."
cd elscholar-api

# Check if backend is running
if lsof -ti:34567 > /dev/null 2>&1; then
  echo "   ⚠️  Backend already running on port 34567"
  echo "   Restarting for Redis changes..."
  kill $(lsof -ti:34567) 2>/dev/null
  sleep 2
fi

echo "   Starting backend with Redis support..."
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend..."
for i in {1..10}; do
  if curl -s http://localhost:34567/health > /dev/null 2>&1; then
    echo "   ✅ Backend ready"
    break
  fi
  sleep 1
  echo -n "."
done

echo ""
echo "3️⃣ Frontend Status..."
cd ../elscholar-ui

if lsof -ti:3000 > /dev/null 2>&1; then
  echo "   ✅ Frontend already running on port 3000"
else
  echo "   Starting frontend..."
  npm start > /dev/null 2>&1 &
  echo "   Frontend starting in background..."
fi

echo ""
echo "4️⃣ Testing Redis-Cached Search..."
echo ""

cd ..

# Test 1: First search (database)
echo "   Test 1: First search (database hit)"
START=$(date +%s%N)
RESPONSE1=$(curl -s -X POST http://localhost:34567/api/search/global \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -d '{"query": "test", "limit": 5}')
END=$(date +%s%N)
TIME1=$(echo "scale=3; ($END - $START) / 1000000" | bc)
echo "   Response time: ${TIME1}ms"
echo "   Cached: $(echo $RESPONSE1 | grep -o '"cached":true' || echo 'false')"

sleep 1

# Test 2: Second search (cache)
echo ""
echo "   Test 2: Same search (cache hit)"
START=$(date +%s%N)
RESPONSE2=$(curl -s -X POST http://localhost:34567/api/search/global \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -d '{"query": "test", "limit": 5}')
END=$(date +%s%N)
TIME2=$(echo "scale=3; ($END - $START) / 1000000" | bc)
echo "   Response time: ${TIME2}ms"
echo "   Cached: $(echo $RESPONSE2 | grep -o '"cached":true' || echo 'false')"

echo ""
echo "5️⃣ Redis Cache Status..."
redis-cli -a Radis123 --no-auth-warning KEYS "search:*" 2>/dev/null | wc -l | xargs echo "   Cache entries:"

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Open: http://localhost:3000"
echo "   2. Press Ctrl+K to open search"
echo "   3. Type any query and see instant results"
echo "   4. Check Network tab for cache indicators"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_TEST_GUIDE.md - Basic testing"
echo "   - TEST_REDIS_SEARCH.md - Redis testing"
echo ""
echo "🛠️  Useful Commands:"
echo "   redis-cli -a Radis123 KEYS 'search:*'  # View cache keys"
echo "   redis-cli -a Radis123 FLUSHDB         # Clear cache"
echo "   tail -f elscholar-api/logs/query.log  # Watch queries"
echo ""
