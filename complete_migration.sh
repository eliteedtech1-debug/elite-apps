#!/bin/bash

echo "=== FULL MIGRATION: 100% SUCCESS TARGET ==="

# Optimize MySQL for large imports
mysql -u root -e "
SET GLOBAL max_allowed_packet=1073741824;
SET GLOBAL innodb_buffer_pool_size=2147483648;
SET GLOBAL wait_timeout=86400;
SET GLOBAL interactive_timeout=86400;
SET GLOBAL net_read_timeout=3600;
SET GLOBAL net_write_timeout=3600;"

# Fresh start
mysql -u root -e "DROP DATABASE IF EXISTS skcooly_db; CREATE DATABASE skcooly_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Method 1: Direct import with optimizations
echo "Attempting direct import..."
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET UNIQUE_CHECKS=0;"
  echo "SET AUTOCOMMIT=0;"
  echo "SET SQL_LOG_BIN=0;"
  cat /Users/apple/Downloads/kirmaskngov_skcooly_db.sql
  echo "SET FOREIGN_KEY_CHECKS=1;"
  echo "SET UNIQUE_CHECKS=1;"
  echo "COMMIT;"
} | mysql -u root --max_allowed_packet=1073741824 skcooly_db

# Check progress
PROD_COUNT=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db';" -s)
echo "Production tables imported: $PROD_COUNT"

# Import all elite_test_db tables
echo "Importing all elite_test_db tables..."
mysqldump -u root elite_test_db | mysql -u root skcooly_db

FINAL_COUNT=$(mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'skcooly_db';" -s)
echo "Final count: $FINAL_COUNT tables"
echo "Success rate: $(echo "scale=1; $FINAL_COUNT * 100 / 250" | bc)%"
