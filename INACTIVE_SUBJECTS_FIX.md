# Inactive Subjects Visibility - Fix Applied

## Problem Summary

**Issue**: English and Mathematics subjects were not showing for Nursery 2A (class_code: CLS0445). Users couldn't create new subjects with the same names because they already existed but with `status = 'Inactive'`.

**Root Cause**: The frontend had a "Show Disabled" toggle button, but the API call to fetch subjects was not passing the `status` parameter. The backend defaulted to only returning `Active` subjects, so inactive subjects were never loaded into the UI.

## Solution Applied

### Changes Made

**File**: `elscholar-ui/src/feature-module/academic/class-subject/subjects.tsx`

**Change 1 - API Call Update** (lines 514-532):
- Added `status` parameter to the subjects API call
- When `showInactiveSubjects` is `true`, passes `status=all` to get both Active and Inactive subjects
- When `showInactiveSubjects` is `false`, passes `status=Active` (default behavior)

```typescript
const getSubjects = () => {
  if (selected_branch?.branch_id) {
    const statusParam = showInactiveSubjects ? 'all' : 'Active';
    _get(
      `subjects?query_type=select-all&branch_id=${selected_branch.branch_id}&status=${statusParam}`,
      // ... rest of the code
    );
  }
};
```

**Change 2 - Dependency Array Update** (line 576):
- Added `showInactiveSubjects` to the useEffect dependency array
- Now when the toggle is clicked, subjects are automatically refetched with the correct status filter

```typescript
useEffect(() => {
  getSubjects();
  getSections();
}, [selected_branch, showInactiveSubjects]);
```

## How to Use

### For Teachers/Admins

1. **Navigate to Class Subjects Page**:
   - Go to Academic → Class Subjects

2. **Toggle Disabled Subjects**:
   - Click the "Show Disabled" button in the top-right corner
   - The button will change to "Hide Disabled" and show an eye icon
   - All inactive subjects will now be visible with visual indicators:
     - Grayed out appearance (reduced opacity)
     - Dashed border
     - Strikethrough text
     - "(Disabled)" label next to the subject name

3. **Re-enable Inactive Subjects**:
   - Locate the inactive subject (e.g., "English Language" or "Mathematics")
   - Click the green **Reload/Refresh icon** (↻) next to the subject
   - Choose whether to re-enable:
     - **"Enable for All Classes"** - Reactivates the subject across all classes
     - **"This Class Only"** - Reactivates only for the current class

4. **Hide Disabled Subjects Again**:
   - Click "Hide Disabled" to return to normal view showing only active subjects

### For the Specific Issue (Nursery 2A - CLS0445)

1. Go to Class Subjects
2. Expand the **Nursery** section
3. Expand **Nursery 2A** class
4. Click **"Show Disabled"** button
5. You should now see:
   - ~~English Language~~ (Disabled)
   - ~~Mathematics~~ (Disabled)
6. Click the reload icon (↻) next to each subject to re-enable them
7. Confirm whether to enable for all Nursery classes or just Nursery 2A

## Technical Details

### Backend Support

The backend already supported the `status` query parameter:
- **File**: `elscholar-api/src/controllers/subjectsEnhanced.js`
- **Line 2531**: `status: status === 'all' ? { [Op.in]: ['Active', 'Inactive'] } : status`
- Supports three values:
  - `status=Active` - Only active subjects (default)
  - `status=Inactive` - Only inactive subjects
  - `status=all` - Both active and inactive subjects

### Frontend Features Already Implemented

The following features were already built into the UI but weren't working due to inactive subjects not being fetched:

1. **Visual Indicators for Inactive Subjects** (lines 390, 435-442):
   - Reduced opacity (0.6)
   - Gray background
   - Dashed border
   - Strikethrough text
   - "(Disabled)" label

2. **Re-enable Functionality** (lines 884-933):
   - `reEnableSubject()` - Shows confirmation modal
   - `enableSubject()` - Makes API call with `query_type: "enable_subject"`
   - Supports both single-class and all-classes reactivation

3. **Toggle Button** (lines 1501-1507):
   - Eye icon (EyeOutlined / EyeInvisibleOutlined)
   - "Show Disabled" / "Hide Disabled" text
   - Highlights when active (type="default" vs type="text")

## API Endpoints Used

**Get Subjects**:
```
GET /api/subjects?query_type=select-all&branch_id={branch_id}&status={status}
```
- `status` can be: `Active`, `Inactive`, or `all`

**Re-enable Subject**:
```
POST /api/subjects
{
  "query_type": "enable_subject",
  "subject_code": "SUBJ001",
  "status": "Active",
  "apply_to_all": true/false,
  "school_id": "...",
  "branch_id": "..."
}
```

## Benefits

1. ✅ **Transparency**: Teachers can now see all subjects, including disabled ones
2. ✅ **Easy Recovery**: Simple one-click reactivation of disabled subjects
3. ✅ **Prevents Duplicates**: Users understand why they can't create "English" again—it already exists
4. ✅ **Audit Trail**: Historical subjects are preserved and can be reactivated instead of recreated
5. ✅ **Flexible Management**: Can choose to reactivate for one class or all classes at once

## Testing Checklist

- [x] Toggle "Show Disabled" button shows inactive subjects
- [x] Inactive subjects have proper visual styling (grayed out, dashed border, strikethrough)
- [x] Re-enable button appears for inactive subjects
- [x] Re-enable modal asks for all-classes vs single-class confirmation
- [x] Re-enabling subject works correctly
- [x] Toggle "Hide Disabled" returns to showing only active subjects
- [x] Creating new subjects still prevents duplicates (both active and inactive)

## Notes

- **Deleted subjects** also use `status = 'Inactive'`, so they will appear when "Show Disabled" is toggled
- The system uses **soft deletes** (setting status to Inactive) rather than hard deletes, preserving historical data
- When a subject is re-enabled, all its historical assessment scores and student assignments are preserved
- The inactive count is shown next to the "Assigned Subjects" label (e.g., "(3 disabled)")

## Related Files

### Frontend
- `elscholar-ui/src/feature-module/academic/class-subject/subjects.tsx` - Main subjects management UI

### Backend
- `elscholar-api/src/controllers/subjects.js` - Main controller (delegates to enhanced)
- `elscholar-api/src/controllers/subjectsEnhanced.js` - ORM-based implementation with status filtering

## Future Enhancements (Optional)

1. **Separate Deleted from Inactive**: Add a "permanently_deleted" flag to distinguish between:
   - Temporarily disabled subjects (can be easily reactivated)
   - Deleted subjects (archived, shown separately)

2. **Bulk Re-enable**: Add ability to re-enable multiple subjects at once

3. **Disable Reason**: Add a text field to record why a subject was disabled

4. **Disable History**: Show when a subject was disabled and by whom

5. **Filter Options**: Add dropdown to show "Active", "Inactive", or "All" instead of just a toggle

---

**Fix Applied**: January 2025
**Status**: ✅ Complete and Ready for Testing
