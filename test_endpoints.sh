#!/bin/bash

# Enhanced Time Slot API Testing Suite
# School: SCH/10, Email: aakabir88@gmail.com

BASE_URL="http://localhost:34567"
SCHOOL_ID="SCH/10"

echo "🚀 Enhanced Time Slot API Testing Suite"
echo "📍 Base URL: $BASE_URL"
echo "🏫 School ID: $SCHOOL_ID"
echo "📅 Test Date: $(date)"
echo ""

# Test 1: Health Check (No Auth Required)
echo "🧪 Test 1: Health Check"
echo "GET /health"
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Failed"
echo ""

# Test 2: Nigerian Templates (Auth Required - Testing without auth first)
echo "🧪 Test 2: Nigerian Templates"
echo "GET /api/nigerian-templates"
curl -s "$BASE_URL/api/nigerian-templates" | jq '.' || echo "❌ Failed"
echo ""

# Test 3: Teacher Assignments (Auth Required)
echo "🧪 Test 3: Teacher Assignments"
echo "GET /api/teacher-assignments?section=Primary"
curl -s "$BASE_URL/api/teacher-assignments?section=Primary" | jq '.' || echo "❌ Failed"
echo ""

# Test 4: Prayer Times (Auth Required)
echo "🧪 Test 4: Prayer Times"
echo "GET /api/prayer-times?date=2025-12-31"
curl -s "$BASE_URL/api/prayer-times?date=2025-12-31" | jq '.' || echo "❌ Failed"
echo ""

# Test 5: Ramadan Adjustments (Auth Required)
echo "🧪 Test 5: Ramadan Adjustments"
echo "GET /api/ramadan-adjustments"
curl -s "$BASE_URL/api/ramadan-adjustments" | jq '.' || echo "❌ Failed"
echo ""

# Test 6: Enhanced Time Slots (Auth Required)
echo "🧪 Test 6: Enhanced Time Slots"
echo "POST /api/enhanced-time-slots"
curl -s -X POST "$BASE_URL/api/enhanced-time-slots" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "Primary",
    "school_id": "'$SCHOOL_ID'",
    "time_slots": [{
      "day": "Monday",
      "start_time": "08:00",
      "end_time": "08:40",
      "subject": "Mathematics",
      "class_code": "PRI1A"
    }]
  }' | jq '.' || echo "❌ Failed"
echo ""

# Test 7: Generate from Template (Auth Required)
echo "🧪 Test 7: Generate from Template"
echo "POST /api/generate-from-template"
curl -s -X POST "$BASE_URL/api/generate-from-template" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "NGR_PRIMARY_STD",
    "section": "Primary",
    "school_id": "'$SCHOOL_ID'"
  }' | jq '.' || echo "❌ Failed"
echo ""

# Test 8: Generate AI Timetable (Auth Required)
echo "🧪 Test 8: Generate AI Timetable"
echo "POST /api/generate-ai-timetable"
curl -s -X POST "$BASE_URL/api/generate-ai-timetable" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "Primary",
    "apply_cultural_rules": true,
    "school_id": "'$SCHOOL_ID'"
  }' | jq '.' || echo "❌ Failed"
echo ""

echo "📋 Testing Complete!"
echo "🎯 Note: Authentication errors expected for protected endpoints"
echo "🔐 Next: Test with valid JWT token"
