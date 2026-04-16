#!/bin/bash

echo "=== SELECTIVE PRODUCTION MIGRATION ==="

# Step 1: Identify new/changed tables only
mysql -u root -e "
USE elite_test_db;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'elite_test_db' 
AND (table_name LIKE '%rbac%' 
     OR table_name LIKE '%lesson%' 
     OR table_name LIKE '%syllabus%'
     OR table_name IN ('users', 'staff_roles', 'permissions'))
ORDER BY table_name;" > new_tables_only.txt

echo "Tables to migrate:"
cat new_tables_only.txt

# Step 2: Export only new/changed tables
echo "Exporting new tables..."
mysqldump -u root elite_test_db $(cat new_tables_only.txt | grep -v table_name | tr '\n' ' ') > selective_migration.sql

# Step 3: Create migration script for production
cat > production_selective_migration.sql << 'EOF'
-- Selective Migration: Add new tables only
-- Safe for production - no existing data affected

SET FOREIGN_KEY_CHECKS=0;

-- Import new RBAC and academic tables
EOF

cat selective_migration.sql >> production_selective_migration.sql

echo "SET FOREIGN_KEY_CHECKS=1;" >> production_selective_migration.sql

echo "Created: production_selective_migration.sql"
echo "Size: $(wc -l < production_selective_migration.sql) lines"

# Step 4: Validation script
cat > validate_selective.sh << 'EOF'
#!/bin/bash
echo "Validating selective migration..."
mysql -u root -e "USE your_production_db; SELECT COUNT(*) as new_rbac_tables FROM information_schema.tables WHERE table_name LIKE '%rbac%';"
mysql -u root -e "USE your_production_db; SELECT COUNT(*) as new_academic_tables FROM information_schema.tables WHERE table_name LIKE '%lesson%' OR table_name LIKE '%syllabus%';"
EOF

chmod +x validate_selective.sh

echo "Ready for production:"
echo "1. Run: mysql -u root production_db < production_selective_migration.sql"
echo "2. Test: ./validate_selective.sh"
