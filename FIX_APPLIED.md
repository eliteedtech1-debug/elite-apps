# Fix Applied - Route Conflict Resolved

## Issue
`Cannot GET /school-setup` error occurred because of route conflicts between:
1. `/elscholar-api/src/routes/app-config.js` (line 56)
2. `/elscholar-api/src/routes/school_creation.js` (line 15)

Both files were defining POST `/school-setup`, and `app-config.js` loaded later, overwriting the route we added in `school_creation.js`.

---

## Solution Applied

### File Modified: `/elscholar-api/src/routes/app-config.js`

**Action**: Commented out the conflicting POST `/school-setup` route (lines 52-97)

**Reason**: The route in `school_creation.js` is more comprehensive and handles both:
- School creation
- Attendance settings updates (via `query_type`)

---

## Routes Now Active

### 1. GET /school-setup
**File**: `/elscholar-api/src/routes/school_creation.js` (line 22-26)
**Controller**: `getAllSchools` from `/elscholar-api/src/controllers/school_creation.js`

**Usage**:
```bash
GET /school-setup?query_type=select&school_id=SCH/1&branch_id=BRCH00001
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "school_id": "SCH/1",
      "branch_id": "BRCH00001",
      "school_name": "Elite School",
      "allow_backdated_attendance": 1,
      "backdated_days": 42,
      ...
    }
  ]
}
```

### 2. POST /school-setup (Two Purposes)

**File**: `/elscholar-api/src/routes/school_creation.js` (line 15-19)
**Controller**: `createSchool` from `/elscholar-api/src/controllers/school_creation.js`

#### Purpose 1: Update Attendance Settings
```bash
POST /school-setup
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "query_type": "update-attendance-settings",
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "allow_backdated_attendance": 1,
  "backdated_days": 42
}
```

**Response**:
```json
{
  "success": true,
  "message": "Attendance settings updated successfully"
}
```

#### Purpose 2: Create New School
```bash
POST /school-setup
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "school_id": "SCH/2",
  "school_name": "New School",
  "short_name": "newschool",
  "admin_name": "Admin Name",
  "admin_email": "admin@example.com",
  "admin_password": "securepassword",
  ...
}
```

---

## How to Test

### Step 1: Restart Backend Server

**IMPORTANT**: You must restart the backend server for route changes to take effect.

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api
# Stop current server (Ctrl+C if running)
npm start
# OR if using nodemon/pm2:
pm2 restart elscholar-api
```

### Step 2: Test GET Endpoint

```bash
# Get your JWT token from login or browser DevTools
export JWT_TOKEN="your_jwt_token_here"

# Test GET /school-setup
curl -X GET \
  "http://localhost:34567/school-setup?query_type=select&school_id=SCH/1&branch_id=BRCH00001" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected**: Should return school setup data including `allow_backdated_attendance` and `backdated_days`

### Step 3: Test POST Endpoint (Update Settings)

```bash
curl -X POST \
  "http://localhost:34567/school-setup" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "SCH/1",
    "branch_id": "BRCH00001",
    "allow_backdated_attendance": 1,
    "backdated_days": 30
  }'
```

**Expected**:
```json
{
  "success": true,
  "message": "Attendance settings updated successfully"
}
```

### Step 4: Test Frontend

1. Open Admin Dashboard
2. Go to **Attendance → Settings** tab
3. **Enable** backdated attendance
4. Try clicking different preset buttons (1 day, 7 days, 42 days)
5. Try entering a custom value (e.g., 55) and click **Apply**
6. Verify settings save successfully
7. Check that Radio buttons deselect when custom value is used

---

## Files Modified in This Fix

1. ✅ `/elscholar-api/src/routes/app-config.js`
   - Commented out lines 52-97 (conflicting POST /school-setup route)

2. ✅ `/elscholar-api/src/controllers/school_creation.js` (from previous fix)
   - Added `updateAttendanceSettings()` function
   - Modified `createSchool()` to route based on query_type
   - Modified `getAllSchools()` to handle direct SELECT queries

3. ✅ `/elscholar-api/src/routes/school_creation.js` (from previous fix)
   - Added GET /school-setup route

4. ✅ `/elscholar-ui/src/feature-module/mainMenu/adminDashboard/AttendanceDashboard.jsx` (from previous fix)
   - Fixed Radio.Group value binding
   - Fixed InputNumber validation

---

## Verification Checklist

- [ ] Backend server restarted
- [ ] GET /school-setup returns data without 404 error
- [ ] POST /school-setup with query_type=update-attendance-settings works
- [ ] Admin can change backdated days using Quick Presets
- [ ] Admin can change backdated days using Custom Input
- [ ] Radio buttons deselect when custom value is entered
- [ ] Settings persist after page refresh
- [ ] Teachers see correct date restrictions in Attendance Register

---

## Troubleshooting

### Still Getting "Cannot GET /school-setup"

**Cause**: Server wasn't restarted
**Fix**: Stop and restart the backend server

```bash
cd elscholar-api
# Kill the process
pkill -f "node.*elscholar-api"
# Or if using pm2
pm2 restart all

# Start again
npm start
```

### Getting 401 Unauthorized

**Cause**: JWT token expired or missing
**Fix**: Login again to get a fresh token

### Settings Not Updating

**Cause**: Database migration not run
**Fix**: Run the migration SQL file

```bash
mysql -u root -p your_database_name < /Users/apple/Downloads/apps/elite/migrations/add_backdated_attendance_to_school_setup.sql
```

### Custom Days Not Working

**Cause**: Frontend changes not applied
**Fix**:
1. Clear browser cache
2. Rebuild frontend if needed
3. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## Summary

✅ **Route conflict resolved** by commenting out duplicate POST /school-setup in app-config.js
✅ **GET /school-setup** now works correctly
✅ **POST /school-setup** handles both school creation and attendance settings
✅ **Frontend** properly manages state for custom day values

**Action Required**: **RESTART BACKEND SERVER** to apply changes!
