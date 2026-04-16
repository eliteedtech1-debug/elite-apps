#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODk4LCJ1c2VyX3R5cGUiOiJBZG1pbiIsInNjaG9vbF9pZCI6IlNDSC8yMCIsImJyYW5jaF9pZCI6bnVsbCwiZW1haWwiOiJhYWthYmlyODhAZ21haWwuY29tIiwibGFzdEFjdGl2aXR5IjoiMjAyNS0xMi0wOFQyMToyNzoyOS4wMTFaIiwiaWF0IjoxNzY1MjI5MjQ5LCJzZXNzaW9uQ3JlYXRlZCI6IjIwMjUtMTItMDhUMjE6Mjc6MjkuMDExWiIsInJlbmV3YWxDb3VudCI6MCwiZXhwIjoxNzY1MzE1NjQ5fQ.vjHtkEy_xeU7K_vZxEHyOzdBLtTcLigtyWMLU3e1_1U"

echo "=========================================="
echo "Testing Character Traits Fallback Logic"
echo "=========================================="
echo ""

echo "1. Checking for NULL or empty sections..."
NULL_COUNT=$(curl -s 'http://localhost:34567/character-traits' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  --data-raw '{"query_type":"Select School Characters"}' | jq '[.results[] | select(.section == null or .section == "")] | length')

echo "   NULL/Empty sections found: $NULL_COUNT"
if [ "$NULL_COUNT" -eq 0 ]; then
  echo "   ✅ PASS: No NULL sections"
else
  echo "   ❌ FAIL: Found $NULL_COUNT NULL sections"
fi
echo ""

echo "2. Checking 'All' section traits..."
ALL_COUNT=$(curl -s 'http://localhost:34567/character-traits' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  --data-raw '{"query_type":"Select School Characters"}' | jq '[.results[] | select(.section == "All")] | length')

echo "   'All' section traits: $ALL_COUNT"
if [ "$ALL_COUNT" -gt 0 ]; then
  echo "   ✅ PASS: Found $ALL_COUNT traits in 'All' section"
else
  echo "   ⚠️  WARNING: No traits in 'All' section"
fi
echo ""

echo "3. Section distribution:"
curl -s 'http://localhost:34567/character-traits' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  --data-raw '{"query_type":"Select School Characters"}' | jq -r '.results | group_by(.section) | map({section: .[0].section, count: length}) | .[] | "   \(.section): \(.count) traits"'

echo ""
echo "4. Sample 'All' section traits:"
curl -s 'http://localhost:34567/character-traits' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  --data-raw '{"query_type":"Select School Characters"}' | jq -r '.results[] | select(.section == "All") | "   - \(.description) (\(.category))"' | head -5

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
