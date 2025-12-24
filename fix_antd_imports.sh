#!/bin/bash

# Find files that use message. but don't import it from antd
FILES=$(grep -r "message\." elscholar-ui/src --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -l)

for file in $FILES; do
    # Check if file has antd import but not message
    if grep -q "from.*antd" "$file" && ! grep -q "import.*message.*from.*antd" "$file"; then
        echo "Fixing antd import in: $file"
        
        # Add message to existing antd import
        sed -i '' 's/import {/import { message, /g' "$file"
        
        # Remove duplicate message imports
        sed -i '' 's/message, message/message/g' "$file"
        
        echo "✅ Fixed: $file"
    fi
done

echo "🎉 Fixed antd imports!"
