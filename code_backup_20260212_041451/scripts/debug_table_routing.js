const db = require('../models');

async function debugTableRouting() {
  try {
    console.log('🔍 Debugging table routing for different user types...');
    
    const testUserId = 712;
    
    // Step 1: Check which table the user actually exists in
    console.log('\n📋 Step 1: Checking user existence across all tables...');
    
    const tables = [
      { name: 'users', idField: 'id', userTypes: ['Admin', 'SuperAdmin', 'admin', 'superadmin'] },
      { name: 'teachers', idField: 'user_id', userTypes: ['Teacher', 'teacher'] },
      { name: 'students', idField: 'admission_no', userTypes: ['Student', 'student'] },
      { name: 'parents', idField: 'user_id', userTypes: ['Parent', 'parent'] }
    ];
    
    for (const table of tables) {
      try {
        const query = `SELECT ${table.idField}, name, user_type FROM ${table.name} WHERE ${table.idField} = :user_id`;
        const result = await db.sequelize.query(query, {
          replacements: { user_id: testUserId },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (result.length > 0) {
          console.log(`✅ Found user in ${table.name} table:`, result[0]);
          console.log(`   Expected user_types for this table:`, table.userTypes);
          console.log(`   Actual user_type:`, result[0].user_type);
          console.log(`   ID field:`, table.idField);
        } else {
          console.log(`❌ User NOT found in ${table.name} table`);
        }
      } catch (error) {
        console.log(`⚠️  Error checking ${table.name} table:`, error.message);
      }
    }
    
    // Step 2: Test the profile controller logic for different user types
    console.log('\n📋 Step 2: Testing profile controller routing logic...');
    
    const userTypes = ['Admin', 'admin', 'Teacher', 'teacher', 'Student', 'student', 'Parent', 'parent'];
    
    for (const userType of userTypes) {
      console.log(`\n🔍 Testing user_type: "${userType}"`);
      
      const normalizedType = userType?.toLowerCase();
      console.log(`   Normalized: "${normalizedType}"`);
      
      let expectedTable, expectedIdField, expectedUpdateQuery;
      
      switch (normalizedType) {
        case 'teacher':
          expectedTable = 'teachers';
          expectedIdField = 'user_id';
          expectedUpdateQuery = `UPDATE teachers SET digital_signature = :digital_signature, updated_at = NOW() WHERE user_id = :user_id`;
          break;
        case 'student':
          expectedTable = 'students';
          expectedIdField = 'admission_no';
          expectedUpdateQuery = `UPDATE students SET digital_signature = :digital_signature, updated_at = NOW() WHERE admission_no = :user_id`;
          break;
        case 'admin':
        case 'superadmin':
          expectedTable = 'users';
          expectedIdField = 'id';
          expectedUpdateQuery = `UPDATE users SET digital_signature = :digital_signature, updatedAt = NOW() WHERE id = :user_id`;
          break;
        case 'parent':
          expectedTable = 'parents';
          expectedIdField = 'user_id';
          expectedUpdateQuery = `UPDATE parents SET digital_signature = :digital_signature, updated_at = NOW() WHERE user_id = :user_id`;
          break;
        default:
          expectedTable = 'UNKNOWN';
          expectedIdField = 'UNKNOWN';
          expectedUpdateQuery = 'UNKNOWN';
      }
      
      console.log(`   Expected table: ${expectedTable}`);
      console.log(`   Expected ID field: ${expectedIdField}`);
      console.log(`   Expected query: ${expectedUpdateQuery}`);
    }
    
    // Step 3: Test actual UPDATE with the correct routing
    console.log('\n📋 Step 3: Testing actual UPDATE with correct table routing...');
    
    // First, determine which table user 712 is actually in
    let actualUserType = null;
    let actualTable = null;
    let actualIdField = null;
    
    for (const table of tables) {
      try {
        const query = `SELECT ${table.idField}, user_type FROM ${table.name} WHERE ${table.idField} = :user_id`;
        const result = await db.sequelize.query(query, {
          replacements: { user_id: testUserId },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (result.length > 0) {
          actualUserType = result[0].user_type;
          actualTable = table.name;
          actualIdField = table.idField;
          break;
        }
      } catch (error) {
        // Continue checking other tables
      }
    }
    
    if (actualTable) {
      console.log(`✅ User 712 found in table: ${actualTable}`);
      console.log(`   User type: ${actualUserType}`);
      console.log(`   ID field: ${actualIdField}`);
      
      // Test the UPDATE query
      const testSignature = 'data:image/png;base64,TEST_SIGNATURE_' + Date.now();
      
      let updateQuery;
      if (actualTable === 'users') {
        updateQuery = `UPDATE users SET digital_signature = :digital_signature, updatedAt = NOW() WHERE id = :user_id`;
      } else {
        updateQuery = `UPDATE ${actualTable} SET digital_signature = :digital_signature, updated_at = NOW() WHERE ${actualIdField} = :user_id`;
      }
      
      console.log(`🔍 Testing UPDATE query: ${updateQuery}`);
      
      const result = await db.sequelize.query(updateQuery, {
        replacements: { 
          digital_signature: testSignature,
          user_id: testUserId 
        },
        type: db.sequelize.QueryTypes.UPDATE
      });
      
      console.log('📝 UPDATE result:', result);
      const affectedRows = result[1] || result?.affectedRows || 0;
      console.log('📈 Affected rows:', affectedRows);
      
      if (affectedRows > 0) {
        console.log('✅ UPDATE successful!');
        
        // Verify the update
        const verifyQuery = `SELECT ${actualIdField}, digital_signature FROM ${actualTable} WHERE ${actualIdField} = :user_id`;
        const verifyResult = await db.sequelize.query(verifyQuery, {
          replacements: { user_id: testUserId },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (verifyResult.length > 0) {
          const user = verifyResult[0];
          console.log('✅ Verification result:');
          console.log('   User ID:', user[actualIdField]);
          console.log('   Signature length:', user.digital_signature?.length || 0);
          console.log('   Signature preview:', user.digital_signature?.substring(0, 50) + '...' || 'NULL');
        }
      } else {
        console.log('❌ UPDATE failed - no rows affected');
      }
      
    } else {
      console.log('❌ User 712 not found in any table!');
    }
    
    // Step 4: Check if there are any constraints or triggers
    console.log('\n📋 Step 4: Checking for constraints or triggers...');
    
    if (actualTable) {
      try {
        const constraintsQuery = `
          SELECT 
            CONSTRAINT_NAME,
            CONSTRAINT_TYPE,
            TABLE_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
          WHERE TABLE_NAME = :table_name 
          AND TABLE_SCHEMA = DATABASE()
        `;
        
        const constraints = await db.sequelize.query(constraintsQuery, {
          replacements: { table_name: actualTable },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        console.log(`🔍 Constraints on ${actualTable} table:`, constraints);
        
        // Check for triggers
        const triggersQuery = `
          SELECT 
            TRIGGER_NAME,
            EVENT_MANIPULATION,
            ACTION_TIMING
          FROM INFORMATION_SCHEMA.TRIGGERS 
          WHERE EVENT_OBJECT_TABLE = :table_name 
          AND TRIGGER_SCHEMA = DATABASE()
        `;
        
        const triggers = await db.sequelize.query(triggersQuery, {
          replacements: { table_name: actualTable },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        console.log(`🔍 Triggers on ${actualTable} table:`, triggers);
        
      } catch (error) {
        console.log('⚠️  Could not check constraints/triggers:', error.message);
      }
    }
    
    console.log('\n🎉 Table routing debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    throw error;
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugTableRouting()
    .then(() => {
      console.log('🏁 Debug script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = { debugTableRouting };