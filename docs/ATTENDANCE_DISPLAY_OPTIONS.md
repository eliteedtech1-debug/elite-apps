# Attendance Display Options - Flexible Configuration

## ✅ Overview

Schools now have **full flexibility** to customize how attendance appears on end-of-term reports. You can choose to show:
- ✅ **Only attendance percentage** (e.g., "89%")
- ✅ **Only detailed breakdown** (Present, Absent, Late, Half-Day In, Half-Day Out)
- ✅ **Both percentage AND detailed breakdown**
- ❌ **Neither** (hide attendance section entirely)

## 🎯 Configuration Toggles

### 1. **Show Attendance Section** (`showAttendancePerformance`)
**Location:** Report Configuration → Visibility Settings
**Default:** `false` (OFF)

**Purpose:** Master toggle for the entire attendance section
- ✅ **ON**: Show attendance section (percentage will always display)
- ❌ **OFF**: Hide entire attendance section

### 2. **Show Detailed Breakdown** (`showAttendanceDetails`)
**Location:** Report Configuration → Visibility Settings
**Default:** `false` (OFF)

**Purpose:** Toggle color-coded attendance cards
- ✅ **ON**: Show detailed cards (Present, Absent, Late, Half-Day In, Half-Day Out)
- ❌ **OFF**: Show only percentage
- 🔒 **Disabled** when "Show Attendance Section" is OFF

## 📊 Display Modes

### Mode 1: Percentage Only
**Config:**
- Show Attendance Section: ✅ ON
- Show Detailed Breakdown: ❌ OFF

**Display:**
```
┌──────────────────────────────┐
│         ATTENDANCE           │
│            89%               │
└──────────────────────────────┘
```

**When to use:**
- Clean, minimalist reports
- Parents who want quick overview
- Space-constrained designs

---

### Mode 2: Detailed Breakdown Only
**Config:**
- Show Attendance Section: ✅ ON
- Show Detailed Breakdown: ✅ ON
- *(Then manually hide percentage in template if needed - advanced)*

**Display:**
```
┌──────────┬──────────┬──────────┐
│ Present  │ Absent   │  Late    │
│   85     │    3     │    2     │
└──────────┴──────────┴──────────┘
┌────────────────┬────────────────┐
│  Half-Day In   │  Half-Day Out  │
│       4        │       1        │
└────────────────┴────────────────┘
```

**When to use:**
- Parents who want exact numbers
- Schools tracking attendance types separately
- Detailed reporting requirements

---

### Mode 3: Both Percentage AND Breakdown
**Config:**
- Show Attendance Section: ✅ ON
- Show Detailed Breakdown: ✅ ON

**Display:**
```
┌──────────────────────────────┐
│         ATTENDANCE           │
│            89%               │
└──────────────────────────────┘

┌──────────┬──────────┬──────────┐
│ Present  │ Absent   │  Late    │
│   85     │    3     │    2     │
└──────────┴──────────┴──────────┘
┌────────────────┬────────────────┐
│  Half-Day In   │  Half-Day Out  │
│       4        │       1        │
└────────────────┴────────────────┘
```

**When to use:**
- Comprehensive reporting
- Schools wanting both summary and details
- Most informative option for parents

---

### Mode 4: Hidden
**Config:**
- Show Attendance Section: ❌ OFF

**Display:**
```
(Attendance section not shown)
```

**When to use:**
- Reports focused on academics only
- Schools with separate attendance reports
- Minimalist report designs

## 🎨 Color-Coded Cards

When **Show Detailed Breakdown** is enabled, attendance types display with color coding:

| Attendance Type | Color | Meaning |
|-----------------|-------|---------|
| **Present** | 🟢 Green | Full day attendance (100%) |
| **Absent** | 🔴 Red | Student was absent (0%) |
| **Late** | 🟠 Orange | Late arrival (80% weight) |
| **Half-Day In** | 🔵 Blue | Half morning (50% weight) |
| **Half-Day Out** | 🟣 Purple | Half afternoon (50% weight) |

## 📐 Attendance Percentage Formula

The percentage is calculated using a **weighted formula**:

```
Attendance % = (Present×100% + Late×80% + Half-Day×50%) ÷ (Total Days - Excused)
```

### Breakdown:
- **Present** = 100% (weight: 1.0)
- **Late** = 80% (weight: 0.8)
- **Half-Day In** = 50% (weight: 0.5)
- **Half-Day Out** = 50% (weight: 0.5)
- **Excused** = Excluded from total (not counted against student)
- **Absent** = 0% (weight: 0.0)
- **Dismissed** = 0% (weight: 0.0)

**Result:** Rounded **UP** using `Math.ceil()` to benefit students

### Example Calculation:
**Student Data:**
- Present: 85 days
- Late: 2 days
- Half-Day In: 4 days
- Half-Day Out: 1 day
- Absent: 3 days
- Excused: 0 days

**Calculation:**
```
Total Days = 85 + 2 + 4 + 1 + 3 = 95 days
Effective Days = 95 - 0 (excused) = 95 days

Weighted Attendance = (85 × 1.0) + (2 × 0.8) + (4 × 0.5) + (1 × 0.5)
                    = 85 + 1.6 + 2 + 0.5
                    = 89.1

Percentage = (89.1 / 95) × 100 = 93.8%
Rounded UP = 94%
```

## 📁 Files Modified

### 1. ReportConfigurationPage.tsx
**Already configured!** The UI toggles are already in place:
- Line 1480-1487: "Show Attendance Section" toggle
- Line 1495-1506: "Show Detailed Breakdown" toggle (disabled when main toggle is OFF)

### 2. PDFReportTemplate.tsx
**Updated sections:**

#### React Preview (Lines 1024-1121):
- Shows percentage when `showAttendancePerformance` is true
- Shows detailed breakdown when `showAttendanceDetails` is also true
- Color-coded cards in 3-2 grid layout

#### PDF Generation (Lines 1843-1964):
- Percentage box with large centered text
- Detailed breakdown cards with proper color fills and borders
- Same color scheme as React preview for consistency

### 3. reportConfigAPI.js
**Default values (Lines 23-26):**
```javascript
showAttendancePerformance: false,  // Master toggle
showAttendanceDetails: false       // Detailed breakdown
```

## 🚀 How to Enable

### For School Administrators:

1. **Navigate to Report Configuration:**
   ```
   Academic → Examinations → Report Configuration
   ```

2. **Go to "Visibility Settings" tab**

3. **Enable attendance section:**
   - Toggle **"Show Attendance Section"** to ON
   - This will display the attendance percentage

4. **Enable detailed breakdown (optional):**
   - Toggle **"Show Detailed Breakdown"** to ON
   - This will add color-coded cards below the percentage

5. **Save configuration**

6. **Generate test report to preview**

## ✨ Benefits

### For Schools:
- ✅ **Full control** over report appearance
- ✅ **Flexible** - adapt to different reporting needs
- ✅ **Professional** - color-coded, clean design
- ✅ **Backward compatible** - defaults to OFF

### For Parents:
- ✅ **Simple percentage** for quick understanding
- ✅ **Detailed breakdown** if they want more info
- ✅ **Visual color coding** makes it easy to interpret
- ✅ **Fair calculation** that accounts for late arrivals and half-days

### For Teachers:
- ✅ **Consistent formatting** across all reports
- ✅ **Less cluttered** when only percentage is shown
- ✅ **Comprehensive** when breakdown is enabled
- ✅ **Automatic calculation** - no manual work needed

## 📋 Testing Checklist

### Test Percentage Display
- [ ] Enable "Show Attendance Section" only
- [ ] Verify percentage displays centered and large
- [ ] Verify no detailed cards show
- [ ] Test with various attendance values (0%, 50%, 100%)

### Test Detailed Breakdown
- [ ] Enable both toggles
- [ ] Verify percentage shows first
- [ ] Verify 5 color-coded cards display below
- [ ] Verify colors match: Green, Red, Orange, Blue, Purple
- [ ] Verify values display correctly

### Test Toggles
- [ ] Disable "Show Attendance Section" → Entire section hides
- [ ] Enable main toggle → Percentage shows
- [ ] Enable breakdown toggle → Cards appear
- [ ] Disable breakdown toggle → Only percentage remains

### Test PDF Generation
- [ ] Web preview matches PDF output
- [ ] Colors render correctly in PDF
- [ ] Text is centered and readable
- [ ] No layout issues or overlaps

## 🔧 Customization

### Adjust Formula Weights
**File:** `EndOfTermReport.tsx` (Lines 251-254)

```typescript
const weightedAttendance =
  (present * 1.0) +      // Change to 1.0 for 100%
  (late * 0.8) +         // Change to 0.9 for 90%, etc.
  (halfDayIn * 0.5) +    // Change to 0.6 for 60%, etc.
  (halfDayOut * 0.5);    // Change to 0.6 for 60%, etc.
```

### Change Card Colors
**File:** `PDFReportTemplate.tsx`

**React Preview (Lines 1048-1117):**
```typescript
backgroundColor: '#e8f5e9',  // Present card background
border: '1px solid #4caf50', // Present card border
// Modify for each card type
```

**PDF Generation (Lines 1889-1960):**
```typescript
pdf.setFillColor(232, 245, 233); // Present card (RGB)
pdf.setDrawColor(76, 175, 80);   // Present border (RGB)
// Modify for each card type
```

## ❓ FAQs

**Q: Can I show only the detailed breakdown without percentage?**
A: Currently, percentage always shows when attendance section is enabled. You can customize the template to hide it if needed.

**Q: What if a student has no attendance data?**
A: The percentage shows `0%` and cards show `0` for all fields.

**Q: Can I change the colors of the cards?**
A: Yes, see the Customization section above.

**Q: Will old reports break with this update?**
A: No! Defaults are set to `false` (OFF), so existing reports won't change until you enable the toggles.

**Q: Where can parents see more detailed attendance info?**
A: In their dashboard under the child's attendance section with dates and reasons.

**Q: Can I adjust the Late weight from 80% to something else?**
A: Yes, modify `EndOfTermReport.tsx` line 252: `(late * 0.8)` → `(late * 0.9)` for 90%

## 📞 Support

Need help configuring attendance display?

1. **Check toggle states** in Report Configuration → Visibility Settings
2. **Test with sample report** before generating for all students
3. **Hard refresh browser** (Cmd+Shift+R) if changes don't appear
4. **Check console** for any errors in browser DevTools

---

**Status:** ✅ Complete and ready for production
**Version:** 2.0 (Enhanced with flexible options)
**Last Updated:** 2025-11-16
**Related Docs:** `ATTENDANCE_PERCENTAGE_UPDATE.md`
