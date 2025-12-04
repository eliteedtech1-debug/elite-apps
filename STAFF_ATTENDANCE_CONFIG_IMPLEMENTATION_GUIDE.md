# Staff Attendance Configuration System - Implementation Guide

## Overview

This implementation provides a comprehensive attendance configuration system for staff with support for:
- Check-in/Check-out time periods
- Overtime rewards (with decimal hour support: 0.5hr, 1.75hr, etc.)
- Late penalties (with decimal hour support)
- Grace periods
- Flexible calculation methods
- Auto-calculation toggles

## Components Implemented

### 1. Database Migration

**File:** `BRANCH_ATTENDANCE_CONFIG_MIGRATION.sql`

**Purpose:** Single comprehensive migration file with all database changes

**Changes:**
- Adds 25+ configuration columns to `school_locations` table
- Creates `attendance_penalties` table for tracking rewards/penalties
- Enhances `staff_attendance` table with calculated fields
- Creates 3 helper views for reporting

**Key Columns Added to school_locations:**

```sql
-- Working Hours
check_in_start TIME DEFAULT '07:00:00'
check_in_end TIME DEFAULT '09:00:00'
check_out_start TIME DEFAULT '13:00:00'
check_out_end TIME DEFAULT '17:00:00'

-- Standard Hours (DECIMAL for 0.5hr support)
standard_hours_per_day DECIMAL(4,2) DEFAULT 8.00
standard_hours_per_week DECIMAL(5,2) DEFAULT 40.00

-- Grace Periods (in minutes)
late_grace_period INT DEFAULT 15
early_departure_grace INT DEFAULT 15

-- Overtime Configuration
enable_overtime TINYINT(1) DEFAULT 1
overtime_rate_per_hour DECIMAL(10,2) DEFAULT 0.00
overtime_currency VARCHAR(10) DEFAULT 'NGN'
overtime_calculation_method ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily'

-- Late Penalty Configuration
enable_late_penalty TINYINT(1) DEFAULT 1
late_penalty_per_hour DECIMAL(10,2) DEFAULT 0.00
late_penalty_currency VARCHAR(10) DEFAULT 'NGN'
late_penalty_method ENUM('deduction', 'warning', 'both') DEFAULT 'deduction'

-- Absence Penalty Configuration
enable_absence_penalty TINYINT(1) DEFAULT 1
absence_penalty_per_day DECIMAL(10,2) DEFAULT 0.00
absence_penalty_currency VARCHAR(10) DEFAULT 'NGN'

-- Calculation Settings
round_overtime_to ENUM('nearest_15min', 'nearest_30min', 'nearest_hour', 'exact') DEFAULT 'nearest_15min'
minimum_overtime_hours DECIMAL(4,2) DEFAULT 0.25
auto_calculate_penalties TINYINT(1) DEFAULT 1
```

**New attendance_penalties Table:**
- Tracks individual penalty/reward instances
- Links to staff_attendance records
- Supports approval workflow
- Stores calculation details in JSON

**Views Created:**
- `v_branch_attendance_config` - All branches with their config
- `v_active_attendance_config` - Currently active configs
- `v_pending_penalties` - Penalties awaiting approval

### 2. Backend API

**Files:**
- `backend/src/controllers/attendanceConfigController.js`
- `backend/src/routes/attendanceConfig.js`

**Endpoints:**

```javascript
// Get attendance configuration for a specific branch
GET /api/attendance-config?school_id=XXX&branch_id=YYY

// Update attendance configuration
PUT /api/attendance-config
Body: {
  school_id: "XXX",
  branch_id: "YYY",
  check_in_start: "08:00:00",
  check_in_end: "09:00:00",
  standard_hours_per_day: 8.00,
  overtime_rate_per_hour: 500.00,
  late_penalty_per_hour: 200.00,
  // ... other config fields
}

// Get all branch configurations for a school
GET /api/attendance-config/all?school_id=XXX
```

**Features:**
- Multi-tenancy support (school_id, branch_id)
- Dynamic update query building
- Full validation
- Decimal hour support throughout

### 3. Frontend Component

**File:** `frontend/src/feature-module/hrm/attendance/AttendanceConfigTab.tsx`

**Integration:** Integrated into StaffAttendanceOverview.tsx as the "Configuration" tab

**Features:**

1. **Working Hours Configuration**
   - Check-in start/end times (TimePicker)
   - Check-out start/end times (TimePicker)
   - Standard hours per day/week (DECIMAL input with 0.5 step)

2. **Grace Periods**
   - Late arrival grace (minutes)
   - Early departure grace (minutes)
   - Tooltips explaining each setting

3. **Overtime Configuration**
   - Enable/disable toggle
   - Rate per hour (supports decimals: ₦500.50)
   - Currency selector (NGN, USD, EUR, GBP)
   - Calculation method (daily/weekly/monthly)
   - Minimum overtime hours (0.25 = 15min, 0.5 = 30min)
   - Rounding rules

4. **Late Penalty Configuration**
   - Enable/disable toggle
   - Penalty per hour (supports decimals)
   - Currency selector
   - Penalty method (deduction/warning/both)

5. **Absence Penalty Configuration**
   - Enable/disable toggle
   - Penalty per day
   - Currency selector
   - Half-day threshold hours
   - Half-day penalty amount

6. **Calculation Settings**
   - Auto-calculate toggle
   - Rounding options
   - Example calculations

**UI Highlights:**
- Responsive design (mobile-friendly)
- Real-time validation
- Clear tooltips for all fields
- Example calculation display
- Color-coded sections

## Usage Guide

### Step 1: Run Database Migration

```bash
# Connect to your MySQL database
mysql -u username -p database_name < BRANCH_ATTENDANCE_CONFIG_MIGRATION.sql

# Or via MySQL Workbench:
# Open the SQL file and execute
```

**Verification:**
```sql
-- Check columns were added
DESCRIBE school_locations;

-- Check new table exists
SHOW TABLES LIKE 'attendance_penalties';

-- Check views exist
SHOW FULL TABLES WHERE Table_type = 'VIEW';
```

### Step 2: Backend Server

Backend routes are already registered in `backend/src/index.js`:
```javascript
app.use('/api', require('./routes/attendanceConfig'));
```

**Test the API:**
```bash
# Get config
curl -X GET "http://localhost:34567/api/attendance-config?school_id=SCH/18&branch_id=BR001"

# Update config
curl -X PUT "http://localhost:34567/api/attendance-config" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "SCH/18",
    "branch_id": "BR001",
    "check_in_start": "08:00:00",
    "check_in_end": "09:00:00",
    "standard_hours_per_day": 8.00,
    "overtime_rate_per_hour": 500.00,
    "enable_overtime": true
  }'
```

### Step 3: Frontend Access

**Navigate to:**
```
http://localhost:3000/hrm/staff-attendance-overview
```

**Then click:** "Configuration" tab

**Configure:**
1. Set working hours
2. Configure grace periods
3. Enable/configure overtime rewards
4. Enable/configure late penalties
5. Enable/configure absence penalties
6. Set calculation preferences
7. Click "Save Configuration"

## Decimal Hour Examples

The system fully supports decimal hours for flexible time tracking:

```javascript
// Overtime Examples
2.5 hours × ₦500/hr = ₦1,250 overtime reward
0.75 hours (45min) × ₦500/hr = ₦375 overtime reward
1.25 hours (1hr 15min) × ₦500/hr = ₦625 overtime reward

// Late Penalty Examples
0.5 hours (30min late) × ₦200/hr = ₦100 penalty
1.75 hours (1hr 45min late) × ₦200/hr = ₦350 penalty

// Standard Hours
8.00 hours/day = standard workday
6.50 hours/day = shorter workday
7.75 hours/day = custom workday
```

## Configuration Options Explained

### Check-in/Check-out Times

- **check_in_start** (07:00): Earliest valid check-in time
- **check_in_end** (09:00): Latest on-time check-in (after = late)
- **check_out_start** (13:00): Earliest valid check-out time
- **check_out_end** (17:00): Latest expected check-out time

**Example:**
```
Staff checks in at 08:30 → On-time (between 07:00 and 09:00)
Staff checks in at 09:15 → Late (after 09:00)
Staff checks in at 06:45 → Invalid (before 07:00)
```

### Overtime Calculation Methods

1. **Daily:** Overtime = hours worked - standard_hours_per_day
   - Example: Worked 10 hours, standard 8 = 2 hours overtime

2. **Weekly:** Overtime = total weekly hours - standard_hours_per_week
   - Example: Worked 45 hours, standard 40 = 5 hours overtime

3. **Monthly:** Calculated based on monthly totals
   - More complex, typically for salaried staff

### Rounding Options

- **exact** (0.00): No rounding, use exact hours
- **nearest_15min** (0.25): Round to nearest quarter hour
- **nearest_30min** (0.50): Round to nearest half hour
- **nearest_hour** (1.00): Round to nearest full hour

**Examples:**
```
Worked 2.3 hours:
- exact = 2.30
- nearest_15min = 2.25
- nearest_30min = 2.50
- nearest_hour = 2.00

Worked 2.8 hours:
- exact = 2.80
- nearest_15min = 2.75
- nearest_30min = 3.00
- nearest_hour = 3.00
```

### Penalty Methods

- **deduction:** Automatically deduct from salary
- **warning:** Issue warning only, no financial impact
- **both:** Deduct AND issue formal warning

## Next Steps (Not Yet Implemented)

### Calculation Service

Create `backend/src/services/attendanceCalculationService.js` to:

1. **Calculate Hours Worked**
   ```javascript
   async function calculateHoursWorked(attendance_id) {
     // Get check_in_time and check_out_time
     // Calculate difference in hours (decimal)
     // Update staff_attendance.hours_worked
   }
   ```

2. **Calculate Overtime**
   ```javascript
   async function calculateOvertime(attendance_id, config) {
     const hoursWorked = getHoursWorked(attendance_id);
     const overtime = hoursWorked - config.standard_hours_per_day;

     if (overtime > config.minimum_overtime_hours) {
       // Round according to config.round_overtime_to
       const roundedOvertime = roundHours(overtime, config.round_overtime_to);
       const rewardAmount = roundedOvertime * config.overtime_rate_per_hour;

       // Create attendance_penalties record (type: overtime_reward)
       await createPenaltyRecord({
         staff_id,
         attendance_id,
         type: 'overtime_reward',
         hours: roundedOvertime,
         rate_per_hour: config.overtime_rate_per_hour,
         amount: rewardAmount,
         currency: config.overtime_currency
       });
     }
   }
   ```

3. **Calculate Late Penalty**
   ```javascript
   async function calculateLatePenalty(attendance_id, config) {
     const checkInTime = getCheckInTime(attendance_id);
     const lateMinutes = checkInTime - config.check_in_end;

     if (lateMinutes > config.late_grace_period) {
       const lateHours = (lateMinutes - config.late_grace_period) / 60;
       const penaltyAmount = lateHours * config.late_penalty_per_hour;

       await createPenaltyRecord({
         type: 'late_penalty',
         hours: lateHours,
         amount: -penaltyAmount, // Negative for penalty
         // ...
       });
     }
   }
   ```

4. **API Endpoint**
   ```javascript
   // Calculate penalties for a specific attendance record
   POST /api/staff-attendance/calculate-penalties
   Body: { attendance_id: 123 }

   // Calculate penalties for all uncalculated attendance
   POST /api/staff-attendance/calculate-all-penalties
   Body: { school_id: "XXX", start_date: "2025-01-01" }
   ```

5. **Cron Job**
   ```javascript
   // In backend/src/cron/attendanceCalculations.js
   const cron = require('node-cron');

   // Run daily at 11:59 PM
   cron.schedule('59 23 * * *', async () => {
     console.log('Running attendance calculations...');
     await calculateAllPenaltiesForToday();
   });
   ```

### Reporting Features

1. **Staff Overtime Report**
   - Total overtime hours per staff
   - Total overtime rewards
   - Filter by date range, branch

2. **Penalty Summary Report**
   - Total late penalties
   - Total absence penalties
   - Breakdown by staff, department

3. **Payroll Integration**
   - Export pending rewards/penalties
   - Integration with salary disbursement
   - Approval workflow

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] All columns added to school_locations
- [ ] attendance_penalties table created
- [ ] Views created successfully
- [ ] Backend API accessible
- [ ] GET /api/attendance-config works
- [ ] PUT /api/attendance-config works
- [ ] Frontend component loads
- [ ] Configuration tab visible
- [ ] Form saves successfully
- [ ] Decimal hours accepted (0.5, 0.75, etc.)
- [ ] Currency selector works
- [ ] All toggles functional
- [ ] Validation working correctly

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:** Some columns may already exist. Run this before migration:
```sql
-- Drop existing columns if needed
ALTER TABLE school_locations
DROP COLUMN IF EXISTS check_in_start,
DROP COLUMN IF EXISTS check_in_end;
-- etc...
```

### Issue: Frontend component not loading

**Solution:**
1. Check browser console for errors
2. Ensure AttendanceConfigTab.tsx is in correct location
3. Restart frontend dev server: `npm run dev`

### Issue: API returns 404

**Solution:**
1. Verify route registered in backend/src/index.js
2. Check backend server is running: `lsof -i:34567`
3. Restart backend: `pm2 restart elite` or `npm start`

### Issue: Decimal hours not saving

**Solution:**
1. Verify DECIMAL columns in database: `DESCRIBE school_locations;`
2. Check API payload in Network tab
3. Ensure InputNumber step=0.01 in frontend

## File Locations Summary

```
Backend:
  backend/src/controllers/attendanceConfigController.js
  backend/src/routes/attendanceConfig.js
  backend/src/index.js (route registration on line 284)

Frontend:
  frontend/src/feature-module/hrm/attendance/AttendanceConfigTab.tsx
  frontend/src/feature-module/hrm/attendance/StaffAttendanceOverview.tsx

Database:
  BRANCH_ATTENDANCE_CONFIG_MIGRATION.sql
  STAFF_ATTENDANCE_CONFIG_MIGRATION.sql (reference file)

Documentation:
  STAFF_ATTENDANCE_CONFIG_IMPLEMENTATION_GUIDE.md (this file)
```

## API Response Examples

**GET /api/attendance-config Success:**
```json
{
  "success": true,
  "message": "Configuration retrieved successfully",
  "data": {
    "school_id": "SCH/18",
    "branch_id": "BR001",
    "branch_name": "Main Campus",
    "check_in_start": "08:00:00",
    "check_in_end": "09:00:00",
    "check_out_start": "13:00:00",
    "check_out_end": "17:00:00",
    "standard_hours_per_day": "8.00",
    "standard_hours_per_week": "40.00",
    "late_grace_period": 15,
    "early_departure_grace": 15,
    "enable_overtime": 1,
    "overtime_rate_per_hour": "500.00",
    "overtime_currency": "NGN",
    "overtime_calculation_method": "daily",
    "enable_late_penalty": 1,
    "late_penalty_per_hour": "200.00",
    "late_penalty_currency": "NGN",
    "late_penalty_method": "deduction",
    "enable_absence_penalty": 1,
    "absence_penalty_per_day": "1000.00",
    "absence_penalty_currency": "NGN",
    "half_day_threshold_hours": "4.00",
    "half_day_penalty": "500.00",
    "round_overtime_to": "nearest_15min",
    "minimum_overtime_hours": "0.25",
    "auto_calculate_penalties": 1
  }
}
```

**PUT /api/attendance-config Success:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    // Updated configuration object
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "school_id and branch_id are required",
  "error": null,
  "statusCode": 400
}
```

## Support

For issues or questions:
1. Check this guide first
2. Review browser/server console logs
3. Verify database schema matches migration
4. Test API endpoints with curl/Postman
5. Check Redux state in browser DevTools

## Version History

**v1.0.0** (2025-12-03)
- Initial implementation
- Database migration with 25+ config fields
- Backend API with CRUD endpoints
- Frontend configuration component
- Decimal hour support
- Multi-currency support
- Comprehensive documentation
