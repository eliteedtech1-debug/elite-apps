// Test script for payment reference auto-generation
// This demonstrates how the payment reference is generated when not provided

// Simulate the generatePaymentReference function
function generatePaymentReference(payment_method = "CASH", school_id = "SCH", branch_id = "MAIN") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const methodCode = {
    'CASH': 'CSH',
    'BANK TRANSFER': 'BNK', 
    'Bank Transfer': 'BNK',
    'CARD': 'CRD',
    'MOBILE MONEY': 'MOB',
    'Mobile Money': 'MOB',
    'OTHER': 'OTH',
    'Other': 'OTH'
  }[payment_method.toUpperCase()] || 'PAY';
  
  // Format: PAY-SCH-MAIN-CSH-1234567890123-001
  const schoolCode = school_id.replace(/[^A-Z0-9]/g, '').substring(0, 3) || 'SCH';
  const branchCode = branch_id ? branch_id.replace(/[^A-Z0-9]/g, '').substring(0, 4) : 'MAIN';
  
  return `PAY-${schoolCode}-${branchCode}-${methodCode}-${timestamp}-${random}`;
}

// Test cases
console.log("=== Payment Reference Generation Test ===
");

// Test 1: Cash payment
console.log("1. Cash Payment:");
console.log("   Generated:", generatePaymentReference("CASH", "SCH/1", "BRCH00001"));
console.log("   Format: PAY-SCH1-BRCH-CSH-[timestamp]-[random]
");

// Test 2: Bank Transfer
console.log("2. Bank Transfer:");
console.log("   Generated:", generatePaymentReference("Bank Transfer", "SCH/1", "BRCH00001"));
console.log("   Format: PAY-SCH1-BRCH-BNK-[timestamp]-[random]
");

// Test 3: Mobile Money
console.log("3. Mobile Money:");
console.log("   Generated:", generatePaymentReference("Mobile Money", "SCH/1", "BRCH00001"));
console.log("   Format: PAY-SCH1-BRCH-MOB-[timestamp]-[random]
");

// Test 4: Card Payment
console.log("4. Card Payment:");
console.log("   Generated:", generatePaymentReference("CARD", "SCH/1", "BRCH00001"));
console.log("   Format: PAY-SCH1-BRCH-CRD-[timestamp]-[random]
");

// Test 5: Unknown payment method
console.log("5. Unknown Payment Method:");
console.log("   Generated:", generatePaymentReference("UNKNOWN", "SCH/1", "BRCH00001"));
console.log("   Format: PAY-SCH1-BRCH-PAY-[timestamp]-[random]
");

// Test 6: No branch (main school)
console.log("6. Main School (No Branch):");
console.log("   Generated:", generatePaymentReference("CASH", "SCH/1", null));
console.log("   Format: PAY-SCH1-MAIN-CSH-[timestamp]-[random]
");

// Test API request examples
console.log("=== API Request Examples ===
");

console.log("1. With payment_reference provided:");
console.log(`POST /api/processparentpayment
{
  "parent_id": "PAR/213232/00001",
  "total_amount_paid": 100000,
  "payment_method": "CASH",
  "payment_reference": "USER-PROVIDED-REF-123",
  "academic_year": "2025/2026",
  "children_payments": [
    {
      "admission_no": "213232/1/0002",
      "class_code": "CLS0001",
      "amount": 100000
    }
  ],
  "term": "First Term",
  "branch_id": "BRCH00001"
}

Response will use: "USER-PROVIDED-REF-123"
`);

console.log("2. Without payment_reference (auto-generated):");
console.log(`POST /api/processparentpayment
{
  "parent_id": "PAR/213232/00001",
  "total_amount_paid": 100000,
  "payment_method": "CASH",
  "academic_year": "2025/2026",
  "children_payments": [
    {
      "admission_no": "213232/1/0002",
      "class_code": "CLS0001",
      "amount": 100000
    }
  ],
  "term": "First Term",
  "branch_id": "BRCH00001"
}

Response will generate: "${generatePaymentReference("CASH", "SCH/1", "BRCH00001")}"
`);

console.log("=== Payment Reference Format Explanation ===");
console.log("PAY-[SCHOOL]-[BRANCH]-[METHOD]-[TIMESTAMP]-[RANDOM]");
console.log("- PAY: Payment prefix");
console.log("- SCHOOL: 3-char school code (alphanumeric only)");
console.log("- BRANCH: 4-char branch code (alphanumeric only) or MAIN");
console.log("- METHOD: Payment method code (CSH, BNK, CRD, MOB, OTH, PAY)");
console.log("- TIMESTAMP: Unix timestamp in milliseconds");
console.log("- RANDOM: 3-digit random number (000-999)");
console.log("
This ensures uniqueness and traceability of all payments.");