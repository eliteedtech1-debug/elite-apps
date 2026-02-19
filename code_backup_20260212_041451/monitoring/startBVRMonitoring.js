/**
 * BVR (BEYOND VISUAL RANGE) MONITORING STARTUP
 * 
 * This script initializes and starts the autonomous code integrity monitoring system.
 * Run this to ensure your code maintains integrity even when operating beyond your direct supervision.
 */

const CodeIntegrityMonitor = require('./CodeIntegrityMonitor');
const express = require('express');
const path = require('path');

class BVRMonitoringSystem {
  constructor() {
    this.monitor = new CodeIntegrityMonitor();
    this.dashboardApp = express();
    this.dashboardPort = process.env.BVR_DASHBOARD_PORT || 3001;
    this.isRunning = false;
  }

  /**
   * START THE COMPLETE BVR MONITORING SYSTEM
   */
  async start() {
    console.log('🛰️ ========================================');
    console.log('🛰️  BEYOND VISUAL RANGE MONITORING SYSTEM');
    console.log('🛰️  Aerospace-Inspired Code Integrity');
    console.log('🛰️ ========================================');
    console.log('');

    try {
      // 1. Initialize monitoring system
      console.log('🔧 Initializing BVR monitoring system...');
      await this.initializeSystem();

      // 2. Start code integrity monitor
      console.log('🛰️ Starting autonomous monitoring...');
      await this.monitor.startMonitoring();

      // 3. Start dashboard
      console.log('📊 Starting monitoring dashboard...');
      await this.startDashboard();

      // 4. Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isRunning = true;
      
      console.log('');
      console.log('✅ ========================================');
      console.log('✅  BVR MONITORING SYSTEM ACTIVE');
      console.log('✅ ========================================');
      console.log(`📊 Dashboard: http://localhost:${this.dashboardPort}`);
      console.log('🛰️ Autonomous monitoring: ACTIVE');
      console.log('🔒 Code integrity: PROTECTED');
      console.log('📡 Beyond visual range: OPERATIONAL');
      console.log('');
      console.log('🚀 Your code is now protected beyond visual range!');
      console.log('');

      // Perform initial comprehensive health check
      setTimeout(async () => {
        console.log('🔍 Performing initial comprehensive health check...');
        const healthReport = await this.monitor.performComprehensiveHealthCheck();
        console.log(`📊 Initial Health Score: ${healthReport.overall_score}% (${healthReport.status})`);
        
        if (healthReport.overall_score >= 95) {
          console.log('✅ System health: EXCELLENT - All systems operational');
        } else if (healthReport.overall_score >= 85) {
          console.log('⚠️ System health: GOOD - Minor issues detected');
        } else {
          console.log('🚨 System health: NEEDS ATTENTION - Issues require review');
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Failed to start BVR monitoring system:', error);
      process.exit(1);
    }
  }

  /**
   * INITIALIZE SYSTEM COMPONENTS
   */
  async initializeSystem() {
    // Create logs directory
    const fs = require('fs').promises;
    const logsDir = path.join(__dirname, '../logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    // Initialize dashboard routes
    this.setupDashboardRoutes();
    
    console.log('✅ System components initialized');
  }

  /**
   * SETUP DASHBOARD ROUTES
   */
  setupDashboardRoutes() {
    // Serve static files
    this.dashboardApp.use(express.static(path.join(__dirname, 'dashboard')));
    this.dashboardApp.use(express.json());

    // Health status endpoint
    this.dashboardApp.get('/api/health', async (req, res) => {
      try {
        const healthReport = await this.monitor.performComprehensiveHealthCheck();
        res.json({
          success: true,
          data: healthReport,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Quick status endpoint
    this.dashboardApp.get('/api/status', async (req, res) => {
      try {
        const quickCheck = await this.monitor.performHealthCheck();
        res.json({
          success: true,
          data: {
            monitoring_active: this.monitor.isMonitoring,
            system_status: this.isRunning ? 'OPERATIONAL' : 'STOPPED',
            quick_check: quickCheck,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Health history endpoint
    this.dashboardApp.get('/api/health/history', (req, res) => {
      res.json({
        success: true,
        data: this.monitor.healthHistory,
        count: this.monitor.healthHistory.length,
        timestamp: new Date().toISOString()
      });
    });

    // System metrics endpoint
    this.dashboardApp.get('/api/metrics', async (req, res) => {
      try {
        const metrics = {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          monitoring_active: this.monitor.isMonitoring,
          health_checks_performed: this.monitor.healthHistory.length,
          last_health_check: this.monitor.healthHistory[this.monitor.healthHistory.length - 1]?.timestamp,
          system_load: await this.getSystemLoad(),
          timestamp: new Date().toISOString()
        };
        
        res.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Dashboard HTML
    this.dashboardApp.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // Control endpoints
    this.dashboardApp.post('/api/control/start', async (req, res) => {
      try {
        if (!this.monitor.isMonitoring) {
          await this.monitor.startMonitoring();
          res.json({ success: true, message: 'Monitoring started' });
        } else {
          res.json({ success: true, message: 'Monitoring already active' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.dashboardApp.post('/api/control/stop', (req, res) => {
      try {
        this.monitor.stopMonitoring();
        res.json({ success: true, message: 'Monitoring stopped' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.dashboardApp.post('/api/control/health-check', async (req, res) => {
      try {
        const healthReport = await this.monitor.performComprehensiveHealthCheck();
        res.json({ success: true, data: healthReport });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  /**
   * START DASHBOARD SERVER
   */
  async startDashboard() {
    return new Promise((resolve, reject) => {
      this.dashboardServer = this.dashboardApp.listen(this.dashboardPort, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`📊 Dashboard server started on port ${this.dashboardPort}`);
          resolve();
        }
      });
    });
  }

  /**
   * SETUP GRACEFUL SHUTDOWN
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down BVR monitoring system...`);
      
      // Stop monitoring
      if (this.monitor.isMonitoring) {
        this.monitor.stopMonitoring();
        console.log('✅ Monitoring stopped');
      }
      
      // Close dashboard server
      if (this.dashboardServer) {
        this.dashboardServer.close(() => {
          console.log('✅ Dashboard server closed');
        });
      }
      
      console.log('✅ BVR monitoring system shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  }

  /**
   * GENERATE DASHBOARD HTML
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BVR Code Integrity Monitor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .card h3 { margin-bottom: 15px; color: #4CAF50; }
        .status { 
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin: 5px 0;
        }
        .status.excellent { background: #4CAF50; }
        .status.good { background: #2196F3; }
        .status.warning { background: #FF9800; }
        .status.critical { background: #F44336; }
        .metric { 
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 5px;
        }
        .controls { text-align: center; margin: 20px 0; }
        .btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 0 10px;
            font-size: 16px;
        }
        .btn:hover { background: #45a049; }
        .btn.danger { background: #F44336; }
        .btn.danger:hover { background: #da190b; }
        .loading { text-align: center; padding: 20px; }
        .timestamp { font-size: 0.9em; opacity: 0.7; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛰️ BVR Code Integrity Monitor</h1>
            <p>Beyond Visual Range - Aerospace-Inspired Code Protection</p>
            <div class="timestamp">Last Updated: <span id="lastUpdate">Loading...</span></div>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="refreshData()">🔄 Refresh</button>
            <button class="btn" onclick="performHealthCheck()">🔍 Health Check</button>
            <button class="btn" onclick="startMonitoring()">▶️ Start</button>
            <button class="btn danger" onclick="stopMonitoring()">⏹️ Stop</button>
        </div>
        
        <div id="loading" class="loading">🛰️ Loading BVR monitoring data...</div>
        
        <div id="dashboard" class="grid" style="display: none;">
            <div class="card">
                <h3>🎯 System Status</h3>
                <div id="systemStatus"></div>
            </div>
            
            <div class="card">
                <h3>📊 Health Metrics</h3>
                <div id="healthMetrics"></div>
            </div>
            
            <div class="card">
                <h3>🔒 Compliance Status</h3>
                <div id="complianceStatus"></div>
            </div>
            
            <div class="card">
                <h3>⚡ Performance</h3>
                <div id="performanceMetrics"></div>
            </div>
        </div>
    </div>
    
    <script>
        let refreshInterval;
        
        async function fetchData(endpoint) {
            try {
                const response = await fetch(endpoint);
                return await response.json();
            } catch (error) {
                console.error('Fetch error:', error);
                return { success: false, error: error.message };
            }
        }
        
        async function refreshData() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
            
            const [statusData, healthData, metricsData] = await Promise.all([
                fetchData('/api/status'),
                fetchData('/api/health'),
                fetchData('/api/metrics')
            ]);
            
            updateDashboard(statusData, healthData, metricsData);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('dashboard').style.display = 'grid';
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        }
        
        function updateDashboard(statusData, healthData, metricsData) {
            // System Status
            const systemStatus = document.getElementById('systemStatus');
            if (statusData.success) {
                const status = statusData.data.monitoring_active ? 'ACTIVE' : 'INACTIVE';
                const statusClass = statusData.data.monitoring_active ? 'excellent' : 'critical';
                systemStatus.innerHTML = \`
                    <div class="metric">
                        <span>Monitoring Status:</span>
                        <span class="status \${statusClass}">\${status}</span>
                    </div>
                    <div class="metric">
                        <span>System Status:</span>
                        <span>\${statusData.data.system_status}</span>
                    </div>
                \`;
            }
            
            // Health Metrics
            const healthMetrics = document.getElementById('healthMetrics');
            if (healthData.success) {
                const score = healthData.data.overall_score;
                const statusClass = score >= 95 ? 'excellent' : score >= 85 ? 'good' : score >= 70 ? 'warning' : 'critical';
                healthMetrics.innerHTML = \`
                    <div class="metric">
                        <span>Overall Health:</span>
                        <span class="status \${statusClass}">\${score}%</span>
                    </div>
                    <div class="metric">
                        <span>Status:</span>
                        <span>\${healthData.data.status}</span>
                    </div>
                \`;
            }
            
            // Compliance Status
            const complianceStatus = document.getElementById('complianceStatus');
            if (healthData.success && healthData.data.checks) {
                const compliance = healthData.data.checks.accounting_compliance;
                const separation = healthData.data.checks.transaction_separation;
                complianceStatus.innerHTML = \`
                    <div class="metric">
                        <span>GAAP Compliance:</span>
                        <span class="status \${compliance?.gaap_compliant ? 'excellent' : 'critical'}">
                            \${compliance?.gaap_compliant ? 'COMPLIANT' : 'VIOLATIONS'}
                        </span>
                    </div>
                    <div class="metric">
                        <span>Transaction Separation:</span>
                        <span class="status \${separation?.separation_enforced ? 'excellent' : 'critical'}">
                            \${separation?.separation_enforced ? 'ENFORCED' : 'VIOLATIONS'}
                        </span>
                    </div>
                \`;
            }
            
            // Performance Metrics
            const performanceMetrics = document.getElementById('performanceMetrics');
            if (metricsData.success) {
                const uptime = Math.floor(metricsData.data.uptime / 3600);
                const memory = Math.round(metricsData.data.memory_usage.heapUsed / 1024 / 1024);
                performanceMetrics.innerHTML = \`
                    <div class="metric">
                        <span>Uptime:</span>
                        <span>\${uptime} hours</span>
                    </div>
                    <div class="metric">
                        <span>Memory Usage:</span>
                        <span>\${memory} MB</span>
                    </div>
                    <div class="metric">
                        <span>Health Checks:</span>
                        <span>\${metricsData.data.health_checks_performed}</span>
                    </div>
                \`;
            }
        }
        
        async function performHealthCheck() {
            const result = await fetchData('/api/control/health-check');
            if (result.success) {
                alert(\`Health Check Complete\\nScore: \${result.data.overall_score}%\\nStatus: \${result.data.status}\`);
                refreshData();
            } else {
                alert('Health check failed: ' + result.error);
            }
        }
        
        async function startMonitoring() {
            const result = await fetch('/api/control/start', { method: 'POST' });
            const data = await result.json();
            alert(data.message);
            refreshData();
        }
        
        async function stopMonitoring() {
            const result = await fetch('/api/control/stop', { method: 'POST' });
            const data = await result.json();
            alert(data.message);
            refreshData();
        }
        
        // Initialize
        refreshData();
        
        // Auto-refresh every 30 seconds
        refreshInterval = setInterval(refreshData, 30000);
    </script>
</body>
</html>
    `;
  }

  /**
   * GET SYSTEM LOAD (placeholder)
   */
  async getSystemLoad() {
    // Implement actual system load calculation
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100
    };
  }
}

// Start the BVR monitoring system if this file is run directly
if (require.main === module) {
  const bvrSystem = new BVRMonitoringSystem();
  bvrSystem.start().catch(error => {
    console.error('❌ Failed to start BVR monitoring system:', error);
    process.exit(1);
  });
}

module.exports = BVRMonitoringSystem;