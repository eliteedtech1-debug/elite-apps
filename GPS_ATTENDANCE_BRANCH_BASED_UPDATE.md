# 📍 GPS Attendance - Branch-Based System Update

## 🔄 Important Change

The GPS coordinates are now stored in the **`school_locations`** table (per branch) instead of `school_setup` table (per school).

### Why This Change?

- ✅ **Multi-Branch Support**: Each branch can have different GPS coordinates
- ✅ **Accurate Location**: Branches are in different physical locations
- ✅ **Flexible Configuration**: Each branch can have its own radius
- ✅ **Better Architecture**: Aligns with existing school_locations structure

---

## 🗄️ Database Schema Changes

### GPS Columns in `school_locations`

```sql
ALTER TABLE `school_locations` 
ADD COLUMN `latitude` DECIMAL(10, 8) NULL COMMENT 'Branch GPS latitude';

ALTER TABLE `school_locations` 
ADD COLUMN `longitude` DECIMAL(11, 8) NULL COMMENT 'Branch GPS longitude';

ALTER TABLE `school_locations` 
ADD COLUMN `gps_radius` INT DEFAULT 80 COMMENT 'Allowed radius in meters';
```

### GPS Setting in `school_setup`

```sql
ALTER TABLE `school_setup` 
ADD COLUMN `staff_login_system` TINYINT(1) DEFAULT 0 
  COMMENT '0=Normal login, 1=GPS-based attendance';
```

---

## 🔄 How It Works

### 1. School-Wide Setting

```sql
-- Enable GPS attendance for the entire school
UPDATE school_setup 
SET staff_login_system = 1
WHERE school_id = 'SCH001';
```

### 2. Branch-Specific GPS Coordinates

```sql
-- Set GPS coordinates for Main Branch
UPDATE school_locations 
SET 
  latitude = 9.0820,
  longitude = 7.5340,
  gps_radius = 100
WHERE school_id = 'SCH001' AND branch_id = 'BR001';

-- Set GPS coordinates for Secondary Branch (different location)
UPDATE school_locations 
SET 
  latitude = 9.1234,
  longitude = 7.5678,
  gps_radius = 80
WHERE school_id = 'SCH001' AND branch_id = 'BR002';
```

### 3. Login Flow with Branch Context

```
Staff Login
  ↓
Get GPS Coordinates
  ↓
Validate Credentials
  ↓
Get branch_id from user.branch_id
  ↓
Check if GPS enabled (school_setup.staff_login_system)
  ↓
Fetch branch GPS coordinates (school_locations)
  ↓
Validate staff location against branch GPS
  ↓
If within radius → Mark attendance for that branch
  ↓
Return token + attendance confirmation
```

---

## 📊 Updated API

### Login Request

```javascript
POST /api/users/login
{
  "username": "staff@school.com",
  "password": "password123",
  "short_name": "demo",
  "gps_lat": 9.0820,
  "gps_lon": 7.5340
}
```

### Backend Processing

```javascript
// 1. Get user's branch_id
const branchId = user.branch_id;

// 2. Validate GPS against branch coordinates
const gpsValidation = await validateGPSLocation({
  school_id: resolvedSchoolId,
  branch_id: branchId,  // ← Branch-specific
  staff_lat: gps_lat,
  staff_lon: gps_lon
});

// 3. Mark attendance for specific branch
await markGPSAttendance({
  staff_id: staffRecord.staff_id,
  school_id: resolvedSchoolId,
  branch_id: branchId,  // ← Branch-specific
  gps_lat, gps_lon,
  distance: gpsValidation.data.distance
});
```

---

## 🔧 Configuration Examples

### Example 1: Single Branch School

```sql
-- School with one branch
UPDATE school_setup 
SET staff_login_system = 1
WHERE school_id = 'SCH001';

UPDATE school_locations 
SET 
  latitude = 9.0820,
  longitude = 7.5340,
  gps_radius = 100
WHERE school_id = 'SCH001' AND branch_id = 'BR001';
```

### Example 2: Multi-Branch School

```sql
-- School with multiple branches
UPDATE school_setup 
SET staff_login_system = 1
WHERE school_id = 'SCH001';

-- Main Campus
UPDATE school_locations 
SET 
  latitude = 9.0820,
  longitude = 7.5340,
  gps_radius = 100
WHERE school_id = 'SCH001' AND branch_id = 'MAIN';

-- Secondary Campus (different location)
UPDATE school_locations 
SET 
  latitude = 9.1500,
  longitude = 7.6000,
  gps_radius = 80
WHERE school_id = 'SCH001' AND branch_id = 'SEC';

-- Junior Campus (different location)
UPDATE school_locations 
SET 
  latitude = 9.0500,
  longitude = 7.5100,
  gps_radius = 120
WHERE school_id = 'SCH001' AND branch_id = 'JUN';
```

---

## 📱 Frontend Integration

### No Changes Required!

The frontend code remains the same. The branch context is handled automatically on the backend using `user.branch_id`.

```javascript
// Frontend - same as before
const handleLogin = async () => {
  const gpsCoords = await getGPSLocation();
  
  const response = await axios.post('/api/users/login', {
    username, password, short_name,
    ...gpsCoords
  });
  
  if (response.data.attendance) {
    showNotification(`Attendance marked at ${response.data.attendance.branchName}`);
  }
};
```

---

## 🎯 Benefits

### 1. **Accurate Location Validation**
- Each branch has its own GPS coordinates
- Staff validated against their assigned branch
- No false rejections due to wrong coordinates

### 2. **Flexible Configuration**
- Different radius for each branch
- Some branches can have GPS, others don't
- Easy to add/remove branches

### 3. **Better Reporting**
- Attendance tracked per branch
- Know which branch staff checked in at
- Branch-wise attendance reports

### 4. **Scalability**
- Supports unlimited branches
- Each branch independently configured
- Easy to manage multi-campus schools

---

## 🔍 Validation Logic

### Step 1: Check School Setting

```sql
SELECT staff_login_system 
FROM school_setup 
WHERE school_id = 'SCH001';
```

If `staff_login_system = 0` → Skip GPS validation (normal login)  
If `staff_login_system = 1` → Proceed to Step 2

### Step 2: Get Branch GPS Coordinates

```sql
SELECT latitude, longitude, gps_radius, branch_name
FROM school_locations 
WHERE school_id = 'SCH001' 
  AND branch_id = 'BR001';
```

### Step 3: Calculate Distance

```javascript
const distance = calculateDistance(
  branchLat, branchLon,  // From school_locations
  staffLat, staffLon     // From login request
);
```

### Step 4: Validate

```javascript
if (distance <= gps_radius) {
  // ✅ Within radius - mark attendance
} else {
  // ❌ Outside radius - reject login
}
```

---

## 📊 Updated Database Structure

### `school_setup` (School-Wide Settings)

| Column | Type | Description |
|--------|------|-------------|
| school_id | VARCHAR(20) | Primary key |
| staff_login_system | TINYINT(1) | 0=Normal, 1=GPS |
| ... | ... | Other columns |

### `school_locations` (Branch-Specific Settings)

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto increment |
| school_id | VARCHAR(20) | Foreign key |
| branch_id | VARCHAR(20) | Branch identifier |
| branch_name | VARCHAR(50) | Branch name |
| location | VARCHAR(200) | Branch address |
| **latitude** | DECIMAL(10,8) | **GPS latitude** |
| **longitude** | DECIMAL(11,8) | **GPS longitude** |
| **gps_radius** | INT | **Allowed radius (meters)** |
| status | ENUM | Active/Inactive |
| ... | ... | Other columns |

### `staff_attendance` (Attendance Records)

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto increment |
| staff_id | VARCHAR(50) | Staff identifier |
| school_id | VARCHAR(50) | School identifier |
| **branch_id** | VARCHAR(50) | **Branch identifier** |
| date | DATE | Attendance date |
| check_in_time | DATETIME | Check-in time |
| gps_lat | DECIMAL(10,8) | Staff GPS latitude |
| gps_lon | DECIMAL(11,8) | Staff GPS longitude |
| **distance_from_branch** | INT | **Distance in meters** |
| method | ENUM | GPS/Manual/Biometric |
| status | ENUM | Present/Late/Absent |
| ... | ... | Other columns |

---

## 🧪 Testing

### Test Case 1: Staff at Correct Branch

```bash
# Staff assigned to BR001, logging in from BR001 location
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff@school.com",
    "password": "password",
    "short_name": "demo",
    "gps_lat": 9.0820,
    "gps_lon": 7.5340
  }'

# Expected: ✅ Login successful, attendance marked at BR001
```

### Test Case 2: Staff at Wrong Branch

```bash
# Staff assigned to BR001, but at BR002 location
curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff@school.com",
    "password": "password",
    "short_name": "demo",
    "gps_lat": 9.1500,
    "gps_lon": 7.6000
  }'

# Expected: ❌ Login rejected - outside radius of assigned branch
```

---

## 🔄 Migration from Old System

If you previously had GPS coordinates in `school_setup`:

```sql
-- Copy GPS coordinates from school_setup to school_locations
UPDATE school_locations sl
JOIN school_setup ss ON sl.school_id = ss.school_id
SET 
  sl.latitude = ss.latitude,
  sl.longitude = ss.longitude,
  sl.gps_radius = ss.gps_radius
WHERE ss.latitude IS NOT NULL;

-- Remove old columns from school_setup (optional)
-- ALTER TABLE school_setup DROP COLUMN latitude;
-- ALTER TABLE school_setup DROP COLUMN longitude;
-- ALTER TABLE school_setup DROP COLUMN gps_radius;
```

---

## 📝 Summary

### What Changed

- ❌ **Old**: GPS coordinates in `school_setup` (per school)
- ✅ **New**: GPS coordinates in `school_locations` (per branch)

### Why It's Better

- ✅ Multi-branch support
- ✅ Accurate location validation
- ✅ Flexible configuration
- ✅ Better reporting
- ✅ Scalable architecture

### What Stays the Same

- ✅ Frontend code (no changes)
- ✅ Login flow
- ✅ Attendance marking
- ✅ Biometric import
- ✅ Reports and analytics

---

## 🎉 Ready to Use

The system is now **branch-aware** and ready for multi-campus schools!

**Setup Steps**:
1. ✅ Run migration (adds columns to school_locations)
2. ✅ Enable GPS for school (school_setup.staff_login_system = 1)
3. ✅ Set GPS coordinates for each branch (school_locations)
4. ✅ Test with staff login
5. ✅ Deploy!

---

**Version**: 1.1.0 (Branch-Based)  
**Date**: December 2024  
**Status**: ✅ Production Ready
