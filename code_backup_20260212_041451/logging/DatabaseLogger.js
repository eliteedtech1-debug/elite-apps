/**
 * Database Query Logger
 * Intercepts and logs all database queries and stored procedure calls
 */

const logger = require('./Logger');

class DatabaseLogger {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_DB_LOGGING === 'true';
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // 1 second
    this.logAllQueries = process.env.LOG_ALL_QUERIES === 'true';
    this.isShuttingDown = false;
  }

  /**
   * Setup Sequelize logging hooks
   */
  setupSequelizeLogging(sequelize) {
    if (!this.isEnabled) return;

    // Hook into Sequelize's logging
    const originalLogging = sequelize.options.logging;
    
    sequelize.options.logging = (sql, timing) => {
      this.logSequelizeQuery(sql, timing);
      
      // Call original logging if it exists
      if (originalLogging && typeof originalLogging === 'function') {
        originalLogging(sql, timing);
      }
    };

    // Hook into query execution for more detailed logging
    this.setupQueryHooks(sequelize);
    
    logger.info('Database logging hooks setup completed');
  }

  /**
   * Setup detailed query hooks
   */
  setupQueryHooks(sequelize) {
    if (this.isShuttingDown) return;
    
    const originalQuery = sequelize.query.bind(sequelize);
    
    sequelize.query = async function(sql, options = {}) {
      // Skip logging if shutting down
      if (this.isShuttingDown) {
        return await originalQuery(sql, options);
      }
      
      const startTime = Date.now();
      
      try {
        // Check if connection manager is still open
        if (sequelize.connectionManager && sequelize.connectionManager.isClosed) {
          console.warn('⚠️ Skipping query - connection manager is closed');
          throw new Error('ConnectionManager was closed');
        }
        
        // Execute the query
        const result = await originalQuery(sql, options);
        return result;
      } catch (error) {
        // Don't log connection errors during shutdown
        if (this.isShuttingDown || error.message.includes('ConnectionManager was closed')) {
          throw error;
        }
        throw error;
      }
    }.bind(this);
  }

  /**
   * Log Sequelize queries (basic logging)
   */
  logSequelizeQuery(sql, timing) {
    if (!this.isEnabled) return;
    
    const executionTime = timing || 0;
    const isSlowQuery = executionTime > this.slowQueryThreshold;
    
    if (this.logAllQueries || isSlowQuery) {
      const level = isSlowQuery ? 'WARN' : 'DEBUG';
      const message = isSlowQuery 
        ? `Slow query detected (${executionTime}ms)` 
        : `Query executed (${executionTime}ms)`;
      
      logger.log(level, 'SQL', message, {
        sql: logger.sanitizeQuery(sql),
        executionTime,
        isSlowQuery,
        queryType: this.getQueryType(sql)
      });
    }
  }

  /**
   * Create a wrapper for stored procedure calls
   */
  createProcedureWrapper(db) {
    if (!this.isEnabled) return;

    // Create a procedure calling helper
    db.callProcedure = async function(procedureName, params = []) {
      const startTime = Date.now();
      const procedureId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Start performance tracking
        logger.startPerformanceTracking(procedureId);
        
        // Build procedure call SQL
        const placeholders = params.map(() => '?').join(', ');
        const sql = `CALL ${procedureName}(${placeholders})`;
        
        logger.info(`Calling stored procedure: ${procedureName}`, {
          procedureId,
          procedureName,
          params: logger.sanitizeParams(params),
          sql
        });
        
        // Execute procedure
        const result = await this.sequelize.query(sql, {
          replacements: params,
          type: this.sequelize.QueryTypes.RAW
        });
        
        const executionTime = Date.now() - startTime;
        
        // Log procedure completion
        await logger.logProcedure(procedureName, params, executionTime, result);
        
        // End performance tracking
        await logger.endPerformanceTracking(procedureId, `Procedure: ${procedureName}`, {
          resultCount: Array.isArray(result) ? result.length : 1,
          executionTime
        });
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // Log procedure error
        await logger.logProcedure(procedureName, params, executionTime, null, error);
        
        // End performance tracking with error
        await logger.endPerformanceTracking(procedureId, `Procedure: ${procedureName} (Error)`, {
          error: error.message,
          executionTime
        });
        
        throw error;
      }
    };

    logger.info('Stored procedure wrapper created');
  }

  /**
   * Wrap model methods to log ORM operations
   */
  wrapModelMethods(db) {
    if (!this.isEnabled) return;

    Object.keys(db).forEach(modelName => {
      const model = db[modelName];
      if (model && typeof model === 'object' && model.findAll) {
        this.wrapModelMethod(model, 'findAll', modelName);
        this.wrapModelMethod(model, 'findOne', modelName);
        this.wrapModelMethod(model, 'findByPk', modelName);
        this.wrapModelMethod(model, 'create', modelName);
        this.wrapModelMethod(model, 'update', modelName);
        this.wrapModelMethod(model, 'destroy', modelName);
        this.wrapModelMethod(model, 'bulkCreate', modelName);
      }
    });

    logger.info('Model methods wrapped for logging');
  }

  /**
   * Wrap individual model method
   */
  wrapModelMethod(model, methodName, modelName) {
    const originalMethod = model[methodName];
    if (!originalMethod) return;

    model[methodName] = async function(...args) {
      const startTime = Date.now();
      const operationId = `${modelName}_${methodName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        logger.startPerformanceTracking(operationId);
        
        logger.debug(`ORM Operation: ${modelName}.${methodName}`, {
          operationId,
          model: modelName,
          method: methodName,
          args: this.sanitizeOrmArgs(args)
        });
        
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - startTime;
        
        await logger.endPerformanceTracking(operationId, `ORM: ${modelName}.${methodName}`, {
          resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
          executionTime
        });
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        logger.error(`ORM Operation Failed: ${modelName}.${methodName}`, {
          operationId,
          model: modelName,
          method: methodName,
          error: error.message,
          executionTime,
          args: this.sanitizeOrmArgs(args)
        });
        
        await logger.endPerformanceTracking(operationId, `ORM: ${modelName}.${methodName} (Error)`, {
          error: error.message,
          executionTime
        });
        
        throw error;
      }
    }.bind(this);
  }

  /**
   * Utility methods
   */
  getQueryType(sql) {
    if (!sql || typeof sql !== 'string') return 'UNKNOWN';
    
    const upperSql = sql.trim().toUpperCase();
    
    if (upperSql.startsWith('SELECT')) return 'SELECT';
    if (upperSql.startsWith('INSERT')) return 'INSERT';
    if (upperSql.startsWith('UPDATE')) return 'UPDATE';
    if (upperSql.startsWith('DELETE')) return 'DELETE';
    if (upperSql.startsWith('CALL')) return 'PROCEDURE';
    if (upperSql.startsWith('CREATE')) return 'CREATE';
    if (upperSql.startsWith('ALTER')) return 'ALTER';
    if (upperSql.startsWith('DROP')) return 'DROP';
    if (upperSql.startsWith('SHOW')) return 'SHOW';
    if (upperSql.startsWith('DESCRIBE') || upperSql.startsWith('DESC')) return 'DESCRIBE';
    
    return 'OTHER';
  }

  isSlowQuery(sql) {
    // Consider certain query types as potentially slow
    const slowQueryPatterns = [
      /JOIN.*JOIN/i,  // Multiple joins
      /GROUP BY.*ORDER BY/i,  // Complex aggregations
      /LIKE.*%.*%/i,  // Full text searches
      /COUNT\(\*\).*WHERE/i,  // Count queries with conditions
    ];
    
    return slowQueryPatterns.some(pattern => pattern.test(sql));
  }

  sanitizeQueryOptions(options) {
    if (!options || typeof options !== 'object') return options;
    
    const sanitized = { ...options };
    
    // Remove sensitive data
    if (sanitized.replacements) {
      sanitized.replacements = logger.sanitizeParams(sanitized.replacements);
    }
    
    // Remove large objects
    delete sanitized.transaction;
    delete sanitized.logging;
    
    return sanitized;
  }

  sanitizeOrmArgs(args) {
    if (!Array.isArray(args)) return args;
    
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Limit object size for logging
        const keys = Object.keys(arg);
        if (keys.length > 10) {
          return { ...Object.fromEntries(keys.slice(0, 10).map(k => [k, arg[k]])), '...': `${keys.length - 10} more keys` };
        }
        return logger.sanitizeBody(arg);
      }
      return arg;
    });
  }

  /**
   * Get database statistics
   */
  getStats() {
    return logger.getQueryStats();
  }

  /**
   * Stop database logging
   */
  stop() {
    this.isEnabled = false;
    this.logAllQueries = false;
    this.isShuttingDown = true;
    console.log('🛑 Database logging stopped');
  }
}

module.exports = new DatabaseLogger();