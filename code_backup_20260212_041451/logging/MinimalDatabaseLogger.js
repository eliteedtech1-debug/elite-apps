/**
 * Minimal Database Logger - Only logs database transactions
 * Filters out noise and focuses on actual DB operations
 */

class MinimalDatabaseLogger {
  constructor() {
    this.isEnabled = process.env.ENABLE_DB_LOGGING === 'true';
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000;
  }

  /**
   * Setup minimal Sequelize logging - only transactions and slow queries
   */
  setupSequelizeLogging(sequelize) {
    if (!this.isEnabled) return;

    sequelize.options.logging = (sql, timing) => {
      // Only log if it's a transaction or slow query
      if (this.shouldLog(sql, timing)) {
        this.logQuery(sql, timing);
      }
    };
  }

  /**
   * Determine if query should be logged
   */
  shouldLog(sql, timing) {
    const sqlLower = sql.toLowerCase();
    
    // Log transactions
    if (sqlLower.includes('begin') || 
        sqlLower.includes('commit') || 
        sqlLower.includes('rollback') ||
        sqlLower.includes('start transaction')) {
      return true;
    }
    
    // Log stored procedure calls
    if (sqlLower.includes('call ')) {
      return true;
    }
    
    // Log slow queries
    if (timing && timing > this.slowQueryThreshold) {
      return true;
    }
    
    // Log INSERT, UPDATE, DELETE operations
    if (sqlLower.startsWith('insert') || 
        sqlLower.startsWith('update') || 
        sqlLower.startsWith('delete')) {
      return true;
    }
    
    return false;
  }

  /**
   * Log the query with minimal formatting
   */
  logQuery(sql, timing) {
    const timestamp = new Date().toISOString();
    const duration = timing ? `(${timing}ms)` : '';
    
    // Clean up SQL for readability
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    
    console.log(`🗄️  [${timestamp}] ${duration} ${cleanSql}`);
  }
}

module.exports = new MinimalDatabaseLogger();
