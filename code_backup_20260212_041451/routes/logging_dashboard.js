/**
 * Logging Dashboard Routes
 * Provides a web interface to monitor database logging and system performance
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../logging/Logger');
const databaseLogger = require('../logging/DatabaseLogger');
const processMonitor = require('../logging/ProcessMonitor');
const loggingConfig = require('../config/loggingConfig');

module.exports = (app) => {
  
  // Main logging dashboard
  app.get('/api/logging/dashboard', async (req, res) => {
    try {
      const stats = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid,
          nodeVersion: process.version,
          environment: process.env.NODE_ENV
        },
        database: databaseLogger.getStats(),
        process: processMonitor.getMetrics ? processMonitor.getMetrics() : {},
        logging: {
          enabled: loggingConfig.enabled,
          logLevel: loggingConfig.logLevel,
          logDirectory: loggingConfig.logDirectory,
          components: {
            databaseLogging: loggingConfig.database.enabled,
            requestLogging: loggingConfig.requests.enabled,
            processMonitoring: loggingConfig.process.enabled,
            performanceTracking: loggingConfig.performance.enabled
          }
        },
        timestamp: new Date().toISOString()
      };

      // Get recent log files
      const logFiles = await getRecentLogFiles();
      
      res.json({
        success: true,
        message: 'Logging dashboard data',
        data: {
          ...stats,
          recentLogFiles: logFiles
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load dashboard data',
        error: error.message
      });
    }
  });

  // Get recent database queries
  app.get('/api/logging/recent-queries', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const logFile = await getMostRecentLogFile('queries');
      
      if (!logFile) {
        return res.json({
          success: true,
          message: 'No query logs found',
          data: []
        });
      }

      const queries = await parseLogFile(logFile, limit);
      
      res.json({
        success: true,
        message: `Recent ${queries.length} database queries`,
        data: queries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load recent queries',
        error: error.message
      });
    }
  });

  // Get slow queries
  app.get('/api/logging/slow-queries', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const threshold = parseInt(req.query.threshold) || 1000;
      
      const logFile = await getMostRecentLogFile('queries');
      
      if (!logFile) {
        return res.json({
          success: true,
          message: 'No query logs found',
          data: []
        });
      }

      const allQueries = await parseLogFile(logFile, 1000);
      const slowQueries = allQueries
        .filter(q => q.data && q.data.executionTime > threshold)
        .sort((a, b) => (b.data.executionTime || 0) - (a.data.executionTime || 0))
        .slice(0, limit);
      
      res.json({
        success: true,
        message: `${slowQueries.length} slow queries found`,
        data: slowQueries,
        threshold
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load slow queries',
        error: error.message
      });
    }
  });

  // Get error logs
  app.get('/api/logging/errors', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const logFile = await getMostRecentLogFile('errors');
      
      if (!logFile) {
        return res.json({
          success: true,
          message: 'No error logs found',
          data: []
        });
      }

      const errors = await parseLogFile(logFile, limit);
      
      res.json({
        success: true,
        message: `Recent ${errors.length} errors`,
        data: errors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load error logs',
        error: error.message
      });
    }
  });

  // Get procedure calls
  app.get('/api/logging/procedures', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const logFile = await getMostRecentLogFile('procedures');
      
      if (!logFile) {
        return res.json({
          success: true,
          message: 'No procedure logs found',
          data: []
        });
      }

      const procedures = await parseLogFile(logFile, limit);
      
      res.json({
        success: true,
        message: `Recent ${procedures.length} procedure calls`,
        data: procedures
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load procedure logs',
        error: error.message
      });
    }
  });

  // Get performance metrics
  app.get('/api/logging/performance', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const logFile = await getMostRecentLogFile('performance');
      
      if (!logFile) {
        return res.json({
          success: true,
          message: 'No performance logs found',
          data: []
        });
      }

      const performance = await parseLogFile(logFile, limit);
      
      res.json({
        success: true,
        message: `Recent ${performance.length} performance metrics`,
        data: performance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load performance logs',
        error: error.message
      });
    }
  });

  // Search logs
  app.get('/api/logging/search', async (req, res) => {
    try {
      const query = req.query.q;
      const type = req.query.type || 'queries';
      const limit = parseInt(req.query.limit) || 100;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const logFile = await getMostRecentLogFile(type);
      
      if (!logFile) {
        return res.json({
          success: true,
          message: 'No logs found',
          data: []
        });
      }

      const allLogs = await parseLogFile(logFile, 1000);
      const searchResults = allLogs
        .filter(log => {
          const logString = JSON.stringify(log).toLowerCase();
          return logString.includes(query.toLowerCase());
        })
        .slice(0, limit);
      
      res.json({
        success: true,
        message: `Found ${searchResults.length} matching logs`,
        data: searchResults,
        query,
        type
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  });

  // Clear logs
  app.delete('/api/logging/clear/:type', async (req, res) => {
    try {
      const type = req.params.type;
      const validTypes = ['queries', 'procedures', 'errors', 'performance', 'processes'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid log type'
        });
      }

      const logDir = path.join(__dirname, '../../logs', type);
      const files = await fs.readdir(logDir);
      
      for (const file of files) {
        await fs.unlink(path.join(logDir, file));
      }
      
      res.json({
        success: true,
        message: `Cleared ${files.length} ${type} log files`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to clear logs',
        error: error.message
      });
    }
  });

  // Export logs
  app.get('/api/logging/export/:type', async (req, res) => {
    try {
      const type = req.params.type;
      const date = req.query.date || new Date().toISOString().split('T')[0];
      
      const logFile = path.join(__dirname, '../../logs', type, `${type}-${date}.log`);
      
      try {
        await fs.access(logFile);
        res.download(logFile, `${type}-${date}.log`);
      } catch (error) {
        res.status(404).json({
          success: false,
          message: 'Log file not found',
          date,
          type
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to export logs',
        error: error.message
      });
    }
  });

  // Simple HTML dashboard
  app.get('/logging/dashboard', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Database Logging Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .stat { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
            .stat h3 { margin: 0 0 10px 0; color: #333; }
            .stat p { margin: 0; font-size: 24px; font-weight: bold; color: #007bff; }
            .logs { max-height: 400px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 5px; }
            .log-entry { margin: 5px 0; padding: 5px; background: white; border-radius: 3px; font-family: monospace; font-size: 12px; }
            .error { border-left: 4px solid #dc3545; }
            .warn { border-left: 4px solid #ffc107; }
            .info { border-left: 4px solid #17a2b8; }
            .debug { border-left: 4px solid #6c757d; }
            button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
            button:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🗄️ Database Logging Dashboard</h1>
            
            <div class="card">
                <h2>📊 System Statistics</h2>
                <div class="stats" id="stats">
                    <div class="stat">
                        <h3>Total Queries</h3>
                        <p id="totalQueries">Loading...</p>
                    </div>
                    <div class="stat">
                        <h3>Slow Queries</h3>
                        <p id="slowQueries">Loading...</p>
                    </div>
                    <div class="stat">
                        <h3>Errors</h3>
                        <p id="errorCount">Loading...</p>
                    </div>
                    <div class="stat">
                        <h3>Uptime</h3>
                        <p id="uptime">Loading...</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>🔍 Recent Database Queries</h2>
                <button onclick="loadQueries()">Refresh Queries</button>
                <button onclick="loadSlowQueries()">Show Slow Queries</button>
                <button onclick="loadErrors()">Show Errors</button>
                <div class="logs" id="queryLogs">
                    Loading recent queries...
                </div>
            </div>

            <div class="card">
                <h2>📞 Recent Procedure Calls</h2>
                <button onclick="loadProcedures()">Refresh Procedures</button>
                <div class="logs" id="procedureLogs">
                    Loading recent procedures...
                </div>
            </div>
        </div>

        <script>
            async function loadDashboard() {
                try {
                    const response = await fetch('/api/logging/dashboard');
                    const data = await response.json();
                    
                    if (data.success) {
                        const stats = data.data;
                        document.getElementById('totalQueries').textContent = stats.database.total || 0;
                        document.getElementById('slowQueries').textContent = stats.database.slow || 0;
                        document.getElementById('errorCount').textContent = stats.database.errors || 0;
                        document.getElementById('uptime').textContent = Math.floor(stats.system.uptime / 60) + 'm';
                    }
                } catch (error) {
                    console.error('Failed to load dashboard:', error);
                }
            }

            async function loadQueries() {
                try {
                    const response = await fetch('/api/logging/recent-queries?limit=20');
                    const data = await response.json();
                    
                    const container = document.getElementById('queryLogs');
                    if (data.success && data.data.length > 0) {
                        container.innerHTML = data.data.map(log => 
                            '<div class="log-entry ' + (log.level || 'info').toLowerCase() + '">' +
                            '<strong>' + log.timestamp + '</strong> [' + (log.level || 'INFO') + '] ' +
                            log.message + 
                            (log.data ? '<br><small>' + JSON.stringify(log.data, null, 2) + '</small>' : '') +
                            '</div>'
                        ).join('');
                    } else {
                        container.innerHTML = '<p>No recent queries found</p>';
                    }
                } catch (error) {
                    document.getElementById('queryLogs').innerHTML = '<p>Error loading queries: ' + error.message + '</p>';
                }
            }

            async function loadSlowQueries() {
                try {
                    const response = await fetch('/api/logging/slow-queries?limit=10');
                    const data = await response.json();
                    
                    const container = document.getElementById('queryLogs');
                    if (data.success && data.data.length > 0) {
                        container.innerHTML = '<h3>🐌 Slow Queries (>' + data.threshold + 'ms)</h3>' +
                            data.data.map(log => 
                                '<div class="log-entry warn">' +
                                '<strong>' + log.timestamp + '</strong> [SLOW] ' +
                                (log.data ? log.data.executionTime + 'ms - ' : '') +
                                log.message + 
                                (log.data ? '<br><small>' + JSON.stringify(log.data, null, 2) + '</small>' : '') +
                                '</div>'
                            ).join('');
                    } else {
                        container.innerHTML = '<p>No slow queries found</p>';
                    }
                } catch (error) {
                    document.getElementById('queryLogs').innerHTML = '<p>Error loading slow queries: ' + error.message + '</p>';
                }
            }

            async function loadErrors() {
                try {
                    const response = await fetch('/api/logging/errors?limit=10');
                    const data = await response.json();
                    
                    const container = document.getElementById('queryLogs');
                    if (data.success && data.data.length > 0) {
                        container.innerHTML = '<h3>❌ Recent Errors</h3>' +
                            data.data.map(log => 
                                '<div class="log-entry error">' +
                                '<strong>' + log.timestamp + '</strong> [ERROR] ' +
                                log.message + 
                                (log.data ? '<br><small>' + JSON.stringify(log.data, null, 2) + '</small>' : '') +
                                '</div>'
                            ).join('');
                    } else {
                        container.innerHTML = '<p>No recent errors found</p>';
                    }
                } catch (error) {
                    document.getElementById('queryLogs').innerHTML = '<p>Error loading errors: ' + error.message + '</p>';
                }
            }

            async function loadProcedures() {
                try {
                    const response = await fetch('/api/logging/procedures?limit=10');
                    const data = await response.json();
                    
                    const container = document.getElementById('procedureLogs');
                    if (data.success && data.data.length > 0) {
                        container.innerHTML = data.data.map(log => 
                            '<div class="log-entry info">' +
                            '<strong>' + log.timestamp + '</strong> [PROCEDURE] ' +
                            log.message + 
                            (log.data ? '<br><small>' + JSON.stringify(log.data, null, 2) + '</small>' : '') +
                            '</div>'
                        ).join('');
                    } else {
                        container.innerHTML = '<p>No recent procedure calls found</p>';
                    }
                } catch (error) {
                    document.getElementById('procedureLogs').innerHTML = '<p>Error loading procedures: ' + error.message + '</p>';
                }
            }

            // Load dashboard on page load
            loadDashboard();
            loadQueries();
            loadProcedures();

            // Auto-refresh every 30 seconds
            setInterval(() => {
                loadDashboard();
                loadQueries();
            }, 30000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
  });
};

// Helper functions
async function getRecentLogFiles() {
  const logDir = path.join(__dirname, '../../logs');
  const files = [];
  
  try {
    const subdirs = ['queries', 'procedures', 'errors', 'performance', 'processes'];
    
    for (const subdir of subdirs) {
      try {
        const subdirPath = path.join(logDir, subdir);
        const subdirFiles = await fs.readdir(subdirPath);
        
        for (const file of subdirFiles) {
          const filePath = path.join(subdirPath, file);
          const stats = await fs.stat(filePath);
          files.push({
            name: file,
            type: subdir,
            size: stats.size,
            modified: stats.mtime,
            path: filePath
          });
        }
      } catch (error) {
        // Subdirectory might not exist
      }
    }
    
    return files.sort((a, b) => b.modified - a.modified).slice(0, 20);
  } catch (error) {
    return [];
  }
}

async function getMostRecentLogFile(type) {
  const logDir = path.join(__dirname, '../../logs', type);
  
  try {
    const files = await fs.readdir(logDir);
    if (files.length === 0) return null;
    
    const logFiles = files
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse();
    
    return logFiles.length > 0 ? path.join(logDir, logFiles[0]) : null;
  } catch (error) {
    return null;
  }
}

async function parseLogFile(filePath, limit = 100) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n').slice(-limit);
    
    const logs = [];
    for (const line of lines) {
      if (line.trim()) {
        try {
          const log = JSON.parse(line);
          logs.push(log);
        } catch (error) {
          // Skip invalid JSON lines
        }
      }
    }
    
    return logs.reverse(); // Most recent first
  } catch (error) {
    return [];
  }
}