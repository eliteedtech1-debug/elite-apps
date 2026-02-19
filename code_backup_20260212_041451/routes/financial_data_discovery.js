const db = require("../models");
const { authenticateToken } = require("../middleware/auth");

module.exports = (app) => {
  // Comprehensive financial data discovery endpoint
  app.get("/api/debug/financial-discovery", authenticateToken, async (req, res) => {
    try {
      const { school_id } = req.user;
      const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';
      
      console.log("🔍 Financial Data Discovery for:", { school_id, branch_id });
      
      const results = {
        user_context: {
          school_id,
          user_branch_id: req.user.branch_id,
          query_branch_id: req.query.branch_id,
          final_branch_id: branch_id
        },
        table_analysis: {}
      };

      // List of potential financial tables to check
      const financialTables = [
        'general_ledger',
        'payment_entries', 
        'journal_entries',
        'journal_entry_lines',
        'account_balances',
        'chart_of_accounts',
        'payroll_periods',
        'payroll_lines',
        'student_payments',
        'fee_payments',
        'expenses',
        'income_entries'
      ];

      // Check each table for data
      for (const tableName of financialTables) {
        try {
          console.log(`🔍 Checking table: ${tableName}`);
          
          // Check if table exists and get basic stats
          const tableCheckQuery = `
            SELECT COUNT(*) as total_rows
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = '${tableName}'
          `;
          
          const [tableExists] = await db.sequelize.query(tableCheckQuery);
          
          if (tableExists[0].total_rows > 0) {
            // Table exists, get data stats
            const dataStatsQuery = `SELECT COUNT(*) as total_entries FROM ${tableName}`;
            const [totalStats] = await db.sequelize.query(dataStatsQuery);
            
            // Get school-specific data if school_id column exists
            let schoolStats = null;
            try {
              const schoolStatsQuery = `SELECT COUNT(*) as school_entries FROM ${tableName} WHERE school_id = :school_id`;
              const [schoolStatsResult] = await db.sequelize.query(schoolStatsQuery, { replacements: { school_id } });
              schoolStats = schoolStatsResult[0];
            } catch (e) {
              // school_id column doesn't exist
              schoolStats = { school_entries: 'N/A - no school_id column' };
            }
            
            // Get sample data
            const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
            const [sampleData] = await db.sequelize.query(sampleQuery);
            
            // Get column information
            const columnsQuery = `
              SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
              FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = '${tableName}'
              ORDER BY ORDINAL_POSITION
            `;
            const [columns] = await db.sequelize.query(columnsQuery);
            
            results.table_analysis[tableName] = {
              exists: true,
              total_entries: totalStats[0].total_entries,
              school_entries: schoolStats,
              columns: columns,
              sample_data: sampleData
            };
          } else {
            results.table_analysis[tableName] = {
              exists: false
            };
          }
        } catch (error) {
          results.table_analysis[tableName] = {
            exists: false,
            error: error.message
          };
        }
      }

      // Special check for any tables with financial-sounding names
      try {
        const financialTablesQuery = `
          SELECT TABLE_NAME 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND (TABLE_NAME LIKE '%payment%' 
               OR TABLE_NAME LIKE '%financial%' 
               OR TABLE_NAME LIKE '%money%' 
               OR TABLE_NAME LIKE '%cash%' 
               OR TABLE_NAME LIKE '%fee%' 
               OR TABLE_NAME LIKE '%expense%' 
               OR TABLE_NAME LIKE '%income%' 
               OR TABLE_NAME LIKE '%revenue%' 
               OR TABLE_NAME LIKE '%ledger%' 
               OR TABLE_NAME LIKE '%account%' 
               OR TABLE_NAME LIKE '%transaction%')
        `;
        
        const [financialTablesList] = await db.sequelize.query(financialTablesQuery);
        results.discovered_financial_tables = financialTablesList;
      } catch (error) {
        results.discovered_financial_tables = { error: error.message };
      }

      // Try to find the most promising data source
      let bestDataSource = null;
      let maxEntries = 0;
      
      for (const [tableName, tableInfo] of Object.entries(results.table_analysis)) {
        if (tableInfo.exists && typeof tableInfo.school_entries === 'object' && tableInfo.school_entries.school_entries > maxEntries) {
          maxEntries = tableInfo.school_entries.school_entries;
          bestDataSource = tableName;
        }
      }
      
      results.recommendation = {
        best_data_source: bestDataSource,
        max_entries: maxEntries,
        suggested_approach: bestDataSource ? `Use ${bestDataSource} table for financial data` : 'No suitable financial data found'
      };

      res.json({
        success: true,
        discovery_results: results
      });
    } catch (error) {
      console.error("Financial discovery error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
};