-- Create grade boundaries for SCH/20
INSERT INTO grade_boundaries (school_id, branch_id, grade, min_percentage, max_percentage, remark, status) VALUES
('SCH/20', 'BRCH00027', 'A', 76.00, 100.00, 'Excellent', 'Active'),
('SCH/20', 'BRCH00027', 'B', 66.00, 75.00, 'Very Good', 'Active'),
('SCH/20', 'BRCH00027', 'C', 56.00, 65.00, 'Good', 'Active'),
('SCH/20', 'BRCH00027', 'D', 46.00, 55.00, 'Fair', 'Active'),
('SCH/20', 'BRCH00027', 'E', 36.00, 45.00, 'Poor', 'Active'),
('SCH/20', 'BRCH00027', 'F', 0.00, 35.00, 'Fail', 'Active');

-- Verify
SELECT grade, min_percentage, max_percentage, remark 
FROM grade_boundaries 
WHERE school_id = 'SCH/20' 
ORDER BY min_percentage DESC;
