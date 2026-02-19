/**
 * Logging Configuration
 * Central configuration for all logging components
 */

module.exports = {
  // General logging settings
  enabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_LOGGING === 'true',
  logLevel: process.env.LOG_LEVEL || 'DEBUG',
  
  // File logging settings
  logDirectory: process.env.LOG_DIRECTORY || './logs',
  maxLogFileSize: process.env.MAX_LOG_FILE_SIZE || '100MB',
  maxLogFiles: process.env.MAX_LOG_FILES || 30,
  
  // Database logging settings
  database: {
    enabled: process.env.ENABLE_DB_LOGGING !== 'false', // Enabled by default
    logAllQueries: process.env.LOG_ALL_QUERIES !== 'false', // Log all queries by default
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // milliseconds
    logProcedures: process.env.LOG_PROCEDURES !== 'false', // Log procedures by default
    logOrmOperations: process.env.LOG_ORM_OPERATIONS !== 'false' // Log ORM operations by default
  },
  
  // Request logging settings
  requests: {
    enabled: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    logBody: process.env.LOG_REQUEST_BODY === 'true',
    logHeaders: process.env.LOG_REQUEST_HEADERS === 'true',
    logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
    slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 5000, // milliseconds
    skipPaths: ['/health', '/favicon.ico', '/robots.txt', '/metrics']
  },
  
  // Process monitoring settings
  process: {
    enabled: process.env.ENABLE_PROCESS_MONITORING === 'true' || process.env.NODE_ENV === 'development',
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL) || 30000, // milliseconds
    memoryLeakThreshold: parseInt(process.env.MEMORY_LEAK_THRESHOLD) || 50 * 1024 * 1024, // 50MB
    cpuThreshold: parseFloat(process.env.CPU_THRESHOLD) || 0.8 // 80%
  },
  
  // Performance tracking settings
  performance: {
    enabled: process.env.ENABLE_PERFORMANCE_TRACKING === 'true' || process.env.NODE_ENV === 'development',
    trackAllOperations: process.env.TRACK_ALL_OPERATIONS === 'true',
    slowOperationThreshold: parseInt(process.env.SLOW_OPERATION_THRESHOLD) || 1000 // milliseconds
  },
  
  // Error logging settings
  errors: {
    logStackTrace: process.env.LOG_STACK_TRACE !== 'false',
    logRequestContext: process.env.LOG_REQUEST_CONTEXT !== 'false',
    notifyOnCriticalErrors: process.env.NOTIFY_ON_CRITICAL_ERRORS === 'true'
  },
  
  // Security logging settings
  security: {
    logFailedLogins: process.env.LOG_FAILED_LOGINS !== 'false',
    logUnauthorizedAccess: process.env.LOG_UNAUTHORIZED_ACCESS !== 'false',
    logSuspiciousActivity: process.env.LOG_SUSPICIOUS_ACTIVITY === 'true'
  },
  
  // Console output settings
  console: {
    enabled: process.env.CONSOLE_LOGGING !== 'false',
    colorize: process.env.COLORIZE_LOGS !== 'false',
    timestamp: process.env.CONSOLE_TIMESTAMP !== 'false',
    level: process.env.CONSOLE_LOG_LEVEL || 'INFO'
  },
  
  // Log rotation settings
  rotation: {
    enabled: process.env.LOG_ROTATION === 'true',
    frequency: process.env.LOG_ROTATION_FREQUENCY || 'daily', // daily, weekly, monthly
    maxSize: process.env.LOG_ROTATION_MAX_SIZE || '100MB',
    maxFiles: parseInt(process.env.LOG_ROTATION_MAX_FILES) || 30,
    compress: process.env.LOG_ROTATION_COMPRESS === 'true'
  },
  
  // External logging services (optional)
  external: {
    // Elasticsearch/ELK Stack
    elasticsearch: {
      enabled: process.env.ELASTICSEARCH_LOGGING === 'true',
      host: process.env.ELASTICSEARCH_HOST,
      port: process.env.ELASTICSEARCH_PORT || 9200,
      index: process.env.ELASTICSEARCH_INDEX || 'elite-scholar-logs'
    },
    
    // Syslog
    syslog: {
      enabled: process.env.SYSLOG_LOGGING === 'true',
      host: process.env.SYSLOG_HOST || 'localhost',
      port: process.env.SYSLOG_PORT || 514,
      facility: process.env.SYSLOG_FACILITY || 'local0'
    },
    
    // Custom webhook
    webhook: {
      enabled: process.env.WEBHOOK_LOGGING === 'true',
      url: process.env.WEBHOOK_URL,
      method: process.env.WEBHOOK_METHOD || 'POST',
      headers: process.env.WEBHOOK_HEADERS ? JSON.parse(process.env.WEBHOOK_HEADERS) : {}
    }
  },
  
  // Sensitive data patterns to sanitize
  sanitization: {
    patterns: [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /credential/i,
      /session/i
    ],
    replacement: '***REDACTED***'
  },
  
  // Development specific settings
  development: {
    prettyPrint: true,
    logToFile: true,
    logToConsole: true,
    verboseErrors: true
  },
  
  // Production specific settings
  production: {
    prettyPrint: false,
    logToFile: true,
    logToConsole: false,
    verboseErrors: false,
    enableCompression: true
  }
};