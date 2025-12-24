// Test admission API endpoints
const AdmissionApplicationController = require('./elscholar-api/src/controllers/AdmissionApplicationController');
const AdmissionWorkflowController = require('./elscholar-api/src/controllers/AdmissionWorkflowController');

// Mock request and response objects
const mockReq = {
  user: {
    school_id: 'TEST001',
    branch_id: 'BR001',
    username: 'test_user'
  },
  body: {
    name_of_applicant: 'Test Student',
    date_of_birth: '2018-01-01',
    gender: 'Male',
    home_address: 'Test Address',
    type_of_application: 'Primary 1',
    state_of_origin: 'Lagos',
    l_g_a: 'Ikeja',
    last_school_attended: 'Previous School',
    last_class: 'Nursery 2',
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
    academic_year: '2024/2025'
  }
};

const mockRes = {
  json: (data) => {
    console.log('✅ API Response:', data.success ? 'Success' : 'Failed');
    if (data.error) console.log('❌ Error:', data.error);
    return mockRes;
  },
  status: (code) => {
    console.log('📊 Status Code:', code);
    return mockRes;
  }
};

async function testAdmissionAPI() {
  console.log('🔍 Testing Admission API endpoints...');

  try {
    // Test 1: Submit Application
    console.log('\n1️⃣ Testing submitApplication...');
    await AdmissionApplicationController.submitApplication(mockReq, mockRes);

    // Test 2: Get Applications
    console.log('\n2️⃣ Testing getApplications...');
    const getReq = { ...mockReq, query: {} };
    await AdmissionApplicationController.getApplications(getReq, mockRes);

    console.log('\n🎉 API tests completed!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAdmissionAPI();
