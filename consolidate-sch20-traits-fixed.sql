-- Consolidate SCH/20 character traits to "All" section (CORRECTED)

-- Step 1: Keep the lowest ID for each category+description, delete the rest
DELETE t1 FROM character_traits t1
INNER JOIN character_traits t2 
WHERE t1.id > t2.id 
  AND t1.school_id = 'SCH/20'
  AND t2.school_id = 'SCH/20'
  AND t1.category = t2.category 
  AND t1.description = t2.description;

-- Step 2: Update remaining records to "All" section
UPDATE character_traits 
SET section = 'All'
WHERE school_id = 'SCH/20';

-- Verification
SELECT 
    section,
    COUNT(*) as trait_count
FROM character_traits
WHERE school_id = 'SCH/20'
GROUP BY section;

SELECT category, description, section
FROM character_traits
WHERE school_id = 'SCH/20'
ORDER BY category, description;
