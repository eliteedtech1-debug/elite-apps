#!/bin/bash

# Test script for PDF generation using curl

echo "🧪 Testing Financial Analytics PDF Generation..."
echo ""

# Create test data
TEST_DATA='{
  "analyticsData": {
    "totalIncome": 150000,
    "totalExpenses": 95000,
    "netIncome": 55000,
    "profitMargin": 36.67,
    "expenseRatio": 63.33,
    "growthRate": 15.5,
    "cashBalance": 125000,
    "accountsReceivable": 22500,
    "payrollExpenses": 57000,
    "incomeByCategory": [
      {"category": "Tuition Fees", "amount": 100000, "percentage": 66.67},
      {"category": "Extra Classes", "amount": 50000, "percentage": 33.33}
    ],
    "expensesByCategory": [
      {"category": "Salaries", "amount": 57000, "percentage": 60},
      {"category": "Operations", "amount": 38000, "percentage": 40}
    ],
    "monthlyTrends": [
      {"month": "Jan", "income": 45000, "expenses": 28500},
      {"month": "Feb", "income": 52000, "expenses": 31350},
      {"month": "Mar", "income": 53000, "expenses": 35150}
    ],
    "topIncomeClasses": [
      {"class": "Grade 12", "amount": 80000},
      {"class": "Grade 11", "amount": 70000}
    ],
    "topExpenseVendors": [
      {"vendor": "Supplier A", "amount": 25000},
      {"vendor": "Supplier B", "amount": 20000}
    ],
    "paymentMethodDistribution": [
      {"method": "Bank Transfer", "amount": 90000, "percentage": 60},
      {"method": "Cash", "amount": 60000, "percentage": 40}
    ],
    "recentTransactions": [
      {
        "entry_date": "2025-01-15",
        "description": "Tuition Payment",
        "account_name": "Student Fees",
        "reference_type": "INCOME",
        "total_amount": 5000
      }
    ]
  },
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-03-31",
    "startFormatted": "Jan 01, 2025",
    "endFormatted": "Mar 31, 2025"
  },
  "companyInfo": {
    "name": "Elite School Management System",
    "address": "123 Education St, City, State 12345",
    "phone": "(555) 123-4567",
    "email": "info@eliteschool.com"
  },
  "generatedAt": "2025-11-03T00:00:00.000Z"
}'

echo "📤 Sending request to http://localhost:34567/api/generate-financial-pdf..."
echo ""

# Make the request
curl -X POST http://localhost:34567/api/generate-financial-pdf \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  --output test-financial-report.pdf \
  -w "\n✅ HTTP Status: %{http_code}\n📁 Downloaded to: test-financial-report.pdf\n📊 File size: %{size_download} bytes\n"

# Check if file was created
if [ -f "test-financial-report.pdf" ]; then
  echo "✅ PDF file created successfully!"
  ls -lh test-financial-report.pdf
else
  echo "❌ Failed to create PDF file"
fi
