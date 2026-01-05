#!/bin/bash

echo "=== FIXING PRODUCTION IMPORT ==="

# Create clean version without foreign key constraints
sed -e 's/CONSTRAINT.*FOREIGN KEY.*REFERENCES.*,//g' \
    -e 's/CONSTRAINT.*FOREIGN KEY.*REFERENCES.*)//g' \
    -e '/FOREIGN KEY/d' \
    /Users/apple/Downloads/kirmaskngov_skcooly_db.sql > /tmp/clean_production.sql

# Import clean version
mysql -u root -e "DROP DATABASE full_skcooly; CREATE DATABASE full_skcooly;"
mysql -u root full_skcooly < /tmp/clean_production.sql

# Add new features
mysql -u root full_skcooly < final_production_migration.sql

# Final count
FINAL_COUNT=$(mysql -u root -e "USE full_skcooly; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'full_skcooly';" -s)
echo "✅ Final tables: $FINAL_COUNT/237"
echo "✅ Success rate: $(echo "scale=1; $FINAL_COUNT * 100 / 237" | bc)%"

rm -f /tmp/clean_production.sql
