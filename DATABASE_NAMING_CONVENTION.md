# 🤖 Database Naming Convention - Elite Scholar

**Date:** 2026-02-11  
**Status:** Standardized

---

## Database Structure

### Production Databases

```
full_skcooly          - Main application database (business data)
├── students, staff, classes
├── payments, fees, billing
├── attendance, grades
└── All core business tables (INT IDs)

skcooly_audit         - Audit & logs database (compliance)
├── audit_trails (UUID)
├── elite_logs (UUID) - All notifications & messages
└── crash_reports (INT)

elite_bot             - AI & chatbot database
├── chatbot_conversations (UUID)
├── chatbot_intents (UUID)
└── chatbot_knowledge_base (UUID)
```

---

## Naming Rationale

### elite_logs (Audit DB)
**Purpose:** Centralized logging for all messages and notifications
- System notifications
- User messages
- Activity logs
- Communication logs

**Why "elite_logs":**
- Consistent with "Elite Scholar" branding
- Clear purpose (logs/messages)
- Future-proof for all log types
- Separate from business data

### elite_bot (AI DB)
**Purpose:** AI, chatbot, and machine learning data
- Chatbot conversations
- Intent recognition
- Knowledge base
- Training data

**Why "elite_bot":**
- Consistent with "Elite Scholar" branding
- Clear purpose (AI/bot)
- Separate from audit logs
- Scalable for ML workloads

---

## UUID Strategy

### Tables Using UUID
✅ **skcooly_audit:**
- audit_trails
- elite_logs

✅ **elite_bot:**
- chatbot_conversations
- chatbot_intents
- chatbot_knowledge_base

### Tables Using INT
✅ **full_skcooly:**
- All main business tables (students, payments, etc.)
- Reason: Performance, existing relationships, no security risk

---

## Migration Path

### Completed
1. ✅ Created `skcooly_audit` database
2. ✅ Created `elite_bot` database (renamed from skcooly_ai)
3. ✅ Moved audit tables with UUID
4. ✅ Moved AI tables with UUID
5. ✅ Created `elite_logs` table with UUID

### Configuration
```bash
# .env
DB_NAME=full_skcooly
AUDIT_DB_NAME=skcooly_audit
AI_DB_NAME=elite_bot
```

---

## Future Log Tables

All future message/log tables should go to `skcooly_audit.elite_logs`:

### Planned Migrations
- SMS logs → elite_logs
- Email logs → elite_logs
- WhatsApp logs → elite_logs
- Push notification logs → elite_logs
- System alerts → elite_logs
- User activity logs → elite_logs

### Schema
```sql
-- All logs use same table with category
INSERT INTO elite_logs (
  id,           -- UUID
  user_id,
  title,
  message,
  type,         -- info, success, warning, error
  category,     -- system, sms, email, whatsapp, push
  metadata,     -- JSON for type-specific data
  school_id
);
```

---

## Benefits

### Centralized Logging
- Single table for all notifications/messages
- Easier querying across log types
- Consistent schema
- Better analytics

### Database Separation
- **Main DB:** Fast, optimized for business operations
- **Audit DB:** Write-heavy, long retention, compliance
- **Bot DB:** ML workloads, can use different engine

### Security
- UUID prevents ID enumeration
- Audit logs isolated from business data
- Bot data separate from sensitive info

### Scalability
- Independent scaling per database
- Different backup strategies
- Can move to separate servers
- Ready for microservices

---

## Database Sizes (Estimated)

```
full_skcooly:     5-10 GB (stable)
skcooly_audit:    2-5 GB (growing, archivable)
elite_bot:        1-2 GB (can rebuild)
```

---

## Access Patterns

### full_skcooly
- High read/write
- Complex queries
- Transactions
- Real-time

### skcooly_audit
- Write-heavy
- Append-only
- Historical queries
- Compliance reports

### elite_bot
- Read-heavy (inference)
- Batch writes (training)
- Can be offline
- Rebuild from logs

---

## Summary

✅ **Main DB:** `full_skcooly` (business data, INT IDs)  
✅ **Audit DB:** `skcooly_audit` (logs/compliance, UUID)  
✅ **Bot DB:** `elite_bot` (AI/chatbot, UUID)  

**Naming:** Consistent "elite" branding  
**Security:** UUID for audit/bot, INT for main  
**Scalability:** Independent databases  
**Future:** All logs → elite_logs table  

---

*Standardized: 2026-02-11 03:14 UTC*
