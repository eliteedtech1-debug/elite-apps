/**
 * Enhanced Logger for Elite Scholar API
 * Provides comprehensive logging for processes, queries, procedure calls, and debugging
 */

const fs = require('fs').promises;
const path = require('path');
const util = require('util');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_LOGGING === 'true';
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    };
    this.currentLevel = this.logLevels[process.env.LOG_LEVEL] || this.logLevels.DEBUG;
    
    // Initialize log directory
    this.initializeLogDirectory();
    
    // Performance tracking
    this.performanceTracking = new Map();
    
    // Query statistics
    this.queryStats = {
      total: 0,
      slow: 0,
      errors: 0,
      procedures: 0
    };
  }

  /**
   * Initialize log directory structure
   */
  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      
      // Create subdirectories for different log types
      const subDirs = ['queries', 'procedures', 'processes', 'errors', 'performance'];
      for (const dir of subDirs) {
        await fs.mkdir(path.join(this.logDir, dir), { recursive: true });
      }
      
      console.log(`📁 Log directory initialized: ${this.logDir}`);
    } catch (error) {
      console.error('❌ Failed to initialize log directory:', error);
    }
  }

  /**
   * Format timestamp for logs
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get caller information for better debugging
   */
  getCallerInfo() {
    const stack = new Error().stack;
    const stackLines = stack.split('\n');
    
    // Find the first line that's not from this Logger class
    for (let i = 3; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (!line.includes('Logger.js') && !line.includes('node_modules')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: path.basename(match[2]),
            line: match[3],
            column: match[4]
          };
        }
      }
    }
    return { function: 'unknown', file: 'unknown', line: '0', column: '0' };
  }

  /**
   * Core logging method
   */
  async log(level, category, message, data = {}, options = {}) {
    if (!this.isEnabled || this.logLevels[level] > this.currentLevel) {
      return;
    }

    const timestamp = this.getTimestamp();
    const caller = this.getCallerInfo();
    
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      caller,
      data,
      ...options
    };

    // Console output with colors
    this.logToConsole(logEntry);
    
    // File output
    await this.logToFile(logEntry);
  }

  /**
   * Log to console with colors
   */
  logToConsole(logEntry) {
    const colors = {
      ERROR: '\x1b[31m',   // Red
      WARN: '\x1b[33m',    // Yellow
      INFO: '\x1b[36m',    // Cyan
      DEBUG: '\x1b[35m',   // Magenta
      TRACE: '\x1b[37m',   // White
      RESET: '\x1b[0m'
    };

    const color = colors[logEntry.level] || colors.INFO;
    const reset = colors.RESET;
    
    const prefix = `${color}[${logEntry.timestamp}] ${logEntry.level} [${logEntry.category}]${reset}`;
    const location = `${logEntry.caller.file}:${logEntry.caller.line}`;
    
    console.log(`${prefix} ${logEntry.message} (${location})`);
    
    if (Object.keys(logEntry.data).length > 0) {
      console.log(`${color}Data:${reset}`, util.inspect(logEntry.data, { 
        colors: true, 
        depth: 3, 
        compact: false 
      }));
    }
  }

  /**
   * Log to file
   */
  async logToFile(logEntry) {
    try {
      const fileName = this.getLogFileName(logEntry.category, logEntry.level);
      const filePath = path.join(this.logDir, fileName);
      
      // Handle circular references and large objects
      const logLine = this.safeStringify(logEntry) + '\n';
      await fs.appendFile(filePath, logLine);
    } catch (error) {
      console.error('❌ Failed to write to log file:', error);
    }
  }

  /**
   * Get appropriate log file name
   */
  getLogFileName(category, level) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Route to appropriate subdirectory
    if (category === 'QUERY' || category === 'SQL') {
      return `queries/queries-${date}.log`;
    } else if (category === 'PROCEDURE') {
      return `procedures/procedures-${date}.log`;
    } else if (category === 'PROCESS') {
      return `processes/processes-${date}.log`;
    } else if (level === 'ERROR') {
      return `errors/errors-${date}.log`;
    } else if (category === 'PERFORMANCE') {
      return `performance/performance-${date}.log`;
    }
    
    return `general-${date}.log`;
  }

  /**
   * Log database queries
   */
  async logQuery(query, params = [], executionTime = 0, result = null, error = null) {
    this.queryStats.total++;
    
    if (error) {
      this.queryStats.errors++;
    }
    
    if (executionTime > 1000) { // Slow query threshold: 1 second
      this.queryStats.slow++;
    }

    const logData = {
      query: this.sanitizeQuery(query),
      params: this.sanitizeParams(params),
      executionTime,
      resultCount: result ? (Array.isArray(result) ? result.length : 1) : 0,
      error: error ? error.message : null,
      isSlow: executionTime > 1000,
      queryHash: this.hashQuery(query)
    };

    // For errors or slow queries, always log; for normal queries, only log if LOG_ALL_QUERIES is true
    if (error || executionTime > 1000) {  // error or slow query
      const level = error ? 'ERROR' : 'WARN';
      const message = error 
        ? `Query failed: ${error.message}` 
        : `Query executed in ${executionTime}ms`;
      await this.log(level, 'QUERY', message, logData);
    } else if (process.env.LOG_ALL_QUERIES === 'true') {  // normal query and logging enabled
      await this.log('DEBUG', 'QUERY', `Query executed in ${executionTime}ms`, logData);
    }
  }

  /**
   * Log database query errors specifically
   */
  async logQueryError(query, params = [], executionTime = 0, error = null) {
    this.queryStats.errors++;

    const logData = {
      query: this.sanitizeQuery(query),
      params: this.sanitizeParams(params),
      executionTime,
      error: error ? error.message : 'Unknown error',
      stack: error ? error.stack : null,
      queryHash: this.hashQuery(query)
    };

    const message = `Query failed: ${error ? error.message : 'Unknown error'}`;

    await this.log('ERROR', 'QUERY_ERROR', message, logData);
  }

  /**
   * Log stored procedure calls
   */
  async logProcedure(procedureName, params = [], executionTime = 0, result = null, error = null) {
    this.queryStats.procedures++;
    
    const logData = {
      procedure: procedureName,
      params: this.sanitizeParams(params),
      executionTime,
      resultCount: result ? (Array.isArray(result) ? result.length : 1) : 0,
      error: error ? error.message : null,
      isSlow: executionTime > 2000 // Procedures have higher threshold
    };

    const level = error ? 'ERROR' : (executionTime > 2000 ? 'WARN' : 'INFO');
    const message = error 
      ? `Procedure ${procedureName} failed: ${error.message}` 
      : `Procedure ${procedureName} executed in ${executionTime}ms`;

    await this.log(level, 'PROCEDURE', message, logData);
  }

  /**
   * Log API requests and responses
   */
  async logRequest(req, res, executionTime = 0) {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params,
      statusCode: res.statusCode,
      executionTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
      schoolId: req.user ? req.user.school_id : null,
      branchId: req.user ? req.user.branch_id : null
    };

    const level = res.statusCode >= 500 ? 'ERROR' : 
                  res.statusCode >= 400 ? 'WARN' : 'INFO';
    
    const message = `${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${executionTime}ms)`;

    await this.log(level, 'REQUEST', message, logData);
  }

  /**
   * Log process information
   */
  async logProcess(processName, data = {}, level = 'INFO') {
    const processData = {
      processName,
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      ...data
    };

    await this.log(level, 'PROCESS', `Process: ${processName}`, processData);
  }

  /**
   * Log performance metrics
   */
  async logPerformance(operation, duration, metadata = {}) {
    // Performance logging disabled
    return;
    
    const perfData = {
      operation,
      duration,
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      ...metadata
    };

    await this.log('INFO', 'PERFORMANCE', `Performance: ${operation} took ${duration}ms`, perfData);
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking(operationId) {
    this.performanceTracking.set(operationId, {
      startTime: Date.now(),
      startMemory: process.memoryUsage()
    });
  }

  /**
   * End performance tracking
   */
  async endPerformanceTracking(operationId, operation, metadata = {}) {
    const tracking = this.performanceTracking.get(operationId);
    if (!tracking) return;

    const duration = Date.now() - tracking.startTime;
    const endMemory = process.memoryUsage();
    
    const memoryDiff = {
      rss: endMemory.rss - tracking.startMemory.rss,
      heapUsed: endMemory.heapUsed - tracking.startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - tracking.startMemory.heapTotal
    };

    await this.logPerformance(operation, duration, {
      ...metadata,
      memoryDiff
    });

    this.performanceTracking.delete(operationId);
    return duration;
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    return {
      ...this.queryStats,
      slowQueryPercentage: this.queryStats.total > 0 
        ? (this.queryStats.slow / this.queryStats.total * 100).toFixed(2) 
        : 0,
      errorPercentage: this.queryStats.total > 0 
        ? (this.queryStats.errors / this.queryStats.total * 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Utility methods for data sanitization
   */
  sanitizeQuery(query) {
    if (typeof query !== 'string') return query;
    
    // Remove sensitive data patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/token\s*=\s*"[^"]*"/gi, 'token="***"');
  }

  sanitizeParams(params) {
    if (!params || !Array.isArray(params)) return params;
    
    return params.map(param => {
      if (typeof param === 'string' && param.length > 100) {
        return param.substring(0, 100) + '...[truncated]';
      }
      return param;
    });
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    });
    
    return sanitized;
  }

  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });
    
    return sanitized;
  }

  hashQuery(query) {
    if (typeof query !== 'string') return null;
    
    // Simple hash for query identification
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Safe JSON stringify that handles circular references
   */
  safeStringify(obj, space = 0) {
    const seen = new WeakSet();
    
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      
      // Handle Sequelize objects
      if (value && typeof value === 'object') {
        // Skip Sequelize instance properties that cause circular references
        if (key === 'sequelize' || key === 'dialect' || key === '_dialect') {
          return '[Sequelize Instance]';
        }
        
        // Skip large or problematic objects
        if (key === 'options' && value.logging) {
          return { ...value, logging: '[Function]' };
        }
        
        // Limit object size
        if (typeof value === 'object' && Object.keys(value).length > 50) {
          return '[Large Object - Truncated]';
        }
      }
      
      // Handle functions
      if (typeof value === 'function') {
        return '[Function]';
      }
      
      // Handle very long strings
      if (typeof value === 'string' && value.length > 1000) {
        return value.substring(0, 1000) + '...[Truncated]';
      }
      
      return value;
    }, space);
  }

  /**
   * Convenience methods for different log levels
   */
  async error(message, data = {}) {
    await this.log('ERROR', 'GENERAL', message, data);
  }

  async warn(message, data = {}) {
    await this.log('WARN', 'GENERAL', message, data);
  }

  async info(message, data = {}) {
    await this.log('INFO', 'GENERAL', message, data);
  }

  async debug(message, data = {}) {
    await this.log('DEBUG', 'GENERAL', message, data);
  }

  async trace(message, data = {}) {
    await this.log('TRACE', 'GENERAL', message, data);
  }
}

// Export singleton instance
module.exports = new Logger();