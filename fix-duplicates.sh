#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODk4LCJ1c2VyX3R5cGUiOiJBZG1pbiIsInNjaG9vbF9pZCI6IlNDSC8yMCIsImJyYW5jaF9pZCI6bnVsbCwiZW1haWwiOiJhYWthYmlyODhAZ21haWwuY29tIiwibGFzdEFjdGl2aXR5IjoiMjAyNS0xMi0wOFQyMToyNzoyOS4wMTFaIiwiaWF0IjoxNzY1MjI5MjQ5LCJzZXNzaW9uQ3JlYXRlZCI6IjIwMjUtMTItMDhUMjE6Mjc6MjkuMDExWiIsInJlbmV3YWxDb3VudCI6MCwiZXhwIjoxNzY1MzE1NjQ5fQ.vjHtkEy_xeU7K_vZxEHyOzdBLtTcLigtyWMLU3e1_1U"

# Delete duplicates, keep first ID and update to "All"
declare -A traits=(
  ["138"]="Affective Traits|Attendance|139,140"
  ["57"]="Affective Traits|Attentiveness|55,54"
  ["65"]="Affective Traits|Attitude to School work|58,59"
  ["61"]="Affective Traits|Cooperation with others|63,62"
  ["67"]="Affective Traits|Health|66,71"
  ["75"]="Affective Traits|Honesty|68,70"
  ["73"]="Affective Traits|Leadership|84,83"
  ["78"]="Affective Traits|Neatness|76,77"
  ["80"]="Affective Traits|Perseverance|82,81,85"
  ["89"]="Affective Traits|Politeness|86,87"
  ["92"]="Affective Traits|Punctuality|90,91"
)

for keep_id in "${!traits[@]}"; do
  IFS='|' read -r category description delete_ids <<< "${traits[$keep_id]}"
  
  echo "Processing: $description"
  
  # Update kept trait to "All" section
  curl -s 'http://localhost:34567/manage-character-traits' \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -H 'X-School-Id: SCH/20' \
    -H 'X-Branch-Id: BRCH00027' \
    --data-raw "{\"query_type\":\"Update Character\",\"id\":$keep_id,\"category\":\"$category\",\"description\":\"$description\",\"section\":\"All\",\"status\":\"Active\"}"
  
  echo ""
  
  # Delete duplicates
  IFS=',' read -ra ids <<< "$delete_ids"
  for id in "${ids[@]}"; do
    echo "  Deleting duplicate ID: $id"
    curl -s 'http://localhost:34567/manage-character-traits' \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      -H 'X-School-Id: SCH/20' \
      -H 'X-Branch-Id: BRCH00027' \
      --data-raw "{\"query_type\":\"Delete Character\",\"id\":$id}"
    echo ""
  done
  
  echo "---"
done

echo "Done! Duplicates eliminated."
