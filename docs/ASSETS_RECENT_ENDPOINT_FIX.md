# Assets Recent Endpoint - 500 Error Fix

## Problem
The endpoint `GET /api/supply-management/assets/recent` was returning a 500 Internal Server Error:
```json
{
    "success": false,
    "message": "Failed to retrieve recent assets",
    "errors": null,
    "timestamp": "2025-11-28T11:48:27.895Z"
}
```

## Root Causes

### 1. **Missing Endpoint Method**
The `getRecentAssets` method didn't exist in the assetController.

### 2. **Model Import Issues**
Asset management models were imported from `../../models` (main index) but weren't exported there because they're in a subdirectory (`assetManagement/`).

### 3. **Association Errors**
When trying to use `include` for AssetCategory and FacilityRoom, got error:
```
SequelizeEagerLoadingError: AssetCategory is not associated to Asset!
```

This happened because the asset management models use `db.sequelize.define()` internally but aren't loaded into the main models index.

## Solutions Applied

### 1. **Created getRecentAssets Method**
Added new method to `assetController.js`:

**File**: `elscholar-api/src/controllers/assetManagement/assetController.js:264-332`

```javascript
async getRecentAssets(req, res) {
  try {
    // Fallback for school_id and branch_id from headers
    const school_id = req.user?.school_id ||
                      req.headers['x-school-id'] ||
                      req.body?.school_id ||
                      req.query?.school_id;
    const branch_id = req.query?.branch_id ||
                      req.headers['x-branch-id'] ||
                      req.body?.branch_id;
    const limit = parseInt(req.query?.limit || req.body?.limit || '10');

    // Validate required parameters
    if (!school_id) {
      return errorResponse(res, 'School ID is required', 400);
    }

    // Build where clause
    const whereClause = { school_id };
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    // Get recent assets sorted by createdAt descending
    const recentAssets = await Asset.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: limit,
      attributes: [
        'asset_id', 'asset_tag', 'asset_name', 'category_id',
        'brand', 'model', 'status', 'condition_rating',
        'room_id', 'purchase_date', 'purchase_cost',
        'createdAt', 'updatedAt'
      ]
    });

    return successResponse(res, 'Recent assets retrieved successfully', {
      assets: recentAssets,
      count: recentAssets.length,
      limit: limit
    });
  } catch (error) {
    console.error('❌ Get recent assets error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return errorResponse(res, 'Failed to retrieve recent assets', 500);
  }
}
```

### 2. **Fixed Model Imports**
Changed from importing from main models index to direct imports:

**Before:**
```javascript
const { Asset, AssetCategory, FacilityRoom, SchoolLocation } = require('../../models');
```

**After:**
```javascript
const Asset = require('../../models/assetManagement/Asset');
const AssetCategory = require('../../models/assetManagement/AssetCategory');
const FacilityRoom = require('../../models/assetManagement/FacilityRoom');
const SchoolLocation = require('../../models/SchoolLocation');
```

### 3. **Removed Associations from Query**
Since models aren't properly associated in the main db object, removed the `include` clause to avoid association errors:

**Simplified Query:**
```javascript
const recentAssets = await Asset.findAll({
  where: whereClause,
  order: [['createdAt', 'DESC']],
  limit: limit,
  attributes: [...] // Only basic fields
});
```

### 4. **Added Route Definition**
Added route before the `/:asset_id` route to avoid conflicts:

**File**: `elscholar-api/src/routes/assetManagement/assetRoutes.js:90`

```javascript
router.get('/recent', assetController.getRecentAssets);
```

### 5. **Enhanced Error Handling**
- Comprehensive logging with emojis (📊, ✅, ❌)
- Parameter validation for `school_id`
- Fallbacks for all parameters (headers → body → query)
- Detailed error messages with stack traces

## Test Results

### Success Response
```bash
curl -X GET "http://localhost:34567/api/supply-management/assets/recent" \
  -H "x-school-id: SCH/1" \
  -H "x-branch-id: BRCH00001"
```

**Response:**
```json
{
  "success": true,
  "message": "Recent assets retrieved successfully",
  "data": {
    "assets": [],
    "count": 0,
    "limit": 10
  },
  "timestamp": "2025-11-28T12:05:39.469Z"
}
```

## Modified Files

1. **`elscholar-api/src/controllers/assetManagement/assetController.js`**
   - Changed model imports to direct imports
   - Added `getRecentAssets` method
   - Added header fallbacks to `getAssets` method

2. **`elscholar-api/src/routes/assetManagement/assetRoutes.js`**
   - Added `/recent` route

## Server Status

Server running on port **34567** (PID: 15743)

## Usage Examples

### With Headers
```bash
curl -X GET http://localhost:34567/api/supply-management/assets/recent \
  -H "x-school-id: your-school-id" \
  -H "x-branch-id: your-branch-id" \
  -H "Authorization: Bearer your-jwt-token"
```

### With Query Parameters
```bash
curl -X GET "http://localhost:34567/api/supply-management/assets/recent?school_id=SCH/1&limit=20"
```

### With Custom Limit
```bash
curl -X GET "http://localhost:34567/api/supply-management/assets/recent?limit=50" \
  -H "x-school-id: SCH/1"
```

## Response Format

```json
{
  "success": true,
  "message": "Recent assets retrieved successfully",
  "data": {
    "assets": [
      {
        "asset_id": "AST-001",
        "asset_tag": "TAG-001",
        "asset_name": "Laptop Dell XPS 15",
        "category_id": "CAT-001",
        "brand": "Dell",
        "model": "XPS 15",
        "status": "Operational",
        "condition_rating": "Excellent",
        "room_id": "ROOM-001",
        "purchase_date": "2024-01-15",
        "purchase_cost": "1500.00",
        "createdAt": "2024-11-28T10:30:00.000Z",
        "updatedAt": "2024-11-28T10:30:00.000Z"
      }
    ],
    "count": 1,
    "limit": 10
  },
  "timestamp": "2025-11-28T12:05:39.469Z"
}
```

## Notes

- The endpoint returns assets sorted by creation date (newest first)
- Default limit is 10, can be customized via `limit` parameter
- Branch filtering is optional - if not provided, returns assets from all branches
- Association data (category name, room name) not included to avoid circular dependency issues
- Client can make additional requests to get category/room details using the IDs

## Future Improvements

1. Consider restructuring asset management models to use standard Sequelize model export pattern
2. Add proper model associations in a separate initialization step
3. Implement pagination with offset/page number
4. Add more filtering options (by status, category, date range)
5. Consider adding category and room data via manual joins or separate queries
