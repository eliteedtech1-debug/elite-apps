# SMS Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Get eBulkSMS Credentials

1. Visit [https://ebulksms.com](https://ebulksms.com)
2. Create an account
3. Go to Dashboard → API Settings
4. Generate your API Key
5. Copy your email (username) and API key

### Step 2: Configure Backend (.env)

1. Navigate to `elscholar-api/` folder
2. Open `.env` file (or copy from `.env.example`)
3. Add these lines at the bottom:

```env
# eBulkSMS API Configuration
EBULKSMS_USERNAME=your.email@example.com
EBULKSMS_API_KEY=your_actual_api_key_here
```

**Replace:**
- `your.email@example.com` with your eBulkSMS email
- `your_actual_api_key_here` with your actual API key

### Step 3: Install Dependencies

```bash
cd elscholar-api
npm install axios
```

### Step 4: Register SMS Route

Open your main server file (e.g., `server.js` or `app.js`) and add:

```javascript
const smsRoutes = require('./src/routes/sms_service');

// Add with your other routes
app.use('/api', smsRoutes);
```

### Step 5: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
```

### Step 6: Top Up eBulkSMS Account

1. Go to eBulkSMS dashboard
2. Buy SMS units
3. Minimum: 100 units (recommended for testing)

---

## ✅ Test the Integration

### Test 1: Send to Single Parent

1. Open parent list in the UI
2. Click the action menu (⋮) next to any parent
3. Select "Send SMS"
4. Type a test message: "This is a test message from [School Name]"
5. Click "Send SMS"
6. Check if the parent receives the SMS

### Test 2: Bulk SMS

1. Click "Send Bulk SMS" button
2. Verify the recipient count
3. Send a test message
4. Check delivery

---

## 🎯 Features

### ✨ What You Get:

1. **Dropdown Actions Menu**
   - View parent details
   - Send SMS
   - Edit parent
   - Enable/Disable parent

2. **Smart Phone Validation**
   - Accepts: `08012345678`, `2348012345678`, `8012345678`
   - Automatically formats to international format
   - Skips invalid numbers with notification

3. **User-Friendly SMS Modal**
   - Auto-populated sender name (from school short name)
   - Character counter
   - SMS page calculator
   - Recipients preview

4. **Security**
   - API credentials stored in `.env` (not exposed to frontend)
   - Credentials never sent to browser
   - Secure backend proxy to eBulkSMS

---

## 📱 Supported Phone Formats

All these formats work:

| Format | Example | Output |
|--------|---------|--------|
| Local with 0 | `08012345678` | `2348012345678` |
| International | `2348012345678` | `2348012345678` |
| Without prefix | `8012345678` | `2348012345678` |
| With + sign | `+2348012345678` | `2348012345678` |
| With dashes | `080-1234-5678` | `2348012345678` |

---

## 💰 Pricing Guide (eBulkSMS)

| SMS Pages | Characters | Cost (Units) | Cost (DND) |
|-----------|------------|--------------|------------|
| 1 page | 1-160 | 1 unit | 2 units |
| 2 pages | 161-320 | 2 units | 4 units |
| 3 pages | 321-480 | 3 units | 6 units |
| 4 pages | 481-612 | 4 units | 8 units |

**DND Numbers:** MTN numbers registered for Do-Not-Disturb cost 2x

---

## 🔧 Troubleshooting

### "SMS service not configured"
**Fix:** Check that `.env` file has `EBULKSMS_USERNAME` and `EBULKSMS_API_KEY`

### "AUTH_FAILURE"
**Fix:** Verify your API key is correct. Generate a new one if needed.

### "INSUFFICIENT_CREDIT"
**Fix:** Top up your eBulkSMS account

### "No valid phone numbers found"
**Fix:** Check parent phone numbers in database. Must be valid Nigerian format.

### SMS not sending
1. Check server logs for errors
2. Verify eBulkSMS account is active
3. Ensure you have sufficient balance
4. Test with a single parent first

---

## 📞 Quick Test Checklist

- [ ] .env configured with eBulkSMS credentials
- [ ] axios installed (`npm install axios`)
- [ ] SMS route registered in server
- [ ] Server restarted
- [ ] eBulkSMS account topped up
- [ ] Test message sent to single parent
- [ ] Test message received
- [ ] Bulk SMS tested
- [ ] Phone validation tested with different formats

---

## 🎨 UI/UX Improvements

### Before:
- 3 separate buttons taking up space
- API credentials exposed in frontend
- No phone validation

### After:
- ✅ Compact dropdown menu (saves 60% space)
- ✅ SMS option integrated in actions
- ✅ Secure credentials in .env
- ✅ Auto phone validation
- ✅ School name auto-populated
- ✅ Bulk SMS feature
- ✅ Character counter
- ✅ Real-time validation

---

## 📚 API Endpoints

### Send SMS
**POST** `/api/send-sms`

```json
{
  "message": {
    "sender": "SCHOOL",
    "messagetext": "Your message here",
    "flash": "0"
  },
  "recipients": {
    "gsm": [
      {
        "msidn": "2348012345678",
        "msgid": "unique_id_123"
      }
    ]
  }
}
```

### Check Balance
**GET** `/api/sms-balance`

Returns your eBulkSMS account balance.

### Delivery Reports
**GET** `/api/sms-delivery-report?uniqueid=msg_id`

Get delivery status for sent messages.

---

## 🔐 Security Best Practices

1. ✅ **Never commit .env file**
   - Add `.env` to `.gitignore`
   - Share `.env.example` instead

2. ✅ **Use environment variables**
   - Store sensitive data in `.env`
   - Never hardcode API keys

3. ✅ **Backend proxy pattern**
   - Frontend never sees API keys
   - All credentials stay on server

4. ✅ **Validate input**
   - Phone numbers validated
   - Message length checked
   - Sender name validated

---

## 📖 Sample Messages

### Parent-Teacher Meeting
```
Dear Parent, we invite you to our PTA meeting on Jan 15, 2025 at 2PM.
Venue: School Hall. Your presence is important. - [School Short Name]
```
(130 characters, 1 SMS)

### Exam Alert
```
Exams start Jan 20-27, 2025. Ensure your child is prepared.
Call 08012345678 for questions. - [School Short Name]
```
(115 characters, 1 SMS)

### Fee Reminder
```
School fees for Term 2 due by Jan 31, 2025. Visit office or pay online.
Thank you - [School Short Name]
```
(102 characters, 1 SMS)

---

## 🎯 Next Steps

1. **Test thoroughly** with different phone formats
2. **Monitor costs** - track SMS usage
3. **Create templates** for common messages
4. **Train staff** on how to use the feature
5. **Set up monitoring** for failed deliveries

---

## 💡 Pro Tips

1. **Keep messages short** - Under 160 chars = 1 unit
2. **Test first** - Always send to 1-2 parents before bulk
3. **Check balance** - Ensure sufficient units before bulk SMS
4. **Use short name** - School short name works best as sender
5. **Avoid special chars** - Stick to letters and numbers in sender name
6. **Time wisely** - Send during business hours for better engagement
7. **Personalize** - Use parent/student names when possible
8. **Track delivery** - Use delivery reports to monitor success

---

**Setup Time:** ~5 minutes
**First Test:** ~2 minutes
**Total:** ~7 minutes to fully working SMS integration!

---

## 📞 Support

**eBulkSMS Issues:** [eBulkSMS Support](https://ebulksms.com/support)
**API Documentation:** See `docs/SMS_INTEGRATION_GUIDE.md` for detailed docs

---

**Last Updated:** 2025-01-07
**Version:** 1.0.0
