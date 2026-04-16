#!/bin/bash

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-skcooly_db}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"

echo "================================================"
echo "Updating NULL sections to 'All'"
echo "================================================"
echo ""

# Execute the SQL file
if [ -n "$DB_PASS" ]; then
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < update-null-sections-to-all.sql
else
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < update-null-sections-to-all.sql
fi

echo ""
echo "================================================"
echo "Update Complete!"
echo "================================================"
echo ""
echo "You can now manage all traits at:"
echo "http://localhost:3000/academic/character-subjects"
