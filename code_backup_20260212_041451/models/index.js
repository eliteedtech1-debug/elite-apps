'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
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
  pool: {
    max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,        // Reduced from 20 to prevent overwhelming the database
    min: parseInt(process.env.DB_MIN_CONNECTIONS) || 1,          // Reduced from 2 to lower minimum
    acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 45000,  // Reduced from 60000 to 45 seconds
    idle: parseInt(process.env.DB_IDLE_TIMEOUT) || 20000,        // Reduced from 30000 to 20 seconds
    evict: parseInt(process.env.DB_EVICTION_INTERVAL) || 30000,  // Increased to 30 seconds to reduce frequent checks
    handleDisconnects: true,                                      // Automatically handle disconnections
    // Additional settings to prevent connection errors
    maxIdleTime: parseInt(process.env.DB_MAX_IDLE_TIME) || 60000, // Maximum idle time before releasing
  },
};

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
      // Set charset only (collate is not supported in dialectOptions)
      charset: 'utf8mb4'
    },
    pool: config.pool,
    // Enable comprehensive SQL query logging
    logging: (sql, timing) => {
      try {
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

        // Execute the logger function and handle any issues
        const logPromise = logger.log(level, 'SQL', message, {
          sql: sanitizedSql,
          executionTime,
          isSlowQuery,
          queryType,
          timestamp: new Date().toISOString(),
          database: config.database,
          host: config.host
        });

        // Only attach .catch() if the return value is a Promise
        if (logPromise && typeof logPromise.catch === 'function') {
          logPromise.catch(err => {
            console.error('Failed to log SQL query:', err.message);
          });
        }

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
          const color = isSlowQuery ? '\x1b[31m' : '\x1b[36m'; // Red for slow, Cyan for normal
          const reset = '\x1b[0m';
          console.log(`${color}[${new Date().toISOString()}] ${queryType} (${executionTime}ms)${reset}`);
          if (process.env.LOG_FULL_QUERIES === 'true') {
            console.log(`${color}SQL: ${sanitizedSql}${reset}`);
          }
        }
      } catch (err) {
        // Catch any errors in setup to prevent cascading failures
        console.error('Failed to set up SQL query logging:', err.message);
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
      max: parseInt(process.env.DB_RETRY_ATTEMPTS) || 5,          // Increased from 3 to 5 attempts
      backoffBase: parseInt(process.env.DB_RETRY_BACKOFF_BASE) || 1000, // Initial backoff time in ms
      backoffExponent: parseInt(process.env.DB_RETRY_BACKOFF_EXP) || 1.5 // Exponent for exponential backoff
    },
    // Add additional timeout settings
    define: {
      // Default options for model definitions
      timestamps: true,
      freezeTableName: true
    },
    // Add additional timeout settings
    define: {
      // Default options for model definitions
      timestamps: true,
      freezeTableName: true
    }
  }
);

// ✅ Set sequelize and Sequelize BEFORE loading models to prevent circular dependency
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ✅ Function to recursively load models from subdirectories
function loadModelsFromDirectory(dir) {
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip problematic directories that are loaded manually or cause issues
      const skipDirectories = ['retailInventory', 'assetManagement'];
      if (skipDirectories.includes(item)) {
        console.log(`⏭️ Skipping ${item} directory (loaded manually)`);
        return;
      }
      // Recursively load models from other subdirectories
      loadModelsFromDirectory(fullPath);
    } else if (item.slice(-3) === '.js' &&
      item !== 'index.js' &&
      item !== 'LoginSession.js' &&
      item !== 'index.dynamic.js') {
      try {
        const model = require(fullPath)(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
        console.log(`✅ Loaded model: ${model.name} from ${fullPath}`);
      } catch (error) {
        console.error(`❌ Failed to load model ${item}: ${error.message}`);
      }
    }
  });
}

// Load all models including those in subdirectories
loadModelsFromDirectory(__dirname);

// ✅ Load Retail Inventory models manually (they're in subdirectories)
try {
  const Product = require('./retailInventory/Product')(sequelize);
  const Supplier = require('./retailInventory/Supplier')(sequelize);
  const StockTransaction = require('./retailInventory/StockTransaction')(sequelize);

  // Refactored and manually loaded models
  const ProductCategory = require('./retailInventory/ProductCategory')(sequelize);
  const ProductStock = require('./retailInventory/ProductStock')(sequelize);
  const ProductVariant = require('./retailInventory/ProductVariant')(sequelize);

  db.Product = Product;
  db.Supplier = Supplier;
  db.StockTransaction = StockTransaction;
  db.ProductCategory = ProductCategory;
  db.ProductStock = ProductStock;
  db.ProductVariant = ProductVariant;

  console.log('✅ Retail Inventory models loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Retail Inventory models:', error.message);
}

// ✅ Load Payroll models manually to ensure they're available
try {
  const GradeLevel = require('./GradeLevel')(sequelize);
  const SalaryStructureHistory = require('./SalaryStructureHistory')(sequelize);

  db.GradeLevel = GradeLevel;
  db.SalaryStructureHistory = SalaryStructureHistory;

  console.log('✅ Payroll models loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Payroll models:', error.message);
}

// ✅ Load AI database models (chatbot)
try {
  const aiDB = require('./ai');
  db.ChatbotConversation = aiDB.ChatbotConversation;
  db.ChatbotIntent = aiDB.ChatbotIntent;
  db.ChatbotKnowledgeBase = aiDB.ChatbotKnowledgeBase;
  console.log('✅ AI database models loaded successfully');
} catch (error) {
  console.error('❌ Failed to load AI database models:', error.message);
}

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

module.exports = db;
