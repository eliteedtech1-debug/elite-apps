# Bulk Grading View - UI/UX Design

## 📊 Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Assignment: Math Quiz - Chapter 5                                       │
│ Class: JSS1 A  |  Subject: Mathematics  |  Total: 25 Students          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ [Individual View] [Bulk Grading View ✓]                    [Export ▼]  │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ 📊 Quick Stats                                                          │
│ ┌──────────┬──────────┬──────────┬──────────┐                         │
│ │ Submitted│ Pending  │ Avg Score│ Graded   │                         │
│ │   23/25  │    2     │  75.5%   │  15/23   │                         │
│ └──────────┴──────────┴──────────┴──────────┘                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Filters: [All Students ▼] [Show: Ungraded ▼] [Sort: Name ▼] [Search]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ SPREADSHEET VIEW (Editable)                                         ││
│ ├────┬──────────────┬────┬────┬────┬────┬────┬───────┬────────┬──────┤│
│ │ #  │ Student Name │ Q1 │ Q2 │ Q3 │ Q4 │ Q5 │ Total │ Status │Action││
│ │    │              │ /2 │ /2 │ /3 │ /2 │ /1 │  /10  │        │      ││
│ ├────┼──────────────┼────┼────┼────┼────┼────┼───────┼────────┼──────┤│
│ │ 1  │ John Doe     │ 2✓ │ 1  │ 3✓ │ 2✓ │ 1✓ │  9/10 │ Graded │ View ││
│ │    │ DS/1/0021    │    │    │    │    │    │  90%  │   ✓    │      ││
│ ├────┼──────────────┼────┼────┼────┼────┼────┼───────┼────────┼──────┤│
│ │ 2  │ Jane Smith   │ 2✓ │ 2✓ │ [2]│ 1  │ 1✓ │  8/10 │ Editing│ Save ││
│ │    │ DS/1/0022    │    │    │ ⚠  │    │    │  80%  │   ⏳   │      ││
│ ├────┼──────────────┼────┼────┼────┼────┼────┼───────┼────────┼──────┤│
│ │ 3  │ Mike Johnson │ 1  │ 0✗ │ 3✓ │ 2✓ │ 0✗ │  6/10 │ Pending│Grade ││
│ │    │ DS/1/0023    │    │    │    │    │    │  60%  │   ⏸   │      ││
│ ├────┼──────────────┼────┼────┼────┼────┼────┼───────┼────────┼──────┤│
│ │ 4  │ Sarah Lee    │ -  │ -  │ -  │ -  │ -  │  0/10 │Not Sub │  -   ││
│ │    │ DS/1/0024    │    │    │    │    │    │   0%  │   ✗    │      ││
│ └────┴──────────────┴────┴────┴────┴────┴────┴───────┴────────┴──────┘│
│                                                                          │
│ [◀ Previous] Page 1 of 2 [Next ▶]                                      │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ 📝 Selected: 3 students                                                 │
│ [Bulk Actions ▼] [Save All Changes] [Release Grades] [Send Feedback]   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Features

### 1. Color Coding
```
✓ Green background  = Correct answer (auto-graded)
✗ Red background    = Wrong answer (auto-graded)
⚠ Yellow background = Needs manual grading (essay/short answer)
- Gray text         = Not submitted
[2] Blue border     = Currently editing
```

### 2. Interactive Cells
- **Click to edit:** Click any score cell to edit
- **Tab navigation:** Press Tab to move to next cell
- **Auto-save:** Changes save automatically after 2 seconds
- **Undo:** Ctrl+Z to undo last change

### 3. Question Headers (Expandable)
```
┌────────────────────────────────────────┐
│ Q1 (/2 marks) [▼]                      │
├────────────────────────────────────────┤
│ What is 2 + 2?                         │
│ Type: Multiple Choice                  │
│ Correct Answer: 4                      │
│ Class Average: 85%                     │
│ Most Common Wrong: 5 (8 students)     │
└────────────────────────────────────────┘
```

---

## 🖱️ Interaction Examples

### Example 1: Quick Grading Flow
```
1. Teacher clicks on Jane's Q3 score (currently showing "2")
2. Cell becomes editable: [2]
3. Teacher types "3" and presses Enter
4. Cell updates: 3✓ (green if correct, yellow if partial)
5. Total auto-updates: 9/10 (90%)
6. Status changes to "Graded"
```

### Example 2: Bulk Actions
```
1. Teacher selects checkboxes for 3 students
2. Clicks "Bulk Actions" dropdown
3. Options appear:
   - Add 1 bonus mark to all
   - Set all Q5 to full marks
   - Send feedback email
   - Mark as reviewed
4. Teacher selects "Add 1 bonus mark to all"
5. All 3 students get +1 mark
```

### Example 3: Filtering
```
Filter: "Show: Ungraded"
Result: Only shows students with Status = "Pending"

Filter: "Sort: Lowest Score"
Result: Students sorted by total score (ascending)

Search: "John"
Result: Only shows students with "John" in name
```

---

## 📱 Mobile View (Responsive)

```
┌─────────────────────────────┐
│ Math Quiz - Chapter 5       │
│ 23/25 Submitted             │
├─────────────────────────────┤
│ [All] [Ungraded] [Search]   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 1. John Doe             │ │
│ │    DS/1/0021            │ │
│ │    ─────────────────    │ │
│ │    Q1: 2/2 ✓            │ │
│ │    Q2: 1/2              │ │
│ │    Q3: 3/3 ✓            │ │
│ │    Q4: 2/2 ✓            │ │
│ │    Q5: 1/1 ✓            │ │
│ │    ─────────────────    │ │
│ │    Total: 9/10 (90%)    │ │
│ │    [View Details]       │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 2. Jane Smith           │ │
│ │    DS/1/0022            │ │
│ │    ─────────────────    │ │
│ │    Q1: 2/2 ✓            │ │
│ │    Q2: 2/2 ✓            │ │
│ │    Q3: [Edit] /3 ⚠      │ │
│ │    Q4: 1/2              │ │
│ │    Q5: 1/1 ✓            │ │
│ │    ─────────────────    │ │
│ │    Total: 8/10 (80%)    │ │
│ │    [Save] [View]        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 🎯 Key Features

### 1. Inline Editing
- Click any cell to edit score
- Validation: Can't exceed max marks
- Real-time total calculation
- Auto-save with visual feedback

### 2. Smart Highlighting
- Hover over row: Highlight entire student row
- Hover over column: Highlight entire question column
- Click student name: Expand to show full responses

### 3. Keyboard Shortcuts
```
Tab       - Next cell
Shift+Tab - Previous cell
Enter     - Save and move down
Esc       - Cancel edit
Ctrl+S    - Save all changes
Ctrl+Z    - Undo
```

### 4. Question Analytics (Hover Tooltip)
```
┌────────────────────────────┐
│ Question 3 Analytics       │
├────────────────────────────┤
│ Correct: 18/23 (78%)       │
│ Partially Correct: 3       │
│ Wrong: 2                   │
│ Average Score: 2.3/3       │
│                            │
│ Common Mistakes:           │
│ • Forgot to carry (5)      │
│ • Wrong formula (2)        │
└────────────────────────────┘
```

### 5. Export Options
```
Export ▼
├─ Excel (.xlsx)
├─ CSV
├─ PDF Report
└─ Copy to Clipboard
```

---

## 🔄 Workflow Example

**Scenario:** Teacher grades 25 students in 10 minutes

```
1. Open assignment → Click "Bulk Grading View"
2. Filter: "Show: Ungraded" → 8 students appear
3. Click Q3 for first student → Type score → Press Enter
4. Repeat for all 8 students (Tab through cells)
5. Review totals → Adjust any scores
6. Click "Save All Changes"
7. Click "Release Grades" → Students get notifications
8. Done! ✓
```

**Time Saved:**
- Old way: 25 students × 2 min = 50 minutes
- New way: 25 students × 0.4 min = 10 minutes
- **Savings: 80% faster!**

---

## 💡 Advanced Features (Phase 2)

1. **Comment Bubbles:** Click cell to add comment
2. **Rubric Integration:** Apply rubric scores with one click
3. **AI Suggestions:** "This answer seems similar to correct answer (85% match)"
4. **Comparison View:** Side-by-side student responses
5. **Grade Distribution Chart:** Visual histogram of scores

---

**End of Mockup**
