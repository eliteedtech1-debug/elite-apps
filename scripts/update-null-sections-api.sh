#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODk4LCJ1c2VyX3R5cGUiOiJBZG1pbiIsInNjaG9vbF9pZCI6IlNDSC8yMCIsImJyYW5jaF9pZCI6bnVsbCwiZW1haWwiOiJhYWthYmlyODhAZ21haWwuY29tIiwibGFzdEFjdGl2aXR5IjoiMjAyNS0xMi0wOFQyMToyNzoyOS4wMTFaIiwiaWF0IjoxNzY1MjI5MjQ5LCJzZXNzaW9uQ3JlYXRlZCI6IjIwMjUtMTItMDhUMjE6Mjc6MjkuMDExWiIsInJlbmV3YWxDb3VudCI6MCwiZXhwIjoxNzY1MzE1NjQ5fQ.vjHtkEy_xeU7K_vZxEHyOzdBLtTcLigtyWMLU3e1_1U"

echo "Fetching all character traits..."

# Fetch all traits
TRAITS=$(curl -s 'http://localhost:34567/character-traits' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  --data-raw '{"query_type":"Select School Characters"}')

# Extract traits with NULL or empty section and update them
echo "$TRAITS" | jq -r '.results[] | select(.section == null or .section == "") | "\(.id)|\(.category)|\(.description)"' | while IFS='|' read -r id category description; do
  echo "Updating trait ID $id: $description"
  
  curl -s 'http://localhost:34567/manage-character-traits' \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -H 'X-School-Id: SCH/20' \
    -H 'X-Branch-Id: BRCH00027' \
    --data-raw "{\"query_type\":\"Update Character\",\"id\":$id,\"category\":\"$category\",\"description\":\"$description\",\"section\":\"All\",\"status\":\"Active\"}"
  
  echo ""
done

echo "Update complete!"
