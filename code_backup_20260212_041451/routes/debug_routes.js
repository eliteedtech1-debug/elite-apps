/**
 * Debug Routes
 * Comprehensive debugging endpoints for development and troubleshooting
 */

const logger = require('../logging/Logger');
const databaseLogger = require('../logging/DatabaseLogger');
const processMonitor = require('../logging/ProcessMonitor');
const { getLoggingStatus } = require('../logging/initializeLogging');
const fs = require('fs').promises;
const path = require('path');

module.exports = (app) => {
  
  /**
   * Debug Dashboard - Main debugging interface
   */
  app.get('/debug', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Elite Scholar API - Debug Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
            .debug-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .debug-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
            .debug-card h3 { margin-top: 0; color: #007bff; }
            .debug-link { display: inline-block; background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; margin: 5px; }
            .debug-link:hover { background: #0056b3; color: white; text-decoration: none; }
            .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
            .status-active { background: #28a745; }
            .status-inactive { background: #dc3545; }
            .info-section { background: #e9ecef; padding: 15px; border-radius: 6px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔧 Elite Scholar API - Debug Dashboard</h1>
                <p>Comprehensive debugging and monitoring tools for development and troubleshooting</p>
            </div>

            <div class="debug-grid">
                <div class="debug-card">
                    <h3>📊 Logging & Monitoring</h3>
                    <p>Access comprehensive logging and monitoring tools</p>
                    <a href="/api/logging/dashboard" class="debug-link">📈 Logging Dashboard</a>
                    <a href="/api/logging/status" class="debug-link">📋 System Status</a>
                    <a href="/api/logging/database/stats" class="debug-link">🗄️ Database Stats</a>
                    <a href="/api/logging/process/metrics" class="debug-link">⚙️ Process Metrics</a>
                </div>

                <div class="debug-card">
                    <h3>🗄️ Database Debugging</h3>
                    <p>Monitor and debug database operations</p>
                    <a href="/debug/database/queries" class="debug-link">🔍 Recent Queries</a>
                    <a href="/debug/database/slow-queries" class="debug-link">🐌 Slow Queries</a>
                    <a href="/debug/database/connections" class="debug-link">🔗 Connections</a>
                    <a href="/debug/database/test" class="debug-link">🧪 Test Connection</a>
                    <a href="/debug/student-classes" class="debug-link">🎓 Student Classes (SCH/13)</a>
                    <a href="/debug/all-classes" class="debug-link">📚 All Classes (SCH/13)</a>
                </div>

                <div class="debug-card">
                    <h3>🌐 API Debugging</h3>
                    <p>Debug API endpoints and requests</p>
                    <a href="/debug/api/routes" class="debug-link">🛣️ All Routes</a>
                    <a href="/debug/api/middleware" class="debug-link">🔧 Middleware</a>
                    <a href="/debug/api/headers" class="debug-link">📋 Request Headers</a>
                    <a href="/debug/api/test" class="debug-link">🧪 Test Endpoint</a>
                </div>

                <div class="debug-card">
                    <h3>📁 Log Files</h3>
                    <p>Access and download log files</p>
                    <a href="/api/logging/files" class="debug-link">📂 Available Files</a>
                    <a href="/api/logging/recent?category=queries&limit=100" class="debug-link">📄 Query Logs</a>
                    <a href="/api/logging/recent?category=errors&limit=50" class="debug-link">❌ Error Logs</a>
                    <a href="/api/logging/recent?category=performance&limit=50" class="debug-link">⚡ Performance Logs</a>
                </div>

                <div class="debug-card">
                    <h3>⚙️ System Information</h3>
                    <p>View system and environment details</p>
                    <a href="/debug/system/info" class="debug-link">💻 System Info</a>
                    <a href="/debug/system/env" class="debug-link">🌍 Environment</a>
                    <a href="/debug/system/memory" class="debug-link">🧠 Memory Usage</a>
                    <a href="/debug/system/health" class="debug-link">❤️ Health Check</a>
                </div>

                <div class="debug-card">
                    <h3>🔧 Configuration</h3>
                    <p>View and modify debug settings</p>
                    <a href="/api/logging/config" class="debug-link">⚙️ Logging Config</a>
                    <a href="/debug/config/database" class="debug-link">🗄️ Database Config</a>
                    <a href="/debug/config/toggle-logging" class="debug-link">🔄 Toggle Logging</a>
                    <a href="/debug/config/clear-logs" class="debug-link">🗑️ Clear Logs</a>
                </div>
            </div>

            <div class="info-section">
                <h4>🚀 Quick Actions</h4>
                <a href="/debug/test/database-query" class="debug-link">🧪 Test DB Query</a>
                <a href="/debug/test/logging" class="debug-link">📝 Test Logging</a>
                <a href="/debug/test/error" class="debug-link">💥 Test Error</a>
                <a href="/debug/test/school-settings" class="debug-link">🏫 Test School Settings</a>
                <a href="/debug/export/logs" class="debug-link">📦 Export All Logs</a>
            </div>

            <div class="info-section">
                <h4>📚 Documentation</h4>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <p><strong>Port:</strong> ${process.env.PORT || '34567'}</p>
                <p><strong>Database Logging:</strong> <span class="status-indicator status-${process.env.ENABLE_DB_LOGGING !== 'false' ? 'active' : 'inactive'}"></span>${process.env.ENABLE_DB_LOGGING !== 'false' ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Request Logging:</strong> <span class="status-indicator status-${process.env.ENABLE_REQUEST_LOGGING !== 'false' ? 'active' : 'inactive'}"></span>${process.env.ENABLE_REQUEST_LOGGING !== 'false' ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Log Level:</strong> ${process.env.LOG_LEVEL || 'DEBUG'}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(html);
  });

  /**
   * Database debugging endpoints
   */
  app.get('/debug/all-classes', async (req, res) => {
    try {
      const db = require('../config/database');
      
      const query = `
        SELECT 
          class_code,
          class_name,
          status,
          parent_id,
          branch_id
        FROM classes 
        WHERE school_id = 'SCH/13'
        ORDER BY class_code
      `;
      
      const [results] = await db.execute(query);
      
      res.json({
        success: true,
        message: 'All classes for SCH/13 retrieved',
        data: {
          classes: results,
          total: results.length,
          school_id: 'SCH/13',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Debug all-classes endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve classes',
        error: error.message
      });
    }
  });

  app.get('/debug/database/queries', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const stats = databaseLogger.getStats();
      
      res.json({
        success: true,
        message: 'Recent database queries retrieved',
        data: {
          stats,
          recentQueries: stats.recentQueries || [],
          limit,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get database queries',
        error: error.message
      });
    }
  });

  app.get('/debug/database/slow-queries', async (req, res) => {
    try {
      const stats = databaseLogger.getStats();
      
      res.json({
        success: true,
        message: 'Slow database queries retrieved',
        data: {
          slowQueries: stats.slowQueries || [],
          threshold: process.env.SLOW_QUERY_THRESHOLD || 1000,
          count: stats.slow || 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get slow queries',
        error: error.message
      });
    }
  });

  app.get('/debug/database/test', async (req, res) => {
    try {
      const db = require('../models');
      const startTime = Date.now();
      
      // Test database connection
      await db.sequelize.authenticate();
      const connectionTime = Date.now() - startTime;
      
      // Test a simple query
      const queryStartTime = Date.now();
      const result = await db.sequelize.query('SELECT 1 as test', {
        type: db.sequelize.QueryTypes.SELECT
      });
      const queryTime = Date.now() - queryStartTime;
      
      res.json({
        success: true,
        message: 'Database test completed successfully',
        data: {
          connection: {
            status: 'connected',
            time: connectionTime + 'ms'
          },
          query: {
            result: result[0],
            time: queryTime + 'ms'
          },
          database: {
            name: db.sequelize.config.database,
            host: db.sequelize.config.host,
            dialect: db.sequelize.config.dialect
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database test failed',
        error: {
          message: error.message,
          name: error.name
        }
      });
    }
  });

  /**
   * API debugging endpoints
   */
  app.get('/debug/api/routes', (req, res) => {
    try {
      const routes = [];
      
      // Extract routes from Express app
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          // Direct route
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods),
            stack: middleware.route.stack.length
          });
        } else if (middleware.name === 'router') {
          // Router middleware
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods),
                stack: handler.route.stack.length
              });
            }
          });
        }
      });
      
      res.json({
        success: true,
        message: 'API routes retrieved',
        data: {
          routes,
          count: routes.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get API routes',
        error: error.message
      });
    }
  });

  app.get('/debug/api/headers', (req, res) => {
    res.json({
      success: true,
      message: 'Request headers retrieved',
      data: {
        headers: req.headers,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/debug/api/test', (req, res) => {
    res.json({
      success: true,
      message: 'API test endpoint working correctly',
      data: {
        server: 'Elite Scholar API',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  });

  /**
   * System information endpoints
   */
  app.get('/debug/system/info', (req, res) => {
    const os = require('os');
    
    res.json({
      success: true,
      message: 'System information retrieved',
      data: {
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
          uptime: process.uptime(),
          cwd: process.cwd()
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
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/debug/system/env', (req, res) => {
    // Filter sensitive environment variables
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth'];
    const filteredEnv = {};
    
    Object.keys(process.env).forEach(key => {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive)
      );
      
      filteredEnv[key] = isSensitive ? '***REDACTED***' : process.env[key];
    });
    
    res.json({
      success: true,
      message: 'Environment variables retrieved (sensitive data redacted)',
      data: {
        environment: filteredEnv,
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/debug/system/health', async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {
          database: { status: 'unknown' },
          logging: { status: 'unknown' },
          filesystem: { status: 'unknown' }
        }
      };
      
      // Database health check
      try {
        const db = require('../models');
        await db.sequelize.authenticate();
        health.checks.database = { status: 'healthy', message: 'Database connection successful' };
      } catch (dbError) {
        health.checks.database = { status: 'unhealthy', error: dbError.message };
        health.status = 'degraded';
      }
      
      // Logging system health check
      try {
        const loggingStatus = getLoggingStatus();
        health.checks.logging = { 
          status: loggingStatus.enabled ? 'healthy' : 'disabled',
          config: loggingStatus.config
        };
      } catch (logError) {
        health.checks.logging = { status: 'unhealthy', error: logError.message };
      }
      
      // Filesystem health check
      try {
        const logDir = path.join(__dirname, '../../logs');
        await fs.access(logDir);
        health.checks.filesystem = { status: 'healthy', message: 'Log directory accessible' };
      } catch (fsError) {
        health.checks.filesystem = { status: 'unhealthy', error: 'Log directory not accessible' };
      }
      
      res.json({
        success: true,
        message: 'Health check completed',
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  });

  /**
   * Test endpoints
   */
  app.get('/debug/test/database-query', async (req, res) => {
    try {
      const db = require('../models');
      const testQuery = `
        SELECT 
          'Database Test' as test_type,
          NOW() as current_time,
          VERSION() as mysql_version,
          DATABASE() as current_database
      `;
      
      const result = await db.sequelize.query(testQuery, {
        type: db.sequelize.QueryTypes.SELECT
      });
      
      await logger.info('Debug database query test executed', {
        query: testQuery,
        result: result[0],
        executedBy: 'debug-endpoint'
      });
      
      res.json({
        success: true,
        message: 'Database query test completed',
        data: {
          query: testQuery,
          result: result[0],
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      await logger.error('Debug database query test failed', {
        error: error.message,
        executedBy: 'debug-endpoint'
      });
      
      res.status(500).json({
        success: false,
        message: 'Database query test failed',
        error: error.message
      });
    }
  });

  app.get('/debug/test/logging', async (req, res) => {
    try {
      const testData = {
        testType: 'logging-system-test',
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substr(2, 9)
      };
      
      // Test all log levels
      await logger.debug('Debug level test message', testData);
      await logger.info('Info level test message', testData);
      await logger.warn('Warning level test message', testData);
      await logger.error('Error level test message', testData);
      
      res.json({
        success: true,
        message: 'Logging test completed - check logs for test messages',
        data: testData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logging test failed',
        error: error.message
      });
    }
  });

  app.get('/debug/test/error', async (req, res) => {
    try {
      // Intentionally throw an error for testing
      throw new Error('This is a test error for debugging purposes');
    } catch (error) {
      await logger.error('Debug test error thrown', {
        error: {
          message: error.message,
          stack: error.stack
        },
        testType: 'intentional-error',
        executedBy: 'debug-endpoint'
      });
      
      res.status(500).json({
        success: false,
        message: 'Test error thrown successfully',
        error: {
          message: error.message,
          type: 'intentional-test-error'
        },
        note: 'This error was intentionally thrown for testing purposes'
      });
    }
  });

  app.get('/debug/student-classes', async (req, res) => {
    try {
      const db = require('../models');
      
      const students = await db.sequelize.query(`
        SELECT 
          admission_no,
          class_code,
          status,
          CONCAT(surname, ', ', first_name) as name
        FROM students 
        WHERE school_id = 'SCH/13'
        ORDER BY class_code, admission_no
      `, {
        type: db.sequelize.QueryTypes.SELECT
      });
      
      await logger.info('Student class_code debug query executed', {
        school_id: 'SCH/13',
        studentCount: students.length,
        executedBy: 'debug-endpoint'
      });
      
      res.json({
        success: true,
        message: `Retrieved ${students.length} students for school SCH/13`,
        data: {
          school_id: 'SCH/13',
          students,
          count: students.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      await logger.error('Student class_code debug query failed', {
        error: error.message,
        school_id: 'SCH/13',
        executedBy: 'debug-endpoint'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve student class codes',
        error: error.message
      });
    }
  });

  app.get('/debug/test/school-settings', async (req, res) => {
    try {
      const db = require('../models');
      const testSchoolId = 'TEST_SCHOOL_001';
      const testBranchId = 'BRANCH_A';
      
      // Test creating school-wide setting
      const schoolWideSetting = await db.SystemConfig.upsert({
        config_key: `school_${testSchoolId}_test_school_setting`,
        config_value: 'School-wide test value',
        config_type: 'string',
        description: 'Test school-wide setting created by debug endpoint',
        is_system: false,
        updated_by: 'debug-test'
      });
      
      // Test creating branch-specific setting
      const branchSetting = await db.SystemConfig.upsert({
        config_key: `school_${testSchoolId}_branch_${testBranchId}_test_branch_setting`,
        config_value: 'Branch-specific test value',
        config_type: 'string',
        description: 'Test branch-specific setting created by debug endpoint',
        is_system: false,
        updated_by: 'debug-test'
      });
      
      // Test retrieving school-wide settings
      const schoolSettings = await db.SystemConfig.findAll({
        where: {
          config_key: {
            [db.Sequelize.Op.like]: `school_${testSchoolId}_%`
          }
        }
      });
      
      // Test retrieving branch-specific settings
      const branchSettings = await db.SystemConfig.findAll({
        where: {
          config_key: {
            [db.Sequelize.Op.like]: `school_${testSchoolId}_branch_${testBranchId}_%`
          }
        }
      });
      
      await logger.info('School settings test completed', {
        testSchoolId,
        testBranchId,
        schoolSettingsCount: schoolSettings.length,
        branchSettingsCount: branchSettings.length,
        testType: 'school-settings-test',
        executedBy: 'debug-endpoint'
      });
      
      res.json({
        success: true,
        message: 'School settings test completed successfully (with branch isolation)',
        data: {
          testSchoolId,
          testBranchId,
          schoolWideSetting: {
            created: schoolWideSetting[1],
            key: `school_${testSchoolId}_test_school_setting`
          },
          branchSetting: {
            created: branchSetting[1],
            key: `school_${testSchoolId}_branch_${testBranchId}_test_branch_setting`
          },
          schoolSettings: {
            count: schoolSettings.length,
            settings: schoolSettings.map(s => ({
              key: s.config_key,
              value: s.config_value,
              type: s.config_type
            }))
          },
          branchSettings: {
            count: branchSettings.length,
            settings: branchSettings.map(s => ({
              key: s.config_key,
              value: s.config_value,
              type: s.config_type
            }))
          },
          endpoint: '/school-settings',
          isolation: 'school_id + branch_id',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      await logger.error('School settings test failed', {
        error: error.message,
        testType: 'school-settings-test',
        executedBy: 'debug-endpoint'
      });
      
      res.status(500).json({
        success: false,
        message: 'School settings test failed',
        error: error.message
      });
    }
  });

  /**
   * Configuration endpoints
   */
  app.get('/debug/config/database', (req, res) => {
    try {
      const db = require('../models');
      const config = {
        database: db.sequelize.config.database,
        host: db.sequelize.config.host,
        port: db.sequelize.config.port,
        dialect: db.sequelize.config.dialect,
        timezone: db.sequelize.config.timezone,
        pool: db.sequelize.config.pool,
        logging: !!db.sequelize.config.logging
      };
      
      res.json({
        success: true,
        message: 'Database configuration retrieved',
        data: {
          config,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get database configuration',
        error: error.message
      });
    }
  });

  console.log('✅ Debug routes initialized');
  console.log('🔧 Debug dashboard available at: /debug');
  console.log('📊 All debugging endpoints are now accessible');
};