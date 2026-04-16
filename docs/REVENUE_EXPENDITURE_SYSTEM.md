# Revenue & Expenditure Tracking System

## Overview
The Elite Core system tracks financial data through two main components:
- **Revenue**: Expected income from student fees and bills
- **Expenditure**: Actual costs including payroll, expenses, and discounts

## Revenue Calculation

### Source: `payment_entries` table
```sql
SUM(cr) WHERE payment_status NOT IN ('Excluded', 'Cancelled', 'Reversed', 'Discount', 'Scholarship')
```

### Current Data (SCH/23):
- **Expected Revenue**: ₦30,000.00
- **Source**: Student fee bills (credit entries)
- **Excludes**: Cancelled bills, discounts, scholarships

## Expenditure Calculation

### Components:
1. **Processed Payroll** - From `payroll_lines` table
2. **Direct Expenses** - From `payment_entries` with expense categories  
3. **Discounts/Scholarships** - Fee reductions

### SQL Logic:
```sql
-- Payroll (only processed)
SELECT SUM(net_pay) FROM payroll_lines 
WHERE is_processed = 1 AND school_id = :schoolId

-- Plus expense categories
SELECT SUM(dr) FROM payment_entries 
WHERE item_category IN ('Salary', 'Payroll', 'Expense', 'Expenditure', 'Operational Cost')

-- Plus discounts/scholarships  
SELECT SUM(cr) FROM payment_entries 
WHERE payment_status IN ('Discount', 'Scholarship')
```

## Database Tables

### Revenue Tables:
- `payment_entries` - Student bills and payments
  - `cr` = Credit (bills/invoices)
  - `dr` = Debit (payments received)

### Expenditure Tables:
- `payroll_lines` - Staff salary records
  - `net_pay` = Final salary amount
  - `is_processed` = 1 (paid), 0 (pending)
- `payroll_periods` - Payroll cycles
- `payroll_items` - Salary components

## Current Status (SCH/23):

### Revenue:
- **Total Expected**: ₦30,000.00
- **From**: 179 students across 14 classes
- **Breakdown**: JSS1 (₦30,000), other classes (₦0)

### Expenditure:
- **Current**: ₦0.00 (no processed payroll)
- **Pending Payroll**: ₦25,050.00 (unprocessed)
- **Staff Records**: 4 payroll entries

## API Endpoints:

### Revenue/Expenditure Report:
```
POST /payments/revenue-expenditure
{
  "startDate": "2025-01-01",
  "endDate": "2026-12-31", 
  "school_id": "SCH/23",
  "branch_id": "BRCH/29"
}
```

### Response:
```json
{
  "success": true,
  "data": [{
    "period": "2025/2026/First Term",
    "revenue": "30000.00",
    "expenditure": "0.00"
  }]
}
```

## Key Insights:

1. **Revenue is accurate** - Matches fees collection page (₦30,000)
2. **Expenditure is realistic** - Only counts processed/paid amounts
3. **Payroll pending** - ₦25,050 awaiting processing
4. **No expense tracking** - System lacks operational expense entries

## To Increase Expenditure:
1. Process pending payroll (`is_processed = 1`)
2. Add expense entries with proper categories
3. Record operational costs (utilities, supplies, etc.)
4. Track discounts and scholarships given

## File Location:
- **Backend**: `/elscholar-api/src/controllers/payments.js` (revenueExpenditureReport function)
- **Frontend**: `/elscholar-ui/src/feature-module/mainMenu/adminDashboard/RevenueExpenditureReport.tsx`

---
*Last Updated: 2026-02-01*
*System: Elite Core Management System*
