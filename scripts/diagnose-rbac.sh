#!/bin/bash

echo "=== RBAC Production Diagnostics ==="
echo ""

# 1. Check if staff_role_definitions table exists
echo "1. Checking staff_role_definitions table..."
mysql -u root -p skcooly_db -e "SHOW TABLES LIKE 'staff_role_definitions';"
echo ""

# 2. Count records
echo "2. Counting records in staff_role_definitions..."
mysql -u root -p skcooly_db -e "SELECT COUNT(*) as total FROM staff_role_definitions;"
echo ""

# 3. Show sample data
echo "3. Sample data from staff_role_definitions..."
mysql -u root -p skcooly_db -e "SELECT role_id, role_name, school_id FROM staff_role_definitions LIMIT 5;"
echo ""

# 4. Check related tables
echo "4. Checking related RBAC tables..."
mysql -u root -p skcooly_db -e "SHOW TABLES LIKE '%role%';"
echo ""

# 5. Test API endpoint locally
echo "5. Testing API endpoint (update URL and token)..."
echo "Run this manually:"
echo "curl 'http://localhost:34567/api/rbac/roles-unified?school_id=SCH/23' -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""

echo "=== Diagnostics Complete ==="
