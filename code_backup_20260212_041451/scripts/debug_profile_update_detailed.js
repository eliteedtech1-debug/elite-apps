const db = require('../models');

async function debugProfileUpdateDetailed() {
  try {
    console.log('🔍 Debugging profile update with detailed analysis...');
    
    const testData = {
      user_id: 712,
      user_type: 'Admin',
      digital_signature: 'data:image/png;base64,TEST_SIGNATURE_DATA'
    };
    
    console.log('📝 Test data:', testData);
    
    // Step 1: Verify user exists
    console.log('\n📋 Step 1: Checking if user exists...');
    const userExists = await db.sequelize.query(
      `SELECT id, name, user_type, school_id, branch_id FROM users WHERE id = :user_id`,
      { 
        replacements: { user_id: testData.user_id },
        type: db.sequelize.QueryTypes.SELECT 
      }
    );
    
    if (userExists.length === 0) {
      console.log('❌ User does not exist!');
      return;
    }
    
    console.log('✅ User exists:', userExists[0]);
    
    // Step 2: Test the exact query that the profile controller would build
    console.log('\n📋 Step 2: Testing profile controller logic...');
    
    const normalizedUserType = testData.user_type?.toLowerCase();
    console.log('🔍 Normalized user_type:', normalizedUserType);
    
    // Build fields exactly like the controller
    const fields = {};
    if (testData.digital_signature !== undefined) {
      fields.digital_signature = testData.digital_signature;
    }
    
    console.log('🔍 Fields to update:', fields);
    
    // Filter fields (like the controller does)
    const filteredFields = Object.fromEntries(
      Object.entries(fields).filter(([key, value]) => value !== undefined && value !== null && value !== '')
    );
    
    console.log('🔍 Filtered fields:', filteredFields);
    
    if (Object.keys(filteredFields).length === 0) {
      console.log('❌ No fields to update after filtering!');
      return;
    }
    
    // Build SET clause
    const setClause = Object.keys(filteredFields)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    console.log('🔍 SET clause:', setClause);
    
    // Build UPDATE query exactly like the controller
    let updateQuery;
    switch (normalizedUserType) {
      case 'admin':
      case 'superadmin':
        updateQuery = `UPDATE users SET ${setClause}, updatedAt = NOW() WHERE id = :user_id`;
        break;
      default:
        console.log('❌ Unsupported user type for this test');
        return;
    }
    
    console.log('🔍 Final UPDATE query:', updateQuery);
    console.log('🔍 Query replacements:', { ...filteredFields, user_id: testData.user_id });
    
    // Step 3: Execute the exact query
    console.log('\n📋 Step 3: Executing the UPDATE query...');
    
    const result = await db.sequelize.query(updateQuery, {
      replacements: { ...filteredFields, user_id: testData.user_id },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    console.log('📝 Full result:', result);
    console.log('📈 Result type:', typeof result);
    console.log('📈 Result length:', result?.length);
    console.log('📈 Result[0]:', result[0]);
    console.log('📈 Result[1]:', result[1]);
    
    // Extract affected rows
    const affectedRows = result[1] || result?.affectedRows || 0;
    console.log('📈 Affected rows:', affectedRows);
    
    if (affectedRows > 0) {
      console.log('✅ UPDATE successful!');
      
      // Verify the update
      const verifyResult = await db.sequelize.query(
        `SELECT id, name, digital_signature FROM users WHERE id = :user_id`,
        { 
          replacements: { user_id: testData.user_id },
          type: db.sequelize.QueryTypes.SELECT 
        }
      );
      
      if (verifyResult.length > 0) {
        const user = verifyResult[0];
        console.log('✅ Verification result:');
        console.log('   User ID:', user.id);
        console.log('   Name:', user.name);
        console.log('   Signature length:', user.digital_signature?.length || 0);
        console.log('   Signature value:', user.digital_signature || 'NULL');
      }
    } else {
      console.log('❌ UPDATE failed - no rows affected');
      
      // Additional debugging
      console.log('\n🔍 Additional debugging...');
      
      // Check if the WHERE clause is working
      const whereTest = await db.sequelize.query(
        `SELECT COUNT(*) as count FROM users WHERE id = :user_id`,
        { 
          replacements: { user_id: testData.user_id },
          type: db.sequelize.QueryTypes.SELECT 
        }
      );
      
      console.log('🔍 WHERE clause test - matching records:', whereTest[0].count);
      
      // Test a simple update without the timestamp
      console.log('\n🔍 Testing simple update without timestamp...');
      const simpleResult = await db.sequelize.query(
        `UPDATE users SET digital_signature = :digital_signature WHERE id = :user_id`,
        {
          replacements: { 
            digital_signature: testData.digital_signature,
            user_id: testData.user_id 
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
      
      console.log('📝 Simple update result:', simpleResult);
      const simpleAffectedRows = simpleResult[1] || simpleResult?.affectedRows || 0;
      console.log('📈 Simple update affected rows:', simpleAffectedRows);
    }
    
    console.log('\n🎉 Detailed debugging completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sql: error.sql
    });
    throw error;
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugProfileUpdateDetailed()
    .then(() => {
      console.log('🏁 Debug script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = { debugProfileUpdateDetailed };