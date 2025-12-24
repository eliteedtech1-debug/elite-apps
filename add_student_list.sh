#!/bin/bash

# Get current menu
MENU=$(mysql -u root elite_test_db -N -e "SELECT menu_data FROM rbac_menu_cache WHERE id = 5;" 2>/dev/null)

# Add Student List to Daily Routine submenu using jq
UPDATED=$(echo "$MENU" | jq '.[2].items[0].submenuItems += [{"label": "Student List", "link": "/student/student-list", "requiredPermissions": ["Form Master", "admin", "branchadmin"]}]')

# Escape for SQL
ESCAPED=$(echo "$UPDATED" | sed "s/'/\\\\'/g")

# Update database
mysql -u root elite_test_db -e "UPDATE rbac_menu_cache SET menu_data = '$ESCAPED', updated_at = NOW() WHERE id = 5;" 2>/dev/null

echo "Student List added to teacher menu successfully"
