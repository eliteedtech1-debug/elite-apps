const db = require('../models');
const fs = require('fs');
const path = require('path');

async function runDigitalSignatureMigration() {
  try {
    console.log('🔄 Starting digital signature migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../../database_updates/add_digital_signature_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split('\n')
      .filter(line => line.trim().length > 0 && !line.trim().startsWith('--'))
      .join(' ')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await db.sequelize.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Check if it's a "column already exists" error
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped - column already exists`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Digital signature migration completed successfully!');
    
    // Test the migration by checking if columns exist
    console.log('🔍 Verifying migration...');
    
    const tables = ['users', 'teachers', 'students', 'parents'];
    for (const table of tables) {
      try {
        const result = await db.sequelize.query(
          `SHOW COLUMNS FROM ${table} LIKE 'digital_signature'`,
          { type: db.sequelize.QueryTypes.SELECT }
        );
        
        if (result.length > 0) {
          console.log(`✅ ${table} table: digital_signature column exists`);
        } else {
          console.log(`❌ ${table} table: digital_signature column NOT found`);
        }
      } catch (error) {
        console.log(`⚠️  ${table} table: Could not verify (table might not exist)`);
      }
    }
    
    console.log('🎉 Migration verification completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runDigitalSignatureMigration()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runDigitalSignatureMigration };