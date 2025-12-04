# Quick Setup - Communication Packages

## 🚀 5-Minute Setup Guide

Get your Communication Setup feature working with messaging packages in 5 simple steps.

---

## Step 1: Run Database Script (2 minutes)

```bash
cd /Users/apple/Downloads/apps/elite/database-samples
mysql -u your_username -p your_database < messaging_packages_sample.sql
```

**OR** manually run in MySQL client:

```sql
-- Copy and paste the entire content of messaging_packages_sample.sql
```

---

## Step 2: Update School ID (30 seconds)

Replace 'TEST_SCHOOL_001' with your actual school ID:

```sql
UPDATE messaging_subscriptions
SET school_id = 'YOUR_SCHOOL_ID'
WHERE school_id = 'TEST_SCHOOL_001';

UPDATE school_setup
SET sms_subscription = 1, whatsapp_subscription = 1
WHERE school_id = 'YOUR_SCHOOL_ID';
```

---

## Step 3: Verify Tables (30 seconds)

```sql
-- Should return 12+ packages
SELECT COUNT(*) FROM messaging_packages WHERE is_active = 1;

-- Should show your subscriptions
SELECT * FROM messaging_subscriptions WHERE school_id = 'YOUR_SCHOOL_ID';
```

---

## Step 4: Start Application (1 minute)

**Backend:**
```bash
cd elscholar-api
npm start
```

**Frontend:**
```bash
cd elscholar-ui
npm start
```

---

## Step 5: Test in Browser (1 minute)

1. Navigate to: **Settings → Communication Setup**

2. Verify you see:
   - ✅ SMS Packages section with packages
   - ✅ WhatsApp Packages section with packages
   - ✅ Subscribe buttons on each package
   - ✅ Current subscriptions (if you added sample subscriptions)

3. **Test Subscribe:**
   - Click "Subscribe" on any SMS package
   - Confirm in modal
   - See success message
   - Package now shows "Active" ribbon

---

## ✅ Success!

You should now see:

- **Dynamic packages** loaded from database
- **Subscribe buttons** that work
- **Active subscriptions** with "Active" ribbons
- **Current Package** button (disabled) on subscribed packages
- **Usage meters** showing messages used/total

---

## Quick Test Checklist

- [ ] Packages display from database (not hardcoded)
- [ ] Subscribe button opens confirmation modal
- [ ] Clicking "Subscribe" creates database record
- [ ] Success message appears after subscription
- [ ] Package shows "Active" ribbon
- [ ] Button changes to "Current Package"
- [ ] Current Subscriptions section updates

---

## Files Created

1. **messaging_packages_sample.sql** - Database sample data
2. **COMMUNICATION_SETUP_TESTING_GUIDE.md** - Complete testing guide
3. **QUICK_SETUP_COMMUNICATION_PACKAGES.md** - This file

---

## What Changed in CommunicationSetup.tsx

### ✅ Added Features:

1. **handleSubscribeToPackage()** - Function to subscribe to packages with confirmation modal

2. **isPackageSubscribed()** - Helper to check if a package is already subscribed

3. **getPackageBorderColor()** - Helper to get color based on package tier

4. **Dynamic SMS Packages Rendering:**
   - Termly packages with Subscribe buttons
   - Pay-As-You-Go packages with info alerts
   - Shows "Active" ribbon on current packages
   - Disables Subscribe button for active packages

5. **Dynamic WhatsApp Packages Rendering:**
   - Same structure as SMS packages
   - Shows "Unlimited" for high message limits
   - Shows "FREE" for free WhatsApp services

6. **Package Details in Cards:**
   - Package name
   - Total cost (for termly) or per-message rate
   - Number of messages
   - Description
   - Subscribe button with confirmation

---

## Database Structure

### messaging_packages
Stores available packages (SMS, WhatsApp, Email)

**Key Fields:**
- `package_name` - Display name
- `service_type` - sms | whatsapp | email
- `package_type` - payg | termly
- `messages_per_term` - Total messages (NULL for PAYG)
- `unit_cost` - Cost per message
- `package_cost` - Total package cost (NULL for PAYG)
- `is_active` - Whether package is available

### messaging_subscriptions
Stores school subscriptions to packages

**Key Fields:**
- `school_id` - School identifier
- `package_id` - Links to messaging_packages
- `start_date` - Subscription start
- `end_date` - Subscription expiry
- `total_messages` - Total allowed messages
- `messages_used` - Messages consumed
- `status` - active | expired | cancelled

### messaging_usage
Tracks individual message sends

**Key Fields:**
- `school_id` - School identifier
- `subscription_id` - Links to messaging_subscriptions
- `service_type` - sms | whatsapp | email
- `message_count` - Number of messages sent
- `cost` - Cost incurred (for PAYG)

---

## Troubleshooting

### Packages Not Showing?

```sql
-- Check if packages exist
SELECT * FROM messaging_packages WHERE is_active = 1;

-- Re-run sample data if empty
source messaging_packages_sample.sql;
```

### Subscribe Button Disabled?

```sql
-- Check if service is enabled
SELECT sms_subscription, whatsapp_subscription
FROM school_setup
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Enable if needed
UPDATE school_setup
SET sms_subscription = 1, whatsapp_subscription = 1
WHERE school_id = 'YOUR_SCHOOL_ID';
```

### "No Active Package" Still Showing?

```sql
-- Check subscription status
SELECT * FROM messaging_subscriptions
WHERE school_id = 'YOUR_SCHOOL_ID' AND status = 'active';

-- Verify end_date is in future
SELECT *, DATEDIFF(end_date, CURDATE()) as days_left
FROM messaging_subscriptions
WHERE school_id = 'YOUR_SCHOOL_ID';
```

---

## Next Actions

After setup works:

1. **Customize Packages:** Edit `messaging_packages` table with your pricing

2. **Add More Packages:** Insert new packages with different tiers

3. **Integrate Usage Tracking:** Ensure all messaging functions call `/api/messaging-usage`

4. **Set Up WhatsApp:** Connect WhatsApp by scanning QR code

5. **Test Full Flow:** Send messages and verify usage updates

---

## Support

Full documentation: See `COMMUNICATION_SETUP_TESTING_GUIDE.md`

Common commands:
```bash
# View recent subscriptions
mysql> SELECT * FROM messaging_subscriptions ORDER BY created_at DESC LIMIT 5;

# View packages
mysql> SELECT package_name, service_type, package_type FROM messaging_packages;

# Check usage
mysql> SELECT messages_used, total_messages FROM messaging_subscriptions WHERE school_id = 'YOUR_ID';
```

---

**Setup Time:** ~5 minutes
**Difficulty:** Easy
**Prerequisites:** MySQL database, Node.js, npm

**Ready to Go!** 🎉
