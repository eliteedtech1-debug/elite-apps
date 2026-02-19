#!/bin/bash

# Script to create elite_prod_db and import kirmaskngov_skcooly_db.gzip
# Ensures exact replication of charset, collation, and all data

set -e  # Exit on error

BACKUP_FILE="$HOME/Downloads/kirmaskngov_skcooly_db.gzip"
NEW_DB="elite_prod_db"
MYSQL_USER="root"

echo "🔍 Checking backup file..."
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found at $BACKUP_FILE"
  exit 1
fi

echo "✅ Backup file found: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
echo ""

echo "🗑️  Dropping existing database if exists..."
mysql -u $MYSQL_USER -e "DROP DATABASE IF EXISTS $NEW_DB;"

echo "🆕 Creating database with utf8mb4 charset and utf8mb4_unicode_ci collation..."
mysql -u $MYSQL_USER -e "
  CREATE DATABASE $NEW_DB 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
"

echo "✅ Database created successfully"
echo ""

echo "📥 Importing data from gzip file..."
echo "   This may take a few minutes depending on database size..."
(
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
  gunzip -c "$BACKUP_FILE"
  echo "SET FOREIGN_KEY_CHECKS=1;"
) | mysql -u $MYSQL_USER $NEW_DB 2>&1 | grep -v "ERROR 1906" || true

echo ""
echo "✅ Import completed successfully!"
echo ""

echo "📊 Verifying import..."
TABLE_COUNT=$(mysql -u $MYSQL_USER -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$NEW_DB';")
echo "   Tables imported: $TABLE_COUNT"

echo ""
echo "🔍 Database details:"
mysql -u $MYSQL_USER -e "
  SELECT 
    SCHEMA_NAME as 'Database',
    DEFAULT_CHARACTER_SET_NAME as 'Charset',
    DEFAULT_COLLATION_NAME as 'Collation'
  FROM information_schema.SCHEMATA 
  WHERE SCHEMA_NAME = '$NEW_DB';
"

echo ""
echo "📋 Sample tables:"
mysql -u $MYSQL_USER -e "
  SELECT 
    TABLE_NAME as 'Table',
    TABLE_ROWS as 'Rows',
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as 'Size (MB)'
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = '$NEW_DB' 
  ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC 
  LIMIT 10;
"

echo ""
echo "✅ Database '$NEW_DB' created and imported successfully!"
echo ""
echo "🔧 To use this database, update your .env file:"
echo "   DB_NAME=$NEW_DB"
