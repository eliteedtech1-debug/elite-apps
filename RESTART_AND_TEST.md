# 🚀 Quick Restart & Test Instructions

## ✅ Fixed: Route Registration Issue

**Problem:** The SMS route was not registered in the server.
**Solution:** Added route registration in `src/index.js`

---

## 📋 Steps to Test

### 1. Configure .env File

Open `/elscholar-api/.env` and add these lines at the bottom:

```env
# eBulkSMS API Configuration
EBULKSMS_USERNAME=your.email@example.com
EBULKSMS_API_KEY=your_actual_api_key_here
```

**Replace** with your actual eBulkSMS credentials from [https://ebulksms.com](https://ebulksms.com)

### 2. Install Dependencies (if not already installed)

```bash
cd elscholar-api
npm install axios
```

### 3. Restart the Server

Stop your current server (Ctrl+C) and restart:

```bash
cd elscholar-api
npm start
```

Or if using PM2:

```bash
pm2 restart all
```

### 4. Test SMS Integration

1. **Open the application** in your browser
2. **Go to Parents List** page
3. **Click the action menu (⋮)** next to any parent
4. **Select "Send SMS"**
5. **Type a test message**: "Test message from school system"
6. **Click "Send SMS"**

---

## ✅ What Should Happen

### Success Response:
- ✅ You'll see: "SMS sent successfully to 1 parent(s)!"
- ✅ The parent receives the SMS

### If You Get Errors:

| Error | Solution |
|-------|----------|
| **"SMS service not configured"** | Check `.env` file has `EBULKSMS_USERNAME` and `EBULKSMS_API_KEY` |
| **"AUTH_FAILURE"** | Verify your eBulkSMS credentials are correct |
| **"INSUFFICIENT_CREDIT"** | Top up your eBulkSMS account |
| **404 Not Found** | Restart the server (the route is now registered) |

---

## 🔍 Verify Route is Working

Test the endpoint directly:

```bash
curl -X POST http://localhost:34567/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "sender": "SCHOOL",
      "messagetext": "Test message",
      "flash": "0"
    },
    "recipients": {
      "gsm": [{
        "msidn": "2348012345678",
        "msgid": "test_123"
      }]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "data": {
    "totalSent": 1,
    "cost": "1.0",
    "status": "SUCCESS"
  }
}
```

---

## 📞 Check Server Logs

After sending SMS, check the server console for:

```
📱 Sending SMS to 1 recipient(s) via eBulkSMS...
✅ SMS sent successfully! Total sent: 1, Cost: 1.0 units
```

---

## 🎯 Test Checklist

- [ ] `.env` configured with eBulkSMS credentials
- [ ] Server restarted
- [ ] Can access Parents List page
- [ ] Dropdown menu shows "Send SMS" option
- [ ] SMS modal opens with school short name
- [ ] Test message sent successfully
- [ ] Parent receives the SMS

---

## 💡 Tips

1. **Use Your Own Phone Number** for testing
2. **Keep Messages Short** (under 160 chars) for 1 SMS unit
3. **Check eBulkSMS Balance** before bulk sending
4. **Test with 1-2 parents** before sending to all

---

## 🔧 Backend Changes Made

1. ✅ Registered SMS route in `src/index.js`:
   ```javascript
   app.use('/api', require('./routes/sms_service'));
   ```

2. ✅ Created `src/routes/sms_service.js` with endpoints:
   - `POST /api/send-sms`
   - `GET /api/sms-balance`
   - `GET /api/sms-delivery-report`

3. ✅ Updated `.env.example` with SMS configuration

---

## 🎨 Frontend Changes Made

1. ✅ Updated `parent-list/index.tsx`:
   - Changed dropdown actions
   - Added SMS modal
   - Added phone validation
   - Updated API call to `api/send-sms`

---

**Ready to test!** 🚀

Just restart the server and try sending a test SMS!
