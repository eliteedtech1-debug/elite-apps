# GPS Attendance - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Run Database Migration (1 min)

```bash
mysql -u root -p elite_db < backend/src/models/gps_attendance_migration.sql
```

### 2. Configure School GPS (1 min)

```sql
UPDATE school_setup 
SET 
  staff_login_system = 1,
  latitude = 9.0820,      -- Replace with your school's latitude
  longitude = 7.5340,     -- Replace with your school's longitude
  gps_radius = 100        -- Radius in meters
WHERE school_id = 'YOUR_SCHOOL_ID';
```

### 3. Update Login Controller (2 min)

```javascript
// In backend/src/controllers/user.js
// Add these imports at the top:
const { validateGPSLocation, markGPSAttendance } = require('../services/staffAttendanceService');

// In the login function, after password validation and before generating token:

// GPS Attendance for Staff
const isStaff = user.user_type === 'Staff' || user.user_type === 'staff';
let attendanceData = null;

if (isStaff && resolvedSchoolId) {
  const { gps_lat, gps_lon } = req.body;
  
  // Validate GPS location
  const gpsValidation = await validateGPSLocation({
    school_id: resolvedSchoolId,
    staff_lat: gps_lat,
    staff_lon: gps_lon
  });

  if (gpsValidation.gpsEnabled) {
    if (!gps_lat || !gps_lon) {
      return res.status(400).json({
        success: false,
        error: 'GPS_REQUIRED',
        message: 'GPS location is required for staff login.'
      });
    }

    if (!gpsValidation.isValid) {
      return res.status(403).json({
        success: false,
        error: gpsValidation.code,
        message: gpsValidation.error
      });
    }

    // Mark attendance
    const [staffRecord] = await db.sequelize.query(
      `SELECT staff_id FROM staff WHERE user_id = :user_id LIMIT 1`,
      {
        replacements: { user_id: user.id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (staffRecord) {
      const attendanceResult = await markGPSAttendance({
        staff_id: staffRecord.staff_id,
        user_id: user.id,
        school_id: resolvedSchoolId,
        branch_id: user.branch_id,
        gps_lat,
        gps_lon,
        distance: gpsValidation.data.distance
      });
      attendanceData = attendanceResult.data;
    }
  }
}

// Add attendance data to response
const response = {
  success: true,
  token: "Bearer " + token,
  user,
  sessionInfo: { /* ... */ }
};

if (attendanceData) {
  response.attendance = {
    marked: true,
    status: attendanceData.status,
    checkInTime: attendanceData.check_in_time,
    method: 'GPS'
  };
}

res.json(response);
```

### 4. Add Routes (1 min)

```javascript
// In your main app.js or routes/index.js
const staffAttendanceRoutes = require('./routes/staffAttendanceRoutes');
app.use('/api/staff-attendance', staffAttendanceRoutes);
```

### 5. Frontend Integration (2 min)

```javascript
// In your login component
const handleLogin = async (username, password, short_name) => {
  // Get GPS coordinates
  let gpsCoords = { gps_lat: null, gps_lon: null };
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    });
    
    gpsCoords = {
      gps_lat: position.coords.latitude,
      gps_lon: position.coords.longitude
    };
  } catch (error) {
    console.warn('GPS not available:', error);
  }

  // Login with GPS
  const response = await axios.post('/api/users/login', {
    username,
    password,
    short_name,
    ...gpsCoords
  });

  // Handle response
  if (response.data.attendance) {
    showNotification(`Attendance marked: ${response.data.attendance.status}`);
  }
};
```

## ✅ Done!

Your GPS attendance system is now active. Staff members will automatically have their attendance marked when they log in from within school premises.

## 📊 Test It

```bash
# Test with valid coordinates (inside radius)
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff@school.com",
    "password": "password",
    "short_name": "demo",
    "gps_lat": 9.0820,
    "gps_lon": 7.5340
  }'

# Expected: Login successful + attendance marked
```

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| GPS not required | Set `staff_login_system = 1` in school_setup |
| "Outside radius" error | Check latitude/longitude are correct |
| Attendance not marking | Verify staff record exists with correct user_id |
| GPS not working in browser | Enable location permissions |

## 📱 Biometric Import

```javascript
// Import CSV data
const records = [
  {
    staff_id: "STF001",
    date: "2024-12-02",
    check_in_time: "2024-12-02 08:30:00",
    check_out_time: "2024-12-02 17:00:00",
    status: "Present"
  }
];

await axios.post('/api/staff-attendance/import', {
  school_id: "SCH001",
  branch_id: "BR001",
  records,
  file_name: "attendance.csv"
});
```

## 📈 View Attendance

```javascript
// Get today's attendance
const today = new Date().toISOString().split('T')[0];

const response = await axios.get('/api/staff-attendance', {
  params: {
    school_id: "SCH001",
    start_date: today,
    end_date: today
  }
});

console.log(response.data.data); // Array of attendance records
```

## 🎯 Key Features

- ✅ Automatic GPS attendance on login
- ✅ Configurable radius per school
- ✅ Biometric CSV/Excel import
- ✅ Manual attendance entry
- ✅ Attendance reports and analytics
- ✅ Import history tracking
- ✅ Multiple attendance methods (GPS, Biometric, Manual)

## 📚 Full Documentation

See `GPS_ATTENDANCE_IMPLEMENTATION_GUIDE.md` for complete details.

---

**Setup Time**: ~7 minutes  
**Difficulty**: Easy  
**Status**: Production Ready ✅
