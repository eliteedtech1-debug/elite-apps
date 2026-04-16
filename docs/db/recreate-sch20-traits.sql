-- Recreate SCH/20 character traits in "All" section
-- Based on the common traits across all 4 sections

INSERT INTO character_traits (school_id, branch_id, category, description, section) VALUES
('SCH/20', 'BRCH00027', 'Affective Traits', 'Attendance', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Attentiveness', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Attitude to School work', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Cooperation with others', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Health', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Honesty', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Leadership', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Neatness', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Perseverance', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Politeness', 'All'),
('SCH/20', 'BRCH00027', 'Affective Traits', 'Punctuality', 'All');

-- Verify
SELECT COUNT(*) as total_traits, section
FROM character_traits
WHERE school_id = 'SCH/20'
GROUP BY section;

SELECT id, category, description, section
FROM character_traits
WHERE school_id = 'SCH/20'
ORDER BY description;
