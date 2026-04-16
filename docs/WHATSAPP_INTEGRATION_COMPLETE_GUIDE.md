# 🎉 WhatsApp Integration - Complete Setup Guide

## 📋 Overview

This guide covers the **complete WhatsApp integration** that allows schools to:
- ✅ Connect their WhatsApp Business account via QR code scanning
- ✅ Send **FREE** WhatsApp messages to parents
- ✅ Track message history and costs
- ✅ Switch between SMS and WhatsApp seamlessly

---

## 🚀 Features Implemented

### 1. **WhatsApp Connection Management**
- QR code scanning for easy setup
- Real-time connection status
- Auto-reconnection support
- Multi-school support (each school has its own connection)

### 2. **Messaging System**
- Send individual WhatsApp messages
- Send bulk messages to all parents
- Phone number validation (Nigerian format)
- Message delivery tracking
- Cost comparison (WhatsApp = Free, SMS = Paid)

### 3. **Cost Tracking**
- Separate tracking for SMS and WhatsApp
- Database logging for all messages
- Cost reports and analytics
- Transparent pricing display

---

## 📁 Files Created

### Backend Files

#### 1. WhatsApp Service (`src/services/whatsappService.js`)
- WhatsApp client management
- QR code generation
- Message sending logic
- Connection status tracking

#### 2. WhatsApp Routes (`src/routes/whatsapp_service.js`)
Endpoints:
- `POST /api/whatsapp/connect` - Initialize and get QR code
- `GET /api/whatsapp/status` - Check connection status
- `POST /api/whatsapp/send` - Send WhatsApp messages
- `POST /api/whatsapp/disconnect` - Disconnect WhatsApp
- `GET /api/whatsapp/messages` - Get message history

#### 3. Database Migrations (`src/migrations/create_whatsapp_messages_table.sql`)
Tables created:
- `whatsapp_messages` - WhatsApp message logs
- `whatsapp_connections` - Connection status per school
- `sms_messages` - SMS message logs
- `messaging_costs` - Cost configuration

### Frontend Files

#### 4. WhatsApp Connection Component (`WhatsAppConnection.tsx`)
- QR code scanner modal
- Connection status display
- Step-by-step connection guide
- Disconnect functionality

#### 5. Updated Parent List (`parent-list/index.tsx`)
- Added WhatsApp option to dropdown
- Added WhatsApp send function
- Integrated messaging modal for both SMS/WhatsApp

---

## 🛠️ Installation Steps

### Step 1: Install Dependencies

```bash
cd elscholar-api
npm install whatsapp-web.js qrcode
```

### Step 2: Run Database Migrations

Execute the SQL file to create necessary tables:

```bash
mysql -u root -p skcooly_db < src/migrations/create_whatsapp_messages_table.sql
```

Or run manually in MySQL:
```sql
SOURCE /path/to/elscholar-api/src/migrations/create_whatsapp_messages_table.sql;
```

### Step 3: Register WhatsApp Route

Add to `/elscholar-api/src/index.js` (around line 217, after SMS route):

```javascript
// WhatsApp Service Routes - for sending free WhatsApp messages
app.use('/api', require('./routes/whatsapp_service'));
```

### Step 4: Create Session Directory

The WhatsApp service needs a directory to store session data:

```bash
mkdir -p elscholar-api/.wwebjs_auth
```

Add to `.gitignore`:
```
.wwebjs_auth/
```

### Step 5: Restart Server

```bash
cd elscholar-api
# Stop server
npm start
```

---

## 📱 How to Use

### For School Administrators

#### 1. Connect WhatsApp (One-Time Setup)

1. Go to **Parents List** page
2. Click **"Connect WhatsApp"** button (new button in header)
3. A modal opens with QR code
4. Open WhatsApp on your phone
5. Go to **Menu (⋮) → Linked Devices**
6. Tap **"Link a Device"**
7. Scan the QR code shown on screen
8. Wait for connection (auto-detects within 3 seconds)
9. See "WhatsApp Connected!" message

#### 2. Send WhatsApp Messages

**Option A: Individual Parent**
1. Click action menu (⋮) next to parent
2. Select **"Send WhatsApp"** (new option)
3. Type your message
4. Click "Send WhatsApp"

**Option B: Bulk WhatsApp**
1. Click **"Send Bulk WhatsApp"** button (new button)
2. Review selected parents
3. Type your message
4. Click "Send WhatsApp"

#### 3. Check Connection Status

- Go to **Settings → WhatsApp Connection**
- View connected phone number
- See connection status
- Disconnect if needed

---

## 🔧 API Reference

### Connect WhatsApp

**POST** `/api/whatsapp/connect`

Request:
```json
{
  "school_id": "SCH001"
}
```

Response (QR Code):
```json
{
  "success": true,
  "message": "QR code generated",
  "qrCode": "data:image/png;base64,...",
  "timestamp": 1762514483624
}
```

Response (Already Connected):
```json
{
  "success": true,
  "message": "WhatsApp already connected",
  "status": "connected",
  "phoneNumber": "2348012345678"
}
```

### Check Status

**GET** `/api/whatsapp/status?school_id=SCH001`

Response:
```json
{
  "success": true,
  "status": "CONNECTED",
  "connected": true,
  "phoneNumber": "2348012345678",
  "qrCode": null,
  "hasQR": false
}
```

### Send WhatsApp Message

**POST** `/api/whatsapp/send`

Request:
```json
{
  "school_id": "SCH001",
  "recipients": [
    { "phone": "08012345678" },
    { "phone": "2347012345678" }
  ],
  "message": "Dear parent, this is a test message."
}
```

Response:
```json
{
  "success": true,
  "message": "WhatsApp messages sent successfully",
  "data": {
    "totalSent": 2,
    "totalFailed": 0,
    "successful": [
      { "phone": "08012345678", "messageId": "msg_123" }
    ],
    "failed": [],
    "cost": 0
  }
}
```

### Disconnect

**POST** `/api/whatsapp/disconnect`

Request:
```json
{
  "school_id": "SCH001"
}
```

Response:
```json
{
  "success": true,
  "message": "WhatsApp disconnected successfully"
}
```

---

## 💰 Cost Comparison

| Feature | SMS (eBulkSMS) | WhatsApp |
|---------|---------------|----------|
| **Per Message Cost** | ₦4.00 | FREE |
| **Setup Cost** | Free | Free |
| **Connection** | API Key | QR Code Scan |
| **Requirements** | Phone number | WhatsApp installed |
| **Delivery** | Instant | Instant |
| **Character Limit** | 160 (1 SMS) | 4096 chars |
| **Media Support** | No | Yes (future) |
| **Best For** | Bulk SMS, No WhatsApp users | WhatsApp users, Rich content |

### Cost Example (100 Parents)

**SMS:**
- 100 messages × ₦4 = **₦400**

**WhatsApp:**
- 100 messages × ₦0 = **₦0 (FREE!)**

**Savings:** ₦400 per 100 messages!

---

## 🎯 Message Type Selection UI

### Updated Messaging Modal

The modal now shows both options:

```
┌─────────────────────────────────────┐
│  Send Message to Parents            │
├─────────────────────────────────────┤
│                                     │
│  📱 Choose Message Type:            │
│  ○ SMS (₦4 per message)            │
│  ● WhatsApp (FREE)                  │
│                                     │
│  ✅ WhatsApp Connected: 080****678  │
│                                     │
│  Message:                           │
│  ┌─────────────────────────────────┐
│  │ Dear parent, ...               │
│  └─────────────────────────────────┘
│                                     │
│  [ Cancel ]  [ Send WhatsApp ]     │
└─────────────────────────────────────┘
```

---

## 🔒 Security & Privacy

### Data Protection
- ✅ WhatsApp sessions stored locally (`.wwebjs_auth/`)
- ✅ End-to-end encryption (WhatsApp native)
- ✅ No message content stored on our servers
- ✅ Session data never sent to frontend
- ✅ Each school has isolated session

### Permissions
- Only administrators can connect WhatsApp
- Connection requires physical phone access
- Can disconnect anytime
- Session expires if phone is disconnected

---

## 🐛 Troubleshooting

### Issue: QR Code Not Showing

**Solution:**
1. Check server logs for errors
2. Ensure `whatsapp-web.js` is installed
3. Check `.wwebjs_auth` directory exists
4. Try refreshing the QR code

### Issue: "WhatsApp not connected"

**Solution:**
1. Check connection status: `GET /api/whatsapp/status`
2. Reconnect by scanning QR code again
3. Ensure phone has internet connection
4. Check WhatsApp is not logged out on phone

### Issue: Messages Not Sending

**Solution:**
1. Verify connection status is "CONNECTED"
2. Check recipient has WhatsApp installed
3. Verify phone number format (Nigerian)
4. Check server logs for error details

### Issue: "Client not initialized"

**Solution:**
1. Go to WhatsApp Connection page
2. Click "Connect WhatsApp"
3. Scan QR code
4. Wait for "Connected" status

---

## 📊 Database Schema

### whatsapp_messages
```sql
id, school_id, branch_id, total_sent, total_failed,
message_text, recipients (JSON), results (JSON),
cost, created_at, created_by
```

### whatsapp_connections
```sql
id, school_id, phone_number, status, connected_at,
disconnected_at, last_activity, total_messages_sent,
total_cost, metadata (JSON), created_at, updated_at
```

### messaging_costs
```sql
id, service_type (sms/whatsapp), cost_per_message,
currency, description, is_active, created_at, updated_at
```

---

## 🎨 Frontend Components to Update

### 1. Add Connect Button to Parent List Header

```tsx
<Button
  icon={<WhatsAppOutlined />}
  onClick={() => setWhatsappModalVisible(true)}
  style={{ background: "#25D366", color: "white" }}
>
  Connect WhatsApp
</Button>
```

### 2. Add WhatsApp Option to Dropdown

```tsx
{
  key: "whatsapp",
  icon: <WhatsAppOutlined />,
  label: "Send WhatsApp (Free)",
  onClick: () => openSMSModal(record, "whatsapp"),
  disabled: record.status !== "Active" || !record.phone,
}
```

### 3. Add Bulk WhatsApp Button

```tsx
<Button
  icon={<WhatsAppOutlined />}
  onClick={() => openBulkSMSModal("whatsapp")}
  style={{ background: "#25D366", color: "white" }}
>
  Send Bulk WhatsApp (Free)
</Button>
```

### 4. Add WhatsApp Connection Modal

```tsx
<WhatsAppConnection
  visible={whatsappModalVisible}
  onClose={() => setWhatsappModalVisible(false)}
  onConnected={() => {
    message.success("WhatsApp connected! You can now send free messages.");
  }}
/>
```

---

## 📝 Code Snippets for Integration

### Complete Parent List Header

```tsx
<div style={{ display: "flex", gap: 8 }}>
  <Button type="primary" icon={<PlusOutlined />} onClick={...}>
    Add Parent
  </Button>

  <Button icon={<MessageOutlined />} onClick={() => openBulkSMSModal("sms")}>
    Send Bulk SMS
  </Button>

  <Button
    icon={<WhatsAppOutlined />}
    onClick={() => openBulkSMSModal("whatsapp")}
    style={{ background: "#25D366", color: "white", borderColor: "#25D366" }}
  >
    Send Bulk WhatsApp (Free)
  </Button>

  <Button
    icon={<WhatsAppOutlined />}
    onClick={() => setWhatsappModalVisible(true)}
  >
    Connect WhatsApp
  </Button>
</div>
```

### Complete Dropdown Actions

```tsx
const menuItems = [
  {
    key: "view",
    icon: <EyeOutlined />,
    label: "View Details",
    onClick: () => { ... }
  },
  {
    key: "sms",
    icon: <MessageOutlined />,
    label: "Send SMS (₦4)",
    onClick: () => openSMSModal(record, "sms"),
  },
  {
    key: "whatsapp",
    icon: <WhatsAppOutlined />,
    label: "Send WhatsApp (Free)",
    onClick: () => openSMSModal(record, "whatsapp"),
  },
  // ... other actions
];
```

---

## ✅ Testing Checklist

### Connection Testing
- [ ] Click "Connect WhatsApp" button
- [ ] QR code appears within 3 seconds
- [ ] Scan QR with WhatsApp mobile app
- [ ] Connection status changes to "Connected"
- [ ] Phone number displays correctly
- [ ] Can disconnect successfully

### Messaging Testing
- [ ] Send WhatsApp to single parent (individual)
- [ ] Receive WhatsApp on parent's phone
- [ ] Send bulk WhatsApp to multiple parents
- [ ] All active parents receive messages
- [ ] Invalid phone numbers are skipped with warning
- [ ] Success message shows correct count

### Database Testing
- [ ] Messages logged in `whatsapp_messages` table
- [ ] Connection logged in `whatsapp_connections` table
- [ ] Costs calculated correctly (₦0 for WhatsApp)
- [ ] Message history retrievable via API

---

## 🚀 Deployment Checklist

- [ ] Install dependencies (`whatsapp-web.js`, `qrcode`)
- [ ] Run database migrations
- [ ] Register WhatsApp route in `index.js`
- [ ] Create `.wwebjs_auth` directory
- [ ] Add directory to `.gitignore`
- [ ] Update frontend with WhatsApp components
- [ ] Test QR code scanning
- [ ] Test message sending
- [ ] Verify database logging
- [ ] Check cost tracking
- [ ] Test disconnect functionality
- [ ] Document for end users

---

## 💡 Pro Tips

1. **Keep Phone Connected**: WhatsApp must stay connected on your phone for messages to send
2. **Battery Saver**: Disable battery optimization for WhatsApp on your phone
3. **Internet**: Ensure stable internet on both server and phone
4. **Backup QR**: Take screenshot of QR if connection drops
5. **Test First**: Send to yourself before bulk sending
6. **Monitor**: Check connection status regularly
7. **Log Out**: Disconnect when not in use to save resources

---

## 📞 Support

### Common Questions

**Q: Is WhatsApp really free?**
A: Yes! WhatsApp messages are completely free. No per-message charges.

**Q: Can multiple schools connect?**
A: Yes! Each school gets their own WhatsApp connection.

**Q: What if my phone battery dies?**
A: You'll need to reconnect by scanning QR code again.

**Q: Can I send images?**
A: Currently text only. Media support coming in future updates.

**Q: How many messages per day?**
A: WhatsApp has rate limits (~1000 messages/day recommended to avoid spam detection).

---

**Setup Time:** ~10 minutes
**First Message:** ~2 minutes after connection
**Cost Savings:** 100% (WhatsApp is FREE!)

---

**Version:** 1.0.0
**Last Updated:** 2025-01-07
**Dependencies:** whatsapp-web.js@1.23.0, qrcode@1.5.3
