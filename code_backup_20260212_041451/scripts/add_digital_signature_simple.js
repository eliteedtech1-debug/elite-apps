const db = require('../models');

async function addDigitalSignatureColumns() {
  try {
    console.log('🔄 Adding digital_signature columns to user tables...');
    
    const alterStatements = [
      {
        table: 'users',
        sql: `ALTER TABLE users ADD COLUMN digital_signature TEXT NULL COMMENT 'Digital signature data (base64 or URL)'`
      },
      {
        table: 'teachers', 
        sql: `ALTER TABLE teachers ADD COLUMN digital_signature TEXT NULL COMMENT 'Digital signature data (base64 or URL)'`
      },
      {
        table: 'students',
        sql: `ALTER TABLE students ADD COLUMN digital_signature TEXT NULL COMMENT 'Digital signature data (base64 or URL)'`
      },
      {
        table: 'parents',
        sql: `ALTER TABLE parents ADD COLUMN digital_signature TEXT NULL COMMENT 'Digital signature data (base64 or URL)'`
      }
    ];
    
    for (const statement of alterStatements) {
      try {
        console.log(`⚡ Adding digital_signature column to ${statement.table} table...`);
        await db.sequelize.query(statement.sql);
        console.log(`✅ Successfully added digital_signature column to ${statement.table} table`);
      } catch (error) {
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists')) {
          console.log(`⚠️  Column already exists in ${statement.table} table - skipping`);
        } else {
          console.error(`❌ Error adding column to ${statement.table} table:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Digital signature columns added successfully!');
    
    // Verify the columns were added
    console.log('🔍 Verifying columns...');
    
    for (const statement of alterStatements) {
      try {
        const result = await db.sequelize.query(
          `SHOW COLUMNS FROM ${statement.table} LIKE 'digital_signature'`,
          { type: db.sequelize.QueryTypes.SELECT }
        );
        
        if (result.length > 0) {
          console.log(`✅ ${statement.table} table: digital_signature column exists`);
        } else {
          console.log(`❌ ${statement.table} table: digital_signature column NOT found`);
        }
      } catch (error) {
        console.log(`⚠️  ${statement.table} table: Could not verify (table might not exist)`);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addDigitalSignatureColumns()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addDigitalSignatureColumns };