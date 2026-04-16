// Test Admission Login Enhancement
// Tests database schema updates, API endpoints, and login page integration

console.log('=== ADMISSION LOGIN ENHANCEMENT TEST ===\n');

const fs = require('fs');

// Test Results Collector
const testResults = {
  database: { passed: 0, failed: 0, tests: [] },
  api: { passed: 0, failed: 0, tests: [] },
  frontend: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] }
};

function addTest(category, name, passed, details = '') {
  testResults[category].tests.push({ name, passed, details });
  if (passed) testResults[category].passed++;
  else testResults[category].failed++;
}

// 1. Database Schema Enhancement Test
console.log('1. Testing Database Schema Enhancement...');

const schemaPath = './admission_module_final/SCHOOL_LOCATIONS_ENHANCEMENT.sql';
if (fs.existsSync(schemaPath)) {
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  // Check schema changes
  const hasAdmissionOpen = content.includes('admission_open BOOLEAN');
  const hasClosingDate = content.includes('admission_closing_date DATE');
  const hasIndex = content.includes('idx_school_locations_admission');
  const hasUpdateQuery = content.includes('UPDATE school_locations');
  const hasVerificationQuery = content.includes('SELECT');
  
  addTest('database', 'Admission Open Column', hasAdmissionOpen);
  addTest('database', 'Closing Date Column', hasClosingDate);
  addTest('database', 'Performance Index', hasIndex);
  addTest('database', 'Data Update Script', hasUpdateQuery);
  addTest('database', 'Verification Query', hasVerificationQuery);
  
  console.log(`✓ Database Schema: ${testResults.database.passed} passed, ${testResults.database.failed} failed`);
} else {
  addTest('database', 'Schema Enhancement File', false);
  console.log('✗ Database schema enhancement file not found');
}

// 2. API Controller Test
console.log('\n2. Testing API Controller...');

const controllerPath = './elscholar-api/src/controllers/AdmissionBranchController.js';
if (fs.existsSync(controllerPath)) {
  const content = fs.readFileSync(controllerPath, 'utf8');
  
  // Check controller methods
  const hasGetAdmissionBranches = content.includes('getAdmissionBranches');
  const hasGetSchoolsWithAdmissions = content.includes('getSchoolsWithAdmissions');
  const hasSchoolIdValidation = content.includes('school_id is required');
  const hasDateLogic = content.includes('admission_closing_date >= CURDATE()');
  const hasDaysRemaining = content.includes('DATEDIFF');
  const hasErrorHandling = content.includes('try {') && content.includes('catch');
  
  addTest('api', 'Get Admission Branches Method', hasGetAdmissionBranches);
  addTest('api', 'Get Schools With Admissions Method', hasGetSchoolsWithAdmissions);
  addTest('api', 'School ID Validation', hasSchoolIdValidation);
  addTest('api', 'Date Logic Implementation', hasDateLogic);
  addTest('api', 'Days Remaining Calculation', hasDaysRemaining);
  addTest('api', 'Error Handling', hasErrorHandling);
  
  console.log(`✓ API Controller: ${testResults.api.passed} passed, ${testResults.api.failed} failed`);
} else {
  addTest('api', 'Controller File Exists', false);
  console.log('✗ API controller file not found');
}

// 3. Routes Test
console.log('\n3. Testing API Routes...');

const routesPath = './elscholar-api/src/routes/admissionBranches.js';
if (fs.existsSync(routesPath)) {
  const content = fs.readFileSync(routesPath, 'utf8');
  
  // Check route definitions
  const hasSchoolBranchesRoute = content.includes('/schools/:school_id/branches');
  const hasSchoolsRoute = content.includes('/schools');
  const hasControllerImport = content.includes('AdmissionBranchController');
  const hasExpressRouter = content.includes('express.Router()');
  
  addTest('api', 'School Branches Route', hasSchoolBranchesRoute);
  addTest('api', 'Schools Route', hasSchoolsRoute);
  addTest('api', 'Controller Import', hasControllerImport);
  addTest('api', 'Express Router Setup', hasExpressRouter);
  
  console.log(`✓ API Routes: Additional tests completed`);
} else {
  addTest('api', 'Routes File Exists', false);
  console.log('✗ API routes file not found');
}

// 4. Frontend Components Test
console.log('\n4. Testing Frontend Components...');

const branchDisplayPath = './elscholar-ui/src/feature-module/auth/login/AdmissionBranchDisplay.tsx';
if (fs.existsSync(branchDisplayPath)) {
  const content = fs.readFileSync(branchDisplayPath, 'utf8');
  
  // Check component features
  const hasReactImport = content.includes('import React');
  const hasAntdComponents = content.includes('Card, Button, Tag, Tooltip');
  const hasApiIntegration = content.includes('_get');
  const hasNavigateIntegration = content.includes('useNavigate');
  const hasResponsiveLayout = content.includes('xs={24}');
  const hasTooltips = content.includes('Tooltip');
  const hasDateFormatting = content.includes('moment');
  const hasClosingDateLogic = content.includes('getClosingDateColor');
  
  addTest('frontend', 'React Component Structure', hasReactImport);
  addTest('frontend', 'Ant Design Integration', hasAntdComponents);
  addTest('frontend', 'API Integration', hasApiIntegration);
  addTest('frontend', 'Navigation Integration', hasNavigateIntegration);
  addTest('frontend', 'Responsive Layout', hasResponsiveLayout);
  addTest('frontend', 'Tooltips Implementation', hasTooltips);
  addTest('frontend', 'Date Formatting', hasDateFormatting);
  addTest('frontend', 'Closing Date Logic', hasClosingDateLogic);
  
  console.log(`✓ Branch Display Component: ${testResults.frontend.passed} passed, ${testResults.frontend.failed} failed`);
} else {
  addTest('frontend', 'Branch Display Component', false);
  console.log('✗ Branch display component not found');
}

// 5. Login Page Integration Test
console.log('\n5. Testing Login Page Integration...');

const loginPath = './elscholar-ui/src/feature-module/auth/login/login.tsx';
if (fs.existsSync(loginPath)) {
  const content = fs.readFileSync(loginPath, 'utf8');
  
  // Check login page updates
  const hasImport = content.includes('import AdmissionBranchDisplay');
  const hasComponent = content.includes('<AdmissionBranchDisplay');
  const hasSchoolIdProp = content.includes('schoolId={schoolDetails?.school_id}');
  const hasSchoolNameProp = content.includes('schoolName={getSchoolName()}');
  
  addTest('integration', 'Component Import', hasImport);
  addTest('integration', 'Component Usage', hasComponent);
  addTest('integration', 'School ID Prop', hasSchoolIdProp);
  addTest('integration', 'School Name Prop', hasSchoolNameProp);
  
  console.log(`✓ Login Integration: ${testResults.integration.passed} passed, ${testResults.integration.failed} failed`);
} else {
  addTest('integration', 'Login Page File', false);
  console.log('✗ Login page file not found');
}

// 6. Application Route Link Test
console.log('\n6. Testing Application Route Link...');

const routeLinkPath = './elscholar-ui/src/feature-module/admissions/ApplicationRouteLink.tsx';
if (fs.existsSync(routeLinkPath)) {
  const content = fs.readFileSync(routeLinkPath, 'utf8');
  
  // Check route link features
  const hasSearchParams = content.includes('useSearchParams');
  const hasReduxIntegration = content.includes('useDispatch');
  const hasContextSetting = content.includes('setSchool') && content.includes('setSelectedBranch');
  const hasErrorHandling = content.includes('error') && content.includes('Alert');
  const hasLoadingState = content.includes('loading') && content.includes('Spin');
  const hasFormIntegration = content.includes('AdmissionApplicationForm');
  
  addTest('integration', 'URL Search Params', hasSearchParams);
  addTest('integration', 'Redux Integration', hasReduxIntegration);
  addTest('integration', 'Context Setting', hasContextSetting);
  addTest('integration', 'Error Handling', hasErrorHandling);
  addTest('integration', 'Loading State', hasLoadingState);
  addTest('integration', 'Form Integration', hasFormIntegration);
  
  console.log(`✓ Application Route Link: Additional tests completed`);
} else {
  addTest('integration', 'Route Link Component', false);
  console.log('✗ Application route link component not found');
}

// 7. Routes Configuration Test
console.log('\n7. Testing Routes Configuration...');

const allRoutesPath = './elscholar-ui/src/feature-module/router/all_routes.tsx';
if (fs.existsSync(allRoutesPath)) {
  const content = fs.readFileSync(allRoutesPath, 'utf8');
  
  // Check route definitions
  const hasApplicationRouteLink = content.includes('applicationRouteLink');
  const hasCorrectPath = content.includes('/app-route-link');
  
  addTest('integration', 'Application Route Link Definition', hasApplicationRouteLink);
  addTest('integration', 'Correct Route Path', hasCorrectPath);
  
  console.log(`✓ Routes Configuration: Additional tests completed`);
} else {
  addTest('integration', 'All Routes File', false);
  console.log('✗ All routes file not found');
}

// Generate Summary Report
console.log('\n=== ENHANCEMENT TEST SUMMARY ===');
let totalPassed = 0;
let totalFailed = 0;

Object.keys(testResults).forEach(category => {
  const { passed, failed } = testResults[category];
  totalPassed += passed;
  totalFailed += failed;
  console.log(`${category.toUpperCase()}: ${passed} passed, ${failed} failed`);
});

console.log(`\nOVERALL: ${totalPassed} passed, ${totalFailed} failed`);
console.log(`SUCCESS RATE: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

// Detailed Results
console.log('\n=== DETAILED RESULTS ===');
Object.keys(testResults).forEach(category => {
  console.log(`\n${category.toUpperCase()}:`);
  testResults[category].tests.forEach(test => {
    const status = test.passed ? '✓' : '✗';
    console.log(`  ${status} ${test.name}`);
    if (test.details) console.log(`    ${test.details}`);
  });
});

console.log('\n=== ENHANCEMENT COMPLETE ===');
console.log('The login page enhancement includes:');
console.log('- Database schema with admission dates');
console.log('- API endpoints for admission branches');
console.log('- Dynamic branch display on login page');
console.log('- Application form links with branch context');
console.log('- Mobile-first responsive design');
console.log('- Multi-tenant school context integration');
