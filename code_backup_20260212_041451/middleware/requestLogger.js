/**
 * Request Logging Middleware
 * Automatically logs all incoming requests and outgoing responses
 */

const logger = require('../logging/Logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  // Skip logging for health checks and static assets
  const skipPaths = ['/health', '/favicon.ico', '/robots.txt'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', requestId);

  // Start performance tracking
  logger.startPerformanceTracking(requestId);
  
  const startTime = Date.now();

  // Log incoming request
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl || req.url}`, {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    headers: logger.sanitizeHeaders(req.headers),
    query: req.query,
    params: req.params,
    body: logger.sanitizeBody(req.body),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    schoolId: req.user ? req.user.school_id : null,
    branchId: req.user ? req.user.branch_id : null
  });

  // Capture original res.end to log response
  const originalEnd = res.end;
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody = null;
  let responseLogged = false;

  // Override res.send to capture response body
  res.send = function(body) {
    if (!responseLogged) {
      responseBody = body;
      logResponse();
    }
    return originalSend.call(this, body);
  };

  // Override res.json to capture JSON response
  res.json = function(obj) {
    if (!responseLogged) {
      responseBody = obj;
      logResponse();
    }
    return originalJson.call(this, obj);
  };

  // Override res.end to ensure we always log
  res.end = function(chunk, encoding) {
    if (!responseLogged) {
      if (chunk) responseBody = chunk;
      logResponse();
    }
    return originalEnd.call(this, chunk, encoding);
  };

  function logResponse() {
    if (responseLogged) return;
    responseLogged = true;

    const executionTime = Date.now() - startTime;
    
    // End performance tracking
    logger.endPerformanceTracking(requestId, `${req.method} ${req.originalUrl || req.url}`, {
      statusCode: res.statusCode,
      requestId
    });

    // Log the complete request/response cycle
    logger.logRequest(req, res, executionTime);

    // Log response details
    const responseData = {
      requestId,
      statusCode: res.statusCode,
      executionTime,
      responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
      headers: res.getHeaders()
    };

    // Include response body for errors or if debug level is enabled
    if (res.statusCode >= 400 || logger.currentLevel >= logger.logLevels.TRACE) {
      responseData.body = logger.sanitizeBody(responseBody);
    }

    const level = res.statusCode >= 500 ? 'ERROR' : 
                  res.statusCode >= 400 ? 'WARN' : 'INFO';
    
    logger.log(level, 'RESPONSE', 
      `Response: ${res.statusCode} for ${req.method} ${req.originalUrl || req.url} (${executionTime}ms)`, 
      responseData
    );

    // Log slow requests
    if (executionTime > 5000) { // 5 seconds threshold
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl || req.url}`, {
        requestId,
        executionTime,
        statusCode: res.statusCode,
        url: req.originalUrl || req.url,
        method: req.method
      });
    }
  }

  next();
};

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  
  logger.error(`Request Error: ${err.message}`, {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      status: err.status || err.statusCode
    },
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: logger.sanitizeHeaders(req.headers),
      body: logger.sanitizeBody(req.body),
      params: req.params,
      query: req.query,
      userId: req.user ? req.user.id : null,
      schoolId: req.user ? req.user.school_id : null
    }
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};