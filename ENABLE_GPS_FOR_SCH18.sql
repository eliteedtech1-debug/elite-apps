-- =====================================================
-- QUICK FIX: Enable GPS Attendance for SCH/18
-- =====================================================

-- 1. Enable GPS attendance for school
UPDATE school_setup
SET staff_login_system = 1
WHERE school_id = 'SCH/18';

-- 2. Check what branches exist
SELECT
  branch_id,
  branch_name,
  location,
  latitude,
  longitude,
  gps_radius,
  CASE
    WHEN latitude IS NULL THEN '❌ NEEDS GPS COORDINATES'
    ELSE '✅ HAS GPS COORDINATES'
  END as gps_status
FROM school_locations
WHERE school_id = 'SCH/18';

-- 3. Set GPS coordinates for main branch
-- IMPORTANT: Replace these coordinates with your actual school location!
-- Find your coordinates at: https://www.latlong.net/

UPDATE school_locations
SET
  latitude = 9.0820,        -- ⚠️ REPLACE WITH YOUR LATITUDE
  longitude = 7.5324,       -- ⚠️ REPLACE WITH YOUR LONGITUDE
  gps_radius = 150          -- 150 meters radius (good for testing)
WHERE school_id = 'SCH/18'
  AND branch_id IS NOT NULL
LIMIT 1;

-- 4. Update users to have branch_id from their teacher record
UPDATE users u
JOIN teachers t ON u.id = t.user_id
SET u.branch_id = t.branch_id
WHERE u.user_type = 'Teacher'
  AND u.school_id = 'SCH/18'
  AND u.branch_id IS NULL
  AND t.branch_id IS NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check GPS is enabled
SELECT
  'GPS Enabled?' as check_type,
  school_id,
  short_name,
  CASE
    WHEN staff_login_system = 1 THEN '✅ YES'
    ELSE '❌ NO'
  END as status
FROM school_setup
WHERE school_id = 'SCH/18';

-- Check branch GPS coordinates
SELECT
  'Branch GPS' as check_type,
  branch_id,
  branch_name,
  CONCAT('Lat: ', IFNULL(latitude, 'NULL'), ', Lon: ', IFNULL(longitude, 'NULL'), ', Radius: ', IFNULL(gps_radius, 'NULL'), 'm') as coordinates,
  CASE
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN '✅ CONFIGURED'
    ELSE '❌ NOT CONFIGURED'
  END as status
FROM school_locations
WHERE school_id = 'SCH/18';

-- Check users have branch_id
SELECT
  'User Branch' as check_type,
  u.email,
  u.user_type,
  u.branch_id as user_branch,
  t.branch_id as teacher_branch,
  CASE
    WHEN u.branch_id IS NOT NULL THEN '✅ HAS BRANCH'
    WHEN t.branch_id IS NOT NULL THEN '⚠️ CAN USE TEACHER BRANCH'
    ELSE '❌ NO BRANCH'
  END as status
FROM users u
LEFT JOIN teachers t ON u.id = t.user_id
WHERE u.school_id = 'SCH/18'
  AND u.user_type = 'Teacher'
LIMIT 5;

-- =====================================================
-- READY TO TEST!
-- =====================================================
-- After running this script:
-- 1. Restart your backend
-- 2. Login as a teacher with GPS coordinates
-- 3. Check staff_attendance table for new records
-- =====================================================
