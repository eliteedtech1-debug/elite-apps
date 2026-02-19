/**
 * Database Pool Configurations for Different Scaling Scenarios
 * Safe configurations with monitoring and fallback options
 */

const os = require('os');

// Get number of CPU cores for dynamic scaling
const CPU_CORES = os.cpus().length;

// Base configuration (current)
const BASE_POOL_CONFIG = {
  max: 20,
  min: 2,
  acquire: 60000,
  idle: 30000,
  evict: 1000,
  handleDisconnects: true
};

// Configuration for 2 instances (recommended first step)
const TWO_INSTANCE_POOL_CONFIG = {
  max: 10,        // 10 × 2 instances = 20 total
  min: 1,         // Reduced minimum per instance
  acquire: 60000,
  idle: 30000,
  evict: 1000,
  handleDisconnects: true
};

// Configuration for 4 instances (if 2 instances work well)
const FOUR_INSTANCE_POOL_CONFIG = {
  max: 5,         // 5 × 4 instances = 20 total
  min: 1,
  acquire: 60000,
  idle: 30000,
  evict: 1000,
  handleDisconnects: true
};

// Configuration for max CPU instances (advanced)
const MAX_INSTANCE_POOL_CONFIG = {
  max: Math.max(3, Math.floor(20 / CPU_CORES)), // Ensure at least 3 per instance
  min: 1,
  acquire: 60000,
  idle: 30000,
  evict: 1000,
  handleDisconnects: true
};

/**
 * Get pool configuration based on instance count
 * @param {number} instanceCount - Number of instances running
 * @returns {object} Pool configuration
 */
function getPoolConfig(instanceCount = 1) {
  const configs = {
    1: BASE_POOL_CONFIG,
    2: TWO_INSTANCE_POOL_CONFIG,
    4: FOUR_INSTANCE_POOL_CONFIG,
    [CPU_CORES]: MAX_INSTANCE_POOL_CONFIG
  };

  const config = configs[instanceCount] || BASE_POOL_CONFIG;
  
  // Add safety checks
  const safeConfig = {
    ...config,
    // Ensure we don't exceed reasonable limits
    max: Math.min(config.max, 50),
    min: Math.max(config.min, 1),
    // Add connection validation
    validate: true,
    // Add connection retry logic
    retry: {
      max: 3,
      timeout: 5000
    }
  };

  return safeConfig;
}

/**
 * Get current pool configuration from environment
 * @returns {object} Current pool configuration
 */
function getCurrentPoolConfig() {
  const instanceCount = parseInt(process.env.INSTANCE_COUNT) || 1;
  const clusterMode = process.env.CLUSTER_MODE === 'true';
  
  if (!clusterMode) {
    return BASE_POOL_CONFIG;
  }
  
  return getPoolConfig(instanceCount);
}

/**
 * Validate pool configuration
 * @param {object} config - Pool configuration to validate
 * @returns {object} Validation result
 */
function validatePoolConfig(config) {
  const warnings = [];
  const errors = [];

  // Check maximum connections
  if (config.max > 100) {
    warnings.push(`High max connections (${config.max}). Consider database server limits.`);
  }

  // Check minimum connections
  if (config.min > config.max / 2) {
    warnings.push(`High min connections (${config.min}). May waste resources.`);
  }

  // Check acquire timeout
  if (config.acquire < 10000) {
    warnings.push(`Low acquire timeout (${config.acquire}ms). May cause connection errors under load.`);
  }

  // Check idle timeout
  if (config.idle < 10000) {
    warnings.push(`Low idle timeout (${config.idle}ms). May cause frequent reconnections.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * Monitor pool health
 * @param {object} sequelize - Sequelize instance
 * @returns {object} Pool health metrics
 */
async function getPoolHealth(sequelize) {
  try {
    const pool = sequelize.connectionManager.pool;
    
    return {
      total: pool.size,
      active: pool.borrowed,
      idle: pool.available,
      pending: pool.pending,
      max: pool.max,
      min: pool.min
    };
  } catch (error) {
    return {
      error: error.message,
      status: 'unhealthy'
    };
  }
}

module.exports = {
  BASE_POOL_CONFIG,
  TWO_INSTANCE_POOL_CONFIG,
  FOUR_INSTANCE_POOL_CONFIG,
  MAX_INSTANCE_POOL_CONFIG,
  getPoolConfig,
  getCurrentPoolConfig,
  validatePoolConfig,
  getPoolHealth,
  CPU_CORES
};