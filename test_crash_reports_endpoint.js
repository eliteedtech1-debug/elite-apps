#!/usr/bin/env node

/**
 * Test script to verify crash reports endpoints are working
 * 
 * Usage: node test_crash_reports_endpoint.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:34567';

// Test data
const testCrashReport = {
  errorMessage: "Test error message from script",
  stackTrace: "Error: Test error\n    at test (test.js:1:1)",
  componentStack: "",
  url: "http://localhost:3000/test",
  userAgent: "Test User Agent",
  deviceInfo: {
    screenWidth: 1920,
    screenHeight: 1080,
    windowWidth: 1200,
    windowHeight: 800,
    pixelRatio: 1,
    platform: "Test Platform",
    language: "en-US",
    online: true,
    cookieEnabled: true,
    timezone: "UTC"
  },
  appVersion: "1.0.0",
  os: "Test OS",
  browser: "Test Browser",
  type: "reported_error",
  severity: "medium",
  userId: 1,
  schoolId: "SCH/1",
  branchId: null
};

/**
 * Test endpoint availability
 */
async function testEndpoint(url, method = 'GET', data = null, headers = {}) {
  console.log(`\n🧪 Testing ${method} ${url}`);
  
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log(`✅ ${method} ${url} - Status: ${response.status}`);
    console.log(`📋 Response:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    console.log(`❌ ${method} ${url} - Failed!`);
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📋 Error response:`, error.response.data);
      
      return {
        success: false,
        status: error.response.status,
        error: error.response.data
      };
    } else if (error.request) {
      console.log(`🔌 Network error: No response received`);
      console.log(`🔗 Check if server is running at ${BASE_URL}`);
      
      return {
        success: false,
        error: 'Network error'
      };
    } else {
      console.log(`⚠️ Request setup error:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Crash Reports Endpoint Test Suite');
  console.log('═══════════════════════════════════════');
  console.log(`🔗 Testing API at: ${BASE_URL}`);
  
  const tests = [
    // Test basic API connectivity
    {
      name: 'API Test Endpoint',
      url: '/api/test',
      method: 'GET'
    },
    
    // Test support test endpoint
    {
      name: 'Support Test Endpoint',
      url: '/support/test',
      method: 'GET'
    },
    
    // Test crash reports endpoints
    {
      name: 'Crash Reports (No Auth)',
      url: '/support/crash-reports-no-auth',
      method: 'POST',
      data: testCrashReport
    },
    
    {
      name: 'Crash Reports (Direct)',
      url: '/support/crash-reports',
      method: 'POST',
      data: testCrashReport,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    },
    
    {
      name: 'Crash Reports (API)',
      url: '/api/support/crash-reports',
      method: 'POST',
      data: testCrashReport,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(
      test.url, 
      test.method, 
      test.data, 
      test.headers || {}
    );
    
    results.push({
      name: test.name,
      url: test.url,
      method: test.method,
      ...result
    });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('═══════════════');
  
  let successCount = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const statusCode = result.status ? `(${result.status})` : '';
    
    console.log(`${result.name.padEnd(25)} | ${status} ${statusCode}`);
    
    if (result.success) successCount++;
  });
  
  console.log('\n📈 STATISTICS');
  console.log('═════════════');
  console.log(`✅ Successful requests: ${successCount}/${results.length}`);
  
  // Overall result
  const allSuccess = successCount === results.length;
  
  console.log('\n🎯 FINAL RESULT');
  console.log('═══════════════');
  
  if (allSuccess) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ All crash reports endpoints are working!');
  } else {
    console.log('⚠️ SOME TESTS FAILED');
    
    const failedTests = results.filter(r => !r.success);
    console.log('❌ Failed endpoints:');
    failedTests.forEach(test => {
      console.log(`   - ${test.method} ${test.url} (${test.status || 'No response'})`);
    });
  }
  
  console.log('\n💡 TIPS:');
  console.log('- Make sure the API server is running on port 34567');
  console.log('- Check server logs for route loading messages');
  console.log('- Verify database tables exist (crash_reports, support_tickets)');
  console.log('- Check if authentication middleware is working');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testEndpoint
};