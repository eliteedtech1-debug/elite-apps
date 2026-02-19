const navigationService = require('../services/navigationService');

console.log('🧪 Testing Navigation Intent Detection - Ensuring No Disruption\n');

const testCases = [
  // Should trigger navigation
  { query: 'where is student list', expected: true, reason: 'Explicit navigation query' },
  { query: 'how do i find attendance', expected: true, reason: 'Explicit navigation query' },
  { query: 'show me the payment page', expected: true, reason: 'Explicit navigation query' },
  { query: 'show me attendance', expected: true, reason: 'Explicit navigation query' },
  { query: 'take me to reports', expected: true, reason: 'Explicit navigation query' },
  
  // Should NOT trigger navigation (default behavior)
  { query: 'hello', expected: false, reason: 'Greeting' },
  { query: 'hi there', expected: false, reason: 'Greeting' },
  { query: 'i need help', expected: false, reason: 'General help request' },
  { query: 'create ticket', expected: false, reason: 'Ticket creation' },
  { query: 'talk to human', expected: false, reason: 'Escalation request' },
  { query: 'speak to agent', expected: false, reason: 'Escalation request' },
  { query: 'contact support', expected: false, reason: 'Escalation request' },
  { query: 'i have a problem', expected: false, reason: 'General issue' },
  { query: 'help me with billing', expected: false, reason: 'Knowledge base query' },
  { query: 'what is elite scholar', expected: false, reason: 'Knowledge base query' },
  { query: 'how do i contact support', expected: false, reason: 'Escalation (has "contact support")' },
  { query: 'i want to talk to a human agent', expected: false, reason: 'Escalation (has "human agent")' },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = navigationService.detectNavigationIntent(test.query);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
    console.log(`${status} "${test.query}"`);
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
    console.log(`   Reason: ${test.reason}\n`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Results: ${passed}/${testCases.length} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('✅ All tests passed! Navigation feature does not disrupt default behavior.');
} else {
  console.log('❌ Some tests failed. Review the navigation detection logic.');
}
