/**
 * Startup Database Fixes
 * Automatically fixes database schema issues on server startup
 */

const DatabaseFixer = require('./databaseFixer');

/**
 * Run startup database fixes
 * @param {Sequelize} sequelize - Sequelize instance
 */
async function runStartupFixes(sequelize) {
  console.log('🚀 Running startup database fixes...');
  
  try {
    const fixer = new DatabaseFixer(sequelize);
    
    // Create journal_entries table if it doesn't exist
    await fixer.createJournalEntriesTableIfNotExists();
    
    // Run all fixes
    const fixes = await fixer.runAllFixes();
    
    // Verify the structure
    const structure = await fixer.verifyJournalEntriesStructure();
    
    console.log('📊 Journal Entries Table Structure:');
    console.log('Columns:', structure.columns.length);
    console.log('Indexes:', structure.indexes.length);
    
    // Check for custom_item_id specifically
    const hasCustomItemId = structure.columns.some(col => col.COLUMN_NAME === 'custom_item_id');
    const hasCustomItemIdIndex = structure.indexes.some(idx => idx.COLUMN_NAME === 'custom_item_id');
    
    console.log(`✅ custom_item_id column: ${hasCustomItemId ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ custom_item_id index: ${hasCustomItemIdIndex ? 'EXISTS' : 'MISSING'}`);
    
    if (hasCustomItemId && hasCustomItemIdIndex) {
      console.log('🎉 All database fixes completed successfully!');
    } else {
      console.warn('⚠️ Some fixes may not have been applied correctly');
    }
    
    return {
      success: true,
      fixes,
      structure: {
        hasCustomItemId,
        hasCustomItemIdIndex,
        totalColumns: structure.columns.length,
        totalIndexes: structure.indexes.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error running startup fixes:', error);
    
    // Don't throw the error - let the server continue starting
    // The error will be logged and the admin can fix it manually
    return {
      success: false,
      error: error.message,
      recommendation: 'Please run the manual migration script: migrations/manual_fix_journal_entries.sql'
    };
  }
}

/**
 * Safe startup fixes - won't crash the server if they fail
 * @param {Sequelize} sequelize - Sequelize instance
 */
async function safeStartupFixes(sequelize) {
  try {
    return await runStartupFixes(sequelize);
  } catch (error) {
    console.error('❌ Startup fixes failed, but server will continue:', error);
    console.log('💡 Manual fix available: Run migrations/manual_fix_journal_entries.sql');
    
    return {
      success: false,
      error: error.message,
      manualFix: 'migrations/manual_fix_journal_entries.sql'
    };
  }
}

module.exports = {
  runStartupFixes,
  safeStartupFixes
};