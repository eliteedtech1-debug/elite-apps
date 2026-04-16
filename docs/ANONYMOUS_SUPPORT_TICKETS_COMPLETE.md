# Anonymous Support Tickets - Implementation Complete

## Problem Fixed
Users who are **not logged in** (e.g., on the login page) could not create support tickets because the `user_id` field was required in the database.

### Error Before Fix:
```
ValidationError [SequelizeValidationError]: notNull Violation: SupportTicket.user_id cannot be null
```

## Solution Implemented

✅ **Allow anonymous users to create support tickets** by:
1. Making `user_id` nullable in the database
2. Adding anonymous contact fields (name, email, phone)
3. Updating frontend to collect contact info when user is not logged in
4. Updating backend to save anonymous user info

---

## Changes Made

### 1. Database Schema Update

**File:** `src/models/SupportTicket.js`

Changed `user_id` from required to optional and added anonymous contact fields:

```javascript
user_id: {
  type: DataTypes.INTEGER,
  allowNull: true, // ✅ NOW ALLOWS NULL FOR ANONYMOUS USERS
  references: {
    model: 'users',
    key: 'id'
  }
},
// ✅ NEW: Anonymous user contact information
anonymous_name: {
  type: DataTypes.STRING,
  allowNull: true
},
anonymous_email: {
  type: DataTypes.STRING,
  allowNull: true
},
anonymous_phone: {
  type: DataTypes.STRING,
  allowNull: true
},
```

### 2. Database Migration

**File:** `src/migrations/support_tickets_allow_anonymous.sql`

```sql
-- Add anonymous user fields
ALTER TABLE `support_tickets`
ADD COLUMN `anonymous_name` VARCHAR(255) NULL AFTER `user_id`,
ADD COLUMN `anonymous_email` VARCHAR(255) NULL AFTER `anonymous_name`,
ADD COLUMN `anonymous_phone` VARCHAR(255) NULL AFTER `anonymous_email`;

-- Make user_id nullable
ALTER TABLE `support_tickets`
MODIFY COLUMN `user_id` INT NULL;
```

**✅ Migration executed successfully**

---

### 3. Frontend Updates

**File:** `src/feature-module/application/support/ChatbotWidget.tsx`

#### Added Anonymous User State:
```typescript
const [anonymousName, setAnonymousName] = useState<string>('');
const [anonymousEmail, setAnonymousEmail] = useState<string>('');
const [anonymousPhone, setAnonymousPhone] = useState<string>('');
```

#### Updated Ticket Creation to Include Anonymous Info:
```typescript
// If user is not logged in, include anonymous contact info
if (!user || !user.id) {
  ticketPayload.anonymous_name = anonymousName;
  ticketPayload.anonymous_email = anonymousEmail;
  ticketPayload.anonymous_phone = anonymousPhone;
}
```

#### Added Anonymous Contact Fields to Ticket Modal:
```typescript
{/* Show contact fields for anonymous users (not logged in) */}
{(!user || !user.id) && (
  <>
    <div>📧 Please provide your contact information so we can respond to your ticket</div>

    <input placeholder="Enter your name" value={anonymousName} ... />
    <input type="email" placeholder="your.email@example.com" value={anonymousEmail} ... />
    <input type="tel" placeholder="e.g., 08012345678" value={anonymousPhone} ... />
  </>
)}
```

---

### 4. Backend Updates

**File:** `src/controllers/supportController.js`

Updated `createTicket` method to accept and save anonymous user fields:

```javascript
const {
  title,
  description,
  category,
  priority,
  anonymous_name,    // ✅ NEW
  anonymous_email,   // ✅ NEW
  anonymous_phone    // ✅ NEW
} = req.body;

const insertTicketSQL = `
  INSERT INTO support_tickets (
    user_id,
    anonymous_name,    -- ✅ NEW FIELD
    anonymous_email,   -- ✅ NEW FIELD
    anonymous_phone,   -- ✅ NEW FIELD
    title,
    description,
    category,
    priority,
    status,
    created_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const insertTicketValues = [
  userId,                  // Can be NULL for anonymous users
  anonymous_name || null,  // ✅ Save anonymous contact info
  anonymous_email || null,
  anonymous_phone || null,
  title,
  description,
  category,
  priority,
  'open',
  currentTimestamp,
  currentTimestamp
];
```

---

## How It Works Now

### For Logged-In Users (No Changes)
1. User opens chatbot
2. Clicks "How do I contact support?"
3. Fills ticket form (NO contact fields shown)
4. Ticket created with `user_id`

**Database Record:**
```
{
  user_id: 720,              // ✅ Logged-in user ID
  anonymous_name: NULL,
  anonymous_email: NULL,
  anonymous_phone: NULL,
  title: "Login Issue",
  description: "Cannot login...",
  ...
}
```

---

### For Anonymous Users (NEW!)
1. Anonymous user on login page opens chatbot
2. Clicks "How do I contact support?"
3. Fills ticket form + **contact fields shown**
4. Ticket created with `user_id = NULL` + anonymous contact info

**Database Record:**
```
{
  user_id: NULL,                           // ✅ Anonymous user
  anonymous_name: "John Doe",              // ✅ Contact info collected
  anonymous_email: "john@example.com",     // ✅ Can respond via email
  anonymous_phone: "08012345678",          // ✅ Can respond via phone
  title: "Cannot access login page",
  description: "The login page is not loading...",
  ...
}
```

---

## User Experience

### Before Fix ❌
- Anonymous user: **Cannot create tickets** (error)
- Users on login page: **No way to get support**

### After Fix ✅
- Anonymous user: **Can create tickets**
- Contact form appears automatically
- Support team can respond via email/phone

---

## UI Screenshots

### For Anonymous Users:
```
┌─────────────────────────────────────┐
│ Create Support Ticket               │
├─────────────────────────────────────┤
│ Title: *                            │
│ [Cannot access my account      ]    │
│                                     │
│ Description: *                      │
│ [I forgot my password...       ]    │
│                                     │
│ 📧 Please provide your contact      │
│    information so we can respond    │
│                                     │
│ Your Name:                          │
│ [John Doe                      ]    │
│                                     │
│ Email Address:                      │
│ [john@example.com              ]    │
│                                     │
│ Phone Number:                       │
│ [08012345678                   ]    │
│                                     │
│ Category: [Technical ▼]             │
│ Priority: [Medium ▼]                │
│                                     │
│ [Cancel]  [Create Ticket]           │
└─────────────────────────────────────┘
```

### For Logged-In Users:
```
┌─────────────────────────────────────┐
│ Create Support Ticket               │
├─────────────────────────────────────┤
│ Title: *                            │
│ [Payment not working           ]    │
│                                     │
│ Description: *                      │
│ [I tried to pay fees but...    ]    │
│                                     │
│ Category: [Billing ▼]               │
│ Priority: [High ▼]                  │
│                                     │
│ [Cancel]  [Create Ticket]           │
└─────────────────────────────────────┘
```

---

## Testing

### Test Case 1: Anonymous User Creates Ticket
1. **Open app without logging in**
2. Click chatbot icon
3. Click "How do I contact support?"
4. Fill form:
   - Title: "Test Anonymous Ticket"
   - Description: "Testing anonymous ticket creation"
   - Name: "Test User"
   - Email: "test@example.com"
   - Phone: "1234567890"
5. Click "Create Ticket"
6. ✅ **Expected:** Ticket created with `user_id = NULL` and contact info saved

### Test Case 2: Logged-In User Creates Ticket
1. **Log in to app**
2. Click chatbot icon
3. Click "How do I contact support?"
4. Fill form (NO contact fields shown):
   - Title: "Test Logged-In Ticket"
   - Description: "Testing logged-in ticket creation"
5. Click "Create Ticket"
6. ✅ **Expected:** Ticket created with `user_id` set and no anonymous fields

### Test Case 3: Verify Database
```sql
-- Check anonymous ticket
SELECT user_id, anonymous_name, anonymous_email, anonymous_phone, title
FROM support_tickets
WHERE user_id IS NULL;

-- Check logged-in ticket
SELECT user_id, anonymous_name, anonymous_email, anonymous_phone, title
FROM support_tickets
WHERE user_id IS NOT NULL;
```

---

## Database Schema

```sql
CREATE TABLE support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,                  -- ✅ Nullable for anonymous users
  anonymous_name VARCHAR(255) NULL,   -- ✅ NEW: Anonymous user name
  anonymous_email VARCHAR(255) NULL,  -- ✅ NEW: Anonymous user email
  anonymous_phone VARCHAR(255) NULL,  -- ✅ NEW: Anonymous user phone
  assigned_to INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in-progress', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  category ENUM('technical', 'billing', 'feature-request', 'account', 'other') DEFAULT 'other',
  response_time INT NULL,
  resolution_time INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);
```

---

## API Endpoint Changes

### POST `/api/support/tickets`

**Request Body (Anonymous User):**
```json
{
  "title": "Cannot login",
  "description": "I forgot my password",
  "category": "account",
  "priority": "high",
  "anonymous_name": "John Doe",        // ✅ NEW: Only when user not logged in
  "anonymous_email": "john@example.com", // ✅ NEW
  "anonymous_phone": "08012345678"     // ✅ NEW
}
```

**Request Body (Logged-In User):**
```json
{
  "title": "Payment issue",
  "description": "Payment failed",
  "category": "billing",
  "priority": "high"
  // NO anonymous fields needed - user_id from auth
}
```

**Response:**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "id": 123,
    "user_id": null,  // or user ID if logged in
    "anonymous_name": "John Doe",
    "anonymous_email": "john@example.com",
    "anonymous_phone": "08012345678",
    "title": "Cannot login",
    "description": "I forgot my password",
    "category": "account",
    "priority": "high",
    "status": "open",
    "createdAt": "2025-11-17T12:00:00",
    "updatedAt": "2025-11-17T12:00:00"
  }
}
```

---

## Benefits

1. ✅ **Better User Experience**: Users can get help even before logging in
2. ✅ **Reduced Friction**: No need to create account just to report issue
3. ✅ **More Support Requests**: Anonymous users more likely to reach out
4. ✅ **Login Page Support**: Users stuck at login can now get help
5. ✅ **Email/Phone Recovery**: Can help users recover accounts via contact info

---

## Files Modified

- ✅ `/src/models/SupportTicket.js` - Made user_id nullable, added anonymous fields
- ✅ `/src/migrations/support_tickets_allow_anonymous.sql` - Database migration
- ✅ `/src/feature-module/application/support/ChatbotWidget.tsx` - Frontend form
- ✅ `/src/controllers/supportController.js` - Backend ticket creation
- ✅ Database: Columns added, constraint relaxed

---

## Backwards Compatibility

✅ **Fully backwards compatible**
- Existing tickets with `user_id` work exactly as before
- New tickets can have `user_id = NULL` with anonymous contact info
- Logged-in users see no changes to their experience
- Anonymous fields only shown when user is not logged in

---

## Next Steps (Optional Enhancements)

Future improvements that could be added:

1. **Email Verification**: Send confirmation email to anonymous users
2. **Ticket Tracking**: Allow anonymous users to check ticket status via email link
3. **Phone SMS Updates**: Send SMS updates to anonymous users
4. **Pre-filled Forms**: Save anonymous contact info in localStorage for repeat users
5. **Account Creation Prompt**: Suggest creating account after ticket resolved
6. **Spam Protection**: Add reCAPTCHA for anonymous ticket creation
7. **Rate Limiting**: Limit number of anonymous tickets from same IP

---

## Production Ready ✅

All changes are:
- ✅ Tested and verified
- ✅ Database migration executed
- ✅ Server restarted
- ✅ Backwards compatible
- ✅ No breaking changes
- ✅ Ready for production deployment

**The support ticket system now works for both logged-in and anonymous users!** 🎉
