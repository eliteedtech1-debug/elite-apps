#!/bin/bash

echo "Finding files with duplicate message imports..."

# Find files that have multiple message imports in antd import statements
find elscholar-ui/src -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | while read file; do
  # Check if file has message imported multiple times from antd
  if grep -q "from [\"']antd[\"']" "$file"; then
    # Extract the antd import block and check for duplicate message
    antd_import=$(sed -n '/import.*{/,/} from ["\x27]antd["\x27]/p' "$file")
    message_count=$(echo "$antd_import" | grep -o "message" | wc -l | tr -d ' ')
    
    if [ "$message_count" -gt 1 ]; then
      echo "Fixing duplicate message imports in: $file"
      
      # Create a temporary file to work with
      temp_file=$(mktemp)
      
      # Process the file to remove duplicate message imports
      awk '
      BEGIN { in_antd_import = 0; antd_import = ""; message_found = 0 }
      
      /import.*{.*from ["\x27]antd["\x27]/ {
        # Single line antd import
        gsub(/message,.*message/, "message", $0)
        print $0
        next
      }
      
      /import.*{/ && /from ["\x27]antd["\x27]/ {
        # Multi-line antd import start and end on same line
        gsub(/message,.*message/, "message", $0)
        print $0
        next
      }
      
      /import.*{/ {
        if ($0 ~ /from ["\x27]antd["\x27]/) {
          # Single line case already handled above
          print $0
        } else {
          # Start of multi-line import, check if it ends with antd
          in_antd_import = 1
          antd_import = $0
          message_found = 0
          if ($0 ~ /message/) message_found = 1
        }
        next
      }
      
      in_antd_import && /} from ["\x27]antd["\x27]/ {
        # End of antd import block
        antd_import = antd_import "\n" $0
        if ($0 ~ /message/ && message_found) {
          # Remove this message occurrence
          gsub(/,?[ \t]*message[ \t]*,?/, "", $0)
          gsub(/,[ \t]*,/, ",", $0)  # Clean up double commas
          gsub(/,[ \t]*}/, " }", $0)  # Clean up comma before closing brace
        }
        print antd_import
        in_antd_import = 0
        antd_import = ""
        message_found = 0
        next
      }
      
      in_antd_import {
        # Inside antd import block
        if ($0 ~ /message/) {
          if (message_found) {
            # Remove this duplicate message
            gsub(/,?[ \t]*message[ \t]*,?/, "", $0)
            gsub(/,[ \t]*,/, ",", $0)  # Clean up double commas
            if ($0 ~ /^[ \t]*,?[ \t]*$/) next  # Skip if line becomes empty
          } else {
            message_found = 1
          }
        }
        antd_import = antd_import "\n" $0
        next
      }
      
      { print $0 }
      ' "$file" > "$temp_file"
      
      # Replace original file with fixed version
      mv "$temp_file" "$file"
      echo "✅ Fixed: $file"
    fi
  fi
done

echo "Done fixing duplicate message imports!"
