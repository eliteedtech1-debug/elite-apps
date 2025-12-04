-- More dynamic approach: Update ca_setup records to match the currently active academic calendar for each school
-- This will handle schools in the middle of a term or any scenario where academic calendar is already set to Active

UPDATE ca_setup cs
JOIN academic_calendar ac ON cs.school_id = ac.school_id
SET 
    cs.academic_year = ac.academic_year,
    cs.term = ac.term
WHERE 
    ac.status = 'Active'
    AND cs.school_id = 'SCH/18';