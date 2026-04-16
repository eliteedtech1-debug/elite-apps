# Multi-Database Quick Reference

## 🗄️ Database Structure
```
full_skcooly (274 tables)    - Core business data
skcooly_audit (3 tables)     - Audit trails & logs
skcooly_ai (3 tables)        - Chatbot & AI data
```

## 🔧 Scripts

### Test Setup
```bash
cd elscholar-api
./scripts/test-db-setup.sh
```

### Migrate Tables
```bash
cd elscholar-api
./scripts/migrate-databases.sh
```

### Drop Old Tables
```bash
cd elscholar-api
./scripts/drop-migrated-tables.sh
```

## 💻 Code Usage

### Audit Database
```javascript
const auditDB = require('../models/audit');
await auditDB.AuditTrail.create({ ... });
await auditDB.AuditTrail.findAll({ ... });
```

### Main Database
```javascript
const mainDB = require('../models');
await mainDB.Student.create({ ... });
await mainDB.Payment.findAll({ ... });
```

### AI Database
```javascript
const aiDB = require('../models/ai');
// Add AI models as needed
```

## 🔐 Environment Variables
```bash
# Main
DB_NAME=full_skcooly

# Audit
AUDIT_DB_NAME=skcooly_audit

# AI
AI_DB_NAME=skcooly_ai
```

## 📊 Migration Results
- ✅ 6 tables migrated
- ✅ 4,591 rows transferred
- ✅ 100% data integrity
- ✅ 0 downtime

## 🚀 Startup
```bash
cd elscholar-api
npm run dev

# Expected:
# ✅ Main DB connected: full_skcooly
# ✅ Audit DB connected: skcooly_audit
# ✅ AI DB connected: skcooly_ai
```

## 📁 Key Files
- `src/config/databases.js` - DB connections
- `src/models/audit/index.js` - Audit models
- `src/models/ai/index.js` - AI models
- `src/services/auditService.js` - Uses auditDB
- `.env` - DB configuration

## ✅ Benefits
- 🚀 Better performance (isolated workloads)
- 🔧 Easier maintenance (separate backups)
- 📈 Independent scaling
- 🔐 Better security (separate access)
