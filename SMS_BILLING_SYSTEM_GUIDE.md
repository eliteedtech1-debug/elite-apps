# SMS Billing System Implementation Guide

## Overview
The SMS billing system now tracks all messages sent by schools and saves them efficiently in the database for billing purposes.

## What Was Implemented

### 1. **Bulk Message Storage Optimization**
Instead of creating individual records for each recipient, bulk messages are now saved as **1 record** with a list of recipients.

**Benefits:**
- Reduces database size by 90%+ for bulk messages
- Faster queries for billing reports
- Easier to track campaign-level metrics

**Example:**
- **Before:** Sending to 100 people = 100 database records
- **After:** Sending to 100 people = 1 database record with recipients list

### 2. **Database Schema Updates**
File: `/src/migrations/update_messaging_history_for_bulk.sql`

New fields added to `messaging_history` table:
- `message_type` - 'single' or 'bulk'
- `recipients_count` - Number of recipients
- `recipients_list` - JSON array of recipients (for bulk messages)

Example bulk message record:
```json
{
  "message_type": "bulk",
  "recipients_count": 3,
  "cost": 15.00,
  "recipients_list": [
    {"phone": "2347035384184", "name": "John Doe", "id": "PARENT001"},
    {"phone": "2348012345678", "name": "Jane Smith", "id": "PARENT002"},
    {"phone": "2349087654321", "name": "Bob Wilson", "id": "PARENT003"}
  ]
}
```

### 3. **Phone Number Normalization**
File: `/src/routes/sms_service.js:17-44`

Automatically converts all phone formats to international format (234...):
- `07035384184` → `2347035384184` ✅
- `+2347035384184` → `2347035384184` ✅
- `+234 703 538-4184` → `2347035384184` ✅

### 4. **Billing Endpoints**

#### A. Get Billing Report
**Endpoint:** `GET /api/messaging-billing`

**Query Parameters:**
- `school_id` (optional) - Filter by specific school
- `date_from` (optional) - Start date (YYYY-MM-DD)
- `date_to` (optional) - End date (YYYY-MM-DD)
- `group_by` (optional) - 'school' or 'month' (default: 'school')

**Example Usage:**
```bash
# Get overall billing for all schools
curl "http://localhost:34567/api/messaging-billing"

# Get billing for specific school
curl "http://localhost:34567/api/messaging-billing?school_id=SCH/1"

# Get monthly billing breakdown
curl "http://localhost:34567/api/messaging-billing?school_id=SCH/1&group_by=month"

# Get billing for specific period
curl "http://localhost:34567/api/messaging-billing?school_id=SCH/1&date_from=2025-01-01&date_to=2025-01-31"
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "billing_records": [
      {
        "school_id": "SCH/1",
        "channel": "sms",
        "total_messages_sent": "2",
        "total_recipients": "4",
        "total_cost": "19.00",
        "bulk_messages_count": "1",
        "single_messages_count": "1"
      }
    ],
    "summary": {
      "total_schools": "1",
      "total_message_records": "3",
      "total_recipients_all": "5",
      "total_revenue": "19.00",
      "sms_revenue": "19.00"
    }
  }
}
```

#### B. Get School Message Count
**Endpoint:** `GET /api/school-message-count/:school_id`

**Query Parameters:**
- `date_from` (optional) - Start date
- `date_to` (optional) - End date

**Example Usage:**
```bash
# Get total message count for a school
curl "http://localhost:34567/api/school-message-count/SCH/1"

# Get count for specific period
curl "http://localhost:34567/api/school-message-count/SCH/1?date_from=2025-01-01&date_to=2025-01-31"
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "school_id": "SCH/1",
    "breakdown": [
      {
        "channel": "sms",
        "message_type": "bulk",
        "message_count": "1",
        "total_recipients": "3",
        "total_cost": "15.00",
        "avg_cost_per_message": "15.00"
      }
    ],
    "totals": {
      "total_message_records": "2",
      "total_recipients_reached": "4",
      "total_amount_due": "19.00"
    }
  }
}
```

#### C. Get Messaging History
**Endpoint:** `GET /api/messaging-history`

**Query Parameters:**
- `school_id` (required) - School ID
- `channel` (optional) - Filter by sms/whatsapp/email
- `date_from` (optional) - Start date
- `date_to` (optional) - End date
- `limit` (optional) - Records per page (default: 50)
- `offset` (optional) - Pagination offset

**Example Usage:**
```bash
# Get recent messages
curl "http://localhost:34567/api/messaging-history?school_id=SCH/1&limit=10"

# Get only SMS messages
curl "http://localhost:34567/api/messaging-history?school_id=SCH/1&channel=sms"
```

#### D. Get Messaging Statistics
**Endpoint:** `GET /api/messaging-stats`

**Query Parameters:**
- `school_id` (required) - School ID
- `period` (optional) - 'daily', 'weekly', 'monthly', 'yearly' (default: 'monthly')

**Example Usage:**
```bash
# Get monthly statistics
curl "http://localhost:34567/api/messaging-stats?school_id=SCH/1"

# Get daily statistics
curl "http://localhost:34567/api/messaging-stats?school_id=SCH/1&period=daily"
```

## How Messages Are Tracked

### When SMS is Sent:
1. Phone numbers are normalized to international format
2. Message is sent via EBulkSMS API
3. If successful, message is saved to `messaging_history` table:
   - **Single recipient:** Individual fields populated
   - **Multiple recipients (bulk):** Saved as 1 record with `recipients_list` JSON
4. Message count is updated in `messaging_subscriptions` table
5. Usage is recorded in `messaging_usage` table

### Database Tables:

**messaging_history** - Stores all sent messages
- For billing reports and message tracking
- Bulk messages use `recipients_list` field (JSON array)
- Single messages use individual recipient fields

**messaging_subscriptions** - Tracks school SMS packages
- Shows how many messages each school has used
- Links to messaging packages

**messaging_usage** - Records usage events
- Tracks when messages were sent
- Links to subscriptions

**messaging_packages** - Defines available SMS packages
- Termly packages (fixed message count)
- Pay-as-you-go packages (per message cost)

## Testing the System

### 1. Send a Bulk SMS
```bash
curl -X POST "http://localhost:34567/api/send-sms" \
  -H "Content-Type: application/json" \
  -H "x-school-id: SCH/1" \
  -H "x-branch-id: BRCH00001" \
  -H "x-user-id: USR001" \
  -d '{
    "message": {
        "sender": "ELITEEDU",
        "messagetext": "Test message",
        "flash": "0"
    },
    "recipients": [
        {"msisdn": "07035384184", "name": "John Doe"},
        {"msisdn": "08012345678", "name": "Jane Smith"},
        {"msisdn": "+2349087654321", "name": "Bob Wilson"}
    ],
    "dndsender": 1
}'
```

### 2. Check Message Was Saved
```sql
-- In MySQL
SELECT
  id,
  school_id,
  message_type,
  recipients_count,
  cost,
  recipients_list
FROM messaging_history
WHERE school_id = 'SCH/1'
ORDER BY id DESC
LIMIT 1;
```

### 3. Get Billing Report
```bash
curl "http://localhost:34567/api/messaging-billing?school_id=SCH/1" | jq '.'
```

### 4. Run Test Script
```bash
./test-billing-api.sh SCH/1
```

## Billing Calculation

### Cost Tracking:
- Each message record stores the `cost` field
- For bulk messages: Total cost = cost_per_recipient × number_of_recipients
- Cost is based on the school's active subscription package

### Generating Bills:
1. Query billing endpoint for date range:
   ```bash
   curl "http://localhost:34567/api/messaging-billing?school_id=SCH/1&date_from=2025-01-01&date_to=2025-01-31"
   ```

2. Get breakdown by channel (SMS/WhatsApp/Email)
3. Calculate total from `total_cost` in response
4. Use `total_recipients` for message count

### Example Bill:
```
School: SCH/1
Period: January 2025

SMS Messages:
  - Bulk Messages: 5 (150 recipients total)
  - Single Messages: 10
  - Total Recipients: 160
  - Total Cost: NGN 640.00

WhatsApp Messages:
  - Bulk Messages: 3 (80 recipients total)
  - Single Messages: 5
  - Total Recipients: 85
  - Total Cost: NGN 0.00 (included in subscription)

TOTAL DUE: NGN 640.00
```

## Important Files Modified

1. **`/src/routes/sms_service.js`**
   - Added db import
   - Added phone normalization function
   - Modified message saving to support bulk storage
   - Tracks message history in database

2. **`/src/routes/messaging_history.js`**
   - Added `/api/messaging-billing` endpoint
   - Added `/api/school-message-count/:school_id` endpoint
   - Existing: messaging history and stats endpoints

3. **`/src/migrations/update_messaging_history_for_bulk.sql`**
   - Database migration to add bulk message support

4. **`.env`**
   - Added `EBULKSMS_USERNAME`
   - Added `EBULKSMS_API_KEY`

## Next Steps for WhatsApp & Email

Apply the same pattern:

1. **WhatsApp Bulk Messages** (`/src/routes/whatsapp_service.js`):
   - Use the same message_type (bulk/single) approach
   - Save recipients_list as JSON for bulk messages
   - Track in messaging_history table

2. **Email Bulk Messages**:
   - Same pattern as SMS
   - Store recipients in recipients_list JSON field
   - Track costs if applicable

## Summary

✅ **SMS messages are now tracked in the database**
✅ **Bulk messages save as 1 record (not N records)**
✅ **Phone numbers are automatically normalized**
✅ **Billing endpoints available for reporting**
✅ **Cost tracking per school**
✅ **Message count tracking per school**

You can now:
- Generate bills for schools based on actual usage
- Track which schools send the most messages
- See breakdown by channel (SMS/WhatsApp/Email)
- Get monthly/yearly reports
- Export billing data for invoicing
