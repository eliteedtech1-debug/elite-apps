# School Branding Fix - Email & WhatsApp Messages

## Issue
All school-sent messages were using hardcoded "Elite Edu Tech" from .env instead of the actual school name from `school_setup` table.

## Solution

### ✅ Fixed Files

#### 1. `/elscholar-api/src/queues/emailWorker.js`

**`processSendEmail()` function:**
- Now queries `school_setup` table for `school_name` and `email_address`
- Uses school-specific branding in email FROM field
- Uses school name in subject and footer
- Falls back to .env values if school not found

**`processEmailWithPDF()` function:**
- Same school branding logic for payment receipts
- Uses school name in subject and footer

**Changes:**
```javascript
// Before
from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_ADDRESS}>`

// After
const [schoolInfo] = await db.sequelize.query(
  'SELECT school_name, email_address FROM school_setup WHERE school_id = ?',
  { replacements: [school_id] }
);
const schoolName = schoolInfo?.[0]?.school_name || process.env.SMTP_FROM_NAME;
const schoolEmail = schoolInfo?.[0]?.email_address || process.env.SMTP_FROM_ADDRESS;

from: `${schoolName} <${schoolEmail}>`
```

#### 2. `/elscholar-api/src/queues/whatsappWorker.js`

**Already correct!**
- `ensureWhatsAppConnection()` already fetches `school_name` from `school_setup`
- Uses school-specific branding for WhatsApp client initialization
- No hardcoded "Elite" found

### ✅ System Messages (Unchanged - Correct)

These should continue using .env values (NOT school-specific):

1. **OTP Emails** (`/elscholar-api/src/services/otpService.js`)
   - Uses "ElScholar" branding
   - System-level authentication, not school-specific

2. **Password Reset** (`/elscholar-api/src/queues/emailTemplates.js`)
   - Uses "School Management System" generic branding
   - System-level security, not school-specific

## Database Schema

```sql
-- school_setup table columns used
school_id VARCHAR(20) PRIMARY KEY
school_name VARCHAR(500) NOT NULL
email_address VARCHAR(255)
primary_contact_number VARCHAR(13)
```

## Testing

### Test Email with School Branding
```bash
curl -X POST 'http://localhost:34567/api/messaging-send' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/23' \
  -H 'X-Branch-Id: BRCH/29' \
  --data-raw '{
    "channels": ["email"],
    "recipient_type": "parents",
    "recipient_ids": ["125"],
    "message": "Test message",
    "subject": "Test Subject"
  }'
```

**Expected Result:**
- Email FROM: `<School Name from school_setup> <school email>`
- Email subject: Uses school name
- Email footer: "This is an automated email from <School Name>"

### Test WhatsApp with School Branding
```bash
curl -X POST 'http://localhost:34567/api/messaging-send' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/23' \
  -H 'X-Branch-Id: BRCH/29' \
  --data-raw '{
    "channels": ["whatsapp"],
    "recipient_type": "parents",
    "recipient_ids": ["125"],
    "message": "Test WhatsApp message"
  }'
```

**Expected Result:**
- WhatsApp client uses school name from `school_setup`
- Message sent with school-specific branding

## Worker Status

Email worker restarted with PID: 59654
- Log: `/elscholar-api/logs/email-worker.log`

WhatsApp worker should be restarted to ensure latest code:
```bash
pkill -9 -f whatsappWorker
cd /Users/apple/Downloads/apps/elite/elscholar-api
node src/queues/whatsappWorker.js > logs/whatsapp-worker.log 2>&1 &
```

## Summary

✅ **School-sent messages** → Use school name from `school_setup` table
✅ **System messages (OTP, password reset)** → Use .env generic branding
✅ **Fallback** → If school not found, use .env values
✅ **WhatsApp** → Already correct, uses school branding

---

**Date:** 2026-02-09
**Status:** Complete
