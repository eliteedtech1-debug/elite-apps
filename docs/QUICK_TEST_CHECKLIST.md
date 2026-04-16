# Quick Test Checklist - WhatsApp PDF Feature

## Pre-Flight Checks (2 minutes)

### 1. Start Backend
```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api
npm start
```
✅ Server running on port 5000

### 2. Start Frontend
```bash
cd /Users/apple/Downloads/apps/elite/elscholar-ui
npm start
```
✅ UI accessible at http://localhost:3000

### 3. Check WhatsApp Connection
- Open browser → WhatsApp Management page
- Status should show: **CONNECTED**
- If not connected:
  - Click "Connect WhatsApp"
  - Scan QR code with your WhatsApp mobile app
  - Wait for "Connected" status

---

## Quick Functional Test (5 minutes)

### Test 1: Happy Path ✅
**Steps:**
1. Navigate to: **Fees Collection → Bill Classes**
2. Find any student with a parent phone number
3. Click **"Send WhatsApp"** button (green WhatsApp icon)
4. Wait for loading toast
5. Check for success toast

**Expected:**
- Loading: "📱 Generating PDF and sending to WhatsApp..."
- Success: "✅ WhatsApp sent successfully with PDF invoice!"
- Parent receives WhatsApp message with PDF

**Time:** ~5-10 seconds

---

### Test 2: Verify Parent Receives Message 📱
**Steps:**
1. Open parent's WhatsApp (use your own phone for testing)
2. Check for new message from your school's WhatsApp number
3. Download and open PDF attachment

**Expected:**
- Message with invoice details
- PDF file attached
- PDF opens and shows invoice

---

### Test 3: Error Handling ⚠️
**Steps:**
1. Find student WITHOUT parent phone (or manually set phone to empty)
2. Click "Send WhatsApp"

**Expected:**
- Warning toast: "No parent phone number for [Student Name]"
- No message sent
- No errors in console

---

## Quick Verification Commands

### Check Recent WhatsApp Logs
```sql
SELECT * FROM whatsapp_messages
WHERE school_id = 'YOUR_SCHOOL_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Messaging History
```sql
SELECT
  recipient_name,
  recipient_identifier,
  message_text,
  status,
  has_attachment,
  created_at
FROM messaging_history
WHERE channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Quick Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| "WhatsApp not connected" | Scan QR code in WhatsApp Management |
| "No parent phone number" | Edit parent record, add phone number |
| "Invalid phone number" | Use format: 08012345678 or 2348012345678 |
| Button not visible | Check school has `whatsapp_subscription = 1` |
| PDF not generating | Check browser console, verify @react-pdf/renderer installed |

---

## Success ✅

If all 3 tests pass, the feature is working correctly!

**Next Steps:**
- Test with real parent phone numbers
- Send to multiple students
- Monitor for any errors over time
