/**
 * Initialize Logging System
 * Sets up all logging components for the Elite Scholar API
 */

const os = require('os');
const logger = require('./Logger');
const databaseLogger = require('./DatabaseLogger');
const processMonitor = require('./ProcessMonitor');
const loggingConfig = require('../config/loggingConfig');

/**
 * Initialize the complete logging system
 */
async function initializeLogging(app, db) {
  try {
    console.log('🚀 Initializing Elite Scholar API Logging System...');
    
    // 1. Initialize core logger
    await logger.info('Logging system initialization started', {
      nodeEnv: process.env.NODE_ENV,
      config: {
        enabled: loggingConfig.enabled,
        logLevel: loggingConfig.logLevel,
        databaseLogging: loggingConfig.database.enabled,
        processMonitoring: loggingConfig.process.enabled
      }
    });

    // 2. Setup comprehensive database logging if enabled
    if (loggingConfig.database.enabled && db) {
      console.log('📊 Setting up comprehensive database logging...');
      
      // Initialize the original database logger
      databaseLogger.setupSequelizeLogging(db.sequelize);
      databaseLogger.createProcedureWrapper(db);
      
      if (loggingConfig.database.logOrmOperations) {
        databaseLogger.wrapModelMethods(db);
      }
      
      // Skip database query interceptor to avoid connection issues
      // const databaseQueryInterceptor = require('../middleware/databaseQueryInterceptor');
      // databaseQueryInterceptor.initialize(db.sequelize, db);
      
      await logger.info('Comprehensive database logging initialized', {
        logAllQueries: loggingConfig.database.logAllQueries,
        slowQueryThreshold: loggingConfig.database.slowQueryThreshold,
        logProcedures: loggingConfig.database.logProcedures,
        logOrmOperations: loggingConfig.database.logOrmOperations,
        interceptorEnabled: false,
        components: {
          sequelizeLogging: true,
          procedureWrapper: true,
          ormMethodWrapping: loggingConfig.database.logOrmOperations,
          queryInterceptor: false
        }
      });
    }

    // 3. Setup request logging middleware if enabled
    if (loggingConfig.requests.enabled && app) {
      console.log('🌐 Setting up request logging middleware...');
      const { requestLogger, errorLogger } = require('../middleware/requestLogger');
      
      // Add request logging middleware early in the stack
      app.use(requestLogger);
      
      // Add error logging middleware at the end
      app.use(errorLogger);
      
      await logger.info('Request logging middleware initialized', {
        logBody: loggingConfig.requests.logBody,
        logHeaders: loggingConfig.requests.logHeaders,
        slowRequestThreshold: loggingConfig.requests.slowRequestThreshold,
        skipPaths: loggingConfig.requests.skipPaths
      });
    }

    // 4. Start process monitoring if enabled
    if (loggingConfig.process.enabled) {
      console.log('⚙️ Starting process monitoring...');
      processMonitor.start();
      
      await logger.info('Process monitoring started', {
        monitoringInterval: loggingConfig.process.monitoringInterval,
        memoryLeakThreshold: loggingConfig.process.memoryLeakThreshold,
        cpuThreshold: loggingConfig.process.cpuThreshold
      });
    }

    // 5. Setup logging dashboard routes if app is provided
    if (app) {
      console.log('📈 Setting up logging dashboard...');
      try {
        require('../routes/logging_dashboard')(app);
        await logger.info('Logging dashboard routes initialized');
      } catch (dashboardError) {
        console.error('⚠️  Failed to setup logging dashboard:', dashboardError.message);
        await logger.warn('Logging dashboard setup failed', { error: dashboardError.message });
      }
    }

    // 6. Setup graceful shutdown handlers
    setupGracefulShutdown();

    // 7. Log system information
    await logSystemInformation();

    // 8. Setup periodic health checks
    setupHealthChecks();

    console.log('✅ Elite Scholar API Logging System initialized successfully!');
    console.log('📁 Logs directory:', logger.logDir);
    console.log('📊 Dashboard available at: /api/logging/dashboard');
    
    await logger.info('Logging system initialization completed', {
      components: {
        coreLogger: true,
        databaseLogger: loggingConfig.database.enabled,
        requestLogger: loggingConfig.requests.enabled,
        processMonitor: loggingConfig.process.enabled,
        dashboard: !!app
      },
      logDirectory: logger.logDir
    });

    return {
      logger,
      databaseLogger,
      processMonitor,
      config: loggingConfig
    };

  } catch (error) {
    console.error('❌ Failed to initialize logging system:', error);
    throw error;
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down logging system...`);
    
    try {
      await logger.info(`Graceful shutdown initiated by ${signal}`, {
        signal,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });

      // Stop process monitoring
      processMonitor.stop();

      // Log final statistics
      const finalStats = {
        database: databaseLogger.getStats(),
        process: processMonitor.getMetrics(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      await logger.info('Final system statistics', finalStats);
      await logger.info('Logging system shutdown completed');

      console.log('✅ Logging system shutdown completed');
      
      // Give some time for final logs to be written
      setTimeout(() => {
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('❌ Error during logging system shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
}

/**
 * Log comprehensive system information
 */
async function logSystemInformation() {
  const os = require('os');
  
  const systemInfo = {
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime()
    },
    node: {
      version: process.version,
      pid: process.pid,
      ppid: process.ppid,
      execPath: process.execPath,
      cwd: process.cwd(),
      argv: process.argv
    },
    memory: {
      system: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      process: process.memoryUsage()
    },
    cpu: {
      count: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      loadAverage: os.loadavg()
    },
    network: {
      interfaces: Object.keys(os.networkInterfaces())
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      logLevel: process.env.LOG_LEVEL
    }
  };

  await logger.info('System information logged', systemInfo);
}

/**
 * Setup periodic health checks
 */
function setupHealthChecks() {
  const healthCheckInterval = 5 * 60 * 1000; // 5 minutes

  setInterval(async () => {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: databaseLogger.getStats(),
        process: processMonitor.getMetrics(),
        status: 'healthy'
      };

      // Check for potential issues
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.rss / os.totalmem()) * 100;
      
      if (memoryUsagePercent > 80) {
        health.status = 'warning';
        health.warnings = health.warnings || [];
        health.warnings.push(`High memory usage: ${memoryUsagePercent.toFixed(2)}%`);
      }

      const dbStats = databaseLogger.getStats();
      if (dbStats.errorPercentage > 5) {
        health.status = 'warning';
        health.warnings = health.warnings || [];
        health.warnings.push(`High database error rate: ${dbStats.errorPercentage}%`);
      }

      // await logger.info('Health check completed', health);

    } catch (error) {
      await logger.error('Health check failed', { error: error.message });
    }
  }, healthCheckInterval);

  logger.info('Periodic health checks started', { interval: healthCheckInterval });
}

/**
 * Get logging system status
 */
function getLoggingStatus() {
  return {
    enabled: loggingConfig.enabled,
    components: {
      coreLogger: true,
      databaseLogger: loggingConfig.database.enabled,
      requestLogger: loggingConfig.requests.enabled,
      processMonitor: loggingConfig.process.enabled
    },
    config: loggingConfig,
    stats: {
      database: databaseLogger.getStats(),
      process: processMonitor.getMetrics()
    }
  };
}

module.exports = {
  initializeLogging,
  getLoggingStatus,
  logger,
  databaseLogger,
  processMonitor
};