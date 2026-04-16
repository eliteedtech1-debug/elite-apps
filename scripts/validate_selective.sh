#!/bin/bash
echo "Validating selective migration..."
mysql -u root -e "USE your_production_db; SELECT COUNT(*) as new_rbac_tables FROM information_schema.tables WHERE table_name LIKE '%rbac%';"
mysql -u root -e "USE your_production_db; SELECT COUNT(*) as new_academic_tables FROM information_schema.tables WHERE table_name LIKE '%lesson%' OR table_name LIKE '%syllabus%';"
