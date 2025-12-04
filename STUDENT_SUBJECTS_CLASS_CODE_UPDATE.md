# Student Subjects Class Code Update

## Summary
Added `class_code` column to `student_subjects` table to track selective subjects per class level. This ensures that when students are promoted to a new class, their selective subject assignments are class-specific.

## Why This Change Was Needed

**Problem**: Previously, selective subjects were only tracked per student without considering their class level.

**Impact**:
- When a student moved from SS1 to SS2, they kept the same selective subjects from SS1
- No way to assign different selective subjects for different class levels
- Historical data lost when updating selective subjects

**Solution**: Add `class_code` to track selective subjects per class level.

## Changes Made

### 1. Database Migration
**File**: `/Users/apple/Downloads/apps/elite/elscholar-api/migrations/add_class_code_to_student_subjects.sql`

- Adds `class_code VARCHAR(50) NOT NULL` column to `student_subjects` table
- Creates index on `class_code` for better query performance
- Creates composite index on `(admission_no, class_code)` for faster lookups
- Auto-populates existing records with student's current class
- Handles column existence check (idempotent migration)

### 2. API Endpoint Updates
**File**: `/Users/apple/Downloads/apps/elite/elscholar-api/src/routes/studentSubjectsRoutes.js`

#### GET `/api/student-subjects/:admission_no`
**Before**:
- Returned all selective subjects for a student (no class filtering)

**After**:
- Auto-detects student's `current_class` if `class_code` not provided
- Filters subjects by class_code
- Returns subjects only for the specified class
- Response includes `class_code` field

**Query Parameters**:
- `class_code` (optional): Filter by specific class (defaults to student's current class)

#### POST `/api/student-subjects`
**Before**:
```json
{
  "admission_no": "YMA/1/0115",
  "subject_codes": ["SBJ001", "SBJ002"],
  "branch_id": "BR001"
}
```

**After**:
```json
{
  "admission_no": "YMA/1/0115",
  "subject_codes": ["SBJ001", "SBJ002"],
  "class_code": "CLS0459",  // Optional: defaults to student's current class
  "branch_id": "BR001"
}
```

**Changes**:
- Deletes only subjects for the specific `class_code` (not all student subjects)
- Auto-fetches student's `current_class` if `class_code` not provided
- Allows empty array for `subject_codes` (to clear all selective subjects for a class)

#### DELETE `/api/student-subjects/:admission_no/:subject_code`
**Before**:
- Deleted subject for student across all classes

**After**:
- Auto-detects student's `current_class` if `class_code` not provided
- Deletes subject only for the specified class
- Returns `class_code` in response

**Query Parameters**:
- `class_code` (optional): Delete from specific class (defaults to student's current class)

#### GET `/api/student-subjects/class/:class_code`
**Changes**:
- Updated JOIN to filter `student_subjects` by `class_code`
- Now correctly shows only selective subjects for the queried class

### 3. Table Structure

**student_subjects** table now has:
```sql
CREATE TABLE student_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_no VARCHAR(50) NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  class_code VARCHAR(50) NOT NULL,  -- NEW COLUMN
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_admission_no (admission_no),
  INDEX idx_subject_code (subject_code),
  INDEX idx_class_code (class_code),  -- NEW INDEX
  INDEX idx_student_class (admission_no, class_code),  -- NEW COMPOSITE INDEX
  INDEX idx_school_id (school_id)
);
```

## Migration Steps

### 1. Run the Migration
```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api

# Option A: Using mysql client
mysql -u [username] -p [database_name] < migrations/add_class_code_to_student_subjects.sql

# Option B: Using Node.js script
node -e "
const db = require('./src/models');
const fs = require('fs');
const migration = fs.readFileSync('./migrations/add_class_code_to_student_subjects.sql', 'utf8');
db.sequelize.query(migration).then(() => {
  console.log('Migration completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
"
```

### 2. Restart Backend Server
```bash
# If using PM2
pm2 restart elite

# If running directly
npm start
```

### 3. Verify Migration
```bash
# Check table structure
mysql -u [username] -p [database_name] -e "DESCRIBE student_subjects;"

# Check data
mysql -u [username] -p [database_name] -e "
  SELECT admission_no, subject_code, class_code, COUNT(*) as count
  FROM student_subjects
  GROUP BY admission_no, class_code
  LIMIT 10;
"
```

## Frontend Changes Required

**File**: `elscholar-ui/src/feature-module/peoples/students/student-list/index.tsx`

The frontend doesn't need changes because:
- Backend auto-detects `current_class` if `class_code` not provided
- Existing API calls will continue to work
- `class_code` is automatically populated from `students.current_class`

**Optional Enhancement**:
If you want to explicitly pass `class_code`, update:
```typescript
_post(
  "api/student-subjects",
  {
    admission_no: studentForSubjects.admission_no,
    subject_codes: selectedSelectiveSubjects,
    class_code: studentForSubjects.class_code,  // Add this line
    branch_id: selected_branch.branch_id,
  },
  // ... handlers
)
```

## Use Cases

### 1. Assigning Selective Subjects to Current Class
```javascript
// Automatically uses student's current class
POST /api/student-subjects
{
  "admission_no": "YMA/1/0115",
  "subject_codes": ["SBJ001", "SBJ002"]
}
```

### 2. Assigning Selective Subjects to Specific Class
```javascript
// Explicitly specify class (e.g., for historical records)
POST /api/student-subjects
{
  "admission_no": "YMA/1/0115",
  "subject_codes": ["SBJ003", "SBJ004"],
  "class_code": "SS2"
}
```

### 3. Getting Student's Current Selective Subjects
```javascript
// Automatically gets subjects for current class
GET /api/student-subjects/YMA/1/0115

// Response:
{
  "success": true,
  "data": [
    {
      "subject_code": "SBJ001",
      "subject_name": "Islamic Studies",
      "class_code": "SS1",
      "type": "selective"
    }
  ],
  "class_code": "SS1"
}
```

### 4. Getting Historical Selective Subjects
```javascript
// Get subjects for a previous class
GET /api/student-subjects/YMA/1/0115?class_code=JSS3

// Shows subjects student had in JSS3
```

## Benefits

1. **Class-Specific Subjects**: Each class level can have different selective subjects
2. **Historical Records**: Maintains history of selective subjects per class
3. **Promotion Support**: When students are promoted, their old selective subjects are preserved
4. **No Data Loss**: Previous class assignments remain intact
5. **Backward Compatible**: Auto-detects current class if not specified
6. **Better Reporting**: Can generate reports showing subject selection patterns across classes

## Testing Checklist

- [ ] Run migration script successfully
- [ ] Verify `class_code` column exists in `student_subjects` table
- [ ] Test assigning selective subjects to a student
- [ ] Verify subjects are filtered by current class in frontend modal
- [ ] Test promoting a student to next class
- [ ] Verify new class doesn't have old selective subjects
- [ ] Assign new selective subjects for the new class
- [ ] Query old class subjects using `class_code` parameter
- [ ] Test End of Term Report shows correct selective subjects
- [ ] Verify filtering works with `shouldIncludeSubject` logic

## Rollback Plan

If issues occur, rollback the migration:

```sql
-- Remove class_code column
ALTER TABLE student_subjects DROP COLUMN class_code;

-- Remove indexes
DROP INDEX idx_class_code ON student_subjects;
DROP INDEX idx_student_class ON student_subjects;
```

Then revert the API code changes in `studentSubjectsRoutes.js`.

## Notes

- Migration is **idempotent** - safe to run multiple times
- Existing records are automatically populated with `students.current_class`
- NULL values for `class_code` are handled (unlikely but possible)
- All queries now default to student's `current_class` for backward compatibility
- Frontend changes are optional - backend handles defaults
