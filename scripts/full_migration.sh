#!/bin/bash

# Complete Migration Script for Production
# This script will handle the full migration with optimizations

echo "=== PRODUCTION MIGRATION SCRIPT ==="
echo "Starting full production migration..."

# Step 1: Optimize MySQL settings
echo "1. Optimizing MySQL settings..."
mysql -u root -e "
SET GLOBAL max_allowed_packet=1073741824;
SET GLOBAL wait_timeout=28800;
SET GLOBAL interactive_timeout=28800;
SET GLOBAL net_read_timeout=600;
SET GLOBAL net_write_timeout=600;"

# Step 2: Create fresh database
echo "2. Preparing target database..."
mysql -u root -e "DROP DATABASE IF EXISTS skcooly_db; CREATE DATABASE skcooly_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Step 3: Import production data in chunks
echo "3. Importing production data..."
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
  echo "SET AUTOCOMMIT=0;"
  echo "START TRANSACTION;"
  
  # Split the file and import in chunks
  split -l 5000 /Users/apple/Downloads/kirmaskngov_skcooly_db.sql /tmp/prod_chunk_
  
  for chunk in /tmp/prod_chunk_*; do
    echo "-- Processing chunk: $chunk"
    cat "$chunk"
  done
  
  echo "SET FOREIGN_KEY_CHECKS=1;"
  echo "COMMIT;"
} | mysql -u root skcooly_db

# Step 4: Import new RBAC and academic features
echo "4. Importing new features..."
if [ -f "/Users/apple/Downloads/apps/elite/new_features.sql" ]; then
  mysql -u root skcooly_db < /Users/apple/Downloads/apps/elite/new_features.sql
fi

# Step 5: Verify migration
echo "5. Verifying migration..."
FINAL_COUNT=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db';" -s)
echo "Final table count: $FINAL_COUNT"

# Step 6: Test critical functionality
echo "6. Testing critical functionality..."
mysql -u root -e "USE skcooly_db; SELECT 'Academic Calendar' as test, COUNT(*) as records FROM academic_calendar;"
mysql -u root -e "USE skcooly_db; SELECT 'RBAC Menu Items' as test, COUNT(*) as records FROM rbac_menu_items;"
mysql -u root -e "USE skcooly_db; SELECT 'Syllabus' as test, COUNT(*) as records FROM syllabus;"

# Cleanup
rm -f /tmp/prod_chunk_*

echo "=== MIGRATION COMPLETE ==="
echo "Database: skcooly_db"
echo "Tables: $FINAL_COUNT"
echo "Status: Ready for testing"
