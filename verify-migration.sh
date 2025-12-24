#!/bin/bash

# Database Migration Verification Script

DB_NAME="elitedeploy"
DB_USER="root"

echo "🔍 Verifying database migration..."

# Check if database exists
echo "📊 Checking database existence..."
DB_EXISTS=$(mysql -u$DB_USER -e "SHOW DATABASES LIKE '$DB_NAME';" | grep -v Database | wc -l)
if [ $DB_EXISTS -eq 1 ]; then
    echo "✅ Database '$DB_NAME' exists"
else
    echo "❌ Database '$DB_NAME' not found"
    exit 1
fi

# Check RBAC tables
echo "🔐 Checking RBAC tables..."
RBAC_TABLES=("superadmin_features" "staff_roles" "staff_role_permissions")
for table in "${RBAC_TABLES[@]}"; do
    TABLE_EXISTS=$(mysql -u$DB_USER $DB_NAME -e "SHOW TABLES LIKE '$table';" | grep -c $table || echo "0")
    if [ $TABLE_EXISTS -eq 1 ]; then
        echo "✅ Table '$table' exists"
        ROW_COUNT=$(mysql -u$DB_USER $DB_NAME -e "SELECT COUNT(*) FROM $table;" | tail -1)
        echo "   📈 Rows: $ROW_COUNT"
    else
        echo "❌ Table '$table' missing"
    fi
done

# Check Simple Account Activation tables
echo "👤 Checking Simple Account Activation tables..."
ACTIVATION_TABLES=("simple_activations" "activation_logs")
for table in "${ACTIVATION_TABLES[@]}"; do
    TABLE_EXISTS=$(mysql -u$DB_USER $DB_NAME -e "SHOW TABLES LIKE '$table';" | grep -c $table || echo "0")
    if [ $TABLE_EXISTS -eq 1 ]; then
        echo "✅ Table '$table' exists"
        ROW_COUNT=$(mysql -u$DB_USER $DB_NAME -e "SELECT COUNT(*) FROM $table;" | tail -1)
        echo "   📈 Rows: $ROW_COUNT"
    else
        echo "❌ Table '$table' missing"
    fi
done

# Check existing core tables
echo "🏫 Checking core tables..."
CORE_TABLES=("users" "students" "teachers" "classes" "schools")
for table in "${CORE_TABLES[@]}"; do
    TABLE_EXISTS=$(mysql -u$DB_USER $DB_NAME -e "SHOW TABLES LIKE '$table';" | grep -c $table || echo "0")
    if [ $TABLE_EXISTS -eq 1 ]; then
        ROW_COUNT=$(mysql -u$DB_USER $DB_NAME -e "SELECT COUNT(*) FROM $table;" | tail -1)
        echo "✅ Table '$table': $ROW_COUNT rows"
    else
        echo "❌ Table '$table' missing"
    fi
done

echo "🎯 Migration verification completed!"
