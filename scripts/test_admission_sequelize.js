// Test admission module with Sequelize
const db = require('./elscholar-api/src/models');

async function testAdmissionModule() {
  try {
    console.log('🔍 Testing admission module with Sequelize...');

    // Test 1: Check database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Test 2: Test school_applicants table
    const [applicants] = await db.sequelize.query(
      "SELECT COUNT(*) as count FROM school_applicants"
    );
    console.log('✅ school_applicants table has', applicants[0].count, 'records');

    // Test 3: Test stored procedure exists
    const [procedures] = await db.sequelize.query(
      "SHOW PROCEDURE STATUS WHERE Name = 'school_admission_form'"
    );
    console.log('✅ school_admission_form procedure:', procedures.length > 0 ? 'exists' : 'missing');

    // Test 4: Test sample application creation
    const testData = {
      query_type: 'create',
      upload: '',
      applicant_id: '',
      guardian_id: '',
      parent_id: '',
      type_of_application: 'Primary 1',
      name_of_applicant: 'Test Student',
      home_address: 'Test Address',
      date_of_birth: '2018-01-01',
      guardian_name: 'Test Guardian',
      guardian_phone: '08012345678',
      guardian_email: 'test@example.com',
      guardian_address: 'Guardian Address',
      guardian_relationship: 'Father',
      parent_fullname: 'Test Parent',
      parent_phone: '08087654321',
      parent_email: 'parent@example.com',
      parent_address: 'Parent Address',
      parent_occupation: 'Engineer',
      state_of_origin: 'Lagos',
      l_g_a: 'Ikeja',
      last_school_attended: 'Previous School',
      mathematics: '',
      english: '',
      special_health_needs: '',
      sex: 'Male',
      admission_no: '',
      school: 'Test School',
      status: 'submitted',
      academic_year: '2024/2025',
      school_id: 'TEST001',
      branch_id: 'BR001',
      short_name: 'TST',
      last_class: 'Nursery 2',
      others: '',
      id: null,
      other_score: 0
    };

    const result = await db.sequelize.query(
      `CALL school_admission_form(
        :query_type, :upload, :applicant_id, :guardian_id, :parent_id,
        :type_of_application, :name_of_applicant, :home_address, :date_of_birth,
        :guardian_name, :guardian_phone, :guardian_email, :guardian_address, :guardian_relationship,
        :parent_fullname, :parent_phone, :parent_email, :parent_address, :parent_occupation,
        :state_of_origin, :l_g_a, :last_school_attended, :mathematics, :english,
        :special_health_needs, :sex, :admission_no, :school, :status,
        :academic_year, :school_id, :branch_id, :short_name, :last_class, :others, :id, :other_score
      )`,
      { replacements: testData }
    );

    console.log('✅ Test application created successfully');
    console.log('📊 Result:', result[0]?.length || 0, 'records returned');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await db.sequelize.close();
  }
}

testAdmissionModule();
