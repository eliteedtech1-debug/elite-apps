#!/bin/bash

echo "🚀 Aggressive Import Strategy - Targeting 231 tables"

# Extract only CREATE TABLE statements
grep -A 50 "CREATE TABLE" /Users/apple/Downloads/kirmaskngov_skcooly_db.sql > /tmp/create_tables_only.sql

# Split into individual table files
awk '/CREATE TABLE/{close(out); out="/tmp/table_"++i".sql"} {print > out}' /tmp/create_tables_only.sql

echo "📊 Processing individual table imports..."
success=0
total=0

for table_file in /tmp/table_*.sql; do
    if [ -f "$table_file" ]; then
        total=$((total + 1))
        table_name=$(grep "CREATE TABLE" "$table_file" | sed 's/.*CREATE TABLE[^`]*`\([^`]*\)`.*/\1/')
        
        # Check if table already exists
        if mysql -h localhost -P 3306 -u root -p elite_db -e "SHOW TABLES LIKE '$table_name';" 2>/dev/null | grep -q "$table_name"; then
            echo "⏭️  Table $table_name already exists"
            success=$((success + 1))
        else
            # Try to import this table
            if mysql -h localhost -P 3306 -u root -p elite_db -e "SET FOREIGN_KEY_CHECKS=0; $(cat $table_file); SET FOREIGN_KEY_CHECKS=1;" 2>/dev/null; then
                echo "✅ Imported table: $table_name"
                success=$((success + 1))
            else
                echo "❌ Failed table: $table_name"
            fi
        fi
    fi
done

# Clean up
rm -f /tmp/table_*.sql /tmp/create_tables_only.sql

echo "📈 Final Results:"
current_count=$(mysql -h localhost -P 3306 -u root -p elite_db -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'elite_db';" 2>/dev/null | tail -1)
echo "   Tables in database: $current_count"
echo "   Expected total: 231"
echo "   Success rate: $(echo "scale=1; $current_count * 100 / 231" | bc)%"
