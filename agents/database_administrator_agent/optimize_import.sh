#!/bin/bash

echo "🔧 Database Administrator Agent - Optimizing MySQL Import"

# Create MySQL configuration for large imports
cat > /tmp/mysql_import.cnf << EOF
[mysql]
max_allowed_packet = 1073741824
net_read_timeout = 600
net_write_timeout = 600

[mysqld]
max_allowed_packet = 1073741824
innodb_buffer_pool_size = 512M
wait_timeout = 28800
interactive_timeout = 28800
bulk_insert_buffer_size = 256M
EOF

echo "📊 Current table count:"
mysql --defaults-extra-file=/tmp/mysql_import.cnf -h localhost -P 3306 -u root -p elite_db -e "SELECT COUNT(*) as current_tables FROM information_schema.tables WHERE table_schema = 'elite_db';"

echo "🚀 Starting optimized import with chunked processing..."

# Split the SQL file into manageable chunks
split -l 2000 /Users/apple/Downloads/kirmaskngov_skcooly_db.sql /tmp/chunk_

echo "📦 Processing chunks..."
chunk_count=0
success_count=0

for chunk_file in /tmp/chunk_*; do
    chunk_count=$((chunk_count + 1))
    echo "Processing chunk $chunk_count: $chunk_file"
    
    # Create optimized import for this chunk
    {
        echo "SET SESSION max_allowed_packet = 1073741824;"
        echo "SET SESSION wait_timeout = 28800;"
        echo "SET SESSION interactive_timeout = 28800;"
        echo "SET SESSION foreign_key_checks = 0;"
        echo "SET SESSION unique_checks = 0;"
        echo "SET SESSION autocommit = 0;"
        echo "SET SESSION sql_mode = '';"
        cat "$chunk_file"
        echo "COMMIT;"
        echo "SET SESSION foreign_key_checks = 1;"
        echo "SET SESSION unique_checks = 1;"
        echo "SET SESSION autocommit = 1;"
    } > /tmp/optimized_chunk.sql
    
    if mysql --defaults-extra-file=/tmp/mysql_import.cnf -h localhost -P 3306 -u root -p elite_db < /tmp/optimized_chunk.sql 2>/dev/null; then
        success_count=$((success_count + 1))
        echo "✅ Chunk $chunk_count imported successfully"
    else
        echo "⚠️ Chunk $chunk_count had issues, continuing..."
    fi
    
    rm -f /tmp/optimized_chunk.sql
done

echo "🧹 Cleaning up temporary files..."
rm -f /tmp/chunk_* /tmp/mysql_import.cnf

echo "📈 Final table count:"
mysql -h localhost -P 3306 -u root -p elite_db -e "SELECT COUNT(*) as final_tables FROM information_schema.tables WHERE table_schema = 'elite_db';"

echo "✅ Import optimization completed! Processed $chunk_count chunks, $success_count successful."
