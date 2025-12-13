#!/bin/bash

echo "🎯 Final Import - Completing remaining tables"

# Missing tables to import
MISSING_TABLES=(
    "features"
    "knowledge_domains_simplified" 
    "loans"
    "payment_entries"
    "permissions"
    "school_applicants"
    "students"
)

for table in "${MISSING_TABLES[@]}"; do
    echo "🔄 Importing table: $table"
    
    # Extract table creation and data for this specific table
    awk "/CREATE TABLE.*\`$table\`/,/^$/" /Users/apple/Downloads/kirmaskngov_skcooly_db.sql > /tmp/${table}_temp.sql
    
    # Import the table
    if mysql -h localhost -P 3306 -u root -p elite_db < /tmp/${table}_temp.sql 2>/dev/null; then
        echo "✅ Successfully imported: $table"
    else
        echo "❌ Failed to import: $table"
        # Try with foreign key checks disabled
        echo "🔄 Retrying $table with FK checks disabled..."
        mysql -h localhost -P 3306 -u root -p elite_db -e "SET FOREIGN_KEY_CHECKS=0; SOURCE /tmp/${table}_temp.sql; SET FOREIGN_KEY_CHECKS=1;" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Successfully imported: $table (FK disabled)"
        else
            echo "❌ Final failure: $table"
        fi
    fi
    
    # Clean up temp file
    rm -f /tmp/${table}_temp.sql
done

echo "🏁 Final import complete!"
echo "📊 Final count: $(mysql -h localhost -P 3306 -u root -p elite_db -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'elite_db';" 2>/dev/null | tail -1) tables"
