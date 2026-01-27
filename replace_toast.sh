#!/bin/bash

# Script to replace react-toastify with antd message

FILES=$(grep -r "react-toastify" elscholar-ui/src --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -l)

for file in $FILES; do
    echo "Processing: $file"
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Replace import statements
    sed -i '' 's/// import { toast } from "react-toastify";/import { message } from "antd";/g' "$file"
    sed -i '' 's/import { toast } from '\''react-toastify'\'';/import { message } from "antd";/g' "$file"
    
    # Replace message.success with message.success
    sed -i '' 's/toast\.success(/message.success(/g' "$file"
    
    # Replace message.error with message.error
    sed -i '' 's/toast\.error(/message.error(/g' "$file"
    
    # Replace message.warning with message.warning
    sed -i '' 's/toast\.warning(/message.warning(/g' "$file"
    sed -i '' 's/toast\.warn(/message.warning(/g' "$file"
    
    # Replace message.info with message.info
    sed -i '' 's/toast\.info(/message.info(/g' "$file"
    
    echo "✅ Updated: $file"
done

echo "🎉 All files updated!"
