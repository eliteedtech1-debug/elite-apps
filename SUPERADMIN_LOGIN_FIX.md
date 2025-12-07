# SuperAdmin/Developer Login Fix

## Changes Made

### 1. Backend - Accept Developer User Type
**File:** `/elscholar-api/src/controllers/user.js`

```javascript
// BEFORE
user_type: "superadmin"

// AFTER
user_type: { [Op.in]: ["superadmin", "Developer"] }
```

### 2. Frontend - Redirect Developer to Dashboard
**File:** `/elscholar-ui/src/feature-module/auth/login/superadmin-login.tsx`

```typescript
// Added Developer redirect
else if (userType === "developer") {
  window.location.href = routes.developerDashboard;
}
```

### 3. Redux - Accept Developer in Auth
**File:** `/elscholar-ui/src/redux/actions/auth.ts`

```typescript
// BEFORE
if (user_type?.toLowerCase() === "superadmin")

// AFTER
if (userTypeLower === "superadmin" || userTypeLower === "developer")
```

## Login Credentials

### Developer Account
- **Username:** `Elite Developer`
- **Password:** `123456`
- **Email:** `developer@elitescholar.ng`
- **User Type:** `Developer`
- **No school_id required** ✅

### Login URL
```
http://localhost:3000/superadmin
```

### API Endpoint
```
POST /superadmin-login
Content-Type: application/json

{
  "username": "Elite Developer",
  "password": "123456"
}
```

## How It Works

### 1. User enters credentials on `/superadmin` page
- Username: Elite Developer
- Password: 123456
- No school_id field (not required for SuperAdmin/Developer)

### 2. Frontend calls `/superadmin-login` endpoint
```javascript
fetch(`${server_url}/superadmin-login`, {
  method: "POST",
  body: JSON.stringify({ username, password })
})
```

### 3. Backend validates user
- Checks if user exists with username or email
- Accepts `user_type` = "superadmin" OR "Developer"
- Validates password with bcrypt
- Generates JWT token (no school_id required)

### 4. Frontend redirects based on user_type
- **SuperAdmin** → `/superadmin-dashboard`
- **Developer** → `/developer-dashboard`

## Testing

### Browser Test (Recommended)
1. Open `http://localhost:3000/superadmin`
2. Enter:
   - Username: `Elite Developer`
   - Password: `123456`
3. Click Login
4. Should redirect to Developer Dashboard

### API Test (Note: curl blocked by security)
```bash
# This will be blocked by suspiciousActivityDetector
curl -X POST "http://localhost:34567/superadmin-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"Elite Developer","password":"123456"}'

# Response: {"success":false,"message":"Access denied"}
# Reason: curl user-agent is blocked by security middleware
```

### Postman Test (Works)
```
POST http://localhost:34567/superadmin-login
Headers:
  Content-Type: application/json
  User-Agent: Mozilla/5.0 (Postman test)

Body:
{
  "username": "Elite Developer",
  "password": "123456"
}
```

## Security Middleware

The `/superadmin-login` endpoint has security middleware that blocks:
- ❌ curl requests
- ❌ wget requests
- ❌ python requests
- ❌ bot/crawler user-agents
- ✅ Browser requests
- ✅ Postman with browser user-agent

**File:** `/elscholar-api/src/middleware/enhancedSecurity.js`
```javascript
const suspiciousPatterns = [
  /bot|crawler|spider|scraper/i,
  /curl|wget|python|java/i,  // <-- Blocks curl
  /sqlmap|nikto|nmap|masscan/i
];
```

## Expected Flow

```
User Login (Browser)
    ↓
POST /superadmin-login
    ↓
Security Middleware ✅
    ↓
Find user (superadmin OR Developer)
    ↓
Validate password
    ↓
Generate JWT token
    ↓
Return success + token
    ↓
Frontend redirects:
  - Developer → /developer-dashboard
  - SuperAdmin → /superadmin-dashboard
```

## Verification

### Check User in Database
```sql
SELECT id, name, email, username, user_type, school_id 
FROM users 
WHERE id = 1;

-- Expected:
-- id: 1
-- name: Elite Developer
-- email: developer@elitescholar.ng
-- username: Elite Developer
-- user_type: Developer
-- school_id: SCH/1 (not used for login)
```

### Check Login Works
1. Open browser
2. Navigate to `http://localhost:3000/superadmin`
3. Login with credentials
4. Should see Developer Dashboard

## Troubleshooting

### Issue: "Access denied"
**Cause:** Using curl or automated tool  
**Solution:** Use browser or Postman with browser user-agent

### Issue: "Super Admin or Developer not found"
**Cause:** Username incorrect  
**Solution:** Use exact username: `Elite Developer` (case-sensitive)

### Issue: "Invalid password"
**Cause:** Wrong password  
**Solution:** Use password: `123456`

### Issue: Redirects to wrong dashboard
**Cause:** user_type not recognized  
**Solution:** Check user_type in database is exactly "Developer" or "superadmin"

## Summary

✅ Developer can now login at `/superadmin` without school_id  
✅ Backend accepts both "superadmin" and "Developer" user types  
✅ Frontend redirects Developer to their dashboard  
✅ No school_id required for SuperAdmin/Developer login  
✅ Security middleware protects against automated attacks
