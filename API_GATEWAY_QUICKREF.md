# 🌐 API Gateway Quick Reference

**Status:** Optional (Post-Modularization)  
**Timeline:** 3 weeks  
**Full Plan:** API_GATEWAY_PLAN.md

---

## What It Does

```
Client Request
    ↓
API Gateway (Port 3000)
    ↓
    ├→ HR Service (Port 3001)
    ├→ Finance Service (Port 3002)
    ├→ Academic Service (Port 3003)
    ├→ Content Service (Port 3004)
    └→ CBT Service (Port 3005)
```

---

## Quick Setup

```bash
# Install
mkdir elite-gateway && cd elite-gateway
npm init -y
npm install express http-proxy-middleware express-rate-limit helmet cors

# Create gateway
cat > src/index.js << 'JS'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/api/hr', createProxyMiddleware({ 
  target: 'http://localhost:3001' 
}));

app.use('/api/finance', createProxyMiddleware({ 
  target: 'http://localhost:3002' 
}));

app.listen(3000, () => console.log('Gateway running on 3000'));
JS

# Run
node src/index.js
```

---

## Features

✅ Single entry point  
✅ Centralized auth  
✅ Rate limiting  
✅ Load balancing  
✅ Request logging  
✅ Service health checks

---

## When to Use

**Yes:**
- Team > 5 developers
- Independent scaling needed
- Different deployment schedules

**No:**
- Small team
- Simple application
- Low traffic

---

## Timeline

**Week 8:** Gateway setup  
**Week 9:** Extract services  
**Week 10:** Testing & deployment

---

**Recommendation:** Complete modularization first (Weeks 1-7), then decide if gateway is needed.

See `API_GATEWAY_PLAN.md` for complete implementation.
