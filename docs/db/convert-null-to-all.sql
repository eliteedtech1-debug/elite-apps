-- Convert all NULL sections to "All" in character traits
UPDATE character_traits 
SET section = 'All' 
WHERE section IS NULL OR section = '';

-- Verify the update
SELECT COUNT(*) as updated_count 
FROM character_traits 
WHERE section = 'All';
