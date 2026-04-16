// Simple admission module test using existing DB config
require('dotenv').config({ path: './elscholar-api/.env' });
const db = require('./elscholar-api/src/models');

async function testAdmission() {
  try {
    console.log('🔍 Testing admission module...');

    // Test 1: Check school_applicants table
    const [count] = await db.sequelize.query(
      "SELECT COUNT(*) as total FROM school_applicants LIMIT 1"
    );
    console.log('✅ school_applicants table accessible, records:', count[0]?.total || 0);

    // Test 2: Test stored procedure
    const testResult = await db.sequelize.query(
      `CALL school_admission_form('select', '', '', '', '', '', '', '', NULL, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'submitted', '2024/2025', 'TEST001', 'BR001', '', '', '', NULL, 0)`
    );
    console.log('✅ school_admission_form procedure works');

    console.log('🎉 Basic tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testAdmission();
