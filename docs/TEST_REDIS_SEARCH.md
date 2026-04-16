# Redis-Cached Search Testing Guide

## ✅ Prerequisites Verified:
- Redis installed and running (PONG response confirmed)
- Backend configured with Redis credentials
- Search routes registered in API
- Frontend search component integrated

---

## 🚀 Quick Start (2 minutes)

### 1. Start Backend with Redis
```bash
cd elscholar-api
npm run dev
```

**Expected output:**
```
Server running on port 34567
Redis connected successfully
Database connected: full_skcooly
```

### 2. Start Frontend
```bash
cd elscholar-ui
npm start
```

**Expected output:**
```
VITE ready in XXXms
Local: http://localhost:3000
```

---

## 🔍 Test Redis Caching

### Test 1: First Search (Database Hit)
1. Open app: `http://localhost:3000`
2. Press `Ctrl+K` to open search
3. Type: "john"
4. **Check Network Tab (F12):**
   - Response time: ~200-500ms
   - Response includes: `"cached": false` (or no cached field)

### Test 2: Same Search (Cache Hit)
1. Press `Ctrl+K` again
2. Type: "john" (same query)
3. **Check Network Tab:**
   - Response time: ~10-50ms (much faster!)
   - Response includes: `"cached": true`

### Test 3: Cache Expiration
1. Wait 5 minutes (cache TTL)
2. Search "john" again
3. **Check Network Tab:**
   - Response time: ~200-500ms (back to database)
   - Response includes: `"cached": false`

---

## 🧪 Manual API Testing

### Test with curl:
```bash
# First request (database)
curl -X POST http://localhost:34567/api/search/global \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -d '{"query": "john", "limit": 10}'

# Second request (cached - should be faster)
curl -X POST http://localhost:34567/api/search/global \
  -H "Content-Type: application/json" \
  -H "X-School-Id: SCH/20" \
  -H "X-Branch-Id: BRCH00027" \
  -d '{"query": "john", "limit": 10}'
```

### Check Redis directly:
```bash
# Connect to Redis
redis-cli

# List all search cache keys
KEYS search:*

# Get a specific cached result
GET "search:SCH/20:BRCH00027:john:10"

# Check TTL (time to live)
TTL "search:SCH/20:BRCH00027:john:10"

# Clear all search cache
KEYS search:* | xargs redis-cli DEL

# Exit Redis
exit
```

---

## 📊 Performance Comparison

### Without Redis Cache:
- Search time: 200-500ms
- Database queries: 4 (students, staff, payments, classes)
- Network latency: High

### With Redis Cache:
- Search time: 10-50ms (10x faster!)
- Database queries: 0 (served from memory)
- Network latency: Minimal

---

## 🔧 Redis Configuration

### Current Settings:
- **Host:** localhost
- **Port:** 6379
- **Password:** Radis123
- **Cache TTL:** 300 seconds (5 minutes)
- **Cache Key Format:** `search:{school_id}:{branch_id}:{query}:{limit}`

### Why 5 Minutes?
- Balances freshness vs performance
- Student/staff data doesn't change frequently
- Reduces database load significantly
- Can be adjusted in `search_routes.js` (CACHE_TTL)

---

## 🐛 Troubleshooting

### Redis Not Connecting:
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
redis-server

# Or on macOS with Homebrew
brew services start redis
```

### Cache Not Working:
1. Check backend logs for Redis errors
2. Verify Redis password in `.env` matches
3. Test Redis connection manually
4. Clear cache and retry: `redis-cli FLUSHDB`

### Search Still Slow:
1. Check if Redis is actually connected (backend logs)
2. Verify cache key format is correct
3. Check database indexes on search columns
4. Monitor slow query logs

---

## 📈 Monitoring Redis

### Check Memory Usage:
```bash
redis-cli INFO memory
```

### Check Cache Hit Rate:
```bash
redis-cli INFO stats | grep keyspace
```

### Monitor Real-Time Commands:
```bash
redis-cli MONITOR
```

---

## 🎯 Success Checklist

- [ ] Redis responds to PING
- [ ] Backend connects to Redis on startup
- [ ] First search takes 200-500ms
- [ ] Second search takes 10-50ms
- [ ] Response includes `"cached": true` on cache hit
- [ ] Cache expires after 5 minutes
- [ ] Search works across all types (students, staff, payments, classes)
- [ ] Multi-tenant isolation works (different schools have different cache)

---

## 💡 Next Steps

### Optimize Further:
1. Add Redis caching to other frequently accessed endpoints
2. Implement cache invalidation on data updates
3. Add Redis session storage for authentication
4. Use Redis for rate limiting
5. Implement Redis pub/sub for real-time features

### Monitor Performance:
1. Track cache hit rates
2. Monitor Redis memory usage
3. Set up alerts for cache misses
4. Analyze slow queries

---

**Testing Time:** ~5 minutes  
**Difficulty:** Easy  
**Performance Gain:** 10x faster searches  
**Status:** READY FOR TESTING ✅
