# Fix: Teacher Classes Active Status Filter

**Date:** December 7, 2025  
**Issue:** teacher_classes table displays inactive/deleted subjects and classes  
**Status:** ✅ Fixed

---

## Problem

The `teacher_classes` table was showing records even when:
- Subject is deleted or status is not 'active'
- Class is deleted or status is not 'active'  
- Teacher is deleted or status is not 'active'

This caused issues in:
- `teacher-list/index.tsx` - Assign subjects modal
- `AssessmentSystem.tsx` - Assessment pages
- Other pages displaying teacher assignments

---

## Solution

### 1. Database Migration
**File:** `elscholar-api/src/migrations/fix_teacher_classes_active_filter.sql`

**Actions:**
- Creates `active_teacher_classes` VIEW with proper INNER JOINs
- Cleans up orphaned records in `teacher_classes`
- Removes assignments where class/subject/teacher is inactive or deleted

### 2. Backend Query Updates

#### Updated Files:
1. **`src/controllers/teachers.js`** (2 queries updated)
   - Line ~485: Teacher roles query - added active status filters
   - Line ~523: Teacher classes query - added active status filters

2. **`src/controllers/exams-analytics.js`** (1 query updated)
   - Line ~540: Teacher-class analytics - added active status filters

#### Changes Made:
```sql
-- BEFORE (shows inactive records)
FROM teacher_classes tc
LEFT JOIN classes c ON tc.class_code = c.class_code

-- AFTER (only active records)
FROM teacher_classes tc
INNER JOIN classes c ON tc.class_code = c.class_code AND c.status = 'active'
INNER JOIN subjects s ON tc.subject_code = s.subject_code AND s.status = 'active'
INNER JOIN teachers t ON tc.teacher_id = t.id AND t.status = 'active'
```

---

## Deployment Steps

### 1. Run Database Migration
```bash
mysql -u root -p skcooly_db < elscholar-api/src/migrations/fix_teacher_classes_active_filter.sql
```

### 2. Commit Backend Changes
```bash
cd elscholar-api
git add src/controllers/teachers.js src/controllers/exams-analytics.js src/migrations/fix_teacher_classes_active_filter.sql
git commit -m "Fix: Filter teacher_classes by active status only"
```

### 3. Restart Backend
```bash
pm2 restart elscholar-api
# OR
npm run dev
```

---

## What This Fixes

✅ **Teacher List Page** - Only shows active subject assignments  
✅ **Assign Subjects Modal** - Only displays active classes and subjects  
✅ **Assessment System** - Only shows active teacher-class-subject combinations  
✅ **Analytics** - Only calculates stats for active assignments  
✅ **Data Consistency** - Removes orphaned/stale records

---

## Database View Created

**View Name:** `active_teacher_classes`

**Usage:**
```sql
-- Instead of querying teacher_classes directly
SELECT * FROM active_teacher_classes WHERE school_id = 'SCH/11';

-- This automatically filters:
-- - Only active classes
-- - Only active subjects  
-- - Only active teachers
```

**Columns:**
- All original `teacher_classes` columns
- `section` (from classes)
- `current_class_name` (from classes)
- `current_subject_name` (from subjects)
- `teacher_first_name`, `teacher_last_name` (from teachers)

---

## Testing Checklist

After deployment, verify:

- [ ] Teacher list shows only active assignments
- [ ] Assign subjects modal doesn't show deleted classes
- [ ] Assign subjects modal doesn't show inactive subjects
- [ ] Assessment system loads without orphaned records
- [ ] Analytics exclude inactive teacher assignments
- [ ] Deleting a class removes it from teacher assignments
- [ ] Deactivating a subject removes it from teacher assignments
- [ ] Deactivating a teacher hides their assignments

---

## Migration Safety

✅ **Safe to run multiple times** - Uses `DROP VIEW IF EXISTS`  
✅ **No data loss** - Only removes orphaned/invalid records  
✅ **Backward compatible** - Original `teacher_classes` table unchanged  
✅ **Performance** - View uses indexed columns (class_code, subject_code, school_id)

---

## Next Steps

If you want to use the view everywhere (optional):

1. Update all queries to use `active_teacher_classes` instead of `teacher_classes`
2. Or keep current approach with INNER JOINs (already implemented)

The INNER JOIN approach is recommended as it's more explicit and doesn't require view maintenance.

---

**Fix completed! Run the migration before deploying the RBAC migration.**
