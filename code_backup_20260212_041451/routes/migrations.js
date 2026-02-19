const { addUpdatedByColumn } = require('../migrations/add-updated-by-column');

/**
 * MIGRATION ROUTES
 * 
 * These routes allow running database migrations safely
 * Should be used with caution and proper authentication
 */

module.exports = (app) => {

/**
 * @route POST /api/migrations/add-updated-by-column
 * @desc Add updated_by column to payment_entries table
 * @access Private (Admin only)
 */
app.post('/api/migrations/add-updated-by-column', async (req, res) => {
  try {
    console.log('🔧 API Migration request: Add updated_by column');
    
    // Check if user has admin privileges (you may want to add more security)
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient privileges. Admin access required for migrations.',
        required_role: 'admin'
      });
    }
    
    const result = await addUpdatedByColumn();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        action: result.action,
        columnInfo: result.columnInfo || null,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        action: result.action,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Migration API error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration API failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/migrations/status
 * @desc Check migration status and database schema
 * @access Private
 */
app.get('/api/migrations/status', async (req, res) => {
  try {
    const db = require('../models');
    
    // Check if updated_by column exists
    const [columnCheck] = await db.sequelize.query(`
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
    
    const hasUpdatedByColumn = columnCheck.length > 0;
    
    // Get table info
    const [tableInfo] = await db.sequelize.query(`
      SELECT 
        TABLE_NAME,
        ENGINE,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        CREATE_TIME,
        UPDATE_TIME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_entries'
    `);
    
    res.json({
      success: true,
      message: 'Migration status retrieved successfully',
      data: {
        updated_by_column: {
          exists: hasUpdatedByColumn,
          info: hasUpdatedByColumn ? columnCheck[0] : null
        },
        table_info: tableInfo[0] || null,
        migrations_needed: {
          add_updated_by_column: !hasUpdatedByColumn
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Migration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get migration status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

};