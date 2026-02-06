// Fix for Outstanding Balance Calculation in Admin Dashboard
// File: elscholar-api/src/routes/finance-dashboard.js

// CURRENT ISSUE:
// The outstanding balance calculation is using SUM(cr - dr) which doesn't properly
// account for refunds, scholarships, discounts, and payment statuses.

// CORRECTED OUTSTANDING BALANCE QUERY:
const correctedOutstandingQuery = `
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
    AND pe.item_category IN ('Fees', 'Item') -- Only fee-related items
`;

// EXPLANATION:
// 1. Bills (cr) - What students are supposed to pay
// 2. Minus Payments (dr) - What students actually paid  
// 3. Minus Discounts/Scholarships - Reductions in what they owe
// 4. Result = True outstanding amount

// IMPLEMENTATION:
// Replace lines 738-743 in elscholar-api/src/routes/finance-dashboard.js with:

const [outstanding] = await db.sequelize.query(
  correctedOutstandingQuery,
  { replacements: { school_id, startDate, endDate } }
);

// ADDITIONAL FIXES NEEDED:

// 1. Revenue Calculation should match the RevenueExpenditureReport:
const [revenue] = await db.sequelize.query(`
  SELECT COALESCE(SUM(dr), 0) AS totalRevenue
  FROM payment_entries
  WHERE school_id = :school_id
    AND dr > 0 
    AND payment_status IN ('Confirmed', 'Paid', 'completed')
    AND updated_at BETWEEN :startDate AND :endDate
`, { replacements: { school_id, startDate, endDate } });

// 2. Add proper expenditure tracking:
const [expenditure] = await db.sequelize.query(`
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
`, { replacements: { school_id, startDate, endDate } });

// TESTING:
// After implementing these fixes:
// 1. Outstanding should show realistic amounts (not ₦20,500 if only ₦7,000 was collected)
// 2. Revenue should match the RevenueExpenditureReport (₦7,000)
// 3. Expenditure should show actual expenses (currently ₦0 because no processed payroll)

console.log('Fix ready for implementation in finance-dashboard.js');
