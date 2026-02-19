// Database utility that provides db.execute interface but uses Sequelize
const { sequelize } = require('../models');
const { Sequelize } = require('sequelize');

// Audit database connection (elite_logs)
let auditConnection = null;

const getAuditConnection = async () => {
  if (auditConnection) return auditConnection;
  
  auditConnection = new Sequelize(
    process.env.AUDIT_DB_NAME || 'elite_logs',
    process.env.AUDIT_DB_USERNAME || 'root',
    process.env.AUDIT_DB_PASSWORD || '',
    {
      host: process.env.AUDIT_DB_HOST || 'localhost',
      port: process.env.AUDIT_DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
    }
  );
  
  await auditConnection.authenticate();
  console.log('✅ Connected to elite_logs database');
  return auditConnection;
};

/**
 * Execute a raw SQL query using Sequelize
 * @param {string} sql - The SQL query to execute
 * @param {Array} values - Values to bind to the query
 * @returns {Promise<Array>} Result of the query execution
 */
const execute = async (sql, values = []) => {
  try {
    const [results] = await sequelize.query(sql, {
      replacements: values,
      type: sequelize.QueryTypes.RAW
    });
    return [results];
  } catch (error) {
    console.error('Database execution error:', error);
    throw error;
  }
};

/**
 * Query method with similar interface
 * @param {string} sql - The SQL query to execute
 * @param {Array} values - Values to bind to the query
 * @returns {Promise} Result of the query execution
 */
const query = async (sql, values = []) => {
  return await sequelize.query(sql, {
    replacements: values,
    type: sequelize.QueryTypes.SELECT
  });
};

module.exports = {
  execute,
  query,
  sequelize,
  getAuditConnection
};