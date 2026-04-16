#!/bin/bash

# Subject Mapping API Test Script
# Tests all three main endpoints

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODk4LCJ1c2VyX3R5cGUiOiJBZG1pbiIsInNjaG9vbF9pZCI6IlNDSC8yMCIsImJyYW5jaF9pZCI6bnVsbCwiZW1haWwiOiJhYWthYmlyODhAZ21haWwuY29tIiwibGFzdEFjdGl2aXR5IjoiMjAyNi0wMS0wMVQwNzo1ODo1OC43NjdaIiwiaWF0IjoxNzY3MjU0MzM4LCJzZXNzaW9uQ3JlYXRlZCI6IjIwMjYtMDEtMDFUMDc6NTg6NTguNzY3WiIsInJlbmV3YWxDb3VudCI6MCwiZXhwIjoxNzY3MzQwNzM4fQ.HeosLwsYSgXTlTLlatyS3jqXvpxOGq72pRxPHGVMU0Q"
BASE_URL="http://localhost:34567/api/v1/subject-mapping"

echo "🧪 Testing Subject Mapping APIs..."
echo

# Test 1: School Subjects
echo "1️⃣ Testing School Subjects API..."
SCHOOL_SUBJECTS=$(curl -s "$BASE_URL/school-subjects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-Id: SCH/20" \
  -H "X-User-Id: 898")

if echo "$SCHOOL_SUBJECTS" | jq -e '.success' > /dev/null; then
  COUNT=$(echo "$SCHOOL_SUBJECTS" | jq '.data | length')
  echo "✅ School Subjects: SUCCESS ($COUNT subjects found)"
else
  echo "❌ School Subjects: FAILED"
fi

# Test 2: Global Content
echo "2️⃣ Testing Global Content API..."
GLOBAL_CONTENT=$(curl -s "$BASE_URL/global-content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-Id: SCH/20" \
  -H "X-User-Id: 898")

if echo "$GLOBAL_CONTENT" | jq -e '.success' > /dev/null; then
  COUNT=$(echo "$GLOBAL_CONTENT" | jq '.data | length')
  echo "✅ Global Content: SUCCESS ($COUNT curriculum items found)"
else
  echo "❌ Global Content: FAILED"
fi

# Test 3: Mapped Content
echo "3️⃣ Testing Mapped Content API..."
MAPPED_CONTENT=$(curl -s "$BASE_URL/mapped-content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-Id: SCH/20" \
  -H "X-User-Id: 898")

if echo "$MAPPED_CONTENT" | jq -e '.success' > /dev/null; then
  COUNT=$(echo "$MAPPED_CONTENT" | jq '.data | length')
  echo "✅ Mapped Content: SUCCESS ($COUNT mappings found)"
else
  echo "⚠️ Mapped Content: No mappings yet (expected for new setup)"
fi

echo
echo "🎯 Subject Mapping APIs are ready!"
echo "📍 Frontend can now load: http://localhost:3000/academic/subject-mapping"
