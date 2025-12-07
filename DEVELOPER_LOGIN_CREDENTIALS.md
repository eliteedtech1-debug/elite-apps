# Developer Login Credentials

## Current Working Credentials

### Email
`developer@elitescholar.ng`

### Username
`Elite Developer`

### Password
`123456` ✅ **WORKING**

## Login Details

### Login URL
```
http://localhost:3000/superadmin
```

### API Login Endpoint
```bash
POST http://localhost:34567/users/login
Content-Type: application/json

{
  "username": "Elite Developer",
  "password": "123456",
  "school_id": "SCH/1"
}
```

### Test Login
```bash
curl -X POST "http://localhost:34567/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Elite Developer",
    "password": "123456",
    "school_id": "SCH/1"
  }'
```

## User Details

| Field | Value |
|-------|-------|
| ID | 1 |
| Name | Elite Developer |
| Email | developer@elitescholar.ng |
| Username | Elite Developer |
| User Type | Developer |
| Status | Active |
| School ID | SCH/1 |

## Password Change Attempts

### Attempted: Dev123
- ❌ Failed to update
- Issue: Backend uses `bcrypt` but hash was generated with `bcryptjs`
- Hash mismatch between bcrypt versions ($2a vs $2b)

### Current Password Hash
```
$2a$10$JUosA7TEaGB5wdQat5C1f.uCHtKrXUtz1DgqDesR/sfCvY8hsW/.K
```
This hash corresponds to password: `123456`

## To Change Password Successfully

### Option 1: Use Backend API
```bash
# Login first
TOKEN=$(curl -s -X POST "http://localhost:34567/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"Elite Developer","password":"123456","school_id":"SCH/1"}' \
  | grep -o '"token":"[^"]*' | sed 's/"token":"Bearer //')

# Change password via API (if endpoint exists)
curl -X POST "http://localhost:34567/api/users/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"123456","new_password":"Dev123"}'
```

### Option 2: Generate Hash with Correct bcrypt Version
```javascript
// Check which bcrypt is used in backend
const bcrypt = require('bcrypt'); // or 'bcryptjs'
const hash = bcrypt.hashSync('Dev123', 10);
console.log(hash);

// Then update in database
UPDATE users SET password = '<generated_hash>' WHERE id = 1;
```

## Access Levels

### Developer Can Access:
- ✅ Developer Dashboard (`/developer-dashboard`)
- ✅ Super Admin Dashboard (`/superadmin-dashboard`)
- ✅ All SuperAdmin features
- ✅ School Access Management
- ✅ App Configurations
- ✅ Create/Manage SuperAdmins
- ✅ View ALL schools
- ✅ Assign packages to ANY school

### Developer Sidebar Shows:
1. Developer Dashboard (primary)
2. Super Admin Dashboard (secondary)
3. All menu items (no filtering)

## Troubleshooting

### Login Fails
1. Check username is exactly: `Elite Developer` (case-sensitive)
2. Check password is: `123456`
3. Check school_id is: `SCH/1`
4. Verify user_type in database is: `Developer`

### Password Won't Update
1. Backend might be using different bcrypt library
2. Check if there's a password change API endpoint
3. Use backend's own password hashing method
4. Verify no triggers on users table

## Security Note

⚠️ **Production Recommendation:**
- Change password from `123456` to a strong password
- Use environment variables for credentials
- Implement password rotation policy
- Enable 2FA for Developer accounts
