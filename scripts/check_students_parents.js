// Check students and parent data for school SCH/20
const db = require('./elscholar-api/src/models');

async function checkStudentsAndParents() {
  try {
    console.log('=== Students in SCH/20 ===');
    const students = await db.sequelize.query(`
      SELECT 
        admission_no, 
        student_name, 
        parent_id, 
        current_class,
        status
      FROM students 
      WHERE school_id = 'SCH/20' 
      LIMIT 10
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    console.log(`Total students found: ${students.length}`);
    students.forEach(s => {
      console.log(`- ${s.student_name} (${s.admission_no}) - Parent ID: ${s.parent_id || 'NULL'} - Class: ${s.current_class}`);
    });

    console.log('\n=== Students with parent_id ===');
    const studentsWithParents = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM students 
      WHERE school_id = 'SCH/20' 
      AND parent_id IS NOT NULL
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    console.log(`Students with parent_id: ${studentsWithParents[0].count}`);

    console.log('\n=== School Applicants (Parent Info) ===');
    const applicants = await db.sequelize.query(`
      SELECT 
        parent_id,
        parent_fullname,
        parent_phone_no,
        parent_email
      FROM school_applicants 
      WHERE school_id = 'SCH/20' 
      LIMIT 5
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    console.log(`Total applicants found: ${applicants.length}`);
    applicants.forEach(a => {
      console.log(`- Parent: ${a.parent_fullname} (ID: ${a.parent_id}) - Phone: ${a.parent_phone_no}`);
    });

    await db.sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStudentsAndParents();
