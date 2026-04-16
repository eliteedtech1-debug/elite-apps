#!/bin/bash
# Comprehensive script to standardize all table collations in the Elite Core database

echo "🚀 Starting comprehensive database collation standardization..."
echo ""

# Check if we're in the correct directory
if [ ! -f "fix_all_table_collations.sql" ]; then
    echo "❌ SQL file 'fix_all_table_collations.sql' not found in current directory"
    echo "Please run this script from the directory containing the SQL file"
    exit 1
fi

# Get database credentials from .env file
ENV_FILE="../../elscholar-api/.env"

if [ -f "$ENV_FILE" ]; then
    echo "📖 Reading database configuration from $ENV_FILE..."
    # Extract credentials using grep and sed
    DB_HOST=$(grep DB_HOST "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PORT=$(grep DB_PORT "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_USER=$(grep DB_USERNAME "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PASS=$(grep DB_PASSWORD "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_NAME=$(grep DB_NAME "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    # Set defaults if values are empty
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-3306}
    DB_USER=${DB_USER:-root}
    DB_PASS=${DB_PASS:-""}
    DB_NAME=${DB_NAME:-elite_db}
else
    echo "❌ .env file not found at $ENV_FILE"
    echo "Please create a .env file with your database credentials"
    exit 1
fi

echo "📡 Connecting to database: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"
echo "🗄️  Database: $DB_NAME"
echo ""

# Confirm before proceeding
echo "⚠️  This will standardize the collation for ALL tables in the database."
echo "⚠️  This operation may take several minutes depending on your data size."
echo ""
read -p "Do you want to continue? [y/N]: " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled by user."
    exit 0
fi

echo ""
echo "🔧 Applying comprehensive collation standardization..."

# Execute the SQL script
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < fix_all_table_collations.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database collation standardization completed successfully!"
    echo ""
    echo "🎉 All tables have been standardized to utf8mb4_unicode_ci collation!"
    echo "📋 The verification query shows any remaining collation mismatches (if any)."
    echo ""
    echo "💡 Please restart your application server to ensure all changes take effect."
    echo "💡 All stored procedures (academic_year, dashboard_query, manage_branches) should now work correctly."
else
    echo ""
    echo "❌ Error occurred during collation standardization."
    echo "Please check the database connection settings and ensure you have sufficient privileges."
    exit 1
fi