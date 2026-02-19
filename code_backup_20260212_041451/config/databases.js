const { Sequelize } = require('sequelize');
require('dotenv').config();

const createConnection = (config, name) => {
  const connection = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port || 3306,
      dialect: 'mysql',
      logging: config.logging || false,
      pool: config.pool || {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        supportBigNumbers: true,
        bigNumberStrings: true,
        timezone: 'Z',
        dateStrings: true
      }
    }
  );

  connection.dbName = name;
  return connection;
};

const mainDB = createConnection({
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  pool: { max: 15, min: 2 }
}, 'Main');

const auditDB = createConnection({
  database: process.env.AUDIT_DB_NAME || process.env.DB_NAME,
  username: process.env.AUDIT_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.AUDIT_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.AUDIT_DB_HOST || process.env.DB_HOST,
  port: process.env.AUDIT_DB_PORT || process.env.DB_PORT,
  pool: { max: 5, min: 1 }
}, 'Audit');

const aiDB = createConnection({
  database: process.env.AI_DB_NAME || process.env.DB_NAME,
  username: process.env.AI_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.AI_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.AI_DB_HOST || process.env.DB_HOST,
  port: process.env.AI_DB_PORT || process.env.DB_PORT,
  pool: { max: 5, min: 1 }
}, 'AI');

const testConnections = async () => {
  const results = { main: false, audit: false, ai: false };
  
  try {
    await mainDB.authenticate();
    console.log('✅ Main DB connected:', mainDB.config.database);
    results.main = true;
  } catch (error) {
    console.error('❌ Main DB failed:', error.message);
  }
  
  try {
    await auditDB.authenticate();
    console.log('✅ Audit DB connected:', auditDB.config.database);
    results.audit = true;
  } catch (error) {
    console.error('❌ Audit DB failed:', error.message);
  }
  
  try {
    await aiDB.authenticate();
    console.log('✅ AI DB connected:', aiDB.config.database);
    results.ai = true;
  } catch (error) {
    console.error('❌ AI DB failed:', error.message);
  }
  
  return results;
};

module.exports = {
  mainDB,
  auditDB,
  aiDB,
  testConnections
};
