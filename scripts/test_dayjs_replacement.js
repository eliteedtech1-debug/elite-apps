// Test Day.js Replacement in Admission Module
console.log('=== DAYJS REPLACEMENT TEST ===\n');

const fs = require('fs');

const filesToCheck = [
  './elscholar-ui/src/feature-module/auth/login/AdmissionBranchDisplay.tsx',
  './elscholar-ui/src/feature-module/admissions/AdmissionApplicationForm.tsx',
  './elscholar-ui/src/feature-module/admissions/TokenManager.tsx',
  './elscholar-api/src/controllers/AdmissionApplicationController.js'
];

let allPassed = true;

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasMoment = content.includes('moment');
    const hasDayjs = content.includes('dayjs');
    
    console.log(`${file}:`);
    console.log(`  Moment usage: ${hasMoment ? '❌ FOUND' : '✅ NONE'}`);
    console.log(`  Day.js usage: ${hasDayjs ? '✅ FOUND' : '❌ MISSING'}`);
    
    if (hasMoment || !hasDayjs) {
      allPassed = false;
    }
    console.log();
  } else {
    console.log(`${file}: ❌ FILE NOT FOUND\n`);
    allPassed = false;
  }
});

console.log(`=== RESULT: ${allPassed ? '✅ ALL PASSED' : '❌ ISSUES FOUND'} ===`);

if (allPassed) {
  console.log('All moment imports successfully replaced with dayjs in admission module.');
}
