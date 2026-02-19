/**
 * Database Fixer Utility
 * Automatically fixes common database schema issues
 */

const { QueryTypes } = require('sequelize');

class DatabaseFixer {
  constructor(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Check if a column exists in a table
   */
  async columnExists(tableName, columnName) {
    try {
      const result = await this.sequelize.query(`
        SELECT COUNT(*) as count
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = :tableName 
        AND COLUMN_NAME = :columnName
      `, {
        replacements: { tableName, columnName },
        type: QueryTypes.SELECT
      });
      
      return result[0].count > 0;
    } catch (error) {
      console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Check if an index exists on a table
   */
  async indexExists(tableName, indexName) {
    try {
      const result = await this.sequelize.query(`
        SELECT COUNT(*) as count
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = :tableName 
        AND INDEX_NAME = :indexName
      `, {
        replacements: { tableName, indexName },
        type: QueryTypes.SELECT
      });
      
      return result[0].count > 0;
    } catch (error) {
      console.error(`Error checking if index ${indexName} exists on ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Fix the journal_entries table custom_item_id column issue
   */
  async fixJournalEntriesCustomItemId() {
    console.log('🔧 Checking journal_entries table for custom_item_id column...');
    
    try {
      // Check if the column exists
      const columnExists = await this.columnExists('journal_entries', 'custom_item_id');
      
      if (!columnExists) {
        console.log('⚠️ custom_item_id column missing from journal_entries table. Adding it...');
        
        // Add the column
        await this.sequelize.query(`
          ALTER TABLE journal_entries 
          ADD COLUMN custom_item_id INT NULL 
          AFTER student_id
        `);
        
        console.log('✅ Added custom_item_id column to journal_entries table');
        
        // Add index for the new column
        const indexExists = await this.indexExists('journal_entries', 'journal_entries_custom_item_id');
        
        if (!indexExists) {
          await this.sequelize.query(`
            ALTER TABLE journal_entries 
            ADD INDEX journal_entries_custom_item_id (custom_item_id)
          `);
          
          console.log('✅ Added index for custom_item_id column');
        }
        
        return { fixed: true, message: 'Added custom_item_id column and index' };
      } else {
        console.log('✅ custom_item_id column already exists in journal_entries table');
        
        // Check if index exists
        const indexExists = await this.indexExists('journal_entries', 'journal_entries_custom_item_id');
        
        if (!indexExists) {
          await this.sequelize.query(`
            ALTER TABLE journal_entries 
            ADD INDEX journal_entries_custom_item_id (custom_item_id)
          `);
          
          console.log('✅ Added missing index for custom_item_id column');
          return { fixed: true, message: 'Added missing index for custom_item_id' };
        }
        
        return { fixed: false, message: 'Column and index already exist' };
      }
    } catch (error) {
      console.error('❌ Error fixing journal_entries custom_item_id:', error);
      throw error;
    }
  }

  /**
   * Verify journal_entries table structure
   */
  async verifyJournalEntriesStructure() {
    try {
      const columns = await this.sequelize.query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          EXTRA
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'journal_entries'
        ORDER BY ORDINAL_POSITION
      `, {
        type: QueryTypes.SELECT
      });
      
      const indexes = await this.sequelize.query(`
        SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'journal_entries'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `, {
        type: QueryTypes.SELECT
      });
      
      return { columns, indexes };
    } catch (error) {
      console.error('❌ Error verifying journal_entries structure:', error);
      throw error;
    }
  }

  /**
   * Run all database fixes
   */
  async runAllFixes() {
    console.log('🔧 Running database fixes...');
    
    const fixes = [];
    
    try {
      // Fix journal_entries custom_item_id issue
      const journalEntriesFix = await this.fixJournalEntriesCustomItemId();
      fixes.push({
        name: 'journal_entries_custom_item_id',
        ...journalEntriesFix
      });
      
      console.log('✅ All database fixes completed');
      return fixes;
    } catch (error) {
      console.error('❌ Error running database fixes:', error);
      throw error;
    }
  }

  /**
   * Create journal_entries table if it doesn't exist
   */
  async createJournalEntriesTableIfNotExists() {
    try {
      // Check if table exists
      const tableExists = await this.sequelize.query(`
        SELECT COUNT(*) as count
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'journal_entries'
      `, {
        type: QueryTypes.SELECT
      });
      
      if (tableExists[0].count === 0) {
        console.log('⚠️ journal_entries table does not exist. Creating it...');
        
        await this.sequelize.query(`
          CREATE TABLE journal_entries (
            entry_id INT AUTO_INCREMENT PRIMARY KEY,
            entry_number VARCHAR(50) UNIQUE,
            account VARCHAR(255) NOT NULL,
            account_code VARCHAR(10) NOT NULL,
            account_type ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Contra-Revenue', 'Contra-Asset') NOT NULL,
            debit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            description TEXT NOT NULL,
            reference VARCHAR(100),
            transaction_date DATE NOT NULL,
            posting_date DATE,
            school_id VARCHAR(20) NOT NULL,
            branch_id VARCHAR(20),
            student_id VARCHAR(50),
            custom_item_id INT,
            status ENUM('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED') NOT NULL DEFAULT 'POSTED',
            created_by INT NOT NULL,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_school_branch (school_id, branch_id),
            INDEX idx_account_code (account_code),
            INDEX idx_transaction_date (transaction_date),
            INDEX idx_status (status),
            INDEX idx_reference (reference),
            INDEX idx_student_id (student_id),
            INDEX idx_custom_item_id (custom_item_id),
            UNIQUE INDEX idx_entry_number (entry_number)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Created journal_entries table with all required columns and indexes');
        return { created: true, message: 'Created journal_entries table' };
      } else {
        console.log('✅ journal_entries table already exists');
        return { created: false, message: 'Table already exists' };
      }
    } catch (error) {
      console.error('❌ Error creating journal_entries table:', error);
      throw error;
    }
  }
}

module.exports = DatabaseFixer;