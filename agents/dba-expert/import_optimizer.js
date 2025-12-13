const mysql = require('mysql2/promise');
const fs = require('fs').promises;

class DatabaseImportOptimizer {
  constructor(config) {
    this.config = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'elite_db',
      ...config
    };
  }

  async optimizeMySQL() {
    const connection = await mysql.createConnection(this.config);
    
    const optimizations = [
      'SET SESSION max_allowed_packet = 1073741824',
      'SET SESSION innodb_buffer_pool_size = 536870912',
      'SET SESSION wait_timeout = 28800',
      'SET SESSION interactive_timeout = 28800',
      'SET SESSION net_read_timeout = 600',
      'SET SESSION net_write_timeout = 600',
      'SET SESSION bulk_insert_buffer_size = 268435456',
      'SET SESSION foreign_key_checks = 0',
      'SET SESSION unique_checks = 0',
      'SET SESSION autocommit = 0',
      'SET SESSION sql_mode = ""'
    ];

    for (const sql of optimizations) {
      try {
        await connection.execute(sql);
      } catch (e) {
        console.log(`Optimization skipped: ${sql}`);
      }
    }
    
    return connection;
  }

  async importInChunks(filePath) {
    console.log('Starting optimized database import...');
    
    const connection = await this.optimizeMySQL();
    const content = await fs.readFile(filePath, 'utf8');
    
    // Split into statements
    const statements = content.split(/;\s*\n/).filter(s => s.trim() && !s.trim().startsWith('--'));
    console.log(`Found ${statements.length} SQL statements`);
    
    let imported = 0;
    const chunkSize = 50;
    
    for (let i = 0; i < statements.length; i += chunkSize) {
      const chunk = statements.slice(i, i + chunkSize);
      
      try {
        await connection.beginTransaction();
        
        for (const statement of chunk) {
          const cleanStatement = statement.trim();
          if (cleanStatement) {
            try {
              await connection.execute(cleanStatement);
              imported++;
            } catch (e) {
              if (!e.message.includes('already exists') && !e.message.includes('Duplicate')) {
                console.log(`Error in statement: ${e.message.substring(0, 100)}...`);
              }
            }
          }
        }
        
        await connection.commit();
        console.log(`Processed ${Math.min(i + chunkSize, statements.length)}/${statements.length} statements`);
        
      } catch (e) {
        await connection.rollback();
        console.log(`Chunk failed, retrying: ${e.message}`);
        
        // Retry individual statements
        for (const statement of chunk) {
          try {
            await connection.execute(statement.trim());
            imported++;
          } catch (retryError) {
            // Skip problematic statements
          }
        }
      }
    }
    
    // Re-enable constraints
    await connection.execute('SET foreign_key_checks = 1');
    await connection.execute('SET unique_checks = 1');
    await connection.execute('SET autocommit = 1');
    
    await connection.end();
    
    console.log(`Import completed! ${imported} statements executed successfully.`);
    return imported;
  }
}

// Execute import
const importer = new DatabaseImportOptimizer();
importer.importInChunks('/Users/apple/Downloads/kirmaskngov_skcooly_db.sql')
  .then(count => {
    console.log(`✅ Database import completed with ${count} statements`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  });
