#!/bin/bash

# Database credentials - update these with your actual credentials
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="skcooly_db"
DB_USER="root"
DB_PASS=""

echo "Updating NULL sections to 'All' in character_traits table..."

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} "$DB_NAME" <<EOF
-- Update NULL or empty sections to "All"
UPDATE character_traits 
SET section = 'All' 
WHERE section IS NULL OR section = '';

-- Show results
SELECT 
  COUNT(*) as total_traits,
  SUM(CASE WHEN section = 'All' THEN 1 ELSE 0 END) as all_section_count,
  COUNT(DISTINCT section) as unique_sections
FROM character_traits;

-- Show section distribution
SELECT section, COUNT(*) as count 
FROM character_traits 
GROUP BY section 
ORDER BY count DESC;
EOF

echo "Update complete!"
