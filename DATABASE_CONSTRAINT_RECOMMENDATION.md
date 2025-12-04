# Database Constraint Recommendation for Payment Entries

## Problem
The payment_entries table currently allows duplicate entries for the same fee item, student, term, and academic year. This can lead to data integrity issues when republishing fees.

## Recommended Solution
Add a unique constraint to prevent duplicate payment entries:

```sql
-- Add unique constraint to prevent duplicates
ALTER TABLE payment_entries 
ADD CONSTRAINT unique_payment_entry 
UNIQUE (ref_no, class_code, term, academic_year, admission_no, payment_status);
```

## What This Constraint Prevents
- Multiple payment entries for the same fee item (ref_no)
- Same student (admission_no) 
- Same class (class_code)
- Same term and academic year
- Same payment status

## Before Adding the Constraint
First, clean up any existing duplicates:

```sql
-- Find existing duplicates
SELECT ref_no, class_code, term, academic_year, admission_no, COUNT(*) as count
FROM payment_entries 
WHERE payment_status != 'Excluded'
GROUP BY ref_no, class_code, term, academic_year, admission_no
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Clean up duplicates (keep the latest entry)
DELETE pe1 FROM payment_entries pe1
INNER JOIN payment_entries pe2 
WHERE pe1.ref_no = pe2.ref_no 
  AND pe1.class_code = pe2.class_code 
  AND pe1.term = pe2.term 
  AND pe1.academic_year = pe2.academic_year 
  AND pe1.admission_no = pe2.admission_no
  AND pe1.payment_status != 'Excluded'
  AND pe2.payment_status != 'Excluded'
  AND pe1.item_id < pe2.item_id;
```

## Benefits
1. **Data Integrity**: Prevents duplicate payment entries at the database level
2. **Performance**: Faster queries due to unique index
3. **Consistency**: Ensures one payment entry per fee item per student
4. **Error Prevention**: Database will reject duplicate inserts with clear error messages

## Alternative Approach
If the unique constraint is too restrictive, consider adding a unique index instead:

```sql
CREATE UNIQUE INDEX idx_unique_payment_entry 
ON payment_entries (ref_no, class_code, term, academic_year, admission_no, payment_status)
WHERE payment_status != 'Excluded';
```

This allows multiple entries only when payment_status is 'Excluded'.

## Implementation Notes
- Test the constraint on a development database first
- Monitor application logs for any constraint violations
- Update application code to handle unique constraint violations gracefully
- Consider adding this constraint during a maintenance window