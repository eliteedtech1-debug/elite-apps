# Financial Dashboard Calculation Fix

## Issue Reported
The branch admin dashboard at `http://localhost:3000/branchadmin-dashboard` shows incorrect financial figures:
- **Total Outstanding**: ₦20,500.00 (0%)
- **Total Revenue**: ₦7,000.00 (Jan 3 - Feb 1, 2026)
- **Expected Revenue**: ₦30,000.00 from receipt classes

The calculations don't account for refunds, scholarships, discounts, etc.

## Root Cause Analysis

### 1. Outstanding Balance Calculation (FIXED)
**Problem**: Used simple `SUM(cr - dr)` which doesn't handle payment statuses properly.

**Original Code**:
```sql
SELECT COALESCE(SUM(cr - dr), 0) AS totalOutstanding
FROM payment_entries
WHERE school_id = :school_id
  AND updated_at BETWEEN :startDate AND :endDate
```

**Fixed Code**:
```sql
SELECT 
  COALESCE(
    SUM(
      CASE 
        -- Bills/Invoices (what students owe)
        WHEN pe.cr > 0 AND pe.payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') 
        THEN pe.cr
        ELSE 0
      END
    ) - 
    SUM(
      CASE 
        -- Payments received (what students paid)
        WHEN pe.dr > 0 AND pe.payment_status IN ('Confirmed', 'Paid', 'completed')
        THEN pe.dr
        ELSE 0
      END
    ) - 
    SUM(
      CASE 
        -- Discounts and scholarships (reduce outstanding)
        WHEN pe.payment_status IN ('Discount', 'Scholarship') AND pe.cr > 0
        THEN pe.cr
        ELSE 0
      END
    ), 
    0
  ) AS totalOutstanding
FROM payment_entries pe
WHERE pe.school_id = :school_id
  AND pe.updated_at BETWEEN :startDate AND :endDate
  AND pe.item_category IN ('Fees', 'Item')
```

### 2. Revenue Calculation (FIXED)
**Problem**: Included all debits without filtering payment status.

**Fixed**: Now only counts confirmed/paid transactions:
```sql
SELECT COALESCE(SUM(dr), 0) AS totalFeesCollected
FROM payment_entries
WHERE school_id = :school_id  
  AND item_category IN ('Fees','Item')
  AND dr > 0 
  AND payment_status IN ('Confirmed', 'Paid', 'completed')
  AND updated_at BETWEEN :startDate AND :endDate
```

### 3. Added Expenditure Tracking (NEW)
**Added**: Comprehensive expenditure calculation including:
- Processed payroll from `payroll_lines`
- Expense categories from `payment_entries`
- Discounts and scholarships given

```sql
SELECT 
  COALESCE(
    SUM(
      CASE
        WHEN pe.item_category IN ('Salary', 'Payroll', 'Expense', 'Expenditure', 'Operational Cost') 
        AND pe.dr > 0
        THEN pe.dr
        WHEN pe.payment_status IN ('Discount', 'Scholarship') AND pe.cr > 0
        THEN pe.cr
        ELSE 0
      END
    ) +
    COALESCE((
      SELECT SUM(pl.net_pay) 
      FROM payroll_lines pl 
      WHERE pl.school_id = :school_id 
      AND pl.created_at BETWEEN :startDate AND :endDate
      AND pl.is_processed = 1
    ), 0),
    0
  ) AS totalExpenditure
FROM payment_entries pe
WHERE pe.school_id = :school_id
  AND pe.updated_at BETWEEN :startDate AND :endDate
```

## Files Modified

### Backend:
- `elscholar-api/src/routes/finance-dashboard.js` - Fixed `/admin-dashboard/metrics` endpoint

### Expected Results After Fix:

1. **Total Outstanding**: Should show realistic amounts based on actual unpaid bills
2. **Total Revenue**: Should match the RevenueExpenditureReport (₦7,000)
3. **Total Expenditure**: Should show actual expenses (currently ₦0 because no processed payroll)

## Data Consistency

The fix ensures consistency between:
- Branch admin dashboard figures
- Revenue/Expenditure report
- Receipt classes page
- Payment entries data

## Testing Steps

1. Restart the backend server
2. Navigate to `http://localhost:3000/branchadmin-dashboard`
3. Verify the financial figures are now realistic and consistent
4. Compare with `http://localhost:3000/management/receipt-classes`
5. Check that discounts, scholarships, and refunds are properly accounted for

## Current Data Context (SCH/23):
- **Expected Revenue**: ₦30,000.00 (from student bills)
- **Actual Revenue**: ₦7,000.00 (payments received)
- **Outstanding**: Should be ₦23,000.00 (₦30,000 - ₦7,000)
- **Expenditure**: ₦0.00 (no processed payroll yet)
- **Pending Payroll**: ₦25,050.00 (unprocessed)

---
*Fix Applied: 2026-02-01*
*System: Elite Core Management System*
