-- =====================================================
-- STUDENT TYPE MIGRATION FOR SCHOOL REVENUES
-- =====================================================

-- Update school_revenues table to use correct student types that match students.status

-- 1. First, let's see what student_type values currently exist
SELECT DISTINCT student_type FROM school_revenues;

-- 2. Update the enum to include the correct student status values
ALTER TABLE school_revenues 
MODIFY COLUMN student_type ENUM(
    'All Students',
    'Fresh Student', 
    'Returning Student',
    'Active',
    'Suspended'
) NOT NULL DEFAULT 'All Students';

-- 3. Update existing records to use the new values
UPDATE school_revenues 
SET student_type = CASE 
    WHEN student_type = 'All' THEN 'All Students'
    WHEN student_type = 'Fresh' THEN 'Fresh Student'
    WHEN student_type = 'Returning' THEN 'Returning Student'
    WHEN student_type = 'None' THEN 'All Students'
    ELSE student_type
END;

-- 4. Verify the changes
SELECT DISTINCT student_type FROM school_revenues;

-- 5. Show the updated table structure
DESCRIBE school_revenues;

SELECT 'Student Type Migration Completed Successfully!' as status;