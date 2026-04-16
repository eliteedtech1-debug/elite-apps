#!/bin/bash
# Script to apply the complete database collation fix for Elite Core System

echo "🚀 Starting complete database collation fix..."

# Get database credentials from .env file
if [ -f ../../elscholar-api/.env ]; then
    echo "📖 Reading database configuration from .env file..."
    source ../../elscholar-api/.env
else
    echo "❌ .env file not found in ../../elscholar-api/"
    echo "Please ensure you're running this from the elite/ directory"
    exit 1
fi

# Set default values if environment variables are not present
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USERNAME:-root}
DB_PASS=${DB_PASSWORD:-""}
DB_NAME=${DB_NAME:-elite_db}

echo "📡 Connecting to database: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"
echo "🗄️  Database: $DB_NAME"

# Execute the SQL script
echo "🔧 Applying database collation fixes..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < fix_everything_collation.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database collation fix applied successfully!"
    echo ""
    echo "🎉 The 'Illegal mix of collations' errors should now be resolved throughout your application."
    echo "💡 Please restart your application server to ensure all changes take effect."
else
    echo ""
    echo "❌ Error occurred while applying database fix."
    echo "Please check the database connection settings and SQL file for issues."
    exit 1
fi