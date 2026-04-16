#!/bin/bash

# =====================================================
# GPS Attendance Test Script
# =====================================================

echo "🧪 Testing GPS Staff Attendance System"
echo "======================================"
echo ""

# Test 1: Login with GPS coordinates (INSIDE radius)
echo "✅ Test 1: Login with GPS (INSIDE 150m radius)"
echo "Coordinates: Lat 9.0821, Lon 7.5325 (should be ~11m from school)"
echo ""

curl -X POST http://localhost:34567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jss3@gmail.com",
    "password": "admin",
    "short_name": "YMA",
    "gps_lat": 9.0821,
    "gps_lon": 7.5325
  }' | jq '.attendance' 2>/dev/null || echo "Note: Install jq for pretty output (brew install jq)"

echo ""
echo ""

# Test 2: Check if attendance was created
echo "✅ Test 2: Verify attendance record in database"
echo ""

mysql -u root elite_yazid -e "
SELECT
  sa.id,
  sa.date,
  sa.check_in_time,
  sa.status,
  sa.method,
  sa.distance_from_branch,
  t.name as staff_name
FROM staff_attendance sa
LEFT JOIN teachers t ON sa.staff_id = t.id
WHERE sa.date = CURDATE()
  AND sa.school_id = 'SCH/18'
ORDER BY sa.created_at DESC
LIMIT 5;
"

echo ""
echo "======================================"
echo "🎉 Test Complete!"
echo ""
echo "Expected Results:"
echo "- Test 1: Should return attendance object with 'marked: true'"
echo "- Test 2: Should show attendance record in database"
echo ""
echo "Troubleshooting:"
echo "- If no attendance: Check backend logs"
echo "- If error: GPS might be outside radius or GPS not enabled"
echo ""
