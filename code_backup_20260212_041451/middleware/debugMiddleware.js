/**
 * Debug Middleware
 * Comprehensive debugging middleware for request/response logging and monitoring
 */

const logger = require('../logging/Logger');

/**
 * Enhanced request logging middleware
 */
function debugRequestLogger(req, res, next) {
  // Skip logging for certain paths to reduce noise
  const skipPaths = ['/favicon.ico', '/robots.txt', '/health'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object for tracking
  req.requestId = requestId;
  
  // Log request start
  const requestData = {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: process.env.LOG_REQUEST_HEADERS === 'true' ? req.headers : {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'x-school-id': req.get('X-School-Id'),
      'x-branch-id': req.get('X-Branch-Id')
    },
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  // Include request body if enabled and not too large
  if (process.env.LOG_REQUEST_BODY === 'true' && req.body) {
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize < 10000) { // Only log bodies smaller than 10KB
      requestData.body = req.body;
    } else {
      requestData.body = `[Body too large: ${bodySize} bytes]`;
    }
  }
  
  logger.info('🌐 HTTP Request Started', requestData);
  
  // Capture original res.json and res.send methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override res.json to log response
  res.json = function(data) {
    logResponse(data, 'json');
    return originalJson.call(this, data);
  };
  
  // Override res.send to log response
  res.send = function(data) {
    logResponse(data, 'send');
    return originalSend.call(this, data);
  };
  
  // Log response function
  function logResponse(data, method) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const isSlowRequest = duration > (parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 5000);
    
    const responseData = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration + 'ms',
      isSlowRequest,
      responseMethod: method,
      timestamp: new Date().toISOString()
    };
    
    // Include response body if enabled and not too large
    if (process.env.LOG_RESPONSE_BODY === 'true' && data) {
      const responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
      if (responseSize < 5000) { // Only log responses smaller than 5KB
        responseData.responseBody = data;
      } else {
        responseData.responseBody = `[Response too large: ${responseSize} bytes]`;
      }
    }
    
    // Log with appropriate level based on status code and duration
    let logLevel = 'info';
    let message = '✅ HTTP Request Completed';
    
    if (res.statusCode >= 500) {
      logLevel = 'error';
      message = '❌ HTTP Request Failed (Server Error)';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
      message = '⚠️ HTTP Request Failed (Client Error)';
    } else if (isSlowRequest) {
      logLevel = 'warn';
      message = '🐌 Slow HTTP Request Completed';
    }
    
    logger[logLevel](message, responseData);
  }
  
  // Handle cases where response is sent without json() or send()
  res.on('finish', () => {
    if (!res.headersSent) return;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Only log if we haven't already logged this response
    if (!res._debugLogged) {
      res._debugLogged = true;
      
      const responseData = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: duration + 'ms',
        responseMethod: 'finish-event',
        timestamp: new Date().toISOString()
      };
      
      logger.info('📤 HTTP Response Sent', responseData);
    }
  });
  
  next();
}

/**
 * Error logging middleware
 */
function debugErrorLogger(err, req, res, next) {
  const errorData = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.LOG_STACK_TRACE !== 'false' ? err.stack : undefined,
      code: err.code,
      status: err.status || err.statusCode
    },
    timestamp: new Date().toISOString()
  };
  
  // Include request context if enabled
  if (process.env.LOG_REQUEST_CONTEXT !== 'false') {
    errorData.requestContext = {
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
  }
  
  logger.error('💥 HTTP Request Error', errorData);
  
  // Don't handle the error, just log it
  next(err);
}

/**
 * Database query debugging middleware
 */
function debugDatabaseQueries(req, res, next) {
  // Add query tracking to request object
  req.dbQueries = [];
  
  // Store original query method if available
  if (req.db && req.db.sequelize) {
    const originalQuery = req.db.sequelize.query;
    
    req.db.sequelize.query = function(sql, options) {
      const queryStart = Date.now();
      const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      req.dbQueries.push({
        queryId,
        sql: sql.substring(0, 500), // Truncate long queries
        startTime: queryStart,
        requestId: req.requestId
      });
      
      return originalQuery.call(this, sql, options).then(result => {
        const queryEnd = Date.now();
        const duration = queryEnd - queryStart;
        
        // Update query record with completion info
        const queryRecord = req.dbQueries.find(q => q.queryId === queryId);
        if (queryRecord) {
          queryRecord.duration = duration;
          queryRecord.completed = true;
          queryRecord.resultCount = Array.isArray(result) ? result.length : 1;
        }
        
        return result;
      }).catch(error => {
        // Update query record with error info
        const queryRecord = req.dbQueries.find(q => q.queryId === queryId);
        if (queryRecord) {
          queryRecord.error = error.message;
          queryRecord.failed = true;
        }
        
        throw error;
      });
    };
  }
  
  next();
}

/**
 * Performance monitoring middleware
 */
function debugPerformanceMonitor(req, res, next) {
  if (process.env.ENABLE_PERFORMANCE_TRACKING !== 'true') {
    return next();
  }
  
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };
    
    const performanceData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      duration: duration.toFixed(2) + 'ms',
      memoryDelta,
      dbQueries: req.dbQueries ? req.dbQueries.length : 0,
      timestamp: new Date().toISOString()
    };
    
    // Log slow operations or significant memory usage
    const isSlowOperation = duration > (parseInt(process.env.SLOW_OPERATION_THRESHOLD) || 1000);
    const hasSignificantMemoryUsage = Math.abs(memoryDelta.heapUsed) > 10 * 1024 * 1024; // 10MB
    
    if (isSlowOperation || hasSignificantMemoryUsage) {
      logger.warn('⚡ Performance Alert', {
        ...performanceData,
        alerts: {
          slowOperation: isSlowOperation,
          significantMemoryUsage: hasSignificantMemoryUsage
        }
      });
    } else if (process.env.TRACK_ALL_OPERATIONS === 'true') {
      logger.debug('⚡ Performance Metrics', performanceData);
    }
  });
  
  next();
}

/**
 * Security debugging middleware
 */
function debugSecurityMonitor(req, res, next) {
  const securityData = {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  };
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /drop.*table/i, // SQL injection
    /exec\(/i, // Code injection
    /eval\(/i  // Code injection
  ];
  
  const urlAndBody = req.url + JSON.stringify(req.body || {});
  const suspiciousActivity = suspiciousPatterns.some(pattern => pattern.test(urlAndBody));
  
  if (suspiciousActivity) {
    logger.warn('🚨 Suspicious Activity Detected', {
      ...securityData,
      suspiciousContent: urlAndBody.substring(0, 500),
      alert: 'Potential security threat detected'
    });
  }
  
  // Log failed authentication attempts
  if (req.url.includes('/login') || req.url.includes('/auth')) {
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.warn('🔐 Authentication Failure', {
          ...securityData,
          statusCode: res.statusCode,
          alert: 'Failed authentication attempt'
        });
      }
    });
  }
  
  next();
}

module.exports = {
  debugRequestLogger,
  debugErrorLogger,
  debugDatabaseQueries,
  debugPerformanceMonitor,
  debugSecurityMonitor
};