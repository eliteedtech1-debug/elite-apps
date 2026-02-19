'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const { getCurrentPoolConfig, validatePoolConfig } = require('../config/database-pools');
require('dotenv').config();

const basename = path.basename(__filename);

const config = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: 'Z',
    dateStrings: true,
    typeCast: (field, next) => {
      if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
        return field.string();
      }
      return next();
    },
  },
  // Dynamic pool configuration based on instance count
  pool: getCurrentPoolConfig(),
};

// Validate pool configuration
const poolValidation = validatePoolConfig(config.pool);
if (!poolValidation.isValid) {
  console.error('❌ Invalid pool configuration:', poolValidation.errors);
  process.exit(1);
}

if (poolValidation.warnings.length > 0) {
  console.warn('⚠️ Pool configuration warnings:');
  poolValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

console.log('📊 Database Pool Configuration:');
console.log(`  - Max connections: ${config.pool.max}`);
console.log(`  - Min connections: ${config.pool.min}`);
console.log(`  - Instance count: ${process.env.INSTANCE_COUNT || 1}`);
console.log(`  - Cluster mode: ${process.env.CLUSTER_MODE === 'true' ? 'enabled' : 'disabled'}`);

const db = {};
let sequelize;

// Enhanced Sequelize configuration with comprehensive database logging
sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    dialectModule: require('mysql2'),
    port: config.port,
    dialectOptions: {
      ...config.dialectOptions,
      // Disable SSL for development
      ssl: false,
      // Set charset
      charset: 'utf8mb4'
    },
    pool: config.pool,
    // Enable comprehensive SQL query logging
    logging: (sql, timing) => {
      const logger = require('../logging/Logger');
      const executionTime = timing || 0;
      const isSlowQuery = executionTime > 1000; // 1 second threshold
      
      // Log all queries with appropriate level
      const level = isSlowQuery ? 'WARN' : 'DEBUG';
      const message = isSlowQuery 
        ? `🐌 SLOW QUERY (${executionTime}ms)` 
        : `📊 SQL Query (${executionTime}ms)`;
      
      // Sanitize and log the query
      const sanitizedSql = sql
        .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
        .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
        .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
        .replace(/token\s*=\s*"[^"]*"/gi, 'token="***"');
      
      // Determine query type
      const queryType = sql.trim().toUpperCase().split(' ')[0] || 'UNKNOWN';
      
      // Add instance information for cluster mode
      const instanceInfo = process.env.CLUSTER_MODE === 'true' ? {
        instanceId: process.env.pm_id || 'unknown',
        instanceCount: process.env.INSTANCE_COUNT || 1,
        clusterMode: true
      } : {
        clusterMode: false
      };
      
      logger.log(level, 'SQL', message, {
        sql: sanitizedSql,
        executionTime,
        isSlowQuery,
        queryType,
        timestamp: new Date().toISOString(),
        database: config.database,
        host: config.host,
        poolConfig: {
          max: config.pool.max,
          min: config.pool.min
        },
        ...instanceInfo
      }).catch(err => {
        console.error('Failed to log SQL query:', err.message);
      });
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        const color = isSlowQuery ? '\x1b[31m' : '\x1b[36m'; // Red for slow, Cyan for normal
        const reset = '\x1b[0m';
        const instancePrefix = process.env.CLUSTER_MODE === 'true' ? `[Instance ${process.env.pm_id || '?'}] ` : '';
        console.log(`${color}[${new Date().toISOString()}] ${instancePrefix}${queryType} (${executionTime}ms)${reset}`);
        if (process.env.LOG_FULL_QUERIES === 'true') {
          console.log(`${color}SQL: ${sanitizedSql}${reset}`);
        }
      }
    },
    // Add retry configuration for connection issues
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /ER_PLUGIN_IS_NOT_LOADED/
      ],
      max: 3
    }
  }
);

// ✅ Only one loop
fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && 
           file !== basename && 
           file.slice(-3) === '.js' && 
           !file.startsWith('index');
  })
  .forEach((file) => {
    try {
      const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } catch (error) {
      console.error(`❌ Failed to load model ${file}: ${error.message}`);
    }
  });

// ✅ Run associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ✅ Register Chart of Accounts hooks for automatic setup
try {
  const ChartOfAccountsHooks = require('../hooks/ChartOfAccountsHooks');
  ChartOfAccountsHooks.registerHooks(db);
  console.log('✅ Chart of Accounts hooks registered successfully');
} catch (error) {
  console.error('❌ Failed to register Chart of Accounts hooks:', error.message);
}

// Add pool health monitoring
if (process.env.CLUSTER_MODE === 'true') {
  const { getPoolHealth } = require('../config/database-pools');
  
  // Log pool health every 30 seconds in cluster mode
  setInterval(async () => {
    try {
      const health = await getPoolHealth(sequelize);
      console.log(`📊 [Instance ${process.env.pm_id || '?'}] Pool Health:`, health);
    } catch (error) {
      console.error('❌ Pool health check failed:', error.message);
    }
  }, 30000);
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;