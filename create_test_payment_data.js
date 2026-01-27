// Create test payment data for Pre-Nursery class
const axios = require('axios');

async function createTestPaymentData() {
  try {
    console.log('Creating test payment data for Pre-Nursery...');
    
    // Create a billing entry (credit) for Pre-Nursery
    const billingData = {
      school_id: 'SCH00001',
      branch_id: 'BRCH00027',
      student_id: 'STU001',
      admission_no: 'ADM001',
      student_name: 'Test Student',
      class_code: 'PRE-NURSERY',
      class_name: 'Pre-Nursery',
      academic_year: '2026/2027',
      term: 'First Term',
      fee_type: 'School Fees',
      amount: 750000, // ₦750,000
      transaction_type: 'cr', // Credit (billing)
      description: 'School fees billing for Pre-Nursery',
      created_by: 'system'
    };
    
    const response = await axios.post('http://localhost:34567/api/orm-payments/entries', billingData, {
      headers: {
        'X-School-Id': 'SCH00001',
        'X-Branch-Id': 'BRCH00027',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Billing entry created:', response.data);
    
    // Create a payment entry (debit) for partial payment
    const paymentData = {
      ...billingData,
      amount: 37499.90, // ₦37,499.90
      transaction_type: 'dr', // Debit (payment)
      description: 'Partial payment for Pre-Nursery school fees'
    };
    
    const paymentResponse = await axios.post('http://localhost:34567/api/orm-payments/entries', paymentData, {
      headers: {
        'X-School-Id': 'SCH00001',
        'X-Branch-Id': 'BRCH00027',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Payment entry created:', paymentResponse.data);
    
    // Test the aggregated API
    console.log('\n🔍 Testing aggregated API...');
    const aggregatedResponse = await axios.get('http://localhost:34567/api/orm-payments/revenues/aggregated?term=First%20Term&academic_year=2026/2027&branch_id=BRCH00027', {
      headers: {
        'X-School-Id': 'SCH00001',
        'X-Branch-Id': 'BRCH00027'
      }
    });
    
    console.log('📊 Aggregated data:', JSON.stringify(aggregatedResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createTestPaymentData();
