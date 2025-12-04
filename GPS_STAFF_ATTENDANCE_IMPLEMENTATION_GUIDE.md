# GPS-Based Staff Attendance System - Complete Implementation Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Setup](#database-setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Integration](#frontend-integration)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## 🎯 Overview

The GPS-Based Staff Attendance System automatically marks staff attendance during login by verifying their physical location against configured school/branch coordinates.

### Key Features

- ✅ **Automatic Attendance Marking**: Staff attendance is marked automatically during login
- 📍 **GPS Validation**: Verifies staff is within configured radius of school/branch
- 🔐 **Secure Login**: No login allowed if staff is outside permitted area (when enabled)
- 📊 **Multiple Methods**: Supports GPS, Manual, Biometric, and Import methods
- 🏢 **Multi-tenant**: Works with school_id and branch_id isolation
- ⚙️ **Configurable**: Enable/disable per school, set custom radius per branch

### Workflow

```
Staff Login Attempt
    ↓
1. Validate Credentials (username/password)
    ↓
2. Check if user is Staff
    ↓
3. Check if school has GPS attendance enabled (staff_login_system = 1)
    ↓
4. If enabled → Request GPS coordinates from frontend
    ↓
5. Calculate distance from branch location
    ↓
6. If within radius → Mark attendance + Allow login
   If outside radius → Reject login with error message
    ↓
7. Return JWT token + attendance data
```

---

## 🏗️ System Architecture

### Database Tables

```
┌─────────────────┐
│  school_setup   │
│  ├─ school_id   │
│  ├─ staff_login_│
│  │   system     │ (1=enabled, 0=disabled)
│  └─ ...         │
└─────────────────┘
         │
         ▼
┌─────────────────────┐
│ school_locations    │
│  ├─ school_id       │
│  ├─ branch_id       │
│  ├─ latitude        │ (branch GPS)
│  ├─ longitude       │ (branch GPS)
│  ├─ gps_radius      │ (allowed radius in meters)
│  └─ ...             │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  teachers (staff)   │
│  ├─ id              │
│  ├─ user_id         │ ──→ links to users table
│  ├─ school_id       │
│  ├─ branch_id       │
│  └─ ...             │
└─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  staff_attendance       │
│  ├─ id                  │
│  ├─ staff_id            │ (from teachers.id)
│  ├─ user_id             │
│  ├─ school_id           │
│  ├─ branch_id           │
│  ├─ date                │
│  ├─ check_in_time       │
│  ├─ check_out_time      │
│  ├─ method              │ (GPS/Manual/Biometric/Import)
│  ├─ gps_lat             │ (staff location)
│  ├─ gps_lon             │ (staff location)
│  ├─ distance_from_branch│
│  ├─ status              │ (Present/Late/Absent/Half-Day/Leave)
│  └─ ...                 │
└─────────────────────────┘
```

### Backend Components

```
backend/src/
├── models/
│   ├── SchoolSetup.js          (existing)
│   ├── SchoolLocation.js       (existing)
│   ├── Staff.js                (existing - points to teachers table)
│   └── StaffAttendance.js      (NEW)
│
├── services/
│   └── staffAttendanceService.js (NEW)
│       ├── validateGPSLocation()
│       ├── markGPSAttendance()
│       ├── importBiometricAttendance()
│       └── getAttendanceRecords()
│
├── utils/
│   └── gpsUtils.js             (NEW)
│       ├── calculateDistance()    (Haversine formula)
│       ├── isWithinRadius()
│       ├── formatDistance()
│       └── isValidCoordinate()
│
└── controllers/
    └── user.js                 (MODIFIED)
        └── login()             (GPS integration added)
```

---

## 💾 Database Setup

### Step 1: Run Migration

```bash
# Navigate to project root
cd /Users/apple/Downloads/apps/elite

# Run the migration SQL file
mysql -u root -p elite_yazid < GPS_STAFF_ATTENDANCE_MIGRATION.sql

# Or if using password in command
mysql -u root elite_yazid < GPS_STAFF_ATTENDANCE_MIGRATION.sql
```

### Step 2: Verify Migration

```bash
mysql -u root -p elite_yazid
```

```sql
-- Check school_setup has staff_login_system column
DESCRIBE school_setup;

-- Check school_locations has GPS columns
DESCRIBE school_locations;

-- Check staff_attendance table exists
DESCRIBE staff_attendance;

-- Check biometric_import_log table exists
DESCRIBE biometric_import_log;
```

### Step 3: Configure School GPS Settings

```sql
-- Enable GPS attendance for a specific school
UPDATE school_setup
SET staff_login_system = 1
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Set GPS coordinates for a branch
UPDATE school_locations
SET
  latitude = 9.0820,        -- Your branch latitude
  longitude = 7.5324,       -- Your branch longitude
  gps_radius = 100          -- Allowed radius in meters (default: 80m)
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND branch_id = 'YOUR_BRANCH_ID';
```

**📍 How to Find GPS Coordinates:**

1. **Google Maps Method:**
   - Open Google Maps
   - Right-click on your school location
   - Click "What's here?"
   - Copy the coordinates (e.g., 9.0820, 7.5324)

2. **Mobile GPS App:**
   - Use apps like "GPS Coordinates" or "My Location"
   - Stand at the school entrance
   - Note the latitude and longitude

3. **Online Tools:**
   - Use https://www.latlong.net/
   - Search for your school address
   - Copy the coordinates

---

## 🔧 Backend Implementation

All backend code is already implemented! Here's what was added:

### ✅ Created Files

1. **`backend/src/models/StaffAttendance.js`**
   - Sequelize model for staff_attendance table
   - Associations with Staff, User, SchoolSetup, SchoolLocation

2. **`backend/src/services/staffAttendanceService.js`**
   - `validateGPSLocation()` - Validates staff location against branch
   - `markGPSAttendance()` - Creates attendance record
   - `importBiometricAttendance()` - Bulk import from CSV/Excel
   - `getAttendanceRecords()` - Query attendance data

3. **`backend/src/utils/gpsUtils.js`**
   - `calculateDistance()` - Haversine distance calculation
   - `isWithinRadius()` - Check if within allowed radius
   - `formatDistance()` - Human-readable distance format
   - `isValidCoordinate()` - GPS validation

### ✅ Modified Files

1. **`backend/src/controllers/user.js`**
   - Added GPS validation in `login()` function
   - Automatically marks attendance for staff users
   - Returns attendance data in login response

---

## 🖥️ Frontend Integration

### Step 1: Get User's GPS Location

Add this function to your frontend login page:

```javascript
// Utility function to get user's GPS coordinates
async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let message = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,  // Use GPS if available
        timeout: 10000,            // 10 second timeout
        maximumAge: 0              // Don't use cached position
      }
    );
  });
}
```

### Step 2: Update Login Function

```javascript
async function handleLogin(username, password, short_name) {
  try {
    // Prepare login payload
    const loginData = {
      username,
      password,
      short_name
    };

    // Get GPS coordinates (will prompt user for permission)
    try {
      const location = await getCurrentLocation();
      loginData.gps_lat = location.lat;
      loginData.gps_lon = location.lon;
      console.log('GPS location obtained:', location);
    } catch (gpsError) {
      console.warn('GPS error:', gpsError.message);
      // Continue login without GPS - backend will handle it
      // If GPS is required for the school, backend will reject
    }

    // Send login request
    const response = await fetch('http://localhost:34567/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      if (data.error === 'GPS_REQUIRED') {
        alert('GPS location is required for staff login. Please enable location services and try again.');
        return;
      }

      if (data.error === 'OUTSIDE_RADIUS') {
        alert(data.message); // Shows distance and required radius
        return;
      }

      if (data.error === 'GPS_NOT_CONFIGURED') {
        alert(data.message); // Branch GPS not configured
        return;
      }

      throw new Error(data.message || 'Login failed');
    }

    // Login successful
    console.log('Login successful:', data);

    // Store token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Check if attendance was marked
    if (data.attendance) {
      console.log('Attendance marked:', data.attendance);
      // Show success message
      alert(`Welcome! Attendance marked: ${data.attendance.status} at ${new Date(data.attendance.checkInTime).toLocaleTimeString()}`);
    }

    // Redirect to dashboard
    window.location.href = '/dashboard';

  } catch (error) {
    console.error('Login error:', error);
    alert(error.message);
  }
}
```

### Step 3: React/Vue Example

**React Example:**

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shortName, setShortName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare login data
      const loginData = { username, password, short_name: shortName };

      // Get GPS location
      try {
        const location = await getCurrentLocation();
        loginData.gps_lat = location.lat;
        loginData.gps_lon = location.lon;
      } catch (gpsError) {
        console.warn('GPS error:', gpsError);
        // Continue without GPS - backend will handle it
      }

      // Login request
      const response = await axios.post('/api/users/login', loginData);

      // Store token
      localStorage.setItem('token', response.data.token);

      // Show attendance info if marked
      if (response.data.attendance) {
        alert(`Attendance marked: ${response.data.attendance.status}`);
      }

      // Redirect
      window.location.href = '/dashboard';

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Staff Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username or Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="School Short Name"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="info">
        📍 GPS location will be requested for attendance marking
      </p>
    </div>
  );
};

export default LoginPage;
```

---

## 🧪 Testing Guide

### Test 1: Enable GPS for Test School

```sql
-- Enable GPS attendance
UPDATE school_setup
SET staff_login_system = 1
WHERE short_name = 'test';

-- Set GPS coordinates (use actual coordinates of your test location)
UPDATE school_locations
SET
  latitude = 9.0820,      -- Replace with your test location
  longitude = 7.5324,     -- Replace with your test location
  gps_radius = 100        -- 100 meters radius
WHERE school_id = (SELECT school_id FROM school_setup WHERE short_name = 'test')
LIMIT 1;
```

### Test 2: Create Test Staff User

```sql
-- Check if test staff exists
SELECT * FROM teachers WHERE email = 'teststaff@school.com';

-- Create test user if needed
INSERT INTO users (name, email, password, user_type, school_id, branch_id, status)
VALUES (
  'Test Staff',
  'teststaff@school.com',
  '$2a$10$hashedpassword', -- Use bcrypt hashed password
  'Staff',
  'YOUR_SCHOOL_ID',
  'YOUR_BRANCH_ID',
  'Active'
);

-- Create staff record linked to user
INSERT INTO teachers (user_id, name, email, mobile_no, school_id, branch_id, status)
SELECT
  u.id,
  'Test Staff',
  'teststaff@school.com',
  '08012345678',
  u.school_id,
  u.branch_id,
  'Active'
FROM users u
WHERE u.email = 'teststaff@school.com';
```

### Test 3: Login Test Cases

#### ✅ Test Case 1: GPS Disabled (Normal Login)

```bash
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teststaff@school.com",
    "password": "test123",
    "short_name": "test"
  }'
```

**Expected:** Login successful, no GPS validation

#### ✅ Test Case 2: GPS Enabled, Within Radius

```bash
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teststaff@school.com",
    "password": "test123",
    "short_name": "test",
    "gps_lat": 9.0821,
    "gps_lon": 7.5325
  }'
```

**Expected:** Login successful, attendance marked

#### ❌ Test Case 3: GPS Enabled, Outside Radius

```bash
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teststaff@school.com",
    "password": "test123",
    "short_name": "test",
    "gps_lat": 9.0900,
    "gps_lon": 7.5400
  }'
```

**Expected:** Login rejected, error message with distance

#### ❌ Test Case 4: GPS Enabled, No Coordinates Provided

```bash
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teststaff@school.com",
    "password": "test123",
    "short_name": "test"
  }'
```

**Expected:** Login rejected, "GPS_REQUIRED" error

### Test 4: Verify Attendance Record

```sql
-- Check if attendance was created
SELECT
  sa.*,
  t.name as staff_name,
  sl.branch_name,
  sl.location
FROM staff_attendance sa
LEFT JOIN teachers t ON sa.staff_id = t.id
LEFT JOIN school_locations sl ON sa.branch_id = sl.branch_id
WHERE sa.date = CURDATE()
ORDER BY sa.created_at DESC
LIMIT 10;
```

---

## 🔍 Troubleshooting

### Issue 1: "GPS_NOT_CONFIGURED" Error

**Problem:** Branch GPS coordinates not set

**Solution:**
```sql
UPDATE school_locations
SET latitude = YOUR_LAT, longitude = YOUR_LON, gps_radius = 100
WHERE school_id = 'YOUR_SCHOOL_ID' AND branch_id = 'YOUR_BRANCH_ID';
```

### Issue 2: Login Works But No Attendance Marked

**Problem:** Staff record not found for user

**Check:**
```sql
SELECT u.id, u.email, t.id as teacher_id
FROM users u
LEFT JOIN teachers t ON u.id = t.user_id
WHERE u.email = 'YOUR_EMAIL';
```

**Solution:** Ensure teachers.user_id is properly linked

### Issue 3: "OUTSIDE_RADIUS" Error (But You're Inside)

**Problem:** GPS accuracy or wrong coordinates

**Check:**
1. Verify branch coordinates are correct:
```sql
SELECT latitude, longitude, gps_radius FROM school_locations WHERE branch_id = 'YOUR_BRANCH';
```

2. Test distance calculation:
```javascript
// In browser console
const lat1 = 9.0820, lon1 = 7.5324; // School
const lat2 = 9.0821, lon2 = 7.5325; // Your location

const R = 6371e3;
const φ1 = lat1 * Math.PI / 180;
const φ2 = lat2 * Math.PI / 180;
const Δφ = (lat2 - lat1) * Math.PI / 180;
const Δλ = (lon2 - lon1) * Math.PI / 180;

const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distance = R * c;

console.log('Distance:', Math.round(distance), 'meters');
```

**Solution:** Increase `gps_radius` if needed (e.g., 150 meters for larger premises)

### Issue 4: Browser Blocks GPS

**Problem:** User denies location permission

**Solution:**
1. Show user how to enable location in browser settings
2. Use HTTPS (location API requires secure context)
3. Provide clear message explaining why location is needed

---

## 📚 API Reference

### POST `/api/users/login`

**Description:** Staff login with GPS-based attendance marking

**Request Body:**
```json
{
  "username": "staff@school.com",    // Email or username
  "password": "password123",         // User password
  "short_name": "school",            // School short name
  "gps_lat": 9.0820,                 // Optional: GPS latitude
  "gps_lon": 7.5324                  // Optional: GPS longitude
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "staff@school.com",
    "user_type": "Staff",
    "school_id": "SCH/1",
    "branch_id": "BR/1"
  },
  "sessionInfo": {
    "lastActivity": "2025-12-03T10:30:00.000Z",
    "inactivityTimeout": 900000,
    "warningThreshold": 780000
  },
  "attendance": {                    // Only if GPS attendance enabled and marked
    "marked": true,
    "status": "Present",             // Present | Late
    "checkInTime": "2025-12-03T08:45:00.000Z",
    "method": "GPS",
    "distance": 45                   // meters from branch
  }
}
```

**Error Responses:**

**400 - GPS Required:**
```json
{
  "success": false,
  "error": "GPS_REQUIRED",
  "message": "GPS location is required for staff login. Please enable location services.",
  "data": {
    "gpsEnabled": true,
    "requiresGPS": true
  }
}
```

**403 - Outside Radius:**
```json
{
  "success": false,
  "error": "OUTSIDE_RADIUS",
  "message": "You are 250m away from Main Branch (Central Campus). You must be within 100m to log in and mark attendance.",
  "data": {
    "distance": 250,
    "allowedRadius": 100,
    "branchName": "Main Branch",
    "branchLocation": "Central Campus",
    "schoolName": "Elite School"
  }
}
```

**403 - GPS Not Configured:**
```json
{
  "success": false,
  "error": "GPS_NOT_CONFIGURED",
  "message": "GPS coordinates not configured for Main Branch. Please contact administrator."
}
```

---

## 🎓 Summary

### What You Have Now

✅ **Database Tables:**
- `staff_attendance` - Main attendance tracking
- `biometric_import_log` - Import logging
- GPS columns in `school_locations`
- `staff_login_system` flag in `school_setup`

✅ **Backend Code:**
- `StaffAttendance` model
- `staffAttendanceService` with GPS validation
- `gpsUtils` with Haversine distance calculation
- Updated `user.js` controller with GPS login

✅ **Features:**
- Automatic attendance on login
- GPS validation with configurable radius
- Distance calculation and tracking
- Support for multiple methods (GPS/Manual/Biometric)
- School-level enable/disable
- Branch-level GPS configuration

### Next Steps

1. **Run Database Migration:**
   ```bash
   mysql -u root elite_yazid < GPS_STAFF_ATTENDANCE_MIGRATION.sql
   ```

2. **Configure Your School:**
   ```sql
   UPDATE school_setup SET staff_login_system = 1 WHERE school_id = 'YOUR_ID';
   UPDATE school_locations SET latitude = X, longitude = Y WHERE branch_id = 'YOUR_BRANCH';
   ```

3. **Update Frontend:**
   - Add GPS location request in login page
   - Handle GPS errors gracefully
   - Show attendance confirmation to user

4. **Test:**
   - Test with GPS disabled (normal login)
   - Test with GPS enabled, within radius
   - Test with GPS enabled, outside radius
   - Verify attendance records in database

5. **Monitor:**
   ```sql
   SELECT * FROM staff_attendance WHERE date = CURDATE();
   ```

---

## 📞 Support

For issues or questions:
1. Check backend logs: `pm2 logs elite`
2. Check database: Query `staff_attendance` table
3. Verify GPS coordinates using Google Maps
4. Test Haversine calculation manually

**Common Configuration:**
- Default radius: 80 meters
- Late threshold: After 9:00 AM
- GPS accuracy: High accuracy mode recommended
- HTTPS required: For browser geolocation API

---

**Implementation Date:** 2025-12-03
**Status:** ✅ Complete and Ready for Testing
