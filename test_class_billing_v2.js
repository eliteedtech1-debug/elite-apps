/**
 * Test script for the new V2 Class Billing API
 * Run this with: node test_class_billing_v2.js
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:34567';
const TEST_PARAMS = {
  class_code: 'CLS0003', // Primary 1 class code
  term: 'First Term',
  academic_year: '2025/2026',
  branch_id: '1'
};

async function testV2ClassBillingAPI() {
  try {
    console.log('🧪 Testing V2 Class Billing API...');
    console.log('📋 Test Parameters:', TEST_PARAMS);
    
    const params = new URLSearchParams(TEST_PARAMS);
    const url = `${API_BASE}/api/v2/class-billing?${params.toString()}`;
    
    console.log('🌐 Request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
        // 'Authorization': 'Bearer your-token-here'
      }
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    const data = await response.json();
    
    console.log('📊 Response Data:');
    console.log('  - Success:', data.success);
    console.log('  - Message:', data.message);
    console.log('  - Data Length:', data.data?.length || 0);
    console.log('  - Query Type:', data.query_type);
    console.log('  - System:', data.system);
    
    if (data.summary) {
      console.log('📈 Summary Statistics:');
      console.log('  - Total Students:', data.summary.total_students);
      console.log('  - Billed Students:', data.summary.billed_students);
      console.log('  - Unbilled Students:', data.summary.unbilled_students);
      console.log('  - Total Amount:', data.summary.total_amount);
      console.log('  - Total Paid:', data.summary.total_paid);
      console.log('  - Outstanding Balance:', data.summary.outstanding_balance);
    }
    
    if (data.data && data.data.length > 0) {
      console.log('\
👥 First Student Sample:');
      const firstStudent = data.data[0];
      console.log('  - Admission No:', firstStudent.admission_no);
      console.log('  - Student Name:', firstStudent.student_name);
      console.log('  - Class Name:', firstStudent.class_name);
      console.log('  - Invoice Count:', firstStudent.invoice_count);
      console.log('  - Total Invoice:', firstStudent.total_invoice);
      console.log('  - Total Paid:', firstStudent.total_paid);
      console.log('  - Balance:', firstStudent.balance);
      console.log('  - Payment Status:', firstStudent.payment_status);
      console.log('  - Confirmed Payments:', firstStudent.confirmed_payments);
      console.log('  - Pending Payments:', firstStudent.pending_payments);
      
      console.log('\
📈 All Students Summary:');
      data.data.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.student_name} (${student.admission_no}) - ₦${student.total_invoice} (${student.payment_status})`);
      });
      
      // Check data quality
      const studentsWithBills = data.data.filter(s => s.invoice_count > 0);
      const studentsWithoutBills = data.data.filter(s => s.invoice_count === 0);
      
      console.log('\
📊 Data Quality Check:');
      console.log(`  - Students with bills: ${studentsWithBills.length}`);
      console.log(`  - Students without bills: ${studentsWithoutBills.length}`);
      console.log(`  - Data consistency: ${data.data.length === data.summary?.total_students ? '✅' : '❌'}`);
      
    } else {
      console.log('\
❌ No students found in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test the summary endpoint
async function testV2ClassSummary() {
  try {
    console.log('\
🧪 Testing V2 Class Summary API...');
    
    const params = new URLSearchParams(TEST_PARAMS);
    const url = `${API_BASE}/api/v2/class-billing/summary?${params.toString()}`;
    
    console.log('🌐 Summary URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 Summary Response:');
    console.log('  - Success:', data.success);
    console.log('  - Data:', data.data);
    
  } catch (error) {
    console.error('❌ Summary Test Failed:', error.message);
  }
}

// Test the test endpoint
async function testV2ClassTest() {
  try {
    console.log('\
🧪 Testing V2 Class Test API...');
    
    const params = new URLSearchParams({ class_code: TEST_PARAMS.class_code });
    const url = `${API_BASE}/api/v2/class-billing/test?${params.toString()}`;
    
    console.log('🌐 Test URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 Test Response:');
    console.log('  - Success:', data.success);
    console.log('  - Students in class:', data.data?.students_in_class);
    console.log('  - Payment entries for class:', data.data?.payment_entries_for_class);
    console.log('  - Sample students:', data.data?.sample_students?.length || 0);
    
  } catch (error) {
    console.error('❌ Test endpoint failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting V2 Class Billing API Tests\
');
  
  await testV2ClassBillingAPI();
  await testV2ClassSummary();
  await testV2ClassTest();
  
  console.log('\
✅ All V2 API tests completed!');
  console.log('\
💡 Next Steps:');
  console.log('1. Update frontend to use /api/v2/class-billing endpoint');
  console.log('2. Remove query_type parameter (not needed in V2)');
  console.log('3. Use the new aggregated data structure');
  console.log('4. Leverage the summary statistics for dashboard');
  console.log('5. Test with authentication headers');
}

runAllTests();