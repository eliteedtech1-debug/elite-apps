# Elite Features Implementation Plan

## Requirements

1. **Elite Plan Gating**
   - Only users with "Elite" or "Elite PENDING" badge can access:
     - Link Lesson Plan from Syllabus Hub
     - Generate with AI button
   - Hide these features for non-Elite users

2. **UI Layout**
   - Both features in 1 row
   - Row only visible for Elite users
   - Buttons: "Link Lesson Plan" and "Generate with AI"

3. **Integration Points**
   - Lesson Form page (`/academic/lesson-form`)
   - Syllabus Hub page
   - User sidebar badge check

## Implementation Steps

### Step 1: Check User Plan Status
- Get user plan from Redux store or API
- Check for "Elite" or "Elite PENDING" badge

### Step 2: Create Elite Features Row Component
- Conditional rendering based on plan status
- Two buttons in one row
- Responsive layout

### Step 3: Add to Lesson Form
- Import Elite features component
- Place above/below existing form fields
- Link to existing lesson plan selection

### Step 4: Add AI Generation
- Create AI generation hook
- Add loading state
- Handle API response

### Step 5: Hide from Non-Elite Users
- Sidebar: Hide "Link Lesson Plan" link
- Lesson Form: Hide Elite features row
- Consistent across all pages

## Files to Modify

1. `src/feature-module/academic/lesson-form/index.tsx` - Add Elite features row
2. `src/feature-module/teacher/syllabus-hub/index.tsx` - Add AI generation
3. `src/components/Sidebar.tsx` - Hide Link Lesson Plan for non-Elite
4. Create: `src/hooks/useElitePlan.ts` - Check Elite status
5. Create: `src/components/EliteFeaturesRow.tsx` - Elite features component

## Status: READY FOR IMPLEMENTATION
