#!/bin/bash

# Migration simulation script
echo "Starting migration simulation..."

# Step 1: Prepare the target database
echo "Preparing skcooly_db..."
mysql -u root -e "DROP DATABASE IF EXISTS skcooly_db; CREATE DATABASE skcooly_db;"

# Step 2: Import with foreign key checks disabled
echo "Importing production data..."
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
  echo "SET AUTOCOMMIT=0;"
  echo "START TRANSACTION;"
  cat /Users/apple/Downloads/kirmaskngov_skcooly_db.sql
  echo "SET FOREIGN_KEY_CHECKS=1;"
  echo "COMMIT;"
} | mysql -u root skcooly_db

# Step 3: Verify import
echo "Verifying import..."
TABLE_COUNT=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db';" -s)
echo "Imported $TABLE_COUNT tables to skcooly_db"

# Step 4: Export new RBAC tables from elite_test_db
echo "Exporting new RBAC and academic tables..."
mysql -u root -e "USE elite_test_db; SHOW TABLES;" | grep -E "(rbac|syllabus|lesson)" > /tmp/new_tables.txt

if [ -s /tmp/new_tables.txt ]; then
  echo "Found new tables to migrate:"
  cat /tmp/new_tables.txt
  
  # Export the new tables
  mysqldump -u root elite_test_db $(cat /tmp/new_tables.txt | tr '\n' ' ') > /Users/apple/Downloads/apps/elite/new_features.sql
  
  # Import new tables to skcooly_db
  echo "Importing new features to skcooly_db..."
  mysql -u root skcooly_db < /Users/apple/Downloads/apps/elite/new_features.sql
  
  # Final verification
  FINAL_COUNT=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db';" -s)
  echo "Final table count in skcooly_db: $FINAL_COUNT"
  
  echo "Migration simulation completed successfully!"
else
  echo "No new tables found to migrate."
fi

# Cleanup
rm -f /tmp/new_tables.txt

echo "Migration simulation finished."
