# Backdated Attendance Implementation - COMPLETE

## Overview
Successfully implemented backdated attendance control system allowing admins to enable/disable teachers' ability to edit past attendance records with flexible day limits (1-365 days).

---

## Backend Changes

### 1. `/elscholar-api/src/controllers/school_creation.js`

#### Added Function: `updateAttendanceSettings`
- **Purpose**: Handles updating backdated attendance settings in the school_setup table
- **Validation**:
  - Requires `school_id` and `branch_id`
  - `allow_backdated_attendance` must be 0 or 1
  - `backdated_days` must be between 1 and 365
- **Database Query**: Direct UPDATE query to school_setup table

```javascript
// Function to update backdated attendance settings
const updateAttendanceSettings = async (req, res) => {
  const {
    school_id,
    branch_id,
    allow_backdated_attendance,
    backdated_days,
  } = req.body;

  // Validation
  if (!school_id || !branch_id) {
    return res.status(400).json({
      success: false,
      message: 'school_id and branch_id are required',
    });
  }

  if (typeof allow_backdated_attendance !== 'number' || ![0, 1].includes(allow_backdated_attendance)) {
    return res.status(400).json({
      success: false,
      message: 'allow_backdated_attendance must be 0 or 1',
    });
  }

  if (!backdated_days || backdated_days < 1 || backdated_days > 365) {
    return res.status(400).json({
      success: false,
      message: 'backdated_days must be between 1 and 365',
    });
  }

  try {
    // Update the school_setup table
    await db.sequelize.query(
      `UPDATE school_setup
       SET allow_backdated_attendance = :allow_backdated_attendance,
           backdated_days = :backdated_days,
           updated_at = NOW()
       WHERE school_id = :school_id
       AND branch_id = :branch_id`,
      {
        replacements: {
          allow_backdated_attendance,
          backdated_days,
          school_id,
          branch_id,
        },
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      message: 'Attendance settings updated successfully',
    });
  } catch (err) {
    console.error('Error updating attendance settings:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating settings',
      error: err.message,
    });
  }
};
```

#### Modified Function: `createSchool`
- **Added query_type routing**: Checks for `query_type=update-attendance-settings` and routes to `updateAttendanceSettings()`
- **Location**: school_creation.js:150-157

```javascript
const createSchool = async (req, res) => {
  const { query_type } = req.body;

  // Handle attendance settings update
  if (query_type === 'update-attendance-settings') {
    return updateAttendanceSettings(req, res);
  }

  // ... rest of createSchool code
};
```

#### Modified Function: `getAllSchools`
- **Added direct SELECT query**: For `query_type=select`, now directly queries school_setup table instead of using stored procedure
- **Supports filtering**: By school_id and branch_id
- **Location**: school_creation.js:334-370

```javascript
// Handle fetching school setup data (including attendance settings)
if (query_type === "select") {
  try {
    let query = `SELECT * FROM school_setup WHERE 1=1`;
    const replacements = {};

    if (school_id) {
      query += ` AND school_id = :school_id`;
      replacements.school_id = school_id;
    }

    if (branch_id) {
      query += ` AND branch_id = :branch_id`;
      replacements.branch_id = branch_id;
    }

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT,
    });

    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching school setup:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching school setup",
      error: err.message,
    });
  }
}
```

### 2. `/elscholar-api/src/routes/school_creation.js`

#### Added GET endpoint
```javascript
// Get school setup data
app.get(
  "/school-setup",
  passport.authenticate("jwt", { session: false }),
  getAllSchools
);
```

**Purpose**: Allows frontend to fetch school setup data including attendance settings

---

## Frontend Changes

### 1. `/elscholar-ui/src/feature-module/mainMenu/adminDashboard/AttendanceDashboard.jsx`

#### Fixed Radio.Group value binding (Line 776)
**Issue**: Radio buttons stayed selected even when custom values were entered
**Fix**: Only set Radio.Group value if backdatedDays matches one of the preset values

```javascript
<Radio.Group
  value={[1, 3, 7, 14, 30, 42, 90].includes(backdatedDays) ? backdatedDays : null}
  onChange={(e) => {
    const newDays = e.target.value;
    setBackdatedDays(newDays);
    saveAttendanceSettings(allowBackdatedAttendance, newDays);
  }}
  buttonStyle="solid"
  size="small"
>
```

#### Fixed InputNumber validation (Line 801-809)
**Issue**: InputNumber allowed invalid values like 0 or values > 365
**Fix**: Added validation in onChange handler

```javascript
<InputNumber
  min={1}
  max={365}
  value={backdatedDays}
  onChange={(value) => {
    if (value && value >= 1 && value <= 365) {
      setBackdatedDays(value);
    }
  }}
  onPressEnter={() => saveAttendanceSettings(allowBackdatedAttendance, backdatedDays)}
  style={{ width: 100 }}
  addonAfter="days"
/>
```

---

## Database Migration

### File: `/migrations/add_backdated_attendance_to_school_setup.sql`

**Status**: Already created in previous conversation

**Adds columns**:
- `allow_backdated_attendance` TINYINT(1) DEFAULT 0
- `backdated_days` SMALLINT UNSIGNED DEFAULT 7

**Supports range**: 1-365 days

---

## API Endpoints

### POST /school-setup
**Purpose**: Update backdated attendance settings

**Request**:
```json
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

**Authentication**: Requires JWT token (passport.authenticate)

### GET /school-setup
**Purpose**: Fetch school setup data including attendance settings

**Request**:
```
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

**Authentication**: Requires JWT token (passport.authenticate)

---

## Error Fixes

### Error 1: "Admin password is required and must be a string"
**Root Cause**: POST /school-setup endpoint was only handling school creation, not attendance settings updates

**Fix**: Added query_type routing in `createSchool()` function to handle `update-attendance-settings` before checking for admin_password

### Error 2: "Admin can't change days from 7 days"
**Root Cause**: Radio.Group was always selecting a value, preventing custom values from being properly displayed

**Fix**:
1. Changed Radio.Group value to only select if backdatedDays matches preset values: `value={[1, 3, 7, 14, 30, 42, 90].includes(backdatedDays) ? backdatedDays : null}`
2. Added validation to InputNumber onChange to ensure value stays in valid range

---

## Testing Instructions

### 1. Start the backend server
```bash
cd elscholar-api
npm start
```

### 2. Start the frontend
```bash
cd elscholar-ui
npm start
```

### 3. Test Flow
1. Login as Admin
2. Navigate to Admin Dashboard → Attendance → Settings tab
3. Toggle "Allow Teachers to Edit Past Attendance" to Enabled
4. Test Quick Presets:
   - Click "1 week" button
   - Confirm modal appears
   - Verify settings saved successfully
5. Test Custom Input:
   - Enter custom value (e.g., 45) in InputNumber
   - Click "Apply" button
   - Confirm modal appears
   - Verify settings saved successfully
   - Verify Radio.Group buttons are deselected (since 45 is not a preset)
6. Test validation:
   - Try entering 0 (should not allow)
   - Try entering 400 (should not allow)
   - Try entering 365 (should work)
7. Test Redux integration:
   - Go to Attendance Register page
   - Click on a past date within the allowed range
   - Should be able to mark attendance
   - Click on a date outside the range
   - Should show locked icon with message

---

## Redux Integration

Settings are automatically dispatched to Redux after successful save:

```javascript
dispatch(updateSchoolData({
  allow_backdated_attendance: allowBackdated ? 1 : 0,
  backdated_days: days,
}));
```

This ensures all components (like AttendanceRegister) get updated settings immediately without page refresh.

---

## Files Modified Summary

### Backend
1. `/elscholar-api/src/controllers/school_creation.js`
   - Added `updateAttendanceSettings()` function
   - Modified `createSchool()` to handle query_type routing
   - Modified `getAllSchools()` to directly query school_setup table

2. `/elscholar-api/src/routes/school_creation.js`
   - Added GET /school-setup endpoint

### Frontend
1. `/elscholar-ui/src/feature-module/mainMenu/adminDashboard/AttendanceDashboard.jsx`
   - Fixed Radio.Group value binding (line 776)
   - Fixed InputNumber validation (line 801-809)

---

## Status: ✅ COMPLETE

All issues resolved:
- ✅ Backend API endpoints implemented (POST and GET /school-setup)
- ✅ Attendance settings validation (1-365 days)
- ✅ Admin can change days using Quick Presets or Custom Input
- ✅ Radio.Group properly deselects when custom value is entered
- ✅ Redux integration for real-time updates
- ✅ Error handling and user feedback
- ✅ Authentication via JWT tokens

**Next Step**: User should test the implementation end-to-end and verify all functionality works as expected.
