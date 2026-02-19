const db = require('../models');

/**
 * Migration: Add updated_by column to payment_entries table
 * Date: 2024-12-20
 * Purpose: Add updated_by column for tracking who last updated payment entries
 * Safety: Checks if column exists before adding to prevent errors
 */

async function addUpdatedByColumn() {
  console.log('🔧 Starting migration: Add updated_by column to payment_entries table...');
  
  try {
    // Check if the column already exists
    const [results] = await db.sequelize.query(`
      SELECT COUNT(*) as column_exists
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_entries'
        AND COLUMN_NAME = 'updated_by'
    `);
    
    const columnExists = results[0].column_exists > 0;
    
    if (columnExists) {
      console.log('✅ Column updated_by already exists in payment_entries table');
      return {
        success: true,
        message: 'Column updated_by already exists',
        action: 'none'
      };
    }
    
    console.log('📝 Adding updated_by column to payment_entries table...');
    
    // Add the column
    await db.sequelize.query(`
      ALTER TABLE payment_entries 
      ADD COLUMN updated_by VARCHAR(100) NULL DEFAULT NULL 
      COMMENT 'User who last updated this payment entry' 
      AFTER created_by
    `);
    
    console.log('✅ Successfully added updated_by column to payment_entries table');
    
    // Verify the column was added
    const [verifyResults] = await db.sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_entries'
        AND COLUMN_NAME = 'updated_by'
    `);
    
    if (verifyResults.length > 0) {
      console.log('🔍 Column verification:', verifyResults[0]);
      return {
        success: true,
        message: 'Column updated_by added successfully',
        action: 'added',
        columnInfo: verifyResults[0]
      };
    } else {
      throw new Error('Column was not added successfully');
    }
    
  } catch (error) {
    console.error('❌ Error adding updated_by column:', error);
    return {
      success: false,
      message: 'Failed to add updated_by column',
      error: error.message,
      action: 'failed'
    };
  }
}

// Function to run the migration
async function runMigration() {
  console.log('🚀 Running payment_entries updated_by column migration...');
  
  try {
    const result = await addUpdatedByColumn();
    
    if (result.success) {
      console.log('✅ Migration completed successfully:', result.message);
    } else {
      console.error('❌ Migration failed:', result.message);
      process.exit(1);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Migration script error:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  addUpdatedByColumn,
  runMigration
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}