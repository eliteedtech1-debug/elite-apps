const db = require('../models');

async function debugUser712() {
  try {
    console.log('🔍 Debugging user 712 profile update issue...');
    
    // Check if user 712 exists in users table
    console.log('\n📋 Checking user 712 in users table...');
    const userCheck = await db.sequelize.query(
      `SELECT id, name, email, user_type, school_id, branch_id FROM users WHERE id = 712`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    if (userCheck.length > 0) {
      console.log('✅ User 712 found in users table:');
      console.log(JSON.stringify(userCheck[0], null, 2));
    } else {
      console.log('❌ User 712 NOT found in users table');
    }
    
    // Check if user 712 exists in other tables
    console.log('\n📋 Checking user 712 in other tables...');
    
    const tables = [
      { table: 'teachers', idField: 'user_id' },
      { table: 'students', idField: 'admission_no' },
      { table: 'parents', idField: 'user_id' }
    ];
    
    for (const { table, idField } of tables) {
      try {
        const result = await db.sequelize.query(
          `SELECT ${idField}, name, email, user_type FROM ${table} WHERE ${idField} = 712`,
          { type: db.sequelize.QueryTypes.SELECT }
        );
        
        if (result.length > 0) {
          console.log(`✅ User 712 found in ${table} table:`, result[0]);
        } else {
          console.log(`❌ User 712 NOT found in ${table} table`);
        }
      } catch (error) {
        console.log(`⚠️  Error checking ${table} table:`, error.message);
      }
    }
    
    // Test the exact UPDATE query that would be used
    console.log('\n📋 Testing UPDATE query...');
    const testSignature = 'data:image/png;base64,TEST_SIGNATURE_DATA';
    
    try {
      const updateResult = await db.sequelize.query(
        `UPDATE users SET digital_signature = :digital_signature, updated_at = NOW() WHERE id = :user_id`,
        { 
          replacements: { 
            digital_signature: testSignature,
            user_id: 712 
          },
          type: db.sequelize.QueryTypes.UPDATE 
        }
      );
      
      console.log('📝 UPDATE result:', updateResult);
      console.log('📊 Rows affected:', updateResult[1] || 0);
      
      if (updateResult[1] > 0) {
        console.log('✅ UPDATE successful - rows were affected');
        
        // Verify the update
        const verifyResult = await db.sequelize.query(
          `SELECT id, name, digital_signature FROM users WHERE id = 712`,
          { type: db.sequelize.QueryTypes.SELECT }
        );
        
        if (verifyResult.length > 0) {
          const user = verifyResult[0];
          console.log('✅ Verification - signature saved:');
          console.log('   Signature length:', user.digital_signature?.length || 0);
          console.log('   Signature preview:', user.digital_signature?.substring(0, 50) + '...' || 'NULL');
        }
      } else {
        console.log('❌ UPDATE failed - no rows affected');
      }
      
    } catch (error) {
      console.error('❌ UPDATE query failed:', error.message);
    }
    
    // Check the current digital_signature value
    console.log('\n📋 Current digital_signature value...');
    const currentSig = await db.sequelize.query(
      `SELECT id, name, digital_signature FROM users WHERE id = 712`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    if (currentSig.length > 0) {
      const user = currentSig[0];
      console.log('📊 Current signature status:');
      console.log('   User ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Signature length:', user.digital_signature?.length || 0);
      console.log('   Signature is NULL:', user.digital_signature === null);
      console.log('   Signature preview:', user.digital_signature?.substring(0, 50) + '...' || 'NULL');
    }
    
    console.log('\n🎉 Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    throw error;
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugUser712()
    .then(() => {
      console.log('🏁 Debug script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = { debugUser712 };