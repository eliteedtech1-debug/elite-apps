-- Test the exact queries used in the fixed API endpoints

USE full_skcooly;

SELECT '=== TESTING FIXED ADMIN DASHBOARD QUERIES ===' as test_section;

-- 1. Test Fixed Fees Collected Query (from finance-dashboard.js)
SELECT 'Fixed Fees Collected Query' as query_name;
SELECT COALESCE(
  SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) -
  SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END), 0
) AS totalFeesCollected
FROM payment_entries
WHERE school_id = 'SCH/TEST'
  AND item_category IN ('Fees','Item')
  AND updated_at BETWEEN '2025-01-01' AND '2025-12-31';

-- 2. Test Fixed Outstanding Balance Query
SELECT 'Fixed Outstanding Balance Query' as query_name;
SELECT 
  COALESCE(
    -- Expected Revenue (bills minus scholarships/discounts)
    SUM(CASE WHEN cr > 0 AND payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN cr ELSE 0 END) -
    SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship') AND cr > 0 THEN cr ELSE 0 END) -
    -- Collected Revenue (payments minus refunds)
    SUM(CASE WHEN dr > 0 AND payment_status IN ('Confirmed', 'Paid', 'completed') THEN dr ELSE 0 END) +
    SUM(CASE WHEN payment_status = 'Refund' AND cr > 0 THEN cr ELSE 0 END),
    0
  ) AS totalOutstanding
FROM payment_entries pe
WHERE pe.school_id = 'SCH/TEST'
  AND pe.updated_at BETWEEN '2025-01-01' AND '2025-12-31'
  AND pe.item_category IN ('Fees', 'Item');

-- 3. Test Fixed Expenditure Query
SELECT 'Fixed Expenditure Query' as query_name;
SELECT 
  COALESCE(
    SUM(CASE WHEN item_category IN ('Expense', 'Operational Cost') AND dr > 0 THEN dr ELSE 0 END) +
    SUM(CASE WHEN payment_status IN ('Discount', 'Scholarship', 'Refund') AND cr > 0 THEN cr ELSE 0 END),
    0
  ) AS totalExpenditure
FROM payment_entries pe
WHERE pe.school_id = 'SCH/TEST'
  AND pe.updated_at BETWEEN '2025-01-01' AND '2025-12-31';

SELECT '=== TESTING REVENUE EXPENDITURE REPORT QUERY ===' as test_section;

-- 4. Test Fixed Revenue Expenditure Report Query (from payments.js)
SELECT 'Revenue Expenditure Report Query' as query_name;
SELECT
  CONCAT(COALESCE(pe.academic_year, 'N/A'), '/', COALESCE(pe.term, 'N/A')) AS period,
  SUM(
    CASE
      WHEN pe.dr > 0 AND pe.payment_status IN ('Confirmed', 'Paid', 'completed')
      THEN pe.dr
      ELSE 0
    END
  ) - SUM(
    CASE
      WHEN pe.payment_status = 'Refund' AND pe.cr > 0
      THEN pe.cr
      ELSE 0
    END
  ) AS revenue,
  SUM(
    CASE
      WHEN pe.item_category IN ('Expense', 'Operational Cost') 
      AND pe.dr > 0
      THEN pe.dr
      WHEN pe.payment_status IN ('Discount', 'Scholarship', 'Refund') AND pe.cr > 0
      THEN pe.cr
      ELSE 0
    END
  ) AS expenditure
FROM payment_entries pe
WHERE pe.created_at BETWEEN @startDate AND @endDate
  AND pe.school_id = @school_id
GROUP BY academic_year, term
HAVING revenue > 0 OR expenditure > 0
ORDER BY academic_year DESC, FIELD(term, 'First Term', 'Second Term', 'Third Term');

SELECT '=== VERIFICATION SUMMARY ===' as test_section;
SELECT 
  'Expected Results' as summary,
  'Fees Collected: ₦128,000' as fees_collected,
  'Outstanding: ₦44,000' as outstanding,
  'Expenditure: ₦45,000' as expenditure,
  'Revenue (same as fees collected): ₦128,000' as revenue;
