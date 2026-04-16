-- Consolidate SCH/20 character traits to "All" section
-- This will keep one record per unique category+description and delete duplicates

-- Step 1: Update the first occurrence of each trait to "All" section
UPDATE character_traits t1
INNER JOIN (
    SELECT MIN(id) as keep_id, category, description
    FROM character_traits
    WHERE school_id = 'SCH/20'
    GROUP BY category, description
) t2 ON t1.id = t2.keep_id
SET t1.section = 'All';

-- Step 2: Delete duplicate records (keep only the one we just updated)
DELETE t1 FROM character_traits t1
INNER JOIN character_traits t2 
WHERE t1.id > t2.id 
  AND t1.school_id = 'SCH/20'
  AND t2.school_id = 'SCH/20'
  AND t1.category = t2.category 
  AND t1.description = t2.description;

-- Verification: Show results
SELECT 
    section,
    COUNT(*) as trait_count,
    GROUP_CONCAT(DISTINCT description ORDER BY description SEPARATOR ', ') as traits
FROM character_traits
WHERE school_id = 'SCH/20'
GROUP BY section;

-- Show all traits
SELECT id, category, description, section
FROM character_traits
WHERE school_id = 'SCH/20'
ORDER BY category, description;
