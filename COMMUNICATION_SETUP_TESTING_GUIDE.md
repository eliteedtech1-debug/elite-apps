# Communication Setup - Complete Testing Guide

## Overview
This guide provides step-by-step instructions for setting up and testing the Communication Setup feature with messaging packages for SMS and WhatsApp.

---

## Table of Contents
1. [Database Setup](#database-setup)
2. [Package Configuration](#package-configuration)
3. [Frontend Testing](#frontend-testing)
4. [Package Subscription Flow](#package-subscription-flow)
5. [Troubleshooting](#troubleshooting)

---

## Database Setup

### Step 1: Run the Sample Data SQL Script

1. Navigate to the database samples folder:
   ```bash
   cd /Users/apple/Downloads/apps/elite/database-samples
   ```

2. Open MySQL client and connect to your database:
   ```bash
   mysql -u your_username -p your_database_name
   ```

3. Run the sample data script:
   ```sql
   source messaging_packages_sample.sql
   ```

   **OR** copy and paste the SQL content directly into your MySQL client.

### Step 2: Update Test School ID

After running the script, update the sample subscriptions with your actual school ID:

```sql
-- Replace 'TEST_SCHOOL_001' with your actual school_id
UPDATE messaging_subscriptions
SET school_id = 'YOUR_ACTUAL_SCHOOL_ID'
WHERE school_id = 'TEST_SCHOOL_001';
```

### Step 3: Enable Communication Subscriptions

Enable SMS and WhatsApp subscriptions for your school:

```sql
UPDATE school_setup
SET
  sms_subscription = 1,
  whatsapp_subscription = 1
WHERE school_id = 'YOUR_ACTUAL_SCHOOL_ID';
```

### Step 4: Verify Database Tables

Check that all tables were created successfully:

```sql
-- Check packages
SELECT COUNT(*) as total_packages FROM messaging_packages;

-- View all packages
SELECT
  id,
  package_name,
  service_type,
  package_type,
  messages_per_term,
  unit_cost,
  package_cost
FROM messaging_packages
ORDER BY service_type, package_type, messages_per_term;
```

Expected output:
- **Total packages:** Should show at least 12 packages (SMS + WhatsApp + Email)
- SMS packages: 5 (1 PAYG + 4 Termly)
- WhatsApp packages: 4 (1 PAYG + 3 Termly)
- Email packages: 4 (1 PAYG + 3 Termly)

---

## Package Configuration

### Available Package Types

#### 1. **Pay-As-You-Go (PAYG)**
- **Purpose:** Pay only for messages sent
- **Billing:** Charged per message at unit_cost rate
- **Best For:** Schools with low or irregular messaging needs
- **No Subscription Needed:** Automatically available when service is enabled

#### 2. **Termly Packages**
- **Purpose:** Bulk message packages for a school term
- **Billing:** One-time payment for the entire package
- **Duration:** Typically 3 months (one term)
- **Best For:** Schools with predictable messaging needs
- **Requires Subscription:** User must actively subscribe

### Package Tiers

#### SMS Packages:
| Package | Type | Messages | Total Cost | Per Message | Best For |
|---------|------|----------|------------|-------------|----------|
| Bronze  | Termly | 500 | ₦1,000 | ₦2.00 | Small schools |
| Silver  | Termly | 2,000 | ₦3,500 | ₦1.75 | Medium schools |
| Gold    | Termly | 5,000 | ₦7,500 | ₦1.50 | Large schools |
| Platinum| Termly | 10,000 | ₦12,500 | ₦1.25 | Very large schools |
| PAYG    | PAYG | N/A | N/A | ₦2.50 | Occasional use |

#### WhatsApp Packages:
| Package | Type | Messages | Total Cost | Per Message | Best For |
|---------|------|----------|------------|-------------|----------|
| Bronze  | Termly | Unlimited | ₦2,500 | Free | Standard use |
| Silver  | Termly | Unlimited | ₦5,000 | Free | Priority support |
| Gold    | Termly | Unlimited | ₦10,000 | Free | Enterprise |
| PAYG    | PAYG | N/A | Free | Free | Any use |

---

## Frontend Testing

### Step 1: Start the Application

1. **Backend:**
   ```bash
   cd /Users/apple/Downloads/apps/elite/elscholar-api
   npm start
   ```

2. **Frontend:**
   ```bash
   cd /Users/apple/Downloads/apps/elite/elscholar-ui
   npm start
   ```

### Step 2: Navigate to Communication Setup

1. Log in to your ElScholar account
2. Go to: **Settings → Communication Setup**
3. You should see the Communication Setup dashboard

### Step 3: Verify Page Elements

Check that the following sections are visible:

✅ **Service Status Cards** (Top row)
- SMS Enabled/Disabled toggle
- WhatsApp Enabled/Disabled toggle
- Email Enabled/Disabled toggle
- WhatsApp Connection status (if enabled)

✅ **Statistics Cards** (Second row)
- Active Subscriptions count
- SMS Cost (from PAYG package)
- Total Messages Sent

✅ **Current Subscriptions Section**
- Shows active subscriptions with usage meters
- If no subscriptions: Shows "No Active Package" warning

✅ **Available Packages Section**
- **SMS Packages:**
  - Termly Packages subsection
  - Pay-As-You-Go subsection
  - Each package card shows:
    - Package name
    - Total cost (for termly) or per-message rate (for PAYG)
    - Number of messages
    - Description
    - Subscribe button (for termly packages)
    - "Active" ribbon if currently subscribed

- **WhatsApp Packages:**
  - Similar structure to SMS packages
  - Shows "Unlimited" for WhatsApp unlimited packages
  - Shows "FREE" for free WhatsApp PAYG

✅ **Messaging History Section**
- Recent messages table
- Channels, recipients, status

---

## Package Subscription Flow

### Scenario 1: Subscribe to SMS Silver Package

**Objective:** Subscribe a school to the SMS Silver termly package.

**Steps:**

1. Navigate to Communication Setup page

2. Scroll to "SMS Packages" → "Termly Packages" section

3. Locate the **"SMS Silver - 2,000 Messages"** card

4. Click the **"Subscribe"** button

5. **Confirmation Modal appears:**
   ```
   Subscribe to SMS Silver - 2,000 Messages?

   Package: SMS Silver - 2,000 Messages
   Type: Termly Package
   Messages: 2,000 messages per term
   Cost: ₦3,500
   Rate: ₦1.75 per message

   Best value for medium schools. 2,000 SMS messages per term at ₦1.75 each.

   [Cancel]  [Subscribe]
   ```

6. Click **"Subscribe"**

7. **Success message appears:**
   ```
   ✅ Successfully subscribed to SMS Silver - 2,000 Messages!
   ```

8. **Verify subscription:**
   - Package card now shows "Active" ribbon
   - "Subscribe" button is disabled and shows "Current Package"
   - "Current Subscriptions" section shows the new subscription
   - Usage meter shows: "0 / 2,000 messages used"

**Database Verification:**

```sql
SELECT
  ms.id as subscription_id,
  mp.package_name,
  ms.start_date,
  ms.end_date,
  ms.total_messages,
  ms.messages_used,
  ms.status,
  DATEDIFF(ms.end_date, CURDATE()) as days_remaining
FROM messaging_subscriptions ms
JOIN messaging_packages mp ON ms.package_id = mp.id
WHERE ms.school_id = 'YOUR_SCHOOL_ID'
AND mp.service_type = 'sms'
AND ms.status = 'active';
```

Expected result:
- New row with package_name = 'SMS Silver - 2,000 Messages'
- start_date = today
- end_date = 3 months from today
- total_messages = 2000
- messages_used = 0
- status = 'active'

---

### Scenario 2: Subscribe to WhatsApp Bronze Package

**Objective:** Subscribe to WhatsApp unlimited package.

**Steps:**

1. Ensure WhatsApp subscription is enabled:
   - Toggle "WhatsApp Service" to ON (if not already)

2. Scroll to "WhatsApp Packages" → "Termly Packages"

3. Click **"Subscribe"** on **"WhatsApp Bronze - Unlimited"** card

4. Confirm subscription in modal

5. **Expected Result:**
   - Success message
   - Package marked as "Active"
   - Shows "Unlimited messages" in current subscriptions

**Note:** WhatsApp requires connection setup via QR code before sending messages, even with an active subscription.

---

### Scenario 3: Send Messages and Track Usage

**Objective:** Send SMS messages and verify usage tracking.

**Steps:**

1. Navigate to a messaging feature (e.g., Parents → Parent List)

2. Select parents and send SMS messages

3. Return to Communication Setup page

4. **Verify Usage Update:**
   - Current Subscriptions section shows updated usage
   - Progress bar reflects messages used
   - Example: "150 / 2,000 messages used" with 7.5% progress bar

**Database Verification:**

```sql
SELECT
  ms.messages_used,
  ms.total_messages,
  ROUND((ms.messages_used / ms.total_messages) * 100, 2) as usage_percentage
FROM messaging_subscriptions ms
JOIN messaging_packages mp ON ms.package_id = mp.id
WHERE ms.school_id = 'YOUR_SCHOOL_ID'
AND mp.service_type = 'sms'
AND ms.status = 'active';
```

---

### Scenario 4: Switch Between Packages

**Objective:** Upgrade from Silver to Gold package.

**Steps:**

1. Currently subscribed to: SMS Silver (2,000 messages)

2. Navigate to SMS Packages → Termly Packages

3. Click **"Subscribe"** on **"SMS Gold - 5,000 Messages"** card

4. Confirm subscription

5. **Expected Behavior:**
   - Old subscription (Silver) remains active until term ends
   - New subscription (Gold) becomes active
   - Both may show as active depending on business logic
   - Frontend shows the most recent active subscription

**Note:** Current implementation allows multiple active subscriptions. To prevent this, add logic to expire old subscriptions when a new one is activated.

---

## Troubleshooting

### Issue 1: "No Active Package" Shows Even After Subscribing

**Possible Causes:**
- Subscription not properly created in database
- Subscription status is not 'active'
- end_date is in the past

**Solution:**

```sql
-- Check subscription status
SELECT * FROM messaging_subscriptions
WHERE school_id = 'YOUR_SCHOOL_ID'
ORDER BY created_at DESC LIMIT 5;

-- Fix if needed
UPDATE messaging_subscriptions
SET status = 'active', end_date = DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
WHERE id = [subscription_id];
```

---

### Issue 2: Subscribe Button is Disabled

**Possible Causes:**
- Service (SMS/WhatsApp) is not enabled in school_setup
- Package is already subscribed
- Frontend state not updated after enabling service

**Solution:**

```sql
-- Check service subscriptions
SELECT
  school_id,
  sms_subscription,
  whatsapp_subscription,
  email_subscription
FROM school_setup
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Enable if needed
UPDATE school_setup
SET sms_subscription = 1, whatsapp_subscription = 1
WHERE school_id = 'YOUR_SCHOOL_ID';
```

Then refresh the Communication Setup page.

---

### Issue 3: Packages Not Loading

**Possible Causes:**
- messaging_packages table is empty
- Packages are marked as inactive (is_active = 0)
- API endpoint not returning data

**Solution:**

```sql
-- Check packages
SELECT COUNT(*) FROM messaging_packages WHERE is_active = 1;

-- If 0, run the sample data script again
source messaging_packages_sample.sql;

-- Or manually activate packages
UPDATE messaging_packages SET is_active = 1;
```

Check browser console for API errors:
```
GET /api/messaging-costs
```

---

### Issue 4: Usage Not Updating After Sending Messages

**Possible Causes:**
- Messaging functions not calling usage tracking API
- Subscription ID not passed correctly
- messages_used not incrementing

**Solution:**

Ensure messaging functions call the usage tracking endpoint:

```javascript
// After sending SMS
_post('api/messaging-usage', {
  school_id: school?.school_id,
  service_type: 'sms',
  message_count: recipientCount
}, (res) => {
  console.log('Usage tracked:', res);
});
```

Manually update usage for testing:

```sql
UPDATE messaging_subscriptions
SET messages_used = messages_used + 10
WHERE id = [subscription_id];
```

---

### Issue 5: WhatsApp Not Connecting

**Possible Causes:**
- WhatsApp client not initialized
- QR code not scanned
- Chrome/Puppeteer not installed

**Solution:**

1. Navigate to Communication Setup
2. Click "Connect WhatsApp" button
3. Scan QR code with WhatsApp mobile app
4. Wait for "Connected" status

Check backend logs for WhatsApp connection errors.

---

## Testing Checklist

Use this checklist to verify full functionality:

### Database Setup
- [ ] messaging_packages table created with sample data
- [ ] messaging_subscriptions table created
- [ ] messaging_usage table created
- [ ] school_setup has sms_subscription and whatsapp_subscription enabled
- [ ] At least one test subscription exists in database

### Frontend Display
- [ ] Communication Setup page loads without errors
- [ ] Service toggle switches work (SMS, WhatsApp, Email)
- [ ] Statistics cards display correct values
- [ ] Current Subscriptions section shows active packages
- [ ] SMS Packages section loads with Termly and PAYG subsections
- [ ] WhatsApp Packages section loads with Termly and PAYG subsections
- [ ] Each package card displays name, cost, messages, description
- [ ] "Active" ribbon shows on currently subscribed packages
- [ ] Messaging History table loads and displays recent messages

### Package Subscription
- [ ] Subscribe button works for termly packages
- [ ] Confirmation modal shows package details
- [ ] Subscription creates record in messaging_subscriptions table
- [ ] Success message appears after subscription
- [ ] Package card updates to show "Active" status
- [ ] Subscribe button changes to "Current Package" and disables
- [ ] Current Subscriptions section updates immediately

### Usage Tracking
- [ ] Sending messages increments messages_used in database
- [ ] Usage meter updates on Communication Setup page
- [ ] Progress bar shows correct percentage
- [ ] Usage stays within package limits (for termly packages)
- [ ] PAYG packages don't show usage meters

### Edge Cases
- [ ] Cannot subscribe to same package twice
- [ ] Subscribe button disabled when service is not enabled
- [ ] Expired subscriptions don't show as active
- [ ] Switching packages works correctly
- [ ] API errors display user-friendly messages

---

## Sample Test Data

### Test School Setup

```sql
-- Create/update test school
INSERT INTO school_setup (school_id, school_name, short_name, sms_subscription, whatsapp_subscription)
VALUES ('TEST_SCHOOL', 'Test ElScholar School', 'TES', 1, 1)
ON DUPLICATE KEY UPDATE
  sms_subscription = 1,
  whatsapp_subscription = 1;
```

### Test Subscription

```sql
-- Subscribe test school to SMS Silver
INSERT INTO messaging_subscriptions
  (school_id, package_id, start_date, end_date, total_messages, messages_used, status)
VALUES
  (
    'TEST_SCHOOL',
    (SELECT id FROM messaging_packages WHERE package_name = 'SMS Silver - 2,000 Messages' LIMIT 1),
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
    2000,
    0,
    'active'
  );
```

### Test Usage

```sql
-- Simulate 100 messages sent
UPDATE messaging_subscriptions
SET messages_used = 100
WHERE school_id = 'TEST_SCHOOL'
AND status = 'active'
AND package_id IN (SELECT id FROM messaging_packages WHERE service_type = 'sms');
```

---

## API Endpoints Reference

### Get Available Packages
```
GET /api/messaging-costs
Response: { success: true, data: { sms: {...}, whatsapp: {...} } }
```

### Get School Subscriptions
```
GET /api/messaging-subscription?school_id=YOUR_SCHOOL_ID
Response: { success: true, data: [subscriptions] }
```

### Subscribe to Package
```
POST /api/messaging-subscribe
Body: { school_id, package_id }
Response: { success: true, message, data }
```

### Track Usage
```
POST /api/messaging-usage
Body: { school_id, service_type, message_count }
Response: { success: true, data: { usage_id, cost, remaining_messages } }
```

### Enable/Disable Service
```
PUT /api/school/subscription
Body: { school_id, sms_subscription, whatsapp_subscription }
Response: { success: true, message }
```

---

## Success Criteria

The Communication Setup feature is fully functional when:

✅ All database tables exist and are populated
✅ Frontend loads without errors
✅ Packages display correctly with dynamic data from database
✅ Users can successfully subscribe to packages
✅ Active subscriptions show "Active" ribbon
✅ Subscribe button becomes "Current Package" after subscribing
✅ Usage tracking works correctly
✅ Messaging history displays recent messages
✅ Service toggles work (enable/disable SMS, WhatsApp, Email)
✅ WhatsApp connection flow works (QR code scanning)

---

## Next Steps

After successful testing:

1. **Customize Packages:** Update package pricing and limits in `messaging_packages` table to match your school's needs

2. **Set Term Dates:** Integrate with your academic calendar to automatically set correct end_dates for termly subscriptions

3. **Payment Integration:** Connect package subscriptions to your payment gateway

4. **Notifications:** Set up alerts when packages are near expiration or usage limits

5. **Reports:** Create financial reports for messaging costs

6. **Bulk Operations:** Add ability to send bulk messages with automatic usage tracking

---

## Support

If you encounter issues not covered in this guide:

1. Check browser console for JavaScript errors
2. Check backend logs for API errors
3. Verify database schema matches expected structure
4. Review SQL queries for syntax errors
5. Ensure all dependencies are installed (npm packages, MySQL)

---

**Last Updated:** 2025-01-08
**Version:** 1.0
