# Attendance Percentage Calculation Verification

## ✅ Calculation Accuracy

Both **React Preview** and **PDF Generation** use **identical logic**:

### Formula
```javascript
Total Days = Present + Late + Half-Day-In + Half-Day-Out + Absent + Dismissed

Percentage for each type = (Type Count / Total Days) × 100

Result: Rounded to 1 decimal place (e.g., 89.5%)
```

### Important Notes
- **Excused** days are **excluded** from total (not counted)
- **Dismissed** days are **included** in total
- All values default to `0` if undefined/null
- Division by zero handled: returns `0.0%`

## 📊 Example Calculation

**Student Data:**
- Present: 85 days
- Late: 2 days
- Half-Day In: 4 days
- Half-Day Out: 1 day
- Absent: 3 days
- Dismissed: 0 days
- Excused: 5 days (not included in total)

**Calculation:**
```
Total Days = 85 + 2 + 4 + 1 + 3 + 0 = 95 days

Present % = (85 / 95) × 100 = 89.5%
Late %    = (2 / 95) × 100 = 2.1%
HD-In %   = (4 / 95) × 100 = 4.2%
HD-Out %  = (1 / 95) × 100 = 1.1%
Absent %  = (3 / 95) × 100 = 3.2%

Total: 89.5% + 2.1% + 4.2% + 1.1% + 3.2% = 100.1% ✓ (rounding)
```

## 🎯 Consistency Between Preview & PDF

### React Preview (Lines 1048-1061)
```typescript
const totalDays = (Number(first.attendance.present) || 0) +
                 (Number(first.attendance.late) || 0) +
                 (Number(first.attendance['half-day-in']) || 0) +
                 (Number(first.attendance['half-day-out']) || 0) +
                 (Number(first.attendance.absent) || 0) +
                 (Number(first.attendance.dismissed) || 0);

const calcPercent = (val: number) => {
  if (totalDays === 0) return '0.0';
  const percent = (val / totalDays) * 100;
  return percent.toFixed(1);
};
```

### PDF Generation (Lines 1900-1913)
```javascript
const totalDays = (Number(first.attendance.present) || 0) +
                 (Number(first.attendance.late) || 0) +
                 (Number(first.attendance['half-day-in']) || 0) +
                 (Number(first.attendance['half-day-out']) || 0) +
                 (Number(first.attendance.absent) || 0) +
                 (Number(first.attendance.dismissed) || 0);

const calcPercent = (val) => {
  if (totalDays === 0) return '0.0%';
  const percent = (val / totalDays) * 100;
  return percent.toFixed(1) + '%';
};
```

**Difference:** PDF adds '%' in function, React adds it in JSX - otherwise **IDENTICAL**

## 🎨 Visual Consistency

### Card Order (Both Preview & PDF)
1. Present (Green)
2. Late (Orange)
3. Half-Day In (Blue)
4. Half-Day Out (Purple)
5. Absent (Red) - **LAST**

### Colors (RGB Values)
| Card | Background | Border | Text Color |
|------|------------|--------|------------|
| **Present** | `rgb(232, 245, 233)` #e8f5e9 | `rgb(76, 175, 80)` #4caf50 | `rgb(27, 94, 32)` #1b5e20 |
| **Late** | `rgb(255, 243, 224)` #fff3e0 | `rgb(255, 152, 0)` #ff9800 | `rgb(230, 81, 0)` #e65100 |
| **HD-In** | `rgb(227, 242, 253)` #e3f2fd | `rgb(33, 150, 243)` #2196f3 | `rgb(13, 71, 161)` #0d47a1 |
| **HD-Out** | `rgb(243, 229, 245)` #f3e5f5 | `rgb(156, 39, 176)` #9c27b0 | `rgb(74, 20, 140)` #4a148c |
| **Absent** | `rgb(255, 235, 238)` #ffebee | `rgb(244, 67, 54)` #f44336 | `rgb(183, 28, 28)` #b71c1c |

### Layout (Both Preview & PDF)
- **All 5 cards in ONE horizontal row**
- **Equal width** for each card
- **Small gaps** between cards (8px React, 2px PDF)
- **Centered text** in each card
- **Card height**: Consistent across all cards

## ✅ Testing Checklist

### Accuracy Tests
- [ ] Test with whole numbers: 100, 50, 25, 0
- [ ] Test with decimals: 89.5%, 2.1%, 4.2%
- [ ] Test edge case: all zeros → shows 0.0%
- [ ] Test edge case: only one type has value
- [ ] Verify percentages sum to ~100% (allow for rounding)

### Consistency Tests
- [ ] Generate same report in preview and PDF
- [ ] Compare percentages: Should match exactly
- [ ] Compare card order: Should match exactly
- [ ] Compare colors: Should look identical
- [ ] Compare layout: Should be aligned the same way

### Data Validation
- [ ] Excused days NOT included in total
- [ ] Dismissed days ARE included in total
- [ ] Null/undefined values treated as 0
- [ ] No negative percentages
- [ ] All percentages show 1 decimal place

## 🔧 Troubleshooting

### Issue: Preview and PDF percentages don't match
**Solution:** Check that both are using the same `first.attendance` object

### Issue: Percentages don't sum to 100%
**Solution:** This is expected due to rounding. Verify individual calculations are correct.

### Issue: Shows NaN or undefined
**Solution:** Check that `totalDays` is not 0 and all attendance values are numbers

### Issue: Wrong decimal places
**Solution:** Verify `.toFixed(1)` is used in both React and PDF

## 📝 Implementation Files

1. **PDFReportTemplate.tsx**
   - React Preview: Lines 1046-1131
   - PDF Generation: Lines 1898-1978

2. **EndOfTermReport.tsx**
   - Attendance data preparation with percentage calculation

3. **reportConfigAPI.js**
   - Default config: `showAttendanceDetails: false`

---

**Status:** ✅ Verified - Both preview and PDF use identical calculations
**Last Updated:** 2025-11-16
**Precision:** 1 decimal place (e.g., 89.5%)
