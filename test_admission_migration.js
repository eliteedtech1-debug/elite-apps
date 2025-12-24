// Quick test script for admission module migration
const mysql = require('mysql2/promise');

async function testMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'skcooly_db'
  });

  try {
    console.log('🔍 Testing admission module migration...');

    // Test 1: Check if school_applicants table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'school_applicants'"
    );
    console.log('✅ school_applicants table exists:', tables.length > 0);

    // Test 2: Check table structure
    const [columns] = await connection.execute(
      "DESCRIBE school_applicants"
    );
    console.log('✅ Table has', columns.length, 'columns');

    // Test 3: Check for sample data
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM school_applicants"
    );
    console.log('✅ Table has', rows[0].count, 'records');

    // Test 4: Check if new tables exist (if migration was run)
    const newTables = ['admission_guardians', 'admission_parents', 'admission_documents', 'admission_status_history'];
    for (const table of newTables) {
      const [exists] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      console.log(`${exists.length > 0 ? '✅' : '⚠️'} ${table} table:`, exists.length > 0 ? 'exists' : 'not found');
    }

    console.log('🎉 Migration test completed');
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
  } finally {
    await connection.end();
  }
}

testMigration();
