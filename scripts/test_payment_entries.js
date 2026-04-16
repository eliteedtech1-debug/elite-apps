// Quick test to see what's in payment_entries table
const db = require('./elscholar-api/src/models');

async function testPaymentEntries() {
  try {
    // Check what's actually in payment_entries for this school/term
    const result = await db.sequelize.query(`
      SELECT 
        s.current_class,
        COUNT(pe.item_id) as total_entries,
        SUM(pe.cr) as total_billed,
        SUM(pe.dr) as total_paid,
        COUNT(CASE WHEN pe.dr > 0 THEN 1 END) as payment_count,
        COUNT(CASE WHEN pe.cash_received_date IS NOT NULL THEN 1 END) as cash_tracked
      FROM students s
      LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no 
        AND pe.school_id = 'SCH/20'
        AND pe.term = 'First Term'
        AND pe.academic_year = '2025/2026'
        AND pe.payment_status != 'Excluded'
      WHERE s.school_id = 'SCH/20'
        AND s.branch_id = 'BRCH00027'
        AND s.status IN ('Active', 'Suspended')
      GROUP BY s.current_class
      HAVING total_entries > 0
      ORDER BY s.current_class
      LIMIT 5
    `, {
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log('Payment Entries Analysis:');
    console.table(result);
    
    // Also check a sample of actual payment entries
    const sample = await db.sequelize.query(`
      SELECT 
        admission_no, description, cr, dr, payment_status, cash_received_date, created_at
      FROM payment_entries 
      WHERE school_id = 'SCH/20' 
        AND term = 'First Term' 
        AND academic_year = '2025/2026'
        AND payment_status != 'Excluded'
      LIMIT 10
    `, {
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log('\nSample Payment Entries:');
    console.table(sample);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testPaymentEntries();
