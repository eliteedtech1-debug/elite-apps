const db = require('../models');

async function testDigitalSignature() {
  try {
    console.log('🔄 Testing digital signature database operations...');
    
    // Test 1: Check if column exists
    console.log('\n📋 Test 1: Checking if digital_signature column exists in users table...');
    const columnCheck = await db.sequelize.query(
      `SHOW COLUMNS FROM users LIKE 'digital_signature'`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    if (columnCheck.length > 0) {
      console.log('✅ digital_signature column exists in users table');
      console.log('📊 Column details:', columnCheck[0]);
    } else {
      console.log('❌ digital_signature column NOT found in users table');
      return;
    }
    
    // Test 2: Try to update a test record
    console.log('\n📋 Test 2: Testing direct UPDATE query...');
    const testSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // First, let's see if user 712 exists
    const userCheck = await db.sequelize.query(
      `SELECT id, name, user_type FROM users WHERE id = 712`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    if (userCheck.length > 0) {
      console.log('✅ User 712 found:', userCheck[0]);
      
      // Try to update the digital signature
      const updateResult = await db.sequelize.query(
        `UPDATE users SET digital_signature = :signature WHERE id = 712`,
        { 
          replacements: { signature: testSignature },
          type: db.sequelize.QueryTypes.UPDATE 
        }
      );
      
      console.log('📝 Update result:', updateResult);
      
      // Check if the update worked
      const verifyResult = await db.sequelize.query(
        `SELECT id, name, digital_signature FROM users WHERE id = 712`,
        { type: db.sequelize.QueryTypes.SELECT }
      );
      
      if (verifyResult.length > 0) {
        const user = verifyResult[0];
        console.log('✅ Verification result:');
        console.log('   User ID:', user.id);
        console.log('   Name:', user.name);
        console.log('   Signature length:', user.digital_signature?.length || 0);
        console.log('   Signature preview:', user.digital_signature?.substring(0, 50) + '...' || 'NULL');
      }
      
    } else {
      console.log('❌ User 712 not found in users table');
    }
    
    // Test 3: Check all user tables
    console.log('\n📋 Test 3: Checking digital_signature column in all user tables...');
    const tables = ['users', 'teachers', 'students', 'parents'];
    
    for (const table of tables) {
      try {
        const result = await db.sequelize.query(
          `SHOW COLUMNS FROM ${table} LIKE 'digital_signature'`,
          { type: db.sequelize.QueryTypes.SELECT }
        );
        
        if (result.length > 0) {
          console.log(`✅ ${table}: digital_signature column exists`);
        } else {
          console.log(`❌ ${table}: digital_signature column NOT found`);
        }
      } catch (error) {
        console.log(`⚠️  ${table}: Table might not exist or error occurred`);
      }
    }
    
    console.log('\n🎉 Digital signature test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDigitalSignature()
    .then(() => {
      console.log('🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testDigitalSignature };