#!/bin/bash

echo "=== SAFE PRODUCTION MIGRATION (NEW TABLES ONLY) ==="

# Export only truly new tables (no users, permissions, etc.)
echo "Exporting new tables only..."
mysqldump -u root elite_test_db \
  lessons lesson_comments lesson_notes lesson_plans lesson_time_table lesson_time_table_backup \
  rbac_conditional_access rbac_menu_access rbac_menu_items rbac_menu_packages \
  rbac_permission_templates rbac_school_packages rbac_usage_analytics rbac_user_menu_access \
  syllabus syllabus_suggestions syllabus_tracker \
  > safe_production_migration.sql

echo "Created safe_production_migration.sql"
echo "Tables: 17 new tables only"
echo "Size: $(wc -l < safe_production_migration.sql) lines"

echo ""
echo "✅ SAFE FOR PRODUCTION:"
echo "mysql -u root production_db < safe_production_migration.sql"
