# GPS-Based Staff Attendance System - Implementation Guide

## 📋 Overview

This system implements GPS-based staff attendance that automatically marks attendance when staff members log in from within school premises. It also supports biometric attendance import from CSV/Excel files.

## 🎯 Features

1. **GPS-Based Attendance**
   - Automatic attendance marking during login
   - Location validation using Haversine formula
   - Configurable radius per school (default: 80 meters)
   - Distance calculation and logging

2. **Biometric Integration**
   - CSV/Excel import support
   - Bulk attendance upload
   - Import history tracking
   - Error logging and reporting

3. **Manual Attendance**
   - Admin can manually mark attendance
   - Support for late, absent, leave statuses
   - Check-in and check-out times

4. **Attendance Dashboard**
   - Daily/weekly/monthly reports
   - Statistics by method (GPS, Biometric, Manual)
   - Staff-wise attendance tracking

## 📁 Files Created

### Backend Files

1. **`backend/src/utils/gpsUtils.js`**
   - GPS distance calculation (Haversine formula)
   - Coordinate validation
   - Distance formatting utilities

2. **`backend/src/services/staffAttendanceService.js`**
   - GPS location validation
   - Attendance marking logic
   - Biometric import processing
   - Attendance queries

3. **`backend/src/controllers/staffAttendanceController.js`**
   - API endpoints for attendance management
   - Manual attendance entry
   - Biometric import
   - Reports and analytics

4. **`backend/src/controllers/userWithGPS.js`**
   - Enhanced login controller with GPS integration
   - Demonstrates GPS attendance workflow

5. **`backend/src/routes/staffAttendanceRoutes.js`**
   - API route definitions
   - Endpoint documentation

6. **`backend/src/models/gps_attendance_migration.sql`**
   - Database schema migration
   - Table creation scripts
   - Sample data

## 🗄️ Database Schema

### Tables Created

#### 1. `staff_attendance`
```sql
CREATE TABLE `staff_attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` VARCHAR(50) NOT NULL,
  `user_id` INT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL,
  `date` DATE NOT NULL,
  `check_in_time` DATETIME NOT NULL,
  `check_out_time` DATETIME NULL,
  `method` ENUM('GPS', 'Manual', 'Biometric', 'Import') DEFAULT 'GPS',
  `gps_lat` DECIMAL(10, 8) NULL,
  `gps_lon` DECIMAL(11, 8) NULL,
  `distance_from_school` INT NULL,
  `status` ENUM('Present', 'Late', 'Absent', 'Half-Day', 'Leave') DEFAULT 'Present',
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_staff_date` (`staff_id`, `date`, `school_id`)
);
```

#### 2. `biometric_import_log`
```sql
CREATE TABLE `biometric_import_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL,
  `import_date` DATE NOT NULL,
  `file_name` VARCHAR(255) NULL,
  `total_records` INT DEFAULT 0,
  `successful_imports` INT DEFAULT 0,
  `failed_imports` INT DEFAULT 0,
  `error_log` TEXT NULL,
  `imported_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Columns Added to `school_setup`

```sql
ALTER TABLE `school_setup` 
ADD COLUMN `staff_login_system` TINYINT(1) DEFAULT 0,
ADD COLUMN `latitude` DECIMAL(10, 8) NULL,
ADD COLUMN `longitude` DECIMAL(11, 8) NULL,
ADD COLUMN `gps_radius` INT DEFAULT 80;
```

## 🚀 Installation Steps

### Step 1: Run Database Migration

```bash
# Connect to MySQL
mysql -u your_username -p your_database

# Run the migration script
source backend/src/models/gps_attendance_migration.sql
```

### Step 2: Update School GPS Settings

```sql
-- Enable GPS attendance for a school
UPDATE school_setup 
SET 
  staff_login_system = 1,
  latitude = 9.0820,  -- Your school's latitude
  longitude = 7.5340,  -- Your school's longitude
  gps_radius = 100     -- Allowed radius in meters
WHERE school_id = 'YOUR_SCHOOL_ID';
```

### Step 3: Integrate GPS Login

**Option A: Replace existing login (Recommended)**

```javascript
// In backend/src/controllers/user.js
// Replace the existing login function with:

const { validateGPSLocation, markGPSAttendance } = require('../services/staffAttendanceService');

// Copy the loginWithGPS function from userWithGPS.js
// and rename it to 'login'
```

**Option B: Add as new endpoint**

```javascript
// In backend/src/routes/userRoutes.js
const { loginWithGPS } = require('../controllers/userWithGPS');

router.post('/login-gps', loginWithGPS);
```

### Step 4: Add Attendance Routes

```javascript
// In your main app.js or routes/index.js
const staffAttendanceRoutes = require('./routes/staffAttendanceRoutes');

app.use('/api/staff-attendance', staffAttendanceRoutes);
```

## 📱 Frontend Integration

### Step 1: Get GPS Coordinates

```javascript
// In your login component (e.g., login.tsx)

const getGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          gps_lat: position.coords.latitude,
          gps_lon: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};
```

### Step 2: Send GPS with Login Request

```javascript
// Enhanced login function
const handleLogin = async (username, password, short_name) => {
  try {
    // Get GPS coordinates
    let gpsCoords = { gps_lat: null, gps_lon: null };
    
    try {
      gpsCoords = await getGPSLocation();
      console.log('GPS coordinates obtained:', gpsCoords);
    } catch (gpsError) {
      console.warn('Could not get GPS location:', gpsError);
      // Continue with login - backend will handle GPS requirement
    }

    // Send login request with GPS coordinates
    const response = await axios.post('/api/users/login', {
      username,
      password,
      short_name,
      ...gpsCoords  // Include GPS coordinates
    });

    // Handle response
    if (response.data.success) {
      // Check if attendance was marked
      if (response.data.attendance) {
        console.log('Attendance marked:', response.data.attendance);
        // Show success message to user
        showNotification(
          `Welcome! Attendance marked: ${response.data.attendance.status}`,
          'success'
        );
      }

      // Store token and proceed with login
      localStorage.setItem('token', response.data.token);
      // ... rest of login logic
    }
  } catch (error) {
    // Handle GPS-specific errors
    if (error.response?.data?.error === 'GPS_REQUIRED') {
      showNotification(
        'Please enable location services to log in',
        'error'
      );
    } else if (error.response?.data?.error === 'OUTSIDE_RADIUS') {
      showNotification(
        error.response.data.message,
        'error'
      );
    } else {
      // Handle other errors
      showNotification(error.response?.data?.message || 'Login failed', 'error');
    }
  }
};
```

### Step 3: Handle GPS Errors

```javascript
// Error handling for GPS-related issues

const handleGPSError = (error) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied. Please enable location services.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable. Please try again.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'An error occurred while getting your location.';
  }
};
```

## 📊 Biometric Import

### CSV Format

```csv
staff_id,date,check_in_time,check_out_time,status
STF001,2024-12-02,2024-12-02 08:30:00,2024-12-02 17:00:00,Present
STF002,2024-12-02,2024-12-02 09:15:00,2024-12-02 17:30:00,Late
STF003,2024-12-02,,,Absent
```

### Import API Call

```javascript
// Frontend code to import biometric data

const importBiometricAttendance = async (file, school_id, branch_id) => {
  try {
    // Parse CSV file
    const records = await parseCSV(file);

    // Send to backend
    const response = await axios.post('/api/staff-attendance/import', {
      school_id,
      branch_id,
      records,
      file_name: file.name
    });

    if (response.data.success) {
      console.log('Import successful:', response.data.data);
      showNotification(
        `Import completed: ${response.data.data.successful} successful, ${response.data.data.failed} failed`,
        'success'
      );
    }
  } catch (error) {
    console.error('Import failed:', error);
    showNotification('Failed to import attendance', 'error');
  }
};
```

## 🔧 API Endpoints

### 1. Login with GPS (Enhanced)
```
POST /api/users/login
Body: {
  username: string,
  password: string,
  short_name: string,
  gps_lat: number,  // Required for staff if GPS enabled
  gps_lon: number   // Required for staff if GPS enabled
}
```

### 2. Get Attendance Records
```
GET /api/staff-attendance?school_id=XXX&start_date=2024-12-01&end_date=2024-12-31
```

### 3. Mark Manual Attendance
```
POST /api/staff-attendance/manual
Body: {
  staff_id: string,
  school_id: string,
  branch_id: string,
  date: string,
  check_in_time: string,
  status: string
}
```

### 4. Import Biometric Data
```
POST /api/staff-attendance/import
Body: {
  school_id: string,
  branch_id: string,
  records: array,
  file_name: string
}
```

### 5. Get Attendance Summary
```
GET /api/staff-attendance/summary?school_id=XXX&start_date=2024-12-01&end_date=2024-12-31
```

### 6. Get Import History
```
GET /api/staff-attendance/import-history?school_id=XXX&limit=50
```

## 🧪 Testing

### Test GPS Attendance

```bash
# Test login with GPS coordinates
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff@school.com",
    "password": "password123",
    "short_name": "demo",
    "gps_lat": 9.0820,
    "gps_lon": 7.5340
  }'
```

### Test Outside Radius

```bash
# Test with coordinates far from school
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff@school.com",
    "password": "password123",
    "short_name": "demo",
    "gps_lat": 6.5244,
    "gps_lon": 3.3792
  }'
```

## 📈 Attendance Dashboard Integration

### Get Today's Attendance

```javascript
const getTodayAttendance = async (school_id, branch_id) => {
  const today = new Date().toISOString().split('T')[0];
  
  const response = await axios.get('/api/staff-attendance', {
    params: {
      school_id,
      branch_id,
      start_date: today,
      end_date: today
    }
  });

  return response.data.data;
};
```

### Display Attendance Statistics

```javascript
const getAttendanceStats = async (school_id, start_date, end_date) => {
  const response = await axios.get('/api/staff-attendance/summary', {
    params: {
      school_id,
      start_date,
      end_date
    }
  });

  return response.data.data;
};
```

## 🔒 Security Considerations

1. **GPS Spoofing Prevention**
   - Consider implementing additional verification methods
   - Log GPS coordinates for audit purposes
   - Monitor for suspicious patterns

2. **Data Privacy**
   - GPS coordinates are stored securely
   - Access restricted to authorized personnel
   - Comply with data protection regulations

3. **Authentication**
   - All endpoints should require authentication
   - Use JWT tokens for API access
   - Implement rate limiting

## 🐛 Troubleshooting

### GPS Not Working

1. Check if `staff_login_system = 1` in school_setup
2. Verify school has latitude/longitude configured
3. Check browser location permissions
4. Verify GPS coordinates are being sent in request

### Attendance Not Marking

1. Check if staff record exists in staff table
2. Verify staff_id is correctly linked to user_id
3. Check database logs for errors
4. Verify date format is correct (YYYY-MM-DD)

### Import Failing

1. Verify CSV format matches expected structure
2. Check for duplicate records
3. Verify staff_id exists in staff table
4. Check import history for error details

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Configure school GPS coordinates
3. ✅ Update login controller
4. ✅ Add attendance routes
5. ✅ Implement frontend GPS integration
6. ✅ Test GPS attendance
7. ✅ Create attendance dashboard
8. ✅ Test biometric import
9. ✅ Train staff on new system
10. ✅ Monitor and optimize

## 📞 Support

For issues or questions:
- Check logs in `backend/logs/`
- Review error messages in import history
- Verify GPS coordinates are accurate
- Contact system administrator

---

**Implementation Date**: December 2024  
**Version**: 1.0.0  
**Status**: Ready for Production
