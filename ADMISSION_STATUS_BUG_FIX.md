# Admission Status Bug Fix

## 🐛 Issue
New schools without admission settings were showing "Admission Open" by default on the login page.

## 🔍 Root Cause

**File**: `/elscholar-api/src/controllers/AdmissionBranchController.js`

**Problem**: The SQL queries used `COALESCE(sas.admission_open, 1)` which defaults to `1` (open) when no record exists in `school_admission_settings` table.

```sql
-- BEFORE (Wrong - defaults to open)
COALESCE(sas.admission_open, 1) as admission_open
```

This meant:
- ❌ New schools automatically show "Admission Open"
- ❌ Schools without explicit settings appear to accept applications
- ❌ No control over admission status for new schools

## ✅ Solution

Changed default from `1` (open) to `0` (closed) and added explicit filter:

```sql
-- AFTER (Correct - defaults to closed)
COALESCE(sas.admission_open, 0) as admission_open

-- AND added explicit filter
WHERE sas.admission_open = 1
  AND (sas.admission_closing_date IS NULL OR sas.admission_closing_date >= CURDATE())
```

## 📝 Changes Made

### 1. getAdmissionBranches() - Line 21-40
**Before:**
- Defaulted to admission_open = 1
- Showed branches even without settings
- Filter: `(sas.admission_open IS NULL OR sas.admission_open = 1)`

**After:**
- Defaults to admission_open = 0
- Only shows branches with explicit admission_open = 1
- Filter: `sas.admission_open = 1`

### 2. getBranchDetails() - Line 82-100
**Before:**
- Defaulted to admission_open = 1
- Complex CASE statement in WHERE clause

**After:**
- Defaults to admission_open = 0
- Simple explicit filter: `sas.admission_open = 1`

## 🧪 Test Results

### Test 1: School with admission_open = 0
```bash
curl 'http://localhost:34567/api/admission-branches/schools/branches?school_id=SCH/20'
```
**Result**: ✅ Empty array (correct - admission closed)

### Test 2: School with admission_open = 1
```bash
curl 'http://localhost:34567/api/admission-branches/schools/branches?school_id=SCH/23'
```
**Result**: ✅ Returns branch with admission details (correct - admission open)

### Test 3: School without admission settings
```bash
curl 'http://localhost:34567/api/admission-branches/schools/branches?school_id=SCH/12'
```
**Result**: ✅ Empty array (correct - defaults to closed)

## 📊 Database Schema

**Table**: `school_admission_settings`

| Column | Type | Description |
|--------|------|-------------|
| school_id | VARCHAR | School identifier |
| branch_id | VARCHAR | Branch identifier |
| admission_open | TINYINT(1) | 0=Closed, 1=Open |
| admission_closing_date | DATE | Optional deadline |
| access_mode | VARCHAR | FREE or PAID |
| application_fee | DECIMAL | Fee amount if PAID |

**Current Data:**
```
school_id | branch_id   | admission_open | admission_closing_date
----------|-------------|----------------|----------------------
SCH/20    | BRCH00027   | 0              | NULL
SCH/23    | BRCH/29     | 1              | 2026-03-20
```

## 🎯 Impact

### Before Fix:
- ❌ All new schools show "Admission Open"
- ❌ No control over admission visibility
- ❌ Confusing for users

### After Fix:
- ✅ Only schools with explicit `admission_open = 1` show admission
- ✅ New schools default to closed (safe default)
- ✅ Schools must explicitly enable admission

## 🔧 How to Enable Admission for a School

Schools must insert a record in `school_admission_settings`:

```sql
INSERT INTO school_admission_settings 
(school_id, branch_id, admission_open, admission_closing_date, access_mode, application_fee)
VALUES 
('SCH/XX', 'BRCH/XX', 1, '2026-12-31', 'FREE', 0);
```

Or update existing:
```sql
UPDATE school_admission_settings 
SET admission_open = 1, 
    admission_closing_date = '2026-12-31'
WHERE school_id = 'SCH/XX' AND branch_id = 'BRCH/XX';
```

## 📱 Frontend Impact

**Component**: `AdmissionBranchDisplay.tsx`

The component calls `/api/admission-branches/schools/branches` and:
- Shows "Apply Now" button only if branches returned
- Displays admission closing date and days remaining
- No frontend changes needed (API handles the logic)

## ✅ Verification Checklist

- [x] Changed COALESCE default from 1 to 0
- [x] Added explicit `sas.admission_open = 1` filter
- [x] Tested school with admission closed
- [x] Tested school with admission open
- [x] Tested school without settings
- [x] Verified frontend displays correctly

## 🚀 Deployment

No database migration needed. Changes are:
- ✅ Backward compatible
- ✅ Only affects query logic
- ✅ Safe to deploy immediately

---

**Status**: ✅ Fixed and Tested  
**File Modified**: `/elscholar-api/src/controllers/AdmissionBranchController.js`  
**Lines Changed**: 21, 28-29, 38, 82, 87, 103-104
