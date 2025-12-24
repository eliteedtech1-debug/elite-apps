-- =====================================================
-- SCHOOL LOCATIONS ENHANCEMENT - ADMISSION DATES
-- =====================================================
-- Add admission opening and closing dates to school_locations table

-- Add admission_open column
ALTER TABLE school_locations 
ADD COLUMN admission_open BOOLEAN DEFAULT FALSE AFTER status;

-- Add admission_closing_date column  
ALTER TABLE school_locations 
ADD COLUMN admission_closing_date DATE NULL AFTER admission_open;

-- Add index for admission queries
CREATE INDEX idx_school_locations_admission ON school_locations(admission_open, admission_closing_date);

-- Update existing records to have admission open by default
UPDATE school_locations 
SET admission_open = TRUE 
WHERE status = 'Active';

-- Sample data update (optional)
UPDATE school_locations 
SET admission_closing_date = '2025-03-31' 
WHERE admission_open = TRUE;

-- Verify changes
SELECT 
  school_name,
  branch_name,
  admission_open,
  admission_closing_date,
  status
FROM school_locations 
WHERE status = 'Active'
LIMIT 5;
