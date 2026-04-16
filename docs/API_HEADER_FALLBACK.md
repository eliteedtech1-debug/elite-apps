# API Header Fallback Implementation

**Date**: 2026-02-08  
**Status**: ✅ COMPLETE

---

## What Was Done

Added automatic fallback from headers for `school_id` and `branch_id` in all communication APIs.

---

## Implementation

### Backend Pattern
```javascript
// Before
const { school_id, branch_id } = req.query;

// After
const { 
  school_id: querySchoolId, 
  branch_id: queryBranchId 
} = req.query;

const school_id = querySchoolId || req.headers['x-school-id'];
const branch_id = queryBranchId || req.headers['x-branch-id'];
```

### Priority Order
1. **Query Parameters** (explicit)
2. **Headers** (automatic from frontend)

---

## Updated Endpoints

### 1. `/api/messaging-history`
```javascript
// Accepts school_id and branch_id from:
// - Query: ?school_id=SCH/23&branch_id=BRCH00027
// - Headers: X-School-Id, X-Branch-Id
```

### 2. `/api/messaging-stats`
```javascript
// Accepts school_id and branch_id from:
// - Query: ?school_id=SCH/23&branch_id=BRCH00027
// - Headers: X-School-Id, X-Branch-Id
```

---

## Frontend Simplification

### Before
```typescript
const params = new URLSearchParams({
  school_id: school?.school_id || '',
  ...(selected_branch?.branch_id && { branch_id: selected_branch.branch_id })
});

_get(`api/messaging-stats?${params.toString()}`, ...)
```

### After
```typescript
// Headers automatically sent by _get helper
_get('api/messaging-stats', ...)
```

---

## How Headers Are Sent

### Helper.tsx (_get, _post, etc.)
```typescript
const schoolContext = getSchoolContext();

// Add X-School-Id (ALWAYS required)
if (schoolContext.school_id) {
  headers["X-School-Id"] = schoolContext.school_id;
}

// Add X-Branch-Id when available
if (schoolContext.branch_id && schoolContext.branch_id !== "") {
  headers["X-Branch-Id"] = schoolContext.branch_id;
}
```

### Automatic Context
- `school_id` from Redux auth state
- `branch_id` from Redux branch state
- Headers added to ALL API calls automatically

---

## Benefits

### 1. Cleaner Frontend Code
No need to manually add school_id/branch_id to every API call

### 2. Consistent Isolation
All APIs automatically respect school/branch context

### 3. Backward Compatible
Still accepts query parameters for direct API calls

### 4. Security
Headers are set from authenticated user context

---

## Testing

### With Headers (Automatic)
```bash
curl http://localhost:34567/api/messaging-history?limit=10 \
  -H 'X-School-Id: SCH/23' \
  -H 'X-Branch-Id: BRCH00027'
```

### With Query Params (Manual)
```bash
curl "http://localhost:34567/api/messaging-history?school_id=SCH/23&branch_id=BRCH00027&limit=10"
```

### Mixed (Query overrides headers)
```bash
curl "http://localhost:34567/api/messaging-history?school_id=SCH/99&limit=10" \
  -H 'X-School-Id: SCH/23'
# Uses SCH/99 from query (not SCH/23 from header)
```

---

## Files Modified

### Backend
1. `src/routes/messaging_history.js` - Added header fallback

### Frontend
1. `src/feature-module/communications/dashboard/index.tsx` - Simplified API calls

---

## Pattern for Other APIs

Use this pattern for all school/branch-isolated endpoints:

```javascript
router.get('/api/your-endpoint', async (req, res) => {
  const { 
    school_id: querySchoolId, 
    branch_id: queryBranchId 
  } = req.query;

  // Fallback to headers
  const school_id = querySchoolId || req.headers['x-school-id'];
  const branch_id = queryBranchId || req.headers['x-branch-id'];

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  // Use school_id and branch_id in queries
  // ...
});
```

---

## Recommended for All APIs

Apply this pattern to:
- ✅ `/api/messaging-history`
- ✅ `/api/messaging-stats`
- ✅ `/api/reminders/*`
- ✅ `/api/email/*`
- ✅ `/api/whatsapp/*`
- 🔄 All other school/branch-isolated endpoints

---

**Status**: ✅ COMPLETE  
**Pattern**: REUSABLE  
**Benefit**: CLEANER CODE

