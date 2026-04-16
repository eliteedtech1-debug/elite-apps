#!/bin/bash

# Script to enable Arabic for a test school
# Usage: ./ENABLE_ARABIC_TEST.sh

echo "======================================"
echo "  Arabic Report - Enable Test School  "
echo "======================================"
echo ""

# Show available schools
echo "📋 Available schools:"
mysql -u root elite_yazid -e "SELECT school_id, school_name, is_arabic FROM school_setup LIMIT 10;" 2>/dev/null

echo ""
echo "======================================"
echo "Enter the school_id to enable Arabic support:"
read -p "School ID: " SCHOOL_ID

if [ -z "$SCHOOL_ID" ]; then
    echo "❌ Error: School ID cannot be empty"
    exit 1
fi

# Enable Arabic for the school
echo ""
echo "🔄 Enabling Arabic for school: $SCHOOL_ID"
mysql -u root elite_yazid -e "UPDATE school_setup SET is_arabic = 1 WHERE school_id = '$SCHOOL_ID';" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Successfully enabled Arabic support!"
    echo ""
    echo "📊 Updated school info:"
    mysql -u root elite_yazid -e "SELECT school_id, school_name, is_arabic FROM school_setup WHERE school_id = '$SCHOOL_ID';" 2>/dev/null

    echo ""
    echo "======================================"
    echo "  Next Steps:"
    echo "======================================"
    echo "1. Restart the frontend: cd elscholar-ui && npm start"
    echo "2. Login with this school"
    echo "3. Go to: Academic → Examinations → End of Term Report"
    echo "4. You should see 'Report Language' selector"
    echo "5. Switch between English and العربية (Arabic)"
    echo ""
    echo "✅ Test the language toggle!"
else
    echo "❌ Error: Failed to update school"
fi

echo ""
