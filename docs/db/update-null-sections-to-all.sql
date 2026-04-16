-- Step 1: Update all NULL or empty sections to "All"
UPDATE character_traits 
SET section = 'All' 
WHERE section IS NULL OR section = '' OR TRIM(section) = '';

-- Step 2: Delete duplicates, keeping only the lowest ID for each category+description combination
DELETE t1 FROM character_traits t1
INNER JOIN character_traits t2 
WHERE t1.id > t2.id 
  AND t1.category = t2.category 
  AND t1.description = t2.description
  AND t1.section = t2.section;

-- Verification: Show results
SELECT 
  'Total traits after cleanup' as metric,
  COUNT(*) as count
FROM character_traits
UNION ALL
SELECT 
  'Traits with "All" section' as metric,
  COUNT(*) as count
FROM character_traits 
WHERE section = 'All'
UNION ALL
SELECT 
  'NULL sections remaining' as metric,
  COUNT(*) as count
FROM character_traits 
WHERE section IS NULL OR section = '' OR TRIM(section) = '';

-- Show section distribution
SELECT 
  COALESCE(section, 'NULL') as section,
  COUNT(*) as trait_count,
  GROUP_CONCAT(DISTINCT category ORDER BY category SEPARATOR ', ') as categories
FROM character_traits
GROUP BY section
ORDER BY trait_count DESC;

-- Show any remaining duplicates (should be empty)
SELECT 
  category,
  description,
  section,
  COUNT(*) as duplicate_count
FROM character_traits
GROUP BY category, description, section
HAVING COUNT(*) > 1;
