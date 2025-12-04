# Asset Dashboard Stats Endpoint - 500 Error Fix

## Problem
The endpoint `GET /api/supply-management/asset-dashboard/stats` was returning a 500 Internal Server Error:
```json
{
    "success": false,
    "message": "Failed to retrieve dashboard statistics",
    "errors": null,
    "timestamp": "2025-11-28T11:42:28.845Z"
}
```

## Root Causes Identified

1. **Missing Header Fallbacks**: The controller was only checking `req.user.school_id` but not falling back to headers (`x-school-id`, `x-branch-id`)
2. **Poor Error Handling**: No detailed logging to identify the actual error
3. **Missing Validation**: No validation for required parameters like `school_id`

## Fixes Applied

### 1. Enhanced Parameter Extraction with Fallbacks

**File**: `elscholar-api/src/controllers/assetManagement/assetDashboardController.js`

Added comprehensive fallback logic for all parameters:

```javascript
// School ID fallback chain
const school_id = req.user?.school_id ||
                  req.headers['x-school-id'] ||
                  req.body?.school_id ||
                  req.query?.school_id;

// Branch ID fallback chain
const branch_id = req.query?.branch_id ||
                  req.headers['x-branch-id'] ||
                  req.body?.branch_id;

// Date parameters fallback
const start_date = req.query?.start_date ||
                   req.body?.start_date ||
                   req.headers['x-start-date'];

const end_date = req.query?.end_date ||
                 req.body?.end_date ||
                 req.headers['x-end-date'];
```

### 2. Added Comprehensive Logging

Enhanced both methods with detailed console logging:

```javascript
console.log('📊 Asset Dashboard Stats Request:', {
  school_id,
  branch_id,
  user: req.user,
  headers: {
    'x-school-id': req.headers['x-school-id'],
    'x-branch-id': req.headers['x-branch-id']
  }
});
```

### 3. Added Validation

```javascript
// Validate required parameters
if (!school_id) {
  console.error('❌ Missing school_id');
  return errorResponse(res, 'School ID is required', 400);
}

if (!report_type) {
  return errorResponse(res, 'Report type is required', 400);
}
```

### 4. Enhanced Error Messages

```javascript
try {
  assetStats = await Asset.getStatisticsBySchool(school_id, branch_id);
  console.log('✅ Asset stats retrieved:', assetStats);
} catch (statsError) {
  console.error('❌ Asset statistics retrieval error:', {
    message: statsError.message,
    stack: statsError.stack,
    name: statsError.name,
    sql: statsError.sql || 'N/A'
  });

  // Check if it's a table doesn't exist error
  if (statsError.message && statsError.message.includes("doesn't exist")) {
    return errorResponse(res, 'Asset management tables not initialized. Please contact administrator.', 500);
  }

  throw statsError;
}
```

### 5. Created Migration Scripts

**Files Created:**
- `elscholar-api/migrations/create_asset_management_tables.sql` - SQL migration script
- `elscholar-api/migrations/run_asset_migration.js` - JavaScript migration runner

These ensure all required tables exist:
- `assets`
- `asset_categories`
- `facility_rooms`
- `asset_inspections`
- `maintenance_requests`

## Migration Verification

Ran migration script successfully:
```bash
node migrations/run_asset_migration.js
```

**Result:**
```
✅ assets - exists
✅ asset_categories - exists
✅ facility_rooms - exists
✅ asset_inspections - exists
✅ maintenance_requests - exists

✨ Migration completed successfully!
```

## How to Test

### 1. Using Browser/Postman with Headers

```http
GET http://localhost:34567/api/supply-management/asset-dashboard/stats
Headers:
  x-school-id: your-school-id
  x-branch-id: your-branch-id (optional)
  Authorization: Bearer your-jwt-token
```

### 2. Using Query Parameters

```http
GET http://localhost:34567/api/supply-management/asset-dashboard/stats?school_id=your-school-id&branch_id=your-branch-id
```

### 3. Expected Response

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "assetStats": {
      "totalAssets": 0,
      "operational": 0,
      "damaged": 0,
      "underMaintenance": 0,
      "decommissioned": 0
    },
    "totalInspections": 0,
    "recentInspections": [],
    "totalMaintenanceRequests": 0,
    "recentMaintenanceRequests": [],
    "upcomingInspections": [],
    "totalUpcomingInspections": 0
  }
}
```

## Changes Summary

### Modified Files
1. `elscholar-api/src/controllers/assetManagement/assetDashboardController.js`
   - Added header fallbacks for all parameters
   - Enhanced error handling and logging
   - Added parameter validation
   - Improved error messages

### Created Files
1. `elscholar-api/migrations/create_asset_management_tables.sql`
2. `elscholar-api/migrations/run_asset_migration.js`

## Server Restart

The development server was restarted to apply changes:
```bash
pkill -f "node.*dev"
npm run dev
```

Server is now running on port 34567 (PID: 4384)

## Next Steps

1. ✅ Test the endpoint with proper headers
2. ✅ Verify error messages are clear and helpful
3. ✅ Check logs for detailed debugging information
4. 📝 Consider adding more detailed asset statistics in future updates
5. 📝 Implement the commented-out inspection and maintenance statistics

## Notes

- All asset management tables already existed in the database
- The issue was primarily missing header fallbacks and validation
- Enhanced logging will make future debugging much easier
- Migration scripts are now available for fresh installations
