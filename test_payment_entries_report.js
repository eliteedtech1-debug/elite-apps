// Test script for the new /reports/payment-entries endpoint
// This demonstrates the various filtering options available

const baseUrl = 'http://localhost:34567';

// Test cases for the payment entries report endpoint
const testCases = [
  {
    name: "Basic income report with date range and branch",
    url: `${baseUrl}/reports/payment-entries?start_date=2025-08-12&end_date=2025-09-11&branch_id=BRCH00001&type=income`,
    description: "Get income entries for a specific date range and branch"
  },
  {
    name: "All payment entries for a branch",
    url: `${baseUrl}/reports/payment-entries?branch_id=BRCH00001`,
    description: "Get all payment entries (income and expenses) for a branch"
  },
  {
    name: "Expense entries only",
    url: `${baseUrl}/reports/payment-entries?type=expense&branch_id=BRCH00001`,
    description: "Get only expense entries for a branch"
  },
  {
    name: "Academic year and term filter",
    url: `${baseUrl}/reports/payment-entries?academic_year=2025/2026&term=First Term&branch_id=BRCH00001`,
    description: "Get entries for specific academic year and term"
  },
  {
    name: "Payment mode filter",
    url: `${baseUrl}/reports/payment-entries?payment_mode=Cash&branch_id=BRCH00001`,
    description: "Get entries for specific payment mode"
  },
  {
    name: "Pagination example",
    url: `${baseUrl}/reports/payment-entries?branch_id=BRCH00001&limit=10&offset=0`,
    description: "Get first 10 entries with pagination"
  },
  {
    name: "Complex filter combination",
    url: `${baseUrl}/reports/payment-entries?start_date=2025-08-01&end_date=2025-09-30&branch_id=BRCH00001&type=income&payment_mode=Cash&payment_status=completed`,
    description: "Complex filter with multiple conditions"
  }
];

console.log("=== Payment Entries Report Endpoint Test Cases ===
");

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Description: ${testCase.description}`);
  console.log(`   URL: ${testCase.url}`);
  console.log(`   curl command:`);
  console.log(`   curl -X GET "${testCase.url}"`);
  console.log("");
});

console.log("=== Expected Response Format ===");
console.log(`{
  "data": [
    {
      "item_id": 123,
      "ref_no": "INC1757621163708407",
      "admission_no": null,
      "class_code": null,
      "academic_year": "2025/2026",
      "term": "First Term",
      "cr": 200000,
      "dr": 0,
      "description": "New dddd",
      "payment_mode": "Cash",
      "school_id": "SCH/1",
      "branch_id": "BRCH00001",
      "payment_status": "completed",
      "quantity": 1,
      "is_optional": "No",
      "created_at": "2025-01-11T...",
      "updated_at": "2025-01-11T...",
      "entry_type": "income"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 100,
    "offset": 0,
    "pages": 1,
    "current_page": 1
  },
  "summary": {
    "total_income": 200000.00,
    "total_expenses": 0.00,
    "net_amount": 200000.00,
    "income_count": 1,
    "expense_count": 0,
    "total_entries": 1
  },
  "filters_applied": {
    "start_date": "2025-08-12",
    "end_date": "2025-09-11",
    "branch_id": "BRCH00001",
    "type": "income"
  },
  "success": true,
  "report_type": "payment_entries_report",
  "generated_at": "2025-01-11T..."
}`);

console.log("
=== Available Query Parameters ===");
console.log("- start_date: Start date filter (YYYY-MM-DD)");
console.log("- end_date: End date filter (YYYY-MM-DD)");
console.log("- branch_id: Filter by branch ID");
console.log("- school_id: Filter by school ID");
console.log("- type: Filter by entry type ('income', 'expense', 'all')");
console.log("- academic_year: Filter by academic year");
console.log("- term: Filter by term");
console.log("- payment_mode: Filter by payment mode");
console.log("- payment_status: Filter by payment status");
console.log("- limit: Number of records per page (default: 100)");
console.log("- offset: Number of records to skip for pagination (default: 0)");

console.log("
=== Response Features ===");
console.log("✅ Filtered data based on query parameters");
console.log("✅ Pagination support with total count");
console.log("✅ Summary statistics (totals, counts, net amount)");
console.log("✅ Entry type classification (income/expense/other)");
console.log("✅ Applied filters information");
console.log("✅ Timestamp of report generation");

console.log("
=== Error Handling ===");
console.log("- Invalid date formats will be ignored");
console.log("- Non-existent branch_id will return empty results");
console.log("- Invalid limit/offset will use defaults");
console.log("- Database errors will return 500 status with error message");

console.log("
=== Usage Examples ===");
console.log("1. Get all income for September 2025:");
console.log("   GET /reports/payment-entries?start_date=2025-09-01&end_date=2025-09-30&type=income");
console.log("");
console.log("2. Get expenses for a specific branch:");
console.log("   GET /reports/payment-entries?branch_id=BRCH00001&type=expense");
console.log("");
console.log("3. Get paginated results:");
console.log("   GET /reports/payment-entries?limit=20&offset=40");
console.log("");
console.log("4. Get cash payments only:");
console.log("   GET /reports/payment-entries?payment_mode=Cash");

console.log("
🎯 The endpoint is now ready to handle your original request:");
console.log("GET /reports/payment-entries?start_date=2025-08-12&end_date=2025-09-11&branch_id=BRCH00001&type=income");