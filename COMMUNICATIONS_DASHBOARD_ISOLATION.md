# Communications Dashboard - School/Branch Isolation

**Date**: 2026-02-08  
**Status**: ✅ IMPLEMENTED

---

## Changes Made

### Backend API Updates

#### 1. `/api/messaging-history`
**Added**: `branch_id` query parameter (optional)

**Before**:
```javascript
WHERE school_id = ?
```

**After**:
```javascript
WHERE school_id = ?
AND branch_id = ? // if branch_id provided
```

**Usage**:
```bash
GET /api/messaging-history?school_id=SCH/23&branch_id=BRCH00027&limit=10
```

#### 2. `/api/messaging-stats`
**Added**: `branch_id` query parameter (optional)

**Filters Applied**:
- Daily stats
- Weekly stats
- Monthly stats
- Yearly stats

**Usage**:
```bash
GET /api/messaging-stats?school_id=SCH/23&branch_id=BRCH00027&period=monthly
```

---

### Frontend Updates

#### `/communications/dashboard`

**Added**:
1. `selected_branch` from Redux store
2. Branch ID in API calls
3. Re-fetch on branch change

**Before**:
```typescript
useEffect(() => {
  fetchDashboardData();
}, [school?.school_id]);

_get(`api/messaging-stats?school_id=${school?.school_id}`, ...)
```

**After**:
```typescript
const { selected_branch } = useSelector((state: any) => state.branch);

useEffect(() => {
  fetchDashboardData();
}, [school?.school_id, selected_branch?.branch_id]);

const params = new URLSearchParams({
  school_id: school?.school_id || '',
  ...(selected_branch?.branch_id && { branch_id: selected_branch.branch_id })
});

_get(`api/messaging-stats?${params.toString()}`, ...)
```

---

## How It Works

### School-Only View
If no branch is selected, shows all messages for the school:
```
GET /api/messaging-history?school_id=SCH/23
→ Returns all messages for SCH/23 (all branches)
```

### Branch-Specific View
If branch is selected, shows only that branch's messages:
```
GET /api/messaging-history?school_id=SCH/23&branch_id=BRCH00027
→ Returns only messages for BRCH00027
```

---

## Data Isolation

### What's Filtered
✅ **Messaging History** - Recent messages list  
✅ **Message Stats** - Total counts, sent/failed  
✅ **Daily Stats** - Messages per day  
✅ **Weekly Stats** - Messages per week  
✅ **Monthly Stats** - Messages per month  
✅ **Yearly Stats** - Messages per year  

### What's Included
- WhatsApp messages
- Email messages
- SMS messages (if implemented)
- Payment reminders
- Bulk sends

---

## Testing

### Test School-Only View
```bash
curl "http://localhost:34567/api/messaging-history?school_id=SCH/23&limit=5"
```

### Test Branch-Specific View
```bash
curl "http://localhost:34567/api/messaging-history?school_id=SCH/23&branch_id=BRCH00027&limit=5"
```

### Test Stats
```bash
curl "http://localhost:34567/api/messaging-stats?school_id=SCH/23&branch_id=BRCH00027&period=monthly"
```

---

## UI Behavior

### Branch Selector
When user changes branch in the UI:
1. Dashboard re-fetches data
2. Only shows messages for selected branch
3. Stats update to reflect branch data

### Multi-Branch Schools
- Superadmin/Principal: Can see all branches
- Branch Manager: Only sees their branch
- Teacher: Only sees their branch

---

## Database Schema

### messaging_history Table
```sql
CREATE TABLE messaging_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),  -- ← Branch isolation
  sender_id VARCHAR(50),
  recipient_id VARCHAR(50),
  channel ENUM('whatsapp', 'email', 'sms'),
  message_text TEXT,
  status ENUM('sent', 'failed'),
  cost DECIMAL(10,2),
  created_at DATETIME,
  INDEX idx_school_branch (school_id, branch_id)
);
```

---

## Files Modified

### Backend
1. `src/routes/messaging_history.js` - Added branch_id filtering

### Frontend
1. `src/feature-module/communications/dashboard/index.tsx` - Added branch context

---

## Security Notes

✅ **School Isolation**: All queries require `school_id`  
✅ **Branch Isolation**: Optional `branch_id` for multi-branch schools  
✅ **User Context**: Frontend uses Redux auth state  
✅ **API Validation**: Backend validates school_id is required  

---

**Status**: ✅ COMPLETE  
**Tested**: YES  
**Production Ready**: YES

