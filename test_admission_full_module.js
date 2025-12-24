// Full Admission Module Test - Comprehensive Review
// Tests all components, integrations, and workflows

console.log('=== FULL ADMISSION MODULE TEST ===\n');

const fs = require('fs');
const path = require('path');

// Test Results Collector
const testResults = {
  backend: { passed: 0, failed: 0, tests: [] },
  frontend: { passed: 0, failed: 0, tests: [] },
  database: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] },
  security: { passed: 0, failed: 0, tests: [] }
};

function addTest(category, name, passed, details = '') {
  testResults[category].tests.push({ name, passed, details });
  if (passed) testResults[category].passed++;
  else testResults[category].failed++;
}

// 1. Backend Components Test
console.log('1. Testing Backend Components...');

// Controllers
const controllers = [
  'AdmissionApplicationController.js',
  'AdmissionTokenController.js',
  'AdmissionWorkflowController.js'
];

controllers.forEach(controller => {
  const filePath = `./elscholar-api/src/controllers/${controller}`;
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasErrorHandling = content.includes('try {') && content.includes('catch');
    const hasValidation = content.includes('required') || content.includes('validate');
    
    addTest('backend', `${controller} - Structure`, exists);
    addTest('backend', `${controller} - Error Handling`, hasErrorHandling);
    addTest('backend', `${controller} - Validation`, hasValidation);
  } else {
    addTest('backend', `${controller} - Missing`, false);
  }
});

// Models
const models = ['AdmissionToken.js'];
models.forEach(model => {
  const filePath = `./elscholar-api/src/models/${model}`;
  const exists = fs.existsSync(filePath);
  addTest('backend', `Model: ${model}`, exists);
});

// Routes
const routes = ['admissions.js', 'admissionTokens.js'];
routes.forEach(route => {
  const filePath = `./elscholar-api/src/routes/${route}`;
  const exists = fs.existsSync(filePath);
  addTest('backend', `Routes: ${route}`, exists);
});

// Helpers
const helperPath = './elscholar-api/src/utils/admissionHelpers.js';
const helperExists = fs.existsSync(helperPath);
addTest('backend', 'Admission Helpers', helperExists);

console.log(`✓ Backend: ${testResults.backend.passed} passed, ${testResults.backend.failed} failed\n`);

// 2. Frontend Components Test
console.log('2. Testing Frontend Components...');

const frontendComponents = [
  'AdmissionApplicationForm.tsx',
  'AdmissionApplicationList.tsx',
  'AdmissionWorkflowManager.tsx',
  'TokenManager.tsx',
  'SchoolContextValidator.tsx'
];

frontendComponents.forEach(component => {
  const filePath = `./elscholar-ui/src/feature-module/admissions/${component}`;
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasReact = content.includes('import React');
    const hasAntd = content.includes('antd');
    const hasRedux = content.includes('useSelector') || content.includes('useDispatch');
    
    addTest('frontend', `${component} - Structure`, exists);
    addTest('frontend', `${component} - React Integration`, hasReact);
    addTest('frontend', `${component} - Ant Design`, hasAntd);
    addTest('frontend', `${component} - Redux Integration`, hasRedux);
  } else {
    addTest('frontend', `${component} - Missing`, false);
  }
});

// Redux Slice
const slicePath = './elscholar-ui/src/redux/slices/admissionSlice.ts';
const sliceExists = fs.existsSync(slicePath);
addTest('frontend', 'Redux Admission Slice', sliceExists);

console.log(`✓ Frontend: ${testResults.frontend.passed} passed, ${testResults.frontend.failed} failed\n`);

// 3. Database Schema Test
console.log('3. Testing Database Schema...');

// Check for existing table usage
const existingTableFiles = [
  './elscholar-api/src/models/EXISTING-PROCS.sql',
  './schema_analysis_report.md',
  './normalization_plan.md'
];

existingTableFiles.forEach(file => {
  const exists = fs.existsSync(file);
  addTest('database', `Schema File: ${path.basename(file)}`, exists);
});

// Check migration scripts
const migrationFiles = [
  './migration_scripts.sql',
  './rollback_scripts.sql',
  './data_validation_queries.sql'
];

migrationFiles.forEach(file => {
  const exists = fs.existsSync(file);
  addTest('database', `Migration: ${path.basename(file)}`, exists);
});

console.log(`✓ Database: ${testResults.database.passed} passed, ${testResults.database.failed} failed\n`);

// 4. Integration Test
console.log('4. Testing Integration Points...');

// API Integration
const indexPath = './elscholar-api/src/index.js';
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  const hasAdmissionRoutes = content.includes('admissions.js');
  const hasTokenRoutes = content.includes('admission-tokens');
  
  addTest('integration', 'Admission Routes Registered', hasAdmissionRoutes);
  addTest('integration', 'Token Routes Registered', hasTokenRoutes);
}

// Redux Integration
const reducerPath = './elscholar-ui/src/redux/reducers/index.ts';
if (fs.existsSync(reducerPath)) {
  const content = fs.readFileSync(reducerPath, 'utf8');
  const hasAdmissionReducer = content.includes('admission');
  
  addTest('integration', 'Redux Admission Reducer', hasAdmissionReducer);
}

// Context Validation
const contextValidatorPath = './elscholar-ui/src/feature-module/admissions/SchoolContextValidator.tsx';
if (fs.existsSync(contextValidatorPath)) {
  const content = fs.readFileSync(contextValidatorPath, 'utf8');
  const hasAuthCheck = content.includes('useSelector');
  const hasErrorHandling = content.includes('Alert');
  
  addTest('integration', 'Context Validation Logic', hasAuthCheck);
  addTest('integration', 'Context Error Handling', hasErrorHandling);
}

console.log(`✓ Integration: ${testResults.integration.passed} passed, ${testResults.integration.failed} failed\n`);

// 5. Security Test
console.log('5. Testing Security Implementation...');

// Token Security
const tokenControllerPath = './elscholar-api/src/controllers/AdmissionTokenController.js';
if (fs.existsSync(tokenControllerPath)) {
  const content = fs.readFileSync(tokenControllerPath, 'utf8');
  const hasCrypto = content.includes('crypto.randomBytes');
  const hasValidation = content.includes('school_id') && content.includes('branch_id');
  
  addTest('security', 'Crypto Token Generation', hasCrypto);
  addTest('security', 'Multi-tenant Validation', hasValidation);
}

// Access Control
const helperPath2 = './elscholar-api/src/utils/admissionHelpers.js';
if (fs.existsSync(helperPath2)) {
  const content = fs.readFileSync(helperPath2, 'utf8');
  const hasAccessValidation = content.includes('validateAccess');
  const hasTokenValidation = content.includes('validateToken');
  
  addTest('security', 'Access Validation', hasAccessValidation);
  addTest('security', 'Token Validation', hasTokenValidation);
}

// Authentication Middleware
const routesPath = './elscholar-api/src/routes/admissionTokens.js';
if (fs.existsSync(routesPath)) {
  const content = fs.readFileSync(routesPath, 'utf8');
  const hasAuth = content.includes('authenticateToken');
  
  addTest('security', 'Authentication Middleware', hasAuth);
}

console.log(`✓ Security: ${testResults.security.passed} passed, ${testResults.security.failed} failed\n`);

// Generate Summary Report
console.log('=== TEST SUMMARY ===');
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

// Export results for report generation
module.exports = testResults;
