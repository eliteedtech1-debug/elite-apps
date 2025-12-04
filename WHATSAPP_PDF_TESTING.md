# WhatsApp PDF Sending - Testing Guide

## Overview
This document provides a comprehensive testing checklist for the automated WhatsApp PDF invoice sending feature implemented in the BillClasses component.

## Feature Summary
- **Purpose**: Send school fee invoices directly to parents via WhatsApp with PDF attachment
- **Trigger**: Click "Send WhatsApp" button on student record
- **Behavior**: Automatically generates PDF invoice and sends to parent's phone number via backend API
- **No User Interaction**: Message sent directly without manual recipient selection

---

## Prerequisites

### 1. Backend Setup
- [ ] Backend server is running on port 5000
- [ ] WhatsApp service is initialized
- [ ] Database is accessible
- [ ] Required npm packages installed:
  - `whatsapp-web.js`
  - `qrcode`
  - `puppeteer`

### 2. WhatsApp Connection
- [ ] WhatsApp client is initialized for the school
- [ ] QR code has been scanned with WhatsApp mobile app
- [ ] Connection status shows "CONNECTED"
- [ ] Phone number is displayed in connection status

### 3. Data Setup
- [ ] Student records exist with valid billing data
- [ ] Students have `parent_id` linking to parents table
- [ ] Parents table has valid phone numbers (Nigerian format: 08xxx or 234xxx)
- [ ] School has `whatsapp_subscription = 1` in database

---

## Testing Checklist

### Phase 1: Prerequisites Verification

#### Test 1.1: Check WhatsApp Connection
**Steps:**
1. Navigate to WhatsApp management page
2. Click "Check Status" or similar
3. Verify status shows "CONNECTED"
4. Note the connected phone number

**Expected Result:**
- Status: CONNECTED
- Phone number displayed
- No errors in console

**API Endpoint:** `GET /api/whatsapp/status?school_id={school_id}`

---

#### Test 1.2: Verify Parent Data
**Steps:**
1. Navigate to BillClasses page
2. Check student records in the table
3. Verify `parent_name` and `parent_phone` columns have data

**Expected Result:**
- Parent names are displayed
- Parent phone numbers are shown
- No "N/A" or empty values for students with parents

**SQL Query to verify:**
```sql
SELECT
  s.student_name,
  s.parent_id,
  p.parent_name,
  p.phone as parent_phone
FROM students s
LEFT JOIN parents p ON s.parent_id = p.parent_id
WHERE s.school_id = 'your_school_id'
LIMIT 10;
```

---

### Phase 2: Happy Path Testing

#### Test 2.1: Send WhatsApp to Single Student
**Steps:**
1. Navigate to BillClasses page
2. Find a student with valid parent phone number
3. Click the 3-dot menu (mobile) or WhatsApp button (desktop)
4. Click "Send WhatsApp"
5. Wait for loading toast
6. Verify success toast appears

**Expected Result:**
- Loading toast: "📱 Generating PDF and sending to WhatsApp..."
- Success toast: "✅ WhatsApp sent successfully with PDF invoice!"
- No errors in browser console
- Parent receives WhatsApp message with PDF attachment

**Time Estimate:** 5-10 seconds

---

#### Test 2.2: Verify Message Content
**Steps:**
1. Check parent's WhatsApp on mobile device
2. Open received message
3. Verify message text format
4. Download and open PDF attachment

**Expected Message Format:**
```
🏫 *[School Name]*
📋 *SCHOOL FEES INVOICE*

👤 Student: [Student Name]
🎓 Class: [Class Name]
📅 Session: [Academic Session]

💰 *Total Amount: ₦[Amount]*

📄 Please find the detailed invoice attached.

Thank you for your prompt payment!
```

**Expected PDF Content:**
- School name and logo
- Student details (name, admission number, class)
- Itemized fee breakdown
- Total amount
- Proper formatting and styling

---

#### Test 2.3: Verify Database Logging
**Steps:**
1. After sending WhatsApp, check database logs
2. Query `whatsapp_messages` table
3. Query `messaging_history` table

**Expected Result:**

**whatsapp_messages table:**
```sql
SELECT * FROM whatsapp_messages
WHERE school_id = 'your_school_id'
ORDER BY created_at DESC LIMIT 1;
```
- `total_sent = 1`
- `total_failed = 0`
- `message_text` contains the message
- `has_attachment = 1`
- `attachment_type = 'pdf'`
- `cost = 0.0`

**messaging_history table:**
```sql
SELECT * FROM messaging_history
WHERE school_id = 'your_school_id'
AND channel = 'whatsapp'
ORDER BY created_at DESC LIMIT 1;
```
- `recipient_identifier` = parent's phone number
- `channel = 'whatsapp'`
- `status = 'sent'`
- `has_attachment = 1`

---

### Phase 3: Edge Cases & Error Handling

#### Test 3.1: Missing Parent Phone Number
**Setup:**
1. Find/create a student without parent phone number
2. Try to send WhatsApp

**Expected Result:**
- Warning toast: "No parent phone number for [Student Name]."
- No API call made
- No error in console

---

#### Test 3.2: Invalid Phone Number
**Setup:**
1. Manually update a parent's phone to invalid format (e.g., "123")
2. Try to send WhatsApp to that student

**Expected Result:**
- Error toast: "Invalid phone number"
- No API call made
- Phone validation catches error early

---

#### Test 3.3: WhatsApp Not Connected
**Setup:**
1. Disconnect WhatsApp (or test with school without connection)
2. Try to send WhatsApp

**Expected Result:**
- Error response from backend: "WhatsApp not connected. Please scan QR code first."
- User sees error toast
- No crash or hanging

**API Response:**
```json
{
  "success": false,
  "message": "WhatsApp not connected. Please scan QR code first."
}
```

---

#### Test 3.4: Unregistered WhatsApp Number
**Setup:**
1. Use a phone number not registered on WhatsApp
2. Try to send WhatsApp

**Expected Result:**
- Backend detects unregistered number
- Error message: "Phone number XXX is not registered on WhatsApp"
- Graceful error handling

---

#### Test 3.5: No Subscription
**Setup:**
1. Set `whatsapp_subscription = 0` for school in database
2. Reload BillClasses page

**Expected Result:**
- "Send WhatsApp" button is NOT visible
- Only "Share Invoice" button appears
- No errors or warnings

---

#### Test 3.6: Student with No Billing Data
**Setup:**
1. Find student with no fee entries
2. Try to send WhatsApp

**Expected Result:**
- PDF generates with ₦0.00 total
- Message still sends (or shows warning about no billing data)
- No crash

---

### Phase 4: Performance Testing

#### Test 4.1: PDF Generation Speed
**Steps:**
1. Send WhatsApp to student with:
   - Few items (2-3 fee entries)
   - Many items (10+ fee entries)
2. Measure time from click to success

**Expected Result:**
- Few items: 3-5 seconds
- Many items: 5-8 seconds
- No timeout errors
- Loading toast remains visible throughout

---

#### Test 4.2: Concurrent Sends
**Steps:**
1. Quickly click "Send WhatsApp" on 3 different students
2. Observe behavior

**Expected Result:**
- All 3 requests process successfully
- Each shows independent loading toast
- No race conditions
- All messages delivered

---

### Phase 5: UI/UX Testing

#### Test 5.1: Button Visibility (Desktop)
**Steps:**
1. Open BillClasses on desktop (>768px width)
2. Check action buttons column

**Expected Result:**
- "Share" button with ShareAltOutlined icon (blue)
- "WhatsApp" button with WhatsAppOutlined icon (green)
- Tooltips work on hover
- Buttons are properly styled

---

#### Test 5.2: Button Visibility (Mobile)
**Steps:**
1. Open BillClasses on mobile (<768px width)
2. Click 3-dot menu on student row

**Expected Result:**
- Dropdown menu appears
- "Share Invoice" option with ShareAltOutlined icon
- "Send WhatsApp" option with WhatsAppOutlined icon
- Clicking either option triggers correct action

---

#### Test 5.3: Loading States
**Steps:**
1. Click "Send WhatsApp"
2. Observe UI during processing

**Expected Result:**
- Loading toast appears immediately
- Toast message: "📱 Generating PDF and sending to WhatsApp..."
- No button double-click issues
- Success toast replaces loading toast

---

### Phase 6: Integration Testing

#### Test 6.1: Parent Management Integration
**Steps:**
1. Find student without parent
2. Click "Attach Parent" (if available)
3. Select/create parent with phone
4. Save
5. Try sending WhatsApp

**Expected Result:**
- Parent successfully attached
- Phone number saved
- WhatsApp sends successfully
- No data inconsistencies

---

#### Test 6.2: Share vs WhatsApp Comparison
**Steps:**
1. Click "Share Invoice" button
2. Note behavior
3. Click "Send WhatsApp" button
4. Compare behaviors

**Expected Result:**

**Share Invoice:**
- Opens share dialog OR downloads PDF
- User manually chooses recipient
- PDF file is downloaded to device

**Send WhatsApp:**
- No dialog or download
- Message sent automatically
- Parent receives message instantly
- User stays on BillClasses page

---

## Test Data Setup

### Sample Test School
```sql
-- Ensure school has WhatsApp subscription
UPDATE schools
SET whatsapp_subscription = 1
WHERE school_id = 'TEST_SCHOOL_001';
```

### Sample Test Parent
```sql
-- Create test parent with valid Nigerian number
INSERT INTO parents (parent_id, school_id, parent_name, phone, email)
VALUES ('TEST_PARENT_001', 'TEST_SCHOOL_001', 'Test Parent', '08012345678', 'test@example.com');
```

### Sample Test Student
```sql
-- Create test student linked to parent
INSERT INTO students (student_id, school_id, student_name, admission_no, class_id, parent_id)
VALUES ('TEST_STUDENT_001', 'TEST_SCHOOL_001', 'Test Student', 'ADM001', 'CLASS_001', 'TEST_PARENT_001');
```

### Sample Test Billing
```sql
-- Add some fee entries for testing
INSERT INTO student_bills (school_id, student_id, bill_item_name, amount, session, term)
VALUES
  ('TEST_SCHOOL_001', 'TEST_STUDENT_001', 'Tuition Fee', 30000, '2023/2024', 'First Term'),
  ('TEST_SCHOOL_001', 'TEST_STUDENT_001', 'Development Levy', 10000, '2023/2024', 'First Term'),
  ('TEST_SCHOOL_001', 'TEST_STUDENT_001', 'Sports Fee', 5000, '2023/2024', 'First Term');
```

---

## Automated Test Script

Run the Node.js test script:

```bash
cd /Users/apple/Downloads/apps/elite
node test-whatsapp-pdf.js
```

**Before running:**
1. Update `TEST_SCHOOL_ID` in the script
2. Update `TEST_PHONE` with a real WhatsApp number you can verify
3. Ensure backend is running

---

## Known Limitations

1. **Rate Limiting**: WhatsApp Web has rate limits. Bulk sending includes 1-second delay between messages.
2. **Connection Dependency**: WhatsApp must remain connected. If disconnected, users must re-scan QR code.
3. **Phone Number Format**: Only Nigerian phone numbers are currently supported (08xxx, 234xxx format).
4. **PDF Size**: Very large PDFs (>5MB) may fail to send via WhatsApp.
5. **Browser Dependency**: Backend uses Puppeteer with Chrome. Chrome must be installed at the specified path.

---

## Troubleshooting

### Issue: "WhatsApp not connected"
**Solution:**
1. Navigate to WhatsApp settings
2. Click "Connect WhatsApp"
3. Scan QR code with WhatsApp mobile app
4. Wait for "Connected" status

### Issue: "Invalid phone number"
**Solution:**
1. Check parent's phone number format
2. Must be Nigerian format: 08012345678 or 2348012345678
3. Update parent record with correct format

### Issue: PDF not generating
**Solution:**
1. Check browser console for errors
2. Verify @react-pdf/renderer is installed
3. Check ReceiptPDF component for syntax errors

### Issue: Message sent but PDF not attached
**Solution:**
1. Check backend logs for PDF conversion errors
2. Verify base64 encoding is correct
3. Check PDF size (must be < 5MB)

### Issue: "Table whatsapp_messages doesn't exist"
**Solution:**
1. Run database migration to create table
2. Check schema in documentation
3. Ensure database is up to date

---

## Success Criteria

The feature is considered fully functional when:

- ✅ All Phase 1-3 tests pass
- ✅ Parents receive messages with PDF attachments
- ✅ Database logging works correctly
- ✅ Error handling gracefully handles all edge cases
- ✅ No console errors or warnings
- ✅ Performance meets acceptable thresholds
- ✅ UI is intuitive and responsive

---

## Sign-off

**Tested By:** _______________
**Date:** _______________
**Test Environment:** _______________
**Test Result:** ☐ Pass ☐ Fail ☐ Partial
**Notes:** _______________________________________________

---

**Last Updated:** 2025-01-08
**Version:** 1.0
