# Checkbox Debugging Guide

## Issue
Checkboxes still not working - cannot check subjects to add them

## Debugging Steps

### 1. Open Browser DevTools Console
Press `F12` or `Cmd+Option+I` (Mac)

### 2. Check Console for Errors
Look for any red errors when clicking a checkbox

### 3. Test Checkbox State
When you click a checkbox, check if `selectedSubjectsFlat` array updates:

In console, type:
```javascript
// Check current selection
console.log(window.selectedSubjectsFlat)
```

### 4. Verify Handler is Called
Add this to browser console to intercept checkbox changes:
```javascript
const originalHandleSelection = window.handleSelectionChange;
window.handleSelectionChange = function(...args) {
  console.log('Checkbox clicked:', args);
  if (originalHandleSelection) {
    return originalHandleSelection(...args);
  }
};
```

### 5. Check Specific Issues

#### Issue A: Checkbox State Not Updating
**Symptoms:** Click checkbox, nothing happens visually

**Possible Causes:**
1. `isSelected` calculation returning wrong value
2. State not updating properly
3. Component not re-rendering

**Fix:** Check if `selectedSubjectsFlat` includes the subject name

#### Issue B: Checkbox Checks But Then Unchecks
**Symptoms:** Checkbox checks briefly then unchecks

**Possible Causes:**
1. Name mismatch between subject.name and what's in selectedSubjectsFlat
2. Component re-rendering with old props

#### Issue C: Some Checkboxes Work, Others Don't
**Symptoms:** Existing subjects work, new subjects don't (or vice versa)

**Possible Causes:**
1. Different handlers for different subject types
2. `alreadyExists` still blocking somewhere

## Quick Fixes to Try

### Fix 1: Hard Refresh
```
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

### Fix 2: Clear LocalStorage
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Fix 3: Check Subject Name Matching
In browser console while modal is open:
```javascript
// Get all subjects in the modal
const subjects = document.querySelectorAll('[type="checkbox"]');
subjects.forEach((cb, i) => {
  console.log(`Checkbox ${i}:`, cb.checked, cb.parentElement.textContent);
});
```

### Fix 4: Force State Update
Try clicking a checkbox, then clicking another part of the UI to force re-render

## What Should Happen

### Correct Behavior:
1. Click checkbox
2. `selectedSubjectsFlat` array updates immediately
3. Checkbox visual state changes
4. Console shows no errors

### Current Behavior (if broken):
1. Click checkbox
2. ??? (What happens? Nothing? Error? Brief check then uncheck?)

## Advanced Debugging

If checkboxes still don't work, check these props being passed to SubjectCheckboxItem:

```typescript
// For each subject, verify:
subject={...}  // ✓ Has name and type
isSelected={...}  // ✓ Boolean value
onSelectionChange={...}  // ✓ Function exists
alreadyExists={false}  // ✓ Must be false
```

## Temporary Workaround

If nothing works, you can use the "Currently Assigned Subjects" section as read-only and manage subjects through the main page's "Manage Subjects" button per class (not modal).

## Next Steps

1. Open `/academic/subjects`
2. Click "Manage Subjects" for any class
3. Try to check a subject
4. Report what happens:
   - [ ] Nothing happens
   - [ ] Brief flash then unchecks
   - [ ] Checks but "OK" button doesn't save
   - [ ] Works but status doesn't show
   - [ ] Other: ___________________

5. Check browser console for errors
6. Share error message if any

## Contact Info

If issue persists after trying all above:
1. Take screenshot of browser console (F12)
2. Note which subjects fail (existing vs new)
3. Check if hard refresh helped
4. Report findings

---

**Dev Server:** Should be running on http://localhost:3000
**Last Updated:** December 3, 2025
