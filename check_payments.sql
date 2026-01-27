-- Quick SQL to check payment_entries data
SELECT 
  s.current_class,
  COUNT(pe.item_id) as payment_entries,
  SUM(pe.cr) as total_billed,
  SUM(pe.dr) as total_paid,
  COUNT(CASE WHEN pe.dr > 0 THEN 1 END) as actual_payments
FROM students s
LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no 
  AND pe.school_id = 'SCH/20'
  AND pe.term = 'First Term'
  AND pe.academic_year = '2025/2026'
  AND pe.payment_status != 'Excluded'
WHERE s.school_id = 'SCH/20'
  AND s.branch_id = 'BRCH00027'
  AND s.status IN ('Active', 'Suspended')
GROUP BY s.current_class
HAVING payment_entries > 0
ORDER BY total_paid DESC;
