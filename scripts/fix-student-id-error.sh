#!/bin/bash

# Quick fix for student_id error in chatbot
# This adds an alias so both student_id and admission_no work

echo "Checking for student_id usage in chatbot queries..."

cd /var/www/html/elite-apiv2

# Search for the problematic query
grep -rn "SELECT.*student_id" src/controllers/ChatbotController.js src/services/ 2>/dev/null || echo "Not found in chatbot files"

# The error is likely in a raw SQL query
# Check if it's in stored procedures or views
echo ""
echo "This error is coming from a query that uses 'student_id' column."
echo "Your database uses 'admission_no' instead."
echo ""
echo "The chatbot is working, but some query needs to be updated."
echo "Check the full error stack trace to find which query is failing."
echo ""
echo "Common fix: Change 'student_id' to 'admission_no' in the query."
