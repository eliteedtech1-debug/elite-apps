# Phase 2 Complete: Payment Reminders

**Date**: 2026-02-08  
**Status**: ✅ IMPLEMENTED & TESTED

---

## What Was Built

Automated payment reminder system that identifies students with outstanding balances and sends reminders via WhatsApp and Email.

### Features Implemented
✅ **Database Schema** - `payment_reminders` table  
✅ **Reminder Service** - Identifies students with outstanding balances  
✅ **Scheduling API** - Schedule reminders for a term  
✅ **Sending API** - Send pending reminders  
✅ **Multi-Channel** - WhatsApp + Email support  
✅ **Cron Jobs** - Automated daily/hourly sending  
✅ **Stats API** - Track reminder statistics  

---

## Files Created

### Backend
1. **`src/services/reminderService.js`** - Core reminder logic
2. **`src/routes/reminder_service.js`** - API endpoints
3. **`src/cron/reminderCron.js`** - Automated scheduling

### Database
1. **`payment_reminders`** - Reminder tracking table

---

## Database Schema

```sql
CREATE TABLE payment_reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  admission_no VARCHAR(50),
  student_name VARCHAR(255),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(100),
  balance_due DECIMAL(10,2) NOT NULL,
  term VARCHAR(50),
  academic_year VARCHAR(20),
  due_date DATE,
  reminder_type ENUM('whatsapp', 'email', 'both') DEFAULT 'both',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_school (school_id),
  INDEX idx_student (student_id)
);
```

---

## API Endpoints

### 1. Schedule Reminders
```http
POST /api/reminders/schedule
Content-Type: application/json

{
  "school_id": "SCH/23",
  "term": "First Term",
  "academic_year": "2025/2026",
  "days_until_due": 7
}
```

**Response**:
```json
{
  "success": true,
  "message": "Scheduled 2 reminders",
  "data": {
    "success": true,
    "scheduled": 2,
    "total": 3
  }
}
```

### 2. Send Pending Reminders
```http
POST /api/reminders/send
Content-Type: application/json

{
  "limit": 100
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sent 1 reminders",
  "data": {
    "success": true,
    "sent": 1,
    "failed": 0,
    "total": 1
  }
}
```

### 3. Get Reminder Stats
```http
GET /api/reminders/stats?school_id=SCH/23&term=First Term&academic_year=2025/2026
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 2,
    "pending": 1,
    "sent": 1,
    "failed": 0,
    "total_outstanding": 13000.00
  }
}
```

### 4. List Reminders
```http
GET /api/reminders/list?school_id=SCH/23&status=pending
```

---

## Cron Jobs

### Daily at 9 AM
Sends all pending reminders (up to 100)

### Hourly (8 AM - 6 PM)
Checks for new pending reminders (up to 50)

### Configuration
Located in: `src/cron/reminderCron.js`

```javascript
// Daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  await reminderService.sendPendingReminders(100);
});

// Hourly during business hours
cron.schedule('0 8-18 * * *', async () => {
  await reminderService.sendPendingReminders(50);
});
```

---

## How It Works

### 1. Schedule Reminders
```
API Call → reminderService.scheduleReminders()
  → Query students with outstanding balances
  → Insert into payment_reminders table
  → Set due_date = today + days_until_due
```

### 2. Send Reminders
```
API Call / Cron Job → reminderService.sendPendingReminders()
  → Query reminders where status='pending' AND due_date <= today
  → For each reminder:
    - Send WhatsApp (if phone exists)
    - Send Email (if email exists)
    - Update status to 'sent'
```

### 3. Message Format

**WhatsApp**:
```
Dear Parent,

Your child Jane Smith has an outstanding balance of ₦8,000 for First Term 2025/2026.

Please make payment at your earliest convenience.

Thank you.
```

**Email**:
```html
<h2>Payment Reminder</h2>
<p>Dear Parent,</p>
<p>Your child <strong>Jane Smith</strong> has an outstanding balance of <strong>₦8,000</strong> for First Term 2025/2026.</p>
<p>Please make payment at your earliest convenience.</p>
<p>Thank you.</p>
```

---

## Testing Results

### Test 1: Schedule Reminders
```bash
curl -X POST http://localhost:34567/api/reminders/schedule \
  -H 'Content-Type: application/json' \
  -d '{
    "school_id": "SCH/23",
    "term": "First Term",
    "academic_year": "2025/2026"
  }'
```

**Result**: ✅ 2 reminders scheduled

### Test 2: Send Reminders
```bash
curl -X POST http://localhost:34567/api/reminders/send \
  -H 'Content-Type: application/json' \
  -d '{"limit": 10}'
```

**Result**: ✅ 1 reminder sent (WhatsApp + Email)

### Database Verification
```sql
SELECT * FROM payment_reminders WHERE status = 'sent';
```

| ID | Student | Balance | Status | Sent At |
|----|---------|---------|--------|---------|
| 1 | Jane Smith | ₦8,000 | sent | 2026-02-08 19:05:46 |

---

## Production Deployment

### Enable Cron Jobs
Cron jobs are automatically initialized when the server starts.

### Manual Trigger
```bash
# Schedule reminders for current term
curl -X POST http://localhost:34567/api/reminders/schedule \
  -H 'Content-Type: application/json' \
  -d '{
    "school_id": "SCH/23",
    "term": "First Term",
    "academic_year": "2025/2026",
    "days_until_due": 7
  }'

# Send pending reminders
curl -X POST http://localhost:34567/api/reminders/send \
  -H 'Content-Type: application/json' \
  -d '{"limit": 100}'
```

---

## Monitoring

### Check Reminder Stats
```bash
curl "http://localhost:34567/api/reminders/stats?school_id=SCH/23&term=First Term&academic_year=2025/2026"
```

### List Pending Reminders
```bash
curl "http://localhost:34567/api/reminders/list?school_id=SCH/23&status=pending"
```

### Database Queries
```sql
-- Pending reminders
SELECT COUNT(*) FROM payment_reminders WHERE status = 'pending';

-- Sent today
SELECT COUNT(*) FROM payment_reminders 
WHERE status = 'sent' AND DATE(sent_at) = CURDATE();

-- Failed reminders
SELECT * FROM payment_reminders WHERE status = 'failed';
```

---

## Next: Phase 3 - Analytics Dashboard

### Objectives
1. Communication analytics API
2. Charts and statistics
3. Integration into `/communications/dashboard`
4. Real-time metrics

### Estimated Time
- Backend: 3 hours
- Frontend: 4 hours
- Testing: 1 hour
- **Total**: 8 hours

---

**Phase 2 Status**: ✅ COMPLETE  
**Ready for Phase 3**: YES

