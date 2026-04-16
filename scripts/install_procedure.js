const mysql = require('mysql2/promise');
require('dotenv').config();

async function installStoredProcedure() {
  let connection;
  
  try {
    // Create connection using environment variables
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'elite_db'
    });

    console.log('Connected to database successfully');

    // Read the stored procedure SQL from file
    const fs = require('fs');
    const procedureSQL = fs.readFileSync('/Users/apple/Downloads/apps/elite/install_GetSectionCASetup_procedure.sql', 'utf8');

    console.log('Installing GetSectionCASetup stored procedure...');
    
    // Execute the SQL to install the stored procedure
    await connection.query(procedureSQL);
    
    console.log('✅ GetSectionCASetup stored procedure installed successfully!');
    
  } catch (error) {
    console.error('❌ Error installing stored procedure:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the installation
installStoredProcedure();