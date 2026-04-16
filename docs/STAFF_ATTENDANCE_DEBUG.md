# Staff Attendance Dummy Data Debug Guide

## 🔍 ISSUE

The staff-attendance page at `http://localhost:3000/hrm/staff-attendance` is showing dummy data instead of real API data.

---

## ✅ CODE VERIFICATION

### The Component IS Using API Data

The component is correctly configured to use API data:

```typescript
// State for API data
const [staffData, setStaffData] = useState<any[]>([]);
const [attendanceData, setAttendanceData] = useState<any[]>([]);

// Fetch from API
const fetchStaff = () => {
  _get(
    `teachers?query_type=select-all&branch_id=...&school_id=...`,
    (res) => {
      setStaffData(res.data);
    }
  );
};

// Table uses API data
<Table dataSource={staffData} columns={columns} />
```

**The component is NOT using dummy data!**

---

## 🐛 POSSIBLE CAUSES

### 1. No Branch Selected ⚠️

**Check**: Is a branch selected in the system?

```typescript
if (!selected_branch) {
  console.warn('No branch selected, cannot fetch staff');
  return;
}
```

**Solution**: Select a branch from the branch selector

---

### 2. API Not Returning Data ⚠️

**Check**: Is the API endpoint working?

```bash
# Test the API directly
curl "http://localhost:34567/teachers?query_type=select-all&branch_id=1&school_id=1"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "teacher_id": "TCH001",
      "full_name": "John Doe",
      "department": "Science",
      "designation": "Teacher"
    }
  ]
}
```

---

### 3. Empty Database ⚠️

**Check**: Are there teachers in the database?

```sql
SELECT * FROM teachers WHERE is_deleted != 1 LIMIT 10;
```

**Solution**: Add teachers to the database

---

### 4. Authentication Issue ⚠️

**Check**: Is the user authenticated?

```typescript
const { selected_branch, user } = useSelector((state: RootState) => state.auth);
```

**Solution**: Ensure user is logged in and has a selected branch

---

## 🔧 DEBUGGING STEPS

### Step 1: Check Console Logs

I've added console logging to the component. Open browser DevTools (F12) and check the Console tab:

```javascript
// You should see:
"Fetching staff for branch: {branch_id: 1, school_id: 1, ...}"
"API URL: teachers?query_type=select-all&branch_id=1&school_id=1"
"Staff API Response: {success: true, data: [...]}"
"Active staff count: 5"
```

**If you see**:
- `"No branch selected"` → Select a branch
- `"Invalid response"` → Check API
- `"Error fetching staff"` → Check network/API

---

### Step 2: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for request to `teachers?query_type=select-all`

**Check**:
- ✅ Request sent?
- ✅ Status 200?
- ✅ Response has data?

---

### Step 3: Check Redux State

1. Install Redux DevTools extension
2. Open DevTools
3. Go to Redux tab
4. Check `state.auth.selected_branch`

**Should see**:
```json
{
  "branch_id": 1,
  "school_id": 1,
  "branch_name": "Main Branch"
}
```

**If null**: Select a branch from the UI

---

### Step 4: Check API Response

Look at the Network tab response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "teacher_id": "TCH001",
      "full_name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "department": "Science",
      "designation": "Teacher",
      "profile_picture": "...",
      "is_deleted": 0
    }
  ]
}
```

**If empty array**: No teachers in database

---

## 🎯 COMMON ISSUES & SOLUTIONS

### Issue 1: "No branch selected"

**Cause**: User hasn't selected a branch

**Solution**:
1. Look for branch selector in the UI
2. Select a branch
3. Page should reload with data

---

### Issue 2: Empty Response

**Cause**: No teachers in database for selected branch

**Solution**:
```sql
-- Add a test teacher
INSERT INTO teachers (teacher_id, full_name, school_id, branch_id, department, designation)
VALUES ('TCH001', 'Test Teacher', 1, 1, 'Science', 'Teacher');
```

---

### Issue 3: API Error

**Cause**: Backend not running or API endpoint broken

**Solution**:
1. Check backend is running: `http://localhost:34567`
2. Check API endpoint: `http://localhost:34567/teachers?query_type=select-all&school_id=1&branch_id=1`
3. Check backend logs for errors

---

### Issue 4: Authentication Error

**Cause**: User not logged in or session expired

**Solution**:
1. Log out
2. Log back in
3. Select branch
4. Navigate to staff attendance

---

## 📊 VERIFICATION CHECKLIST

### Frontend
- ✅ Component uses `staffData` state (not dummy data)
- ✅ `fetchStaff()` calls API
- ✅ `useEffect` triggers on mount
- ✅ Table uses `dataSource={staffData}`

### Backend
- ⚠️ API endpoint exists: `/teachers`
- ⚠️ Query parameter supported: `query_type=select-all`
- ⚠️ Returns data in correct format
- ⚠️ Filters by `school_id` and `branch_id`

### Database
- ⚠️ Teachers table has data
- ⚠️ Teachers not soft-deleted (`is_deleted != 1`)
- ⚠️ Teachers belong to selected branch

### Authentication
- ⚠️ User logged in
- ⚠️ Branch selected
- ⚠️ Session valid

---

## 🧪 TESTING

### Test 1: Console Logs

**Open Console** (F12 → Console)

**Expected**:
```
Fetching staff for branch: {branch_id: 1, ...}
API URL: teachers?query_type=select-all&branch_id=1&school_id=1
Staff API Response: {success: true, data: [...]}
Active staff count: 5
```

**If you see**: `"No branch selected"` → **Select a branch**

---

### Test 2: Network Request

**Open Network Tab** (F12 → Network)

**Expected**:
- Request to `teachers?query_type=select-all`
- Status: 200
- Response: `{success: true, data: [...]}`

**If no request**: Branch not selected or component not mounted

---

### Test 3: API Direct Test

**Test API directly**:
```bash
curl "http://localhost:34567/teachers?query_type=select-all&school_id=1&branch_id=1"
```

**Expected**:
```json
{
  "success": true,
  "data": [...]
}
```

**If error**: Backend issue

---

## 🎉 SUMMARY

### The Component is Correct ✅

The staff-attendance component:
- ✅ Uses API data (not dummy data)
- ✅ Fetches from `/teachers` endpoint
- ✅ Displays data in table
- ✅ Has proper error handling

### Likely Causes ⚠️

1. **No branch selected** (most common)
2. **Empty database** (no teachers)
3. **API not working** (backend issue)
4. **Not authenticated** (session issue)

### Next Steps

1. **Open browser console** (F12)
2. **Check console logs** (see what's happening)
3. **Check network tab** (see API requests)
4. **Select a branch** (if not selected)
5. **Check API response** (verify data exists)

---

**The component is using API data. The issue is likely with the API response or branch selection.**

---

## 🚀 Quick Fix

### If No Branch Selected:
1. Look for branch selector dropdown
2. Select a branch
3. Page should load data

### If API Returns Empty:
1. Check database has teachers
2. Check teachers belong to selected branch
3. Check teachers not soft-deleted

### If API Error:
1. Check backend is running
2. Check API endpoint works
3. Check backend logs

---

**Check the browser console for detailed logs!**
