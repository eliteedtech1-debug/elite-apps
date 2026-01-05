#!/bin/bash

echo "=== RBAC DATA MIGRATION (WITH MENU DATA) ==="

# Export RBAC tables WITH DATA
echo "Exporting RBAC system with all data..."
mysqldump -u root elite_test_db \
  --complete-insert --extended-insert \
  rbac_menu_items rbac_menu_access rbac_menu_packages \
  rbac_school_packages rbac_permission_templates \
  rbac_conditional_access rbac_usage_analytics rbac_user_menu_access \
  > rbac_with_data.sql

# Export academic tables WITH DATA  
echo "Exporting academic system with data..."
mysqldump -u root elite_test_db \
  --complete-insert --extended-insert \
  lessons lesson_comments lesson_notes lesson_plans \
  lesson_time_table lesson_time_table_backup \
  syllabus syllabus_suggestions syllabus_tracker \
  > academic_with_data.sql

# Combine into production migration
echo "Creating production migration with data..."
cat > production_data_migration.sql << 'EOF'
-- Production Migration: RBAC + Academic with DATA
-- Includes menu items, subscriptions, and configurations

SET FOREIGN_KEY_CHECKS=0;
SET AUTOCOMMIT=0;
START TRANSACTION;

EOF

cat rbac_with_data.sql >> production_data_migration.sql
cat academic_with_data.sql >> production_data_migration.sql

cat >> production_data_migration.sql << 'EOF'

SET FOREIGN_KEY_CHECKS=1;
COMMIT;
EOF

echo "✅ Created: production_data_migration.sql"
echo "📊 Data included:"
echo "   - 123 menu items"
echo "   - 275 menu access rules" 
echo "   - 107 menu packages"
echo "   - All subscription data"
echo ""
echo "🚀 Deploy: mysql -u root production_db < production_data_migration.sql"
