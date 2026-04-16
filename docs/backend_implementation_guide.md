# Backend Implementation Guide - Backdated Attendance Settings

## Overview
This guide explains how to implement the backend API endpoint for updating backdated attendance settings in the `school_setup` table.

---

## API Endpoint Required

### **POST /api/school-setup**

**Purpose**: Update backdated attendance settings for a school branch

**Request Method**: `POST`

**Request Payload**:
```json
{
  "query_type": "update-attendance-settings",
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "allow_backdated_attendance": 1,
  "backdated_days": 42
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "Attendance settings updated successfully"
}
```

---

## Backend Implementation Examples

### **Option 1: PHP (Laravel/Plain PHP)**

```php
<?php
// In your SchoolSetupController.php or similar

public function updateSchoolSetup(Request $request) {
    $queryType = $request->input('query_type');

    if ($queryType === 'update-attendance-settings') {
        return $this->updateAttendanceSettings($request);
    }

    // ... other query types
}

private function updateAttendanceSettings(Request $request) {
    // Validate input
    $validator = Validator::make($request->all(), [
        'school_id' => 'required|string',
        'branch_id' => 'required|string',
        'allow_backdated_attendance' => 'required|integer|in:0,1',
        'backdated_days' => 'required|integer|min:1|max:365'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 400);
    }

    $schoolId = $request->input('school_id');
    $branchId = $request->input('branch_id');
    $allowBackdated = $request->input('allow_backdated_attendance');
    $backdatedDays = $request->input('backdated_days');

    try {
        // Update the school_setup table
        $updated = DB::table('school_setup')
            ->where('school_id', $schoolId)
            ->where('branch_id', $branchId)
            ->update([
                'allow_backdated_attendance' => $allowBackdated,
                'backdated_days' => $backdatedDays,
                'updated_at' => now()
            ]);

        if ($updated) {
            // Log the change for audit purposes (optional)
            Log::info('Attendance settings updated', [
                'school_id' => $schoolId,
                'branch_id' => $branchId,
                'allow_backdated_attendance' => $allowBackdated,
                'backdated_days' => $backdatedDays,
                'updated_by' => auth()->user()->id ?? 'system'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Attendance settings updated successfully'
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'No records were updated. Please check school_id and branch_id.'
            ], 404);
        }
    } catch (Exception $e) {
        Log::error('Error updating attendance settings', [
            'error' => $e->getMessage(),
            'school_id' => $schoolId,
            'branch_id' => $branchId
        ]);

        return response()->json([
            'success' => false,
            'message' => 'An error occurred while updating settings'
        ], 500);
    }
}
```

---

### **Option 2: Node.js (Express)**

```javascript
// In your school-setup routes or controller

const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Your DB connection

router.post('/school-setup', async (req, res) => {
    const { query_type } = req.body;

    if (query_type === 'update-attendance-settings') {
        return updateAttendanceSettings(req, res);
    }

    // ... other query types
});

async function updateAttendanceSettings(req, res) {
    const {
        school_id,
        branch_id,
        allow_backdated_attendance,
        backdated_days
    } = req.body;

    // Validation
    if (!school_id || !branch_id) {
        return res.status(400).json({
            success: false,
            message: 'school_id and branch_id are required'
        });
    }

    if (typeof allow_backdated_attendance !== 'number' || ![0, 1].includes(allow_backdated_attendance)) {
        return res.status(400).json({
            success: false,
            message: 'allow_backdated_attendance must be 0 or 1'
        });
    }

    if (!backdated_days || backdated_days < 1 || backdated_days > 365) {
        return res.status(400).json({
            success: false,
            message: 'backdated_days must be between 1 and 365'
        });
    }

    try {
        const query = `
            UPDATE school_setup
            SET allow_backdated_attendance = ?,
                backdated_days = ?,
                updated_at = NOW()
            WHERE school_id = ?
            AND branch_id = ?
        `;

        const [result] = await db.execute(query, [
            allow_backdated_attendance,
            backdated_days,
            school_id,
            branch_id
        ]);

        if (result.affectedRows > 0) {
            // Log for audit (optional)
            console.log('Attendance settings updated:', {
                school_id,
                branch_id,
                allow_backdated_attendance,
                backdated_days,
                updated_by: req.user?.id || 'system'
            });

            return res.json({
                success: true,
                message: 'Attendance settings updated successfully'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'No records were updated. Please check school_id and branch_id.'
            });
        }
    } catch (error) {
        console.error('Error updating attendance settings:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating settings'
        });
    }
}

module.exports = router;
```

---

### **Option 3: Python (Flask/Django)**

```python
# Flask example
from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

school_setup_bp = Blueprint('school_setup', __name__)

@school_setup_bp.route('/school-setup', methods=['POST'])
def update_school_setup():
    data = request.get_json()
    query_type = data.get('query_type')

    if query_type == 'update-attendance-settings':
        return update_attendance_settings(data)

    # ... other query types

def update_attendance_settings(data):
    school_id = data.get('school_id')
    branch_id = data.get('branch_id')
    allow_backdated = data.get('allow_backdated_attendance')
    backdated_days = data.get('backdated_days')

    # Validation
    if not school_id or not branch_id:
        return jsonify({
            'success': False,
            'message': 'school_id and branch_id are required'
        }), 400

    if allow_backdated not in [0, 1]:
        return jsonify({
            'success': False,
            'message': 'allow_backdated_attendance must be 0 or 1'
        }), 400

    if not backdated_days or backdated_days < 1 or backdated_days > 365:
        return jsonify({
            'success': False,
            'message': 'backdated_days must be between 1 and 365'
        }), 400

    try:
        from your_app import db  # Your database connection

        query = """
            UPDATE school_setup
            SET allow_backdated_attendance = %s,
                backdated_days = %s,
                updated_at = NOW()
            WHERE school_id = %s
            AND branch_id = %s
        """

        cursor = db.cursor()
        cursor.execute(query, (
            allow_backdated,
            backdated_days,
            school_id,
            branch_id
        ))
        db.commit()

        if cursor.rowcount > 0:
            # Log for audit (optional)
            logging.info(f'Attendance settings updated: {school_id}/{branch_id}')

            return jsonify({
                'success': True,
                'message': 'Attendance settings updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No records were updated'
            }), 404

    except Exception as e:
        logging.error(f'Error updating attendance settings: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating settings'
        }), 500
```

---

## Security Considerations

### **1. Authentication & Authorization**
```php
// Ensure only admins can update settings
if (!auth()->user()->hasRole('admin')) {
    return response()->json([
        'success' => false,
        'message' => 'Unauthorized. Only administrators can update attendance settings.'
    ], 403);
}
```

### **2. Input Validation**
- ✅ Validate `school_id` exists in database
- ✅ Validate `branch_id` belongs to `school_id`
- ✅ Validate `allow_backdated_attendance` is 0 or 1
- ✅ Validate `backdated_days` is between 1 and 365

### **3. Audit Logging**
```php
// Log all changes for compliance
DB::table('audit_logs')->insert([
    'action' => 'update_attendance_settings',
    'user_id' => auth()->user()->id,
    'school_id' => $schoolId,
    'branch_id' => $branchId,
    'old_value' => json_encode($oldSettings),
    'new_value' => json_encode($newSettings),
    'ip_address' => request()->ip(),
    'created_at' => now()
]);
```

---

## Testing the Endpoint

### **Using cURL:**
```bash
curl -X POST http://localhost/api/school-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query_type": "update-attendance-settings",
    "school_id": "SCH/1",
    "branch_id": "BRCH00001",
    "allow_backdated_attendance": 1,
    "backdated_days": 42
  }'
```

### **Using Postman:**
1. **Method**: POST
2. **URL**: `http://localhost/api/school-setup`
3. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN`
4. **Body** (raw JSON):
```json
{
  "query_type": "update-attendance-settings",
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "allow_backdated_attendance": 1,
  "backdated_days": 42
}
```

---

## Database Query Examples

### **Check current settings:**
```sql
SELECT
    school_id,
    branch_id,
    school_name,
    allow_backdated_attendance,
    backdated_days,
    CASE
        WHEN allow_backdated_attendance = 1
        THEN CONCAT('Enabled (', backdated_days, ' days)')
        ELSE 'Disabled'
    END AS status
FROM school_setup
WHERE school_id = 'SCH/1' AND branch_id = 'BRCH00001';
```

### **Manually update settings:**
```sql
UPDATE school_setup
SET
    allow_backdated_attendance = 1,
    backdated_days = 42,
    updated_at = NOW()
WHERE school_id = 'SCH/1' AND branch_id = 'BRCH00001';
```

---

## Common Use Cases

| Scenario | `backdated_days` | Description |
|----------|------------------|-------------|
| Strict policy | 0 (disabled) | Only today allowed |
| Flexible (1 week) | 7 | Common for corrections |
| Catching up | 42 | 6 weeks for backlog |
| Term entry | 90 | 3 months for term data |
| Historical | 180 | 6 months for old records |
| Maximum | 365 | 1 year (use cautiously) |

---

## Error Handling

### **Possible Errors:**

1. **Missing parameters**:
```json
{
  "success": false,
  "message": "school_id and branch_id are required"
}
```

2. **Invalid days range**:
```json
{
  "success": false,
  "message": "backdated_days must be between 1 and 365"
}
```

3. **Record not found**:
```json
{
  "success": false,
  "message": "No records were updated. Please check school_id and branch_id."
}
```

4. **Database error**:
```json
{
  "success": false,
  "message": "An error occurred while updating settings"
}
```

---

## Summary

This implementation provides:
- ✅ Secure endpoint with validation
- ✅ Support for 1-365 days range
- ✅ Proper error handling
- ✅ Audit logging capability
- ✅ Multiple language examples
- ✅ Testing instructions

Choose the implementation that matches your backend stack and customize as needed!
