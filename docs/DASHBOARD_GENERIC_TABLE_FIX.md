# ✅ Dashboard Fix: Using Generic messaging_history Table

**Date**: 2026-02-08  
**Issue**: Dashboards were querying non-existent split tables (`whatsapp_messages`, `sms_messages`)  
**Solution**: Updated to use the generic `messaging_history` table

---

## Changes Made

### 1. Route Fix
**File**: `/elscholar-api/src/index.js`

```javascript
// Before
app.use('/communications', require('./routes/communications'));

// After
app.use('/api/communications', require('./routes/communications'));
```

**Why**: Frontend expects `/api/communications/*` endpoints

---

### 2. Controller Update
**File**: `/elscholar-api/src/controllers/communicationsController.js`

**Changed from**: Split tables (`whatsapp_messages`, `sms_messages`, `communication_logs`)  
**Changed to**: Single generic table (`messaging_history`)

### Key Query Updates:

#### Developer Dashboard
```sql
-- Now uses messaging_history with channel field
SELECT 
  COUNT(DISTINCT school_id) as total_schools,
  COUNT(*) as total_messages,
  SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as successful_messages,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
  SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp_count,
  SUM(CASE WHEN channel = 'email' THEN 1 ELSE 0 END) as email_count,
  SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END) as sms_count
FROM messaging_history
```

#### School Dashboard
```sql
-- Aggregates by channel from single table
SELECT 
  channel,
  COUNT(*) as message_count,
  SUM(cost) as estimated_cost
FROM messaging_history
WHERE school_id = ? AND branch_id = ?
GROUP BY channel
```

---

## messaging_history Table Structure

```sql
CREATE TABLE messaging_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    sender_type ENUM('admin', 'teacher', 'parent', 'student', 'system'),
    recipient_type ENUM('parent', 'teacher', 'student') NOT NULL,
    recipient_id VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_identifier VARCHAR(255) NOT NULL,
    channel ENUM('sms', 'whatsapp', 'email') NOT NULL,
    message_text TEXT NOT NULL,
    message_subject VARCHAR(500),
    status ENUM('sent', 'failed', 'delivered', 'read') DEFAULT 'sent',
    cost DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Benefits of Generic Table

### 1. **Unified Queries**
- Single table for all channels
- Easier to aggregate cross-channel metrics
- Simpler JOIN operations

### 2. **Consistent Data Model**
- Same fields across all channels
- Unified status tracking
- Centralized cost tracking

### 3. **Better Analytics**
- Easy channel comparison
- Unified trends analysis
- Single source of truth

### 4. **Simplified Maintenance**
- One table to backup
- One table to index
- One table to optimize

---

## API Endpoints

### Developer Dashboard
```
GET /api/communications/developer-dashboard
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "systemStats": {
      "total_schools": 10,
      "total_messages": 1500,
      "successful_messages": 1450,
      "failed_messages": 50,
      "whatsapp_count": 800,
      "email_count": 500,
      "sms_count": 200
    },
    "schoolActivity": [...],
    "channelTrends": [...],
    "errorLogs": [...],
    "performanceMetrics": [...]
  }
}
```

### School Dashboard
```
GET /api/communications/school-dashboard
Authorization: Bearer <token>
X-School-Id: SCH/23
X-Branch-Id: BRCH/29
```

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_messages": 150,
      "successful_messages": 145,
      "failed_messages": 5,
      "whatsapp_count": 80,
      "email_count": 50,
      "sms_count": 20
    },
    "messageTrends": [...],
    "recipientStats": [...],
    "costAnalysis": [...],
    "recentMessages": [...],
    "branchComparison": [...]
  }
}
```

---

## Testing

### 1. Check Table Exists
```sql
SHOW TABLES LIKE 'messaging_history';
```

### 2. Check Sample Data
```sql
SELECT * FROM messaging_history LIMIT 5;
```

### 3. Test Endpoint
```bash
curl 'http://localhost:34567/api/communications/school-dashboard' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-School-Id: SCH/23' \
  -H 'X-Branch-Id: BRCH/29'
```

---

## Migration Notes

If you have existing data in split tables (`whatsapp_messages`, `sms_messages`), you can migrate it:

```sql
-- Migrate WhatsApp messages
INSERT INTO messaging_history 
  (school_id, branch_id, sender_id, sender_type, recipient_type, 
   recipient_id, recipient_name, recipient_identifier, channel, 
   message_text, status, cost, created_at)
SELECT 
  school_id, branch_id, sender_id, 'admin', recipient_type,
  JSON_UNQUOTE(JSON_EXTRACT(recipients, '$[0].id')),
  JSON_UNQUOTE(JSON_EXTRACT(recipients, '$[0].name')),
  JSON_UNQUOTE(JSON_EXTRACT(recipients, '$[0].phone')),
  'whatsapp',
  message_text,
  CASE WHEN total_sent > 0 THEN 'sent' ELSE 'failed' END,
  0.00,
  created_at
FROM whatsapp_messages;

-- Similar for SMS and Email...
```

---

## Status

✅ Route fixed (`/api/communications/*`)  
✅ Controller updated to use `messaging_history`  
✅ All queries use generic table  
✅ Multi-tenant filtering maintained  
✅ Cost tracking included  
✅ Channel aggregation working  

**Ready for**: Testing with real data

---

*Last Updated: 2026-02-08 20:50*
