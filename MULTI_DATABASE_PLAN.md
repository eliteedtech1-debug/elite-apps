# 🗄️ Multi-Database Architecture Plan

## Overview
Separate databases for different concerns while maintaining a unified API interface.

---

## 📊 Database Separation Strategy

### Database 1: Main Application DB (`full_skcooly`)
**Purpose:** Core business operations
**Tables:**
- Students, Staff, Classes
- Payments, Fees, Billing
- Attendance, Grades, Assessments
- School Setup, Users, Permissions
- Payroll, Inventory

**Characteristics:**
- High transaction volume
- Critical business data
- Frequent reads/writes
- Requires strong consistency

---

### Database 2: Audit & Compliance DB (`skcooly_audit`)
**Purpose:** Audit trails, logs, compliance
**Tables:**
- audit_trails
- login_sessions
- permission_audit_logs
- rbac_audit_logs
- crash_reports
- system_logs

**Characteristics:**
- Write-heavy (append-only)
- Long-term retention
- Rarely updated
- Can be archived periodically
- Separate backup schedule

**Benefits:**
- ✅ Doesn't bloat main DB
- ✅ Independent backup/restore
- ✅ Can use different storage (cheaper for logs)
- ✅ Better query performance on main DB
- ✅ Easier compliance reporting

---

### Database 3: AI & Chatbot DB (`skcooly_ai`)
**Purpose:** AI training data, chatbot, analytics
**Tables:**
- chatbot_conversations
- chatbot_intents
- chatbot_knowledge_base
- ai_training_data
- ai_model_versions
- ai_feedback
- analytics_cache
- ml_predictions

**Characteristics:**
- Large datasets
- ML training data
- Can be rebuilt from main DB
- Heavy read for training
- Separate scaling needs

**Benefits:**
- ✅ Isolate AI workload from production
- ✅ Can use GPU-optimized instances
- ✅ Independent scaling
- ✅ Doesn't affect main app performance
- ✅ Can use different DB engine (PostgreSQL for better JSON)

---

## 🏗️ Implementation Architecture

### Option 1: Multiple Sequelize Instances (Recommended)
```
Main App
├── Database 1 (Main) - Sequelize Instance 1
├── Database 2 (Audit) - Sequelize Instance 2
└── Database 3 (AI) - Sequelize Instance 3
```

**Pros:**
- ✅ Simple to implement
- ✅ All in Node.js
- ✅ Unified ORM interface
- ✅ Transaction support per DB

**Cons:**
- ❌ No cross-database transactions
- ❌ Manual data sync if needed

---

### Option 2: API Gateway Pattern
```
Client → API Gateway → Main API (DB1)
                    → Audit Service (DB2)
                    → AI Service (DB3)
```

**Pros:**
- ✅ True microservices
- ✅ Independent deployment
- ✅ Language flexibility
- ✅ Better isolation

**Cons:**
- ❌ More complex infrastructure
- ❌ Network latency
- ❌ Distributed transactions complexity

---

## 🚀 Recommended Approach: Hybrid (Multiple Sequelize + Service Layer)

### Phase 1: Database Setup (2 hours)

#### 1.1 Create Databases
```sql
-- Create audit database
CREATE DATABASE IF NOT EXISTS skcooly_audit 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create AI database
CREATE DATABASE IF NOT EXISTS skcooly_ai 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Grant permissions
GRANT ALL PRIVILEGES ON skcooly_audit.* TO 'root'@'localhost';
GRANT ALL PRIVILEGES ON skcooly_ai.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

#### 1.2 Update .env
```bash
# Main Database
DB_NAME=full_skcooly
DB_HOST=localhost
DB_USERNAME=root
DB_PASSWORD=
DB_PORT=3306

# Audit Database
AUDIT_DB_NAME=skcooly_audit
AUDIT_DB_HOST=localhost
AUDIT_DB_USERNAME=root
AUDIT_DB_PASSWORD=
AUDIT_DB_PORT=3306

# AI Database
AI_DB_NAME=skcooly_ai
AI_DB_HOST=localhost
AI_DB_USERNAME=root
AI_DB_PASSWORD=
AI_DB_PORT=3306
```

---

### Phase 2: Multiple Sequelize Instances (3 hours)

#### 2.1 Create Database Connections
**File:** `elscholar-api/src/config/databases.js`
```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Main Database Connection
const mainDB = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 15,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Audit Database Connection
const auditDB = new Sequelize(
  process.env.AUDIT_DB_NAME || process.env.DB_NAME,
  process.env.AUDIT_DB_USERNAME || process.env.DB_USERNAME,
  process.env.AUDIT_DB_PASSWORD || process.env.DB_PASSWORD,
  {
    host: process.env.AUDIT_DB_HOST || process.env.DB_HOST,
    port: process.env.AUDIT_DB_PORT || process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    }
  }
);

// AI Database Connection
const aiDB = new Sequelize(
  process.env.AI_DB_NAME || process.env.DB_NAME,
  process.env.AI_DB_USERNAME || process.env.DB_USERNAME,
  process.env.AI_DB_PASSWORD || process.env.DB_PASSWORD,
  {
    host: process.env.AI_DB_HOST || process.env.DB_HOST,
    port: process.env.AI_DB_PORT || process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connections
const testConnections = async () => {
  try {
    await mainDB.authenticate();
    console.log('✅ Main DB connected');
    
    await auditDB.authenticate();
    console.log('✅ Audit DB connected');
    
    await aiDB.authenticate();
    console.log('✅ AI DB connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

module.exports = {
  mainDB,
  auditDB,
  aiDB,
  testConnections
};
```

#### 2.2 Separate Model Loaders
**File:** `elscholar-api/src/models/index.js` (Main DB - existing)
**File:** `elscholar-api/src/models/audit/index.js` (Audit DB - new)
**File:** `elscholar-api/src/models/ai/index.js` (AI DB - new)

```javascript
// elscholar-api/src/models/audit/index.js
const { auditDB } = require('../../config/databases');
const AuditTrail = require('./AuditTrail')(auditDB);
const LoginSession = require('./LoginSession')(auditDB);
const PermissionAuditLog = require('./PermissionAuditLog')(auditDB);

module.exports = {
  sequelize: auditDB,
  AuditTrail,
  LoginSession,
  PermissionAuditLog
};
```

```javascript
// elscholar-api/src/models/ai/index.js
const { aiDB } = require('../../config/databases');
const ChatbotConversation = require('./ChatbotConversation')(aiDB);
const ChatbotIntent = require('./ChatbotIntent')(aiDB);
const ChatbotKnowledgeBase = require('./ChatbotKnowledgeBase')(aiDB);

module.exports = {
  sequelize: aiDB,
  ChatbotConversation,
  ChatbotIntent,
  ChatbotKnowledgeBase
};
```

---

### Phase 3: Service Layer Pattern (2 hours)

#### 3.1 Update Audit Service
**File:** `elscholar-api/src/services/auditService.js`
```javascript
const auditDB = require('../models/audit');

class AuditService {
  async log(data) {
    try {
      return await auditDB.AuditTrail.create(data);
    } catch (error) {
      console.error('Audit log failed:', error);
      return null;
    }
  }

  async getEntityHistory(entityType, entityId, options) {
    return await auditDB.AuditTrail.findAll({
      where: { entity_type: entityType, entity_id: entityId },
      ...options
    });
  }
}

module.exports = new AuditService();
```

#### 3.2 Create AI Service
**File:** `elscholar-api/src/services/aiService.js`
```javascript
const aiDB = require('../models/ai');

class AIService {
  async logConversation(data) {
    return await aiDB.ChatbotConversation.create(data);
  }

  async getIntents() {
    return await aiDB.ChatbotIntent.findAll();
  }

  async searchKnowledgeBase(query) {
    return await aiDB.ChatbotKnowledgeBase.findAll({
      where: { content: { [Op.like]: `%${query}%` } }
    });
  }
}

module.exports = new AIService();
```

---

### Phase 4: Unified API Interface (1 hour)

#### 4.1 API Routes Stay the Same
```javascript
// Client doesn't know about multiple databases
GET /api/audit/school?school_id=SCH/23
GET /api/chatbot/intents
POST /api/chatbot/conversation

// Backend routes to correct database automatically
router.get('/audit/school', auditService.getSchoolActivity);
router.get('/chatbot/intents', aiService.getIntents);
```

#### 4.2 Cross-Database Queries (When Needed)
```javascript
// Example: Get student with audit history
async getStudentWithAudit(studentId) {
  const mainDB = require('../models');
  const auditDB = require('../models/audit');
  
  const student = await mainDB.Student.findByPk(studentId);
  const auditHistory = await auditDB.AuditTrail.findAll({
    where: { entity_type: 'Student', entity_id: studentId }
  });
  
  return { student, auditHistory };
}
```

---

### Phase 5: Migration Strategy (2 hours)

#### 5.1 Move Audit Tables
```sql
-- Export from main DB
mysqldump -u root full_skcooly audit_trails > audit_trails.sql

-- Import to audit DB
mysql -u root skcooly_audit < audit_trails.sql

-- Drop from main DB (after verification)
DROP TABLE full_skcooly.audit_trails;
```

#### 5.2 Move AI Tables
```sql
-- Export chatbot tables
mysqldump -u root full_skcooly \
  chatbot_conversations \
  chatbot_intents \
  chatbot_knowledge_base > ai_tables.sql

-- Import to AI DB
mysql -u root skcooly_ai < ai_tables.sql

-- Drop from main DB
DROP TABLE full_skcooly.chatbot_conversations;
DROP TABLE full_skcooly.chatbot_intents;
DROP TABLE full_skcooly.chatbot_knowledge_base;
```

---

## 📈 Benefits Summary

### Performance
- ✅ Main DB stays lean and fast
- ✅ Audit queries don't slow down app
- ✅ AI training doesn't affect production
- ✅ Independent scaling per workload

### Maintenance
- ✅ Separate backup schedules
- ✅ Archive old audit logs easily
- ✅ Rebuild AI DB without affecting main
- ✅ Easier database upgrades

### Cost
- ✅ Use cheaper storage for audit logs
- ✅ Scale AI DB independently
- ✅ Optimize each DB for its workload

### Security
- ✅ Separate access controls
- ✅ Audit DB can be read-only for most users
- ✅ AI DB isolated from sensitive data

---

## 🎯 Implementation Timeline

**Total: 10 hours**

| Phase | Task | Time |
|-------|------|------|
| 1 | Database setup | 2h |
| 2 | Multiple Sequelize instances | 3h |
| 3 | Service layer refactoring | 2h |
| 4 | API interface updates | 1h |
| 5 | Data migration | 2h |

---

## 🔄 Rollback Plan

If issues arise:
1. Keep old tables in main DB initially
2. Run both systems in parallel for 1 week
3. Compare data integrity
4. Switch back if needed (just change connection strings)

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup all databases
- [ ] Test connections to new databases
- [ ] Update .env with new DB configs
- [ ] Test Sequelize connections

### Migration
- [ ] Create new databases
- [ ] Export tables from main DB
- [ ] Import to new databases
- [ ] Verify data integrity
- [ ] Update models to use new connections
- [ ] Test all API endpoints

### Post-Migration
- [ ] Monitor performance
- [ ] Check error logs
- [ ] Verify audit logging works
- [ ] Test chatbot functionality
- [ ] Drop old tables from main DB

---

## 🚨 Important Considerations

### Transactions
- ❌ Cannot use transactions across databases
- ✅ Use saga pattern for distributed operations
- ✅ Implement compensating transactions

### Foreign Keys
- ❌ Cannot have FK constraints across databases
- ✅ Enforce referential integrity in application layer
- ✅ Use entity_type + entity_id pattern

### Joins
- ❌ Cannot JOIN across databases
- ✅ Fetch separately and merge in application
- ✅ Use caching to reduce queries

---

## 💡 Future Enhancements

### Phase 2 (Optional)
1. **Read Replicas** - Scale reads independently
2. **Sharding** - Partition by school_id
3. **Different DB Engines** - PostgreSQL for AI (better JSON)
4. **Caching Layer** - Redis for hot data
5. **Message Queue** - Async audit logging

---

## 📊 Database Size Estimates

### Current (Single DB)
- Main tables: ~5GB
- Audit logs: ~2GB (growing)
- AI data: ~1GB
- **Total: ~8GB**

### After Split
- Main DB: ~5GB (stable)
- Audit DB: ~2GB (archive old data)
- AI DB: ~1GB (can rebuild)
- **Total: ~8GB (but better organized)**

---

**Status:** Ready for implementation  
**Risk:** Medium (requires careful migration)  
**Benefit:** High (better performance, scalability, maintenance)  
**Recommended:** Start with Audit DB separation first, then AI DB
