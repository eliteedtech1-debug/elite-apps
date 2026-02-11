# 🌐 API Gateway Implementation Plan

**Phase:** Post-Modularization (Optional)  
**Timeline:** 2-3 weeks  
**Prerequisites:** Modularization complete, services separated

---

## 📋 Overview

### What is API Gateway?

Single entry point that routes requests to domain-specific services:

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

### Benefits
- Single endpoint for clients
- Centralized authentication
- Rate limiting per service
- Load balancing
- Request/response transformation
- Service discovery
- Monitoring & logging

---

## 🎯 Implementation Strategy

### Option 1: Gradual (Recommended)
Keep monolithic API, add gateway for new features only

### Option 2: Full Migration
Split entire API into microservices with gateway

### Option 3: Hybrid
Gateway routes to both monolith and new microservices

---

## 🏗️ Architecture

### Current (Monolithic)
```
elscholar-api/ (Port 34567)
├── src/
│   ├── models/
│   │   ├── hr/
│   │   ├── finance/
│   │   └── academic/
│   ├── controllers/
│   └── routes/
└── All databases
```

### Target (With Gateway)
```
elite-gateway/ (Port 3000)
└── Routes to services

elite-hr-service/ (Port 3001)
├── src/models/hr/
├── src/controllers/hr/
└── elite_hr database

elite-finance-service/ (Port 3002)
├── src/models/finance/
├── src/controllers/finance/
└── elite_finance database

elite-academic-service/ (Port 3003)
├── src/models/academic/
├── src/controllers/academic/
└── elite_academic database

elite-content-service/ (Port 3004)
└── elite_content database

elite-cbt-service/ (Port 3005)
└── elite_cbt database
```

---

## 📁 Gateway Structure

```
elite-gateway/
├── package.json
├── .env
├── src/
│   ├── index.js (main gateway)
│   ├── config/
│   │   ├── services.js (service registry)
│   │   └── routes.js (route mapping)
│   ├── middleware/
│   │   ├── auth.js (centralized auth)
│   │   ├── rateLimit.js
│   │   ├── logger.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── hr.js
│   │   ├── finance.js
│   │   ├── academic.js
│   │   ├── content.js
│   │   └── cbt.js
│   └── utils/
│       ├── proxy.js
│       └── loadBalancer.js
└── logs/
```

---

## 💻 Implementation

### Step 1: Install Dependencies

```bash
mkdir elite-gateway
cd elite-gateway
npm init -y

npm install express
npm install http-proxy-middleware
npm install express-rate-limit
npm install helmet
npm install cors
npm install dotenv
npm install winston
npm install redis (optional - for distributed rate limiting)
```

### Step 2: Create Gateway Server

```javascript
// src/index.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./config/routes');
const { authenticate } = require('./middleware/auth');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
app.use(cors());

// Logging
app.use(logger);

// Parse JSON
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Authentication (optional - can be per route)
// app.use('/api', authenticate);

// Route to services
routes(app);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 API Gateway running on port ${PORT}`);
});
```

### Step 3: Service Registry

```javascript
// src/config/services.js
module.exports = {
  hr: {
    url: process.env.HR_SERVICE_URL || 'http://localhost:3001',
    timeout: 30000
  },
  finance: {
    url: process.env.FINANCE_SERVICE_URL || 'http://localhost:3002',
    timeout: 30000
  },
  academic: {
    url: process.env.ACADEMIC_SERVICE_URL || 'http://localhost:3003',
    timeout: 30000
  },
  content: {
    url: process.env.CONTENT_SERVICE_URL || 'http://localhost:3004',
    timeout: 30000
  },
  cbt: {
    url: process.env.CBT_SERVICE_URL || 'http://localhost:3005',
    timeout: 30000
  }
};
```

### Step 4: Route Configuration

```javascript
// src/config/routes.js
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('./services');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

module.exports = (app) => {
  // HR Service
  app.use('/api/hr', 
    authenticate,
    rateLimit('hr'),
    createProxyMiddleware({
      target: services.hr.url,
      changeOrigin: true,
      pathRewrite: { '^/api/hr': '/api' },
      timeout: services.hr.timeout,
      onProxyReq: (proxyReq, req) => {
        // Forward auth headers
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-School-Id', req.user.school_id);
          proxyReq.setHeader('X-Branch-Id', req.user.branch_id);
        }
      }
    })
  );

  // Finance Service
  app.use('/api/finance',
    authenticate,
    rateLimit('finance'),
    createProxyMiddleware({
      target: services.finance.url,
      changeOrigin: true,
      pathRewrite: { '^/api/finance': '/api' },
      timeout: services.finance.timeout
    })
  );

  // Academic Service
  app.use('/api/academic',
    authenticate,
    rateLimit('academic'),
    createProxyMiddleware({
      target: services.academic.url,
      changeOrigin: true,
      pathRewrite: { '^/api/academic': '/api' },
      timeout: services.academic.timeout
    })
  );

  // Content Service
  app.use('/api/content',
    authenticate,
    rateLimit('content'),
    createProxyMiddleware({
      target: services.content.url,
      changeOrigin: true,
      pathRewrite: { '^/api/content': '/api' },
      timeout: services.content.timeout
    })
  );

  // CBT Service
  app.use('/api/cbt',
    authenticate,
    rateLimit('cbt'),
    createProxyMiddleware({
      target: services.cbt.url,
      changeOrigin: true,
      pathRewrite: { '^/api/cbt': '/api' },
      timeout: services.cbt.timeout
    })
  );
};
```

### Step 5: Authentication Middleware

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Forward user context to services
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-school-id'] = decoded.school_id;
    req.headers['x-branch-id'] = decoded.branch_id;
    req.headers['x-user-role'] = decoded.role;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Step 6: Rate Limiting

```javascript
// src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const limiters = {
  hr: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many HR requests'
  }),
  finance: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Higher limit for finance
    message: 'Too many finance requests'
  }),
  academic: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: 'Too many academic requests'
  }),
  content: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many content requests'
  }),
  cbt: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // Lower for exam system
    message: 'Too many CBT requests'
  })
};

module.exports = (service) => limiters[service];
```

### Step 7: Logging Middleware

```javascript
// src/middleware/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
};
```

### Step 8: Error Handler

```javascript
// src/middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error('Gateway Error:', err);
  
  // Proxy errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'The requested service is currently unavailable'
    });
  }
  
  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      error: 'Gateway timeout',
      message: 'The service took too long to respond'
    });
  }
  
  // Default error
  res.status(500).json({
    error: 'Internal gateway error',
    message: err.message
  });
};
```

### Step 9: Environment Configuration

```bash
# elite-gateway/.env
PORT=3000
JWT_SECRET=your_jwt_secret

# Service URLs
HR_SERVICE_URL=http://localhost:3001
FINANCE_SERVICE_URL=http://localhost:3002
ACADEMIC_SERVICE_URL=http://localhost:3003
CONTENT_SERVICE_URL=http://localhost:3004
CBT_SERVICE_URL=http://localhost:3005

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

---

## 🔄 Migration Strategy

### Phase 1: Gateway Setup (Week 1)
- [ ] Create gateway project
- [ ] Install dependencies
- [ ] Configure routes
- [ ] Set up authentication
- [ ] Add rate limiting
- [ ] Add logging

### Phase 2: Extract HR Service (Week 2)
- [ ] Create elite-hr-service project
- [ ] Copy HR models, controllers, routes
- [ ] Configure elite_hr database
- [ ] Test independently
- [ ] Route through gateway
- [ ] Update frontend to use gateway

### Phase 3: Extract Other Services (Week 3)
- [ ] Extract finance service
- [ ] Extract academic service
- [ ] Extract content service
- [ ] Extract CBT service
- [ ] Full integration testing

---

## 🧪 Testing

### Test Gateway
```bash
# Start gateway
cd elite-gateway
npm start

# Test health
curl http://localhost:3000/health

# Test HR route
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/hr/staff
```

### Test Service Directly
```bash
# Start HR service
cd elite-hr-service
npm start

# Test directly
curl http://localhost:3001/api/staff
```

---

## 📊 Monitoring

### Add Health Checks
```javascript
// src/routes/health.js
const axios = require('axios');
const services = require('../config/services');

app.get('/health/services', async (req, res) => {
  const checks = await Promise.allSettled([
    axios.get(`${services.hr.url}/health`),
    axios.get(`${services.finance.url}/health`),
    axios.get(`${services.academic.url}/health`),
    axios.get(`${services.content.url}/health`),
    axios.get(`${services.cbt.url}/health`)
  ]);
  
  res.json({
    gateway: 'ok',
    services: {
      hr: checks[0].status === 'fulfilled' ? 'ok' : 'down',
      finance: checks[1].status === 'fulfilled' ? 'ok' : 'down',
      academic: checks[2].status === 'fulfilled' ? 'ok' : 'down',
      content: checks[3].status === 'fulfilled' ? 'ok' : 'down',
      cbt: checks[4].status === 'fulfilled' ? 'ok' : 'down'
    }
  });
});
```

---

## 🚀 Deployment

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  gateway:
    build: ./elite-gateway
    ports:
      - "3000:3000"
    environment:
      - HR_SERVICE_URL=http://hr-service:3001
      - FINANCE_SERVICE_URL=http://finance-service:3002
    depends_on:
      - hr-service
      - finance-service

  hr-service:
    build: ./elite-hr-service
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=mysql
      - DB_NAME=elite_hr

  finance-service:
    build: ./elite-finance-service
    ports:
      - "3002:3002"
    environment:
      - DB_HOST=mysql
      - DB_NAME=elite_finance

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
```

---

## 📋 Integration with Modularization Plan

### Updated Timeline

**Weeks 1-7:** Modularization (as planned)  
**Weeks 8-10:** API Gateway (optional)

```
Week 8: Gateway Setup
  - Create gateway project
  - Configure routes
  - Set up middleware

Week 9: Extract Services
  - Extract HR service
  - Extract finance service
  - Test integration

Week 10: Complete Migration
  - Extract remaining services
  - Full testing
  - Deploy to production
```

---

## ✅ Benefits

### Performance
- Load balancing across services
- Independent scaling
- Service-level caching

### Security
- Centralized authentication
- Rate limiting per service
- Request validation

### Monitoring
- Centralized logging
- Service health checks
- Request tracing

### Development
- Independent deployments
- Team ownership
- Technology flexibility

---

## 🚨 Considerations

### Complexity
- More moving parts
- Network latency
- Service discovery

### When to Use
✅ Multiple teams  
✅ Different scaling needs  
✅ Independent deployments  
❌ Small team  
❌ Simple application  
❌ Low traffic

---

## 🎯 Recommendation

### For Your Project

**Now:** Complete modularization (Weeks 1-7)  
**Later:** Consider gateway if:
- Team grows beyond 5 developers
- Services need independent scaling
- Different deployment schedules needed

**Alternative:** Keep modular monolith, add gateway only when needed

---

## 📝 Summary

**Gateway adds:**
- Single entry point
- Centralized auth
- Rate limiting
- Load balancing
- Service monitoring

**Trade-offs:**
- More complexity
- Network overhead
- Operational burden

**Decision:** Implement after modularization if benefits outweigh costs

---

*API Gateway plan created: 2026-02-11 03:44 UTC*  
*Status: Optional enhancement*  
*Timeline: 2-3 weeks post-modularization*
