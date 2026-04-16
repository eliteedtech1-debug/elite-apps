#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:34567';
const SCHOOL_ID = 'SCH/10';

// Test data
const testData = {
  section: 'Primary',
  school_id: SCHOOL_ID,
  template_id: 'NGR_PRIMARY_STD',
  date: '2025-12-31'
};

// 8 Enhanced Endpoints to Test
const endpoints = [
  {
    name: '1. Health Check',
    method: 'GET',
    url: '/health',
    auth: false
  },
  {
    name: '2. Nigerian Templates',
    method: 'GET', 
    url: '/api/nigerian-templates',
    auth: true
  },
  {
    name: '3. Teacher Assignments',
    method: 'GET',
    url: `/api/teacher-assignments?section=${testData.section}`,
    auth: true
  },
  {
    name: '4. Prayer Times',
    method: 'GET',
    url: `/api/prayer-times?date=${testData.date}`,
    auth: true
  },
  {
    name: '5. Ramadan Adjustments',
    method: 'GET',
    url: '/api/ramadan-adjustments',
    auth: true
  },
  {
    name: '6. Enhanced Time Slots',
    method: 'POST',
    url: '/api/enhanced-time-slots',
    auth: true,
    data: {
      section: testData.section,
      school_id: testData.school_id,
      time_slots: [
        {
          day: 'Monday',
          start_time: '08:00',
          end_time: '08:40',
          subject: 'Mathematics',
          class_code: 'PRI1A'
        }
      ]
    }
  },
  {
    name: '7. Generate from Template',
    method: 'POST',
    url: '/api/generate-from-template',
    auth: true,
    data: {
      template_id: testData.template_id,
      section: testData.section,
      school_id: testData.school_id
    }
  },
  {
    name: '8. Generate AI Timetable',
    method: 'POST',
    url: '/api/generate-ai-timetable',
    auth: true,
    data: {
      section: testData.section,
      apply_cultural_rules: true,
      school_id: testData.school_id
    }
  }
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.url}`);
    
    const config = {
      method: endpoint.method.toLowerCase(),
      url: `${BASE_URL}${endpoint.url}`,
      timeout: 10000
    };
    
    if (endpoint.data) {
      config.data = endpoint.data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    if (endpoint.auth) {
      console.log(`   ⚠️  Authentication required - testing without auth first`);
    }
    
    const response = await axios(config);
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Response:`, JSON.stringify(response.data, null, 2));
    
    return { success: true, status: response.status, data: response.data };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || 'Network Error'}`);
    console.log(`   📝 Message:`, error.response?.data || error.message);
    
    return { 
      success: false, 
      status: error.response?.status, 
      error: error.response?.data || error.message 
    };
  }
}

async function runTests() {
  console.log('🚀 Enhanced Time Slot API Testing Suite');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏫 School ID: ${SCHOOL_ID}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ endpoint: endpoint.name, ...result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.status || 'Network Error'}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Fix authentication for protected endpoints');
  console.log('2. Verify database connections');
  console.log('3. Test with valid school data');
  
  return results;
}

// Run tests
runTests().catch(console.error);
