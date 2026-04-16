#!/bin/bash

# Get current menu data
CURRENT_MENU=$(mysql -u root elite_test_db -N -e "SELECT menu_data FROM rbac_menu_cache WHERE id = 5;" 2>/dev/null)

# Create updated menu with Student List added to teacher's Daily Routine submenu
UPDATED_MENU=$(echo "$CURRENT_MENU" | jq '.[2].items[0].submenuItems += [{"label": "Student List", "link": "/student/student-list", "requiredPermissions": ["Form Master", "admin", "branchadmin"]}]')

# Update the database
mysql -u root elite_test_db -e "UPDATE rbac_menu_cache SET menu_data = '$UPDATED_MENU', updated_at = NOW() WHERE id = 5;" 2>/dev/null

echo "Menu updated successfully"
