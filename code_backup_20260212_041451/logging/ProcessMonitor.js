/**
 * Process Monitor
 * Monitors system processes, memory usage, and performance metrics
 */

const logger = require('./Logger');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class ProcessMonitor {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_PROCESS_MONITORING === 'true';
    this.monitoringInterval = parseInt(process.env.MONITORING_INTERVAL) || 30000; // 30 seconds
    this.intervalId = null;
    this.startTime = Date.now();
    this.metrics = {
      requests: 0,
      errors: 0,
      totalMemoryUsage: [],
      cpuUsage: [],
      responseTimeHistory: []
    };
  }

  /**
   * Start monitoring processes
   */
  start() {
    if (!this.isEnabled || this.intervalId) return;

    logger.info('Starting process monitoring', {
      interval: this.monitoringInterval,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });

    // Log initial system information
    this.logSystemInfo();

    // Start periodic monitoring
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.monitoringInterval);

    // Monitor process events
    this.setupProcessEventListeners();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Process monitoring stopped');
    }
  }

  /**
   * Log initial system information
   */
  async logSystemInfo() {
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      nodeVersion: process.version,
      pid: process.pid,
      ppid: process.ppid,
      uid: process.getuid ? process.getuid() : null,
      gid: process.getgid ? process.getgid() : null,
      cwd: process.cwd(),
      execPath: process.execPath,
      argv: process.argv
    };

    await logger.logProcess('SYSTEM_INFO', systemInfo, 'INFO');
  }

  /**
   * Collect and log performance metrics
   */
  async collectMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };

      // Store metrics for trend analysis
      this.metrics.totalMemoryUsage.push({
        timestamp: Date.now(),
        ...memoryUsage
      });

      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        ...cpuUsage
      });

      // Keep only last 100 entries
      if (this.metrics.totalMemoryUsage.length > 100) {
        this.metrics.totalMemoryUsage = this.metrics.totalMemoryUsage.slice(-100);
      }
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
      }

      const processMetrics = {
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          process: memoryUsage,
          system: systemMemory,
          memoryUsagePercentage: (memoryUsage.rss / systemMemory.total * 100).toFixed(2)
        },
        cpu: {
          usage: cpuUsage,
          loadAverage: os.loadavg()
        },
        handles: {
          activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 'N/A',
          activeRequests: process._getActiveRequests ? process._getActiveRequests().length : 'N/A'
        },
        eventLoop: await this.getEventLoopMetrics(),
        gc: this.getGCMetrics()
      };

      // Check for memory leaks
      const memoryLeakCheck = this.checkMemoryLeak();
      if (memoryLeakCheck.isLeak) {
        await logger.logProcess('MEMORY_LEAK_DETECTED', {
          ...processMetrics,
          leakInfo: memoryLeakCheck
        }, 'WARN');
      }

      // Check for high CPU usage
      const cpuCheck = this.checkHighCPUUsage();
      if (cpuCheck.isHigh) {
        await logger.logProcess('HIGH_CPU_USAGE', {
          ...processMetrics,
          cpuInfo: cpuCheck
        }, 'WARN');
      }

      // Regular metrics logging
      await logger.logProcess('METRICS', processMetrics, 'DEBUG');

      // Log summary every 10 minutes
      if (Date.now() - this.startTime > 0 && (Date.now() - this.startTime) % 600000 < this.monitoringInterval) {
        await this.logSummary();
      }

    } catch (error) {
      logger.error('Failed to collect process metrics', { error: error.message });
    }
  }

  /**
   * Get event loop metrics
   */
  async getEventLoopMetrics() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        resolve({
          lag: Number(delta / 1000000n), // Convert to milliseconds
          timestamp: Date.now()
        });
      });
    });
  }

  /**
   * Get garbage collection metrics
   */
  getGCMetrics() {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      return {
        available: true,
        memoryFreed: {
          rss: before.rss - after.rss,
          heapUsed: before.heapUsed - after.heapUsed,
          heapTotal: before.heapTotal - after.heapTotal
        }
      };
    }
    
    return { available: false };
  }

  /**
   * Check for memory leaks
   */
  checkMemoryLeak() {
    if (this.metrics.totalMemoryUsage.length < 10) {
      return { isLeak: false };
    }

    const recent = this.metrics.totalMemoryUsage.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    const heapGrowth = newest.heapUsed - oldest.heapUsed;
    const rssGrowth = newest.rss - oldest.rss;
    
    // Consider it a leak if memory grew by more than 50MB in the last 10 measurements
    const isLeak = heapGrowth > 50 * 1024 * 1024 || rssGrowth > 100 * 1024 * 1024;
    
    return {
      isLeak,
      heapGrowth,
      rssGrowth,
      timespan: newest.timestamp - oldest.timestamp,
      measurements: recent.length
    };
  }

  /**
   * Check for high CPU usage
   */
  checkHighCPUUsage() {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    
    // Consider high if 1-minute load average is > 80% of CPU cores
    const isHigh = loadAvg[0] > (cpuCount * 0.8);
    
    return {
      isHigh,
      loadAverage: loadAvg,
      cpuCount,
      utilizationPercentage: (loadAvg[0] / cpuCount * 100).toFixed(2)
    };
  }

  /**
   * Setup process event listeners
   */
  setupProcessEventListeners() {
    // Uncaught exceptions
    process.on('uncaughtException', async (error) => {
      await logger.logProcess('UNCAUGHT_EXCEPTION', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }, 'ERROR');
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      await logger.logProcess('UNHANDLED_REJECTION', {
        reason: reason instanceof Error ? {
          name: reason.name,
          message: reason.message,
          stack: reason.stack
        } : reason,
        promise: promise.toString(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }, 'ERROR');
    });

    // Process warnings
    process.on('warning', async (warning) => {
      await logger.logProcess('PROCESS_WARNING', {
        warning: {
          name: warning.name,
          message: warning.message,
          stack: warning.stack
        },
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }, 'WARN');
    });

    // SIGTERM signal
    process.on('SIGTERM', async () => {
      await logger.logProcess('SIGTERM_RECEIVED', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      }, 'INFO');
      
      this.stop();
      process.exit(0);
    });

    // SIGINT signal (Ctrl+C)
    process.on('SIGINT', async () => {
      await logger.logProcess('SIGINT_RECEIVED', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      }, 'INFO');
      
      this.stop();
      process.exit(0);
    });

    // Exit event
    process.on('exit', async (code) => {
      await logger.logProcess('PROCESS_EXIT', {
        exitCode: code,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      }, 'INFO');
    });
  }

  /**
   * Log performance summary
   */
  async logSummary() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const summary = {
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime)
      },
      memory: memoryUsage,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      averageResponseTime: this.getAverageResponseTime(),
      memoryTrend: this.getMemoryTrend(),
      cpuTrend: this.getCPUTrend()
    };

    await logger.logProcess('PERFORMANCE_SUMMARY', summary, 'INFO');
  }

  /**
   * Utility methods
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  getAverageResponseTime() {
    if (this.metrics.responseTimeHistory.length === 0) return 0;
    
    const sum = this.metrics.responseTimeHistory.reduce((a, b) => a + b, 0);
    return (sum / this.metrics.responseTimeHistory.length).toFixed(2);
  }

  getMemoryTrend() {
    if (this.metrics.totalMemoryUsage.length < 2) return 'insufficient_data';
    
    const recent = this.metrics.totalMemoryUsage.slice(-5);
    const older = this.metrics.totalMemoryUsage.slice(-10, -5);
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg * 100);
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  getCPUTrend() {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const utilization = loadAvg[0] / cpuCount;
    
    if (utilization > 0.8) return 'high';
    if (utilization > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Track request metrics
   */
  trackRequest(responseTime) {
    this.metrics.requests++;
    this.metrics.responseTimeHistory.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTimeHistory.length > 1000) {
      this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.slice(-1000);
    }
  }

  /**
   * Track error metrics
   */
  trackError() {
    this.metrics.errors++;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.loadavg(),
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0
    };
  }
}

module.exports = new ProcessMonitor();