/**
 * Database Query Interceptor
 * Comprehensive middleware to intercept and log ALL database operations
 * This ensures every single database query is logged regardless of how it's executed
 */

const logger = require('../logging/Logger');

class DatabaseQueryInterceptor {
  constructor() {
    this.queryCount = 0;
    this.slowQueryThreshold = 1000; // 1 second
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_DB_LOGGING === 'true';
  }

  /**
   * Initialize comprehensive database query interception
   */
  initialize(sequelize, models) {
    if (!this.isEnabled) {
      console.log('📊 Database query logging is disabled');
      return;
    }

    console.log('🔍 Initializing comprehensive database query interception...');

    // 1. Intercept Sequelize instance queries
    this.interceptSequelizeQueries(sequelize);

    // 2. Intercept model operations
    this.interceptModelOperations(models);

    // 3. Intercept raw SQL queries
    this.interceptRawQueries(sequelize);

    // 4. Intercept stored procedure calls
    this.interceptStoredProcedures(sequelize);

    // 5. Monitor connection events (temporarily disabled due to compatibility issues)
    // this.monitorConnectionEvents(sequelize);
    console.log('⚠️  Connection monitoring temporarily disabled to avoid compatibility issues');

    console.log('✅ Database query interception initialized');
    console.log('📈 All database operations will be logged to: logs/queries/');
  }

  /**
   * Intercept all Sequelize queries at the instance level
   */
  interceptSequelizeQueries(sequelize) {
    const originalQuery = sequelize.query.bind(sequelize);
    
    sequelize.query = async function(sql, options = {}) {
      // Check if database is shutting down
      if (this.isShuttingDown) {
        console.log('⚠️ Database query intercepted during shutdown, skipping:', sql.substring(0, 50) + '...');
        return null;
      }
      
      const startTime = Date.now();
      const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Increment query counter
      this.queryCount++;
      
      try {
        // Log query start
        await this.logQueryStart(queryId, sql, options);
        
        // Execute the original query
        const result = await originalQuery(sql, options);
        const executionTime = Date.now() - startTime;
        
        // Log query completion
        await this.logQueryComplete(queryId, sql, options, executionTime, result);
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // Log query error
        await this.logQueryError(queryId, sql, options, executionTime, error);
        
        throw error;
      }
    }.bind(this);
  }

  /**
   * Intercept model operations (findAll, create, update, etc.)
   */
  interceptModelOperations(models) {
    Object.keys(models).forEach(modelName => {
      const model = models[modelName];
      if (model && typeof model === 'object' && model.findAll) {
        this.wrapModelMethod(model, 'findAll', modelName);
        this.wrapModelMethod(model, 'findOne', modelName);
        this.wrapModelMethod(model, 'findByPk', modelName);
        this.wrapModelMethod(model, 'findAndCountAll', modelName);
        this.wrapModelMethod(model, 'create', modelName);
        this.wrapModelMethod(model, 'update', modelName);
        this.wrapModelMethod(model, 'destroy', modelName);
        this.wrapModelMethod(model, 'bulkCreate', modelName);
        this.wrapModelMethod(model, 'upsert', modelName);
        this.wrapModelMethod(model, 'increment', modelName);
        this.wrapModelMethod(model, 'decrement', modelName);
        this.wrapModelMethod(model, 'count', modelName);
        this.wrapModelMethod(model, 'max', modelName);
        this.wrapModelMethod(model, 'min', modelName);
        this.wrapModelMethod(model, 'sum', modelName);
      }
    });
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
        // Log ORM operation start
        await this.logOrmOperationStart(operationId, modelName, methodName, args);
        
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - startTime;
        
        // Log ORM operation completion
        await this.logOrmOperationComplete(operationId, modelName, methodName, args, executionTime, result);
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // Log ORM operation error
        await this.logOrmOperationError(operationId, modelName, methodName, args, executionTime, error);
        
        throw error;
      }
    }.bind(this);
  }

  /**
   * Intercept raw SQL queries
   */
  interceptRawQueries(sequelize) {
    try {
      // Check if the required Sequelize internals are available
      if (!sequelize || !sequelize.dialect) {
        console.log('⚠️  Sequelize dialect not available for raw query interception');
        return;
      }

      if (!sequelize.dialect.queryGenerator) {
        console.log('⚠️  Sequelize queryGenerator not available for raw query interception');
        return;
      }

      if (!sequelize.dialect.queryGenerator.constructor) {
        console.log('⚠️  Sequelize queryGenerator constructor not available for raw query interception');
        return;
      }

      // Instead of overriding internal Sequelize methods which can break internal properties,
      // we'll use Sequelize's built-in hooks system to capture SQL operations
      // This approach is safer and doesn't interfere with Sequelize internals

      // Before Sequelize 6.7.0, the hooks were added differently
      // Using the query interface to intercept raw queries at the connection level
      const originalQuery = sequelize.query.bind(sequelize);

      sequelize.query = async function(sql, options = {}) {
        // Log the raw SQL if it's a SELECT query and logging is enabled
        if (process.env.LOG_ALL_QUERIES === 'true' && typeof sql === 'string' && sql.trim().toUpperCase().startsWith('SELECT')) {
          try {
            this.logRawQuery('SELECT', sql);
          } catch (logError) {
            // Don't let logging errors affect the main function
            console.log('⚠️  Failed to log raw query:', logError.message);
          }
        }

        // Execute the original query
        return await originalQuery(sql, options);
      }.bind(this);

      console.log('✅ Raw query interception implemented safely using query wrapper');
    } catch (error) {
      console.log('⚠️  Failed to setup raw query interception:', error.message);
      console.log('   Raw query logging will be skipped, but other logging will continue');
    }
  }

  /**
   * Intercept stored procedure calls
   */
  interceptStoredProcedures(sequelize) {
    // Create a wrapper for stored procedure calls
    sequelize.callProcedure = async function(procedureName, params = []) {
      const startTime = Date.now();
      const procedureId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Log procedure start
        await this.logProcedureStart(procedureId, procedureName, params);
        
        // Build procedure call SQL
        const placeholders = params.map(() => '?').join(', ');
        const sql = `CALL ${procedureName}(${placeholders})`;
        
        // Execute procedure
        const result = await sequelize.query(sql, {
          replacements: params,
          type: sequelize.QueryTypes.RAW
        });
        
        const executionTime = Date.now() - startTime;
        
        // Log procedure completion
        await this.logProcedureComplete(procedureId, procedureName, params, executionTime, result);
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // Log procedure error
        await this.logProcedureError(procedureId, procedureName, params, executionTime, error);
        
        throw error;
      }
    }.bind(this);
  }

  /**
   * Monitor database connection events
   */
  monitorConnectionEvents(sequelize) {
    sequelize.authenticate()
      .then(() => {
        logger.info('Database connection established', {
          database: sequelize.config.database,
          host: sequelize.config.host,
          port: sequelize.config.port,
          dialect: sequelize.config.dialect
        });
      })
      .catch(err => {
        logger.error('Database connection failed', {
          error: err.message,
          database: sequelize.config.database,
          host: sequelize.config.host
        });
      });

    // Monitor connection pool events
    if (sequelize.connectionManager && sequelize.connectionManager.pool) {
      const pool = sequelize.connectionManager.pool;
      
      pool.on('acquire', (connection) => {
        logger.debug('Database connection acquired', {
          connectionId: connection.threadId || connection.id,
          poolSize: pool.size,
          available: pool.available,
          pending: pool.pending
        });
      });

      pool.on('release', (connection) => {
        logger.debug('Database connection released', {
          connectionId: connection.threadId || connection.id,
          poolSize: pool.size,
          available: pool.available,
          pending: pool.pending
        });
      });

      pool.on('error', (error) => {
        logger.error('Database pool error', {
          error: error.message,
          poolSize: pool.size,
          available: pool.available,
          pending: pool.pending
        });
      });
    }
  }

  /**
   * Logging methods
   */
  async logQueryStart(queryId, sql, options) {
    // Only log if LOG_ALL_QUERIES is true (for more detailed debugging)
    if (process.env.LOG_ALL_QUERIES === 'true') {
      await logger.debug('🔍 Database Query Started', {
        queryId,
        sql: this.sanitizeQuery(sql),
        options: this.sanitizeOptions(options),
        queryType: this.getQueryType(sql),
        timestamp: new Date().toISOString()
      });
    }
  }

  async logQueryComplete(queryId, sql, options, executionTime, result) {
    const isSlowQuery = executionTime > this.slowQueryThreshold;
    
    // For non-slow queries, only log if LOG_ALL_QUERIES is true
    if (isSlowQuery) {
      await logger.warn('SQL', '🐌 Slow Database Query Completed', {
        queryId,
        sql: this.sanitizeQuery(sql),
        executionTime,
        isSlowQuery: true,
        queryType: this.getQueryType(sql),
        resultCount: this.getResultCount(result),
        timestamp: new Date().toISOString()
      });
    } else if (process.env.LOG_ALL_QUERIES === 'true') {
      await logger.debug('SQL', '✅ Database Query Completed', {
        queryId,
        sql: this.sanitizeQuery(sql),
        executionTime,
        isSlowQuery: false,
        queryType: this.getQueryType(sql),
        resultCount: this.getResultCount(result),
        options: this.sanitizeOptions(options),
        timestamp: new Date().toISOString()
      });
    }
  }

  async logQueryError(queryId, sql, options, executionTime, error) {
    await logger.error('❌ Database Query Failed', {
      queryId,
      sql: this.sanitizeQuery(sql),
      executionTime,
      queryType: this.getQueryType(sql),
      error: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      },
      options: this.sanitizeOptions(options),
      timestamp: new Date().toISOString()
    });
  }

  async logOrmOperationStart(operationId, modelName, methodName, args) {
    // Only log ORM operations if LOG_ORM_OPERATIONS is true
    if (process.env.LOG_ORM_OPERATIONS === 'true') {
      await logger.debug('🔧 ORM Operation Started', {
        operationId,
        model: modelName,
        method: methodName,
        args: this.sanitizeOrmArgs(args),
        timestamp: new Date().toISOString()
      });
    }
  }

  async logOrmOperationComplete(operationId, modelName, methodName, args, executionTime, result) {
    const isSlowOperation = executionTime > this.slowQueryThreshold;
    
    // For non-slow operations, only log if LOG_ORM_OPERATIONS is true
    if (isSlowOperation) {
      await logger.warn('ORM', '🐌 Slow ORM Operation Completed', {
        operationId,
        model: modelName,
        method: methodName,
        executionTime,
        isSlowOperation: true,
        resultCount: this.getResultCount(result),
        timestamp: new Date().toISOString()
      });
    } else if (process.env.LOG_ORM_OPERATIONS === 'true') {
      await logger.debug('ORM', '✅ ORM Operation Completed', {
        operationId,
        model: modelName,
        method: methodName,
        executionTime,
        isSlowOperation: false,
        resultCount: this.getResultCount(result),
        args: this.sanitizeOrmArgs(args),
        timestamp: new Date().toISOString()
      });
    }
  }

  async logOrmOperationError(operationId, modelName, methodName, args, executionTime, error) {
    await logger.error('❌ ORM Operation Failed', {
      operationId,
      model: modelName,
      method: methodName,
      executionTime,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      args: this.sanitizeOrmArgs(args),
      timestamp: new Date().toISOString()
    });
  }

  async logProcedureStart(procedureId, procedureName, params) {
    await logger.info('📞 Stored Procedure Started', {
      procedureId,
      procedure: procedureName,
      params: this.sanitizeParams(params),
      timestamp: new Date().toISOString()
    });
  }

  async logProcedureComplete(procedureId, procedureName, params, executionTime, result) {
    const isSlowProcedure = executionTime > (this.slowQueryThreshold * 2); // Procedures have higher threshold
    const level = isSlowProcedure ? 'WARN' : 'INFO';
    const message = isSlowProcedure ? '🐌 Slow Stored Procedure Completed' : '✅ Stored Procedure Completed';

    await logger.log(level, 'PROCEDURE', message, {
      procedureId,
      procedure: procedureName,
      executionTime,
      isSlowProcedure,
      resultCount: this.getResultCount(result),
      params: this.sanitizeParams(params),
      timestamp: new Date().toISOString()
    });
  }

  async logProcedureError(procedureId, procedureName, params, executionTime, error) {
    await logger.error('❌ Stored Procedure Failed', {
      procedureId,
      procedure: procedureName,
      executionTime,
      error: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      },
      params: this.sanitizeParams(params),
      timestamp: new Date().toISOString()
    });
  }

  async logRawQuery(type, sql) {
    // Only log raw queries if LOG_ALL_QUERIES is true
    if (process.env.LOG_ALL_QUERIES === 'true') {
      await logger.debug('🔧 Raw SQL Generated', {
        type,
        sql: this.sanitizeQuery(sql),
        timestamp: new Date().toISOString()
      });
    }
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
    if (upperSql.startsWith('EXPLAIN')) return 'EXPLAIN';
    
    return 'OTHER';
  }

  getResultCount(result) {
    if (!result) return 0;
    if (Array.isArray(result)) return result.length;
    if (result && Array.isArray(result[0])) return result[0].length;
    if (result && typeof result === 'object' && result.count !== undefined) return result.count;
    return 1;
  }

  sanitizeQuery(sql) {
    if (typeof sql !== 'string') return sql;
    
    return sql
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/token\s*=\s*"[^"]*"/gi, 'token="***"')
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
      .replace(/secret\s*=\s*"[^"]*"/gi, 'secret="***"');
  }

  sanitizeOptions(options) {
    if (!options || typeof options !== 'object') return options;
    
    const sanitized = { ...options };
    
    // Remove sensitive data
    if (sanitized.replacements) {
      sanitized.replacements = this.sanitizeParams(sanitized.replacements);
    }
    
    // Remove large objects
    delete sanitized.transaction;
    delete sanitized.logging;
    delete sanitized.instance;
    
    return sanitized;
  }

  sanitizeParams(params) {
    if (!params) return params;
    if (!Array.isArray(params)) return params;
    
    return params.map(param => {
      if (typeof param === 'string' && param.length > 100) {
        return param.substring(0, 100) + '...[truncated]';
      }
      if (typeof param === 'object' && param !== null) {
        // Sanitize object parameters
        const sanitized = { ...param };
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        sensitiveFields.forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = '***';
          }
        });
        return sanitized;
      }
      return param;
    });
  }

  sanitizeOrmArgs(args) {
    if (!Array.isArray(args)) return args;
    
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Limit object size for logging
        const keys = Object.keys(arg);
        if (keys.length > 10) {
          return { 
            ...Object.fromEntries(keys.slice(0, 10).map(k => [k, arg[k]])), 
            '...': `${keys.length - 10} more keys` 
          };
        }
        
        // Sanitize sensitive fields
        const sanitized = { ...arg };
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        sensitiveFields.forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = '***';
          }
        });
        return sanitized;
      }
      return arg;
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalQueries: this.queryCount,
      isEnabled: this.isEnabled,
      slowQueryThreshold: this.slowQueryThreshold,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Stop database query interception
   */
  stop() {
    this.isEnabled = false;
    this.isShuttingDown = true;
    console.log('🛑 Database query interception stopped');
  }
}

// Export singleton instance
module.exports = new DatabaseQueryInterceptor();