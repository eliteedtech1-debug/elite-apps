# Forgot Password - Phone Number Support Fix

## Issue
When using phone number for password reset, the API returned error:
```json
{
  "success": false,
  "message": "Failed to process password reset request",
  "debug": "Unknown column 'phone' in 'field list'"
}
```

## Root Cause
The database tables use different column names for phone numbers:
- **users** table: `phone` ✓
- **teachers** table: `mobile_no` ✗ (not `phone`)
- **parents** table: `phone` ✓
- **students** table: no phone column

## Fix Applied

### 1. Updated SQL Query to Use Correct Column Names
**File**: `elscholar-api/src/routes/user.js`

```javascript
// Phone-based query - updated to use correct column names
userQuery = `
  SELECT id as user_id, name, phone, 'admin' as user_type
  FROM users WHERE phone = ? AND school_id = ?
  UNION
  SELECT user_id, name, mobile_no as phone, 'teacher' as user_type
  FROM teachers WHERE mobile_no = ? AND school_id = ?
  UNION
  SELECT user_id, fullname as name, phone, 'parent' as user_type
  FROM parents WHERE phone = ? AND school_id = ?
`;
```

**Key changes:**
- Teachers query now uses `mobile_no` column instead of `phone`
- Added `mobile_no as phone` alias for consistency in result set

### 2. Fixed Token Insert Issue
The endpoint was trying to insert a record twice:
1. First via `generatePasswordResetToken()` (creates token)
2. Then trying to insert again without token field

**Solution**: Changed from INSERT to UPDATE
```javascript
// Before (causing error)
await db.query(`INSERT INTO password_reset_tokens (...) VALUES (...)`);

// After (fixed)
await db.query(
  `UPDATE password_reset_tokens
   SET otp_code = ?, school_id = ?, contact = ?, email = ?, expires_at = ?, used_at = NULL
   WHERE token = ?`,
  [verificationCode, school_id, email || phone, email || '', expiresAt, resetTokenResult.token]
);
```

## Testing

### Test 1: Phone Number Reset
```bash
curl -X POST http://localhost:34567/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "07035384184",
    "school_id": "SCH/1"
  }'
```

**Response**: ✅
```json
{
  "success": true,
  "message": "Password reset OTP sent successfully! Check your phone.",
  "data": {
    "user_id": 737,
    "contact": "07035384184",
    "expires_at": "2025-11-16T23:00:01.387Z",
    "otp": "079314"
  }
}
```

### Test 2: Email Reset
```bash
curl -X POST http://localhost:34567/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@school.com",
    "school_id": "SCH/1"
  }'
```

## User Type Support

The forgot password endpoint now properly supports:

| User Type | Email Support | Phone Support | Column Used |
|-----------|---------------|---------------|-------------|
| Admin | ✅ | ✅ | `users.phone` |
| Teacher | ✅ | ✅ | `teachers.mobile_no` |
| Parent | ✅ | ✅ | `parents.phone` |
| Student | ✅ | ❌ | No phone column |

**Note**: Students don't have phone numbers in the database (they use parent contact), so phone-based reset is not supported for students.

## Files Modified
1. ✅ `elscholar-api/src/routes/user.js` - Fixed phone column names and token insertion

## Status: ✅ FIXED

Both email and phone-based password reset now work correctly!
