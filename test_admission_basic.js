// Basic admission test without external dependencies
const path = require('path');
process.chdir(path.join(__dirname, 'elscholar-api'));

const db = require('./src/models');

async function testBasic() {
  try {
    console.log('🔍 Testing admission module basics...');

    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    // Test table exists
    const [tables] = await db.sequelize.query("SHOW TABLES LIKE 'school_applicants'");
    console.log('✅ school_applicants table:', tables.length > 0 ? 'exists' : 'missing');

    // Test procedure exists  
    const [procs] = await db.sequelize.query("SHOW PROCEDURE STATUS WHERE Name = 'school_admission_form'");
    console.log('✅ school_admission_form procedure:', procs.length > 0 ? 'exists' : 'missing');

    console.log('🎉 Basic validation complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testBasic();
