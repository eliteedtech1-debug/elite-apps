const express = require('express');
const router = express.Router();
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

// Health check metrics
let healthMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  lastHealthCheck: null,
  dependencies: {
    database: { status: 'unknown', lastCheck: null },
    cloudinary: { status: 'unknown', lastCheck: null },
    filesystem: { status: 'unknown', lastCheck: null },
    pdfGeneration: { status: 'unknown', lastCheck: null }
  }
};

// Increment request counter
router.use((req, res, next) => {
  healthMetrics.requestCount++;
  next();
});

// Basic health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await performHealthCheck();
    healthMetrics.lastHealthCheck = Date.now();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - healthMetrics.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: health.checks,
      metrics: {
        requestCount: healthMetrics.requestCount,
        errorCount: healthMetrics.errorCount,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  } catch (error) {
    healthMetrics.errorCount++;
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check endpoint
router.get('/health/detailed', async (req, res) => {
  try {
    const health = await performDetailedHealthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - healthMetrics.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: health.checks,
      dependencies: healthMetrics.dependencies,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: require('os').loadavg(),
        freeMemory: require('os').freemem(),
        totalMemory: require('os').totalmem()
      },
      metrics: {
        requestCount: healthMetrics.requestCount,
        errorCount: healthMetrics.errorCount,
        errorRate: healthMetrics.requestCount > 0 ? (healthMetrics.errorCount / healthMetrics.requestCount) * 100 : 0
      }
    });
  } catch (error) {
    healthMetrics.errorCount++;
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe endpoint
router.get('/ready', async (req, res) => {
  try {
    const ready = await checkReadiness();
    res.status(ready ? 200 : 503).json({
      ready,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe endpoint
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - healthMetrics.startTime
  });
});

// Metrics endpoint (Prometheus format)
router.get('/metrics', (req, res) => {
  const metrics = generatePrometheusMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Perform basic health check
async function performHealthCheck() {
  const checks = {};
  let overallStatus = 'healthy';

  // Database check
  try {
    const db = require('../config/database');
    await db.authenticate();
    checks.database = { status: 'healthy', message: 'Database connection successful' };
    healthMetrics.dependencies.database = { status: 'healthy', lastCheck: Date.now() };
  } catch (error) {
    checks.database = { status: 'unhealthy', message: error.message };
    healthMetrics.dependencies.database = { status: 'unhealthy', lastCheck: Date.now() };
    overallStatus = 'unhealthy';
  }

  // Filesystem check
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'id-cards');
    await promisify(fs.access)(uploadsDir, fs.constants.W_OK);
    checks.filesystem = { status: 'healthy', message: 'File system accessible' };
    healthMetrics.dependencies.filesystem = { status: 'healthy', lastCheck: Date.now() };
  } catch (error) {
    checks.filesystem = { status: 'unhealthy', message: 'File system not accessible' };
    healthMetrics.dependencies.filesystem = { status: 'unhealthy', lastCheck: Date.now() };
    overallStatus = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (memUsagePercent > 90) {
    checks.memory = { status: 'warning', message: `High memory usage: ${memUsagePercent.toFixed(2)}%` };
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  } else {
    checks.memory = { status: 'healthy', message: `Memory usage: ${memUsagePercent.toFixed(2)}%` };
  }

  return { status: overallStatus, checks };
}

// Perform detailed health check
async function performDetailedHealthCheck() {
  const basicHealth = await performHealthCheck();
  const checks = { ...basicHealth.checks };
  let overallStatus = basicHealth.status;

  // Cloudinary check
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const cloudinary = require('cloudinary').v2;
      await cloudinary.api.ping();
      checks.cloudinary = { status: 'healthy', message: 'Cloudinary connection successful' };
      healthMetrics.dependencies.cloudinary = { status: 'healthy', lastCheck: Date.now() };
    } catch (error) {
      checks.cloudinary = { status: 'unhealthy', message: error.message };
      healthMetrics.dependencies.cloudinary = { status: 'unhealthy', lastCheck: Date.now() };
      overallStatus = 'unhealthy';
    }
  } else {
    checks.cloudinary = { status: 'warning', message: 'Cloudinary not configured' };
  }

  // PDF Generation check
  try {
    const ReactPDF = require('@react-pdf/renderer');
    const { createCanvas } = require('canvas');
    const QRCode = require('qrcode');
    
    // Test canvas creation
    const canvas = createCanvas(100, 100);
    
    // Test QR code generation
    await QRCode.toDataURL('test');
    
    checks.pdfGeneration = { status: 'healthy', message: 'PDF generation dependencies available' };
    healthMetrics.dependencies.pdfGeneration = { status: 'healthy', lastCheck: Date.now() };
  } catch (error) {
    checks.pdfGeneration = { status: 'unhealthy', message: error.message };
    healthMetrics.dependencies.pdfGeneration = { status: 'unhealthy', lastCheck: Date.now() };
    overallStatus = 'unhealthy';
  }

  // Disk space check
  try {
    const stats = await promisify(fs.statvfs || fs.stat)(process.cwd());
    const freeSpace = stats.bavail * stats.bsize;
    const totalSpace = stats.blocks * stats.bsize;
    const usedPercent = ((totalSpace - freeSpace) / totalSpace) * 100;
    
    if (usedPercent > 90) {
      checks.diskSpace = { status: 'warning', message: `High disk usage: ${usedPercent.toFixed(2)}%` };
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    } else {
      checks.diskSpace = { status: 'healthy', message: `Disk usage: ${usedPercent.toFixed(2)}%` };
    }
  } catch (error) {
    checks.diskSpace = { status: 'warning', message: 'Could not check disk space' };
  }

  return { status: overallStatus, checks };
}

// Check if service is ready to accept requests
async function checkReadiness() {
  try {
    // Check database connection
    const db = require('../config/database');
    await db.authenticate();
    
    // Check required directories exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'id-cards');
    await promisify(fs.access)(uploadsDir, fs.constants.W_OK);
    
    // Check required environment variables
    const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'JWT_SECRET_KEY'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Readiness check failed:', error.message);
    return false;
  }
}

// Generate Prometheus metrics
function generatePrometheusMetrics() {
  const uptime = Date.now() - healthMetrics.startTime;
  const memUsage = process.memoryUsage();
  
  return `
# HELP id_card_generator_uptime_seconds Total uptime in seconds
# TYPE id_card_generator_uptime_seconds counter
id_card_generator_uptime_seconds ${uptime / 1000}

# HELP id_card_generator_requests_total Total number of requests
# TYPE id_card_generator_requests_total counter
id_card_generator_requests_total ${healthMetrics.requestCount}

# HELP id_card_generator_errors_total Total number of errors
# TYPE id_card_generator_errors_total counter
id_card_generator_errors_total ${healthMetrics.errorCount}

# HELP id_card_generator_memory_usage_bytes Memory usage in bytes
# TYPE id_card_generator_memory_usage_bytes gauge
id_card_generator_memory_usage_bytes{type="rss"} ${memUsage.rss}
id_card_generator_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}
id_card_generator_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}
id_card_generator_memory_usage_bytes{type="external"} ${memUsage.external}

# HELP id_card_generator_dependency_status Dependency status (1=healthy, 0=unhealthy)
# TYPE id_card_generator_dependency_status gauge
id_card_generator_dependency_status{dependency="database"} ${healthMetrics.dependencies.database.status === 'healthy' ? 1 : 0}
id_card_generator_dependency_status{dependency="cloudinary"} ${healthMetrics.dependencies.cloudinary.status === 'healthy' ? 1 : 0}
id_card_generator_dependency_status{dependency="filesystem"} ${healthMetrics.dependencies.filesystem.status === 'healthy' ? 1 : 0}
id_card_generator_dependency_status{dependency="pdfGeneration"} ${healthMetrics.dependencies.pdfGeneration.status === 'healthy' ? 1 : 0}
`.trim();
}

module.exports = router;