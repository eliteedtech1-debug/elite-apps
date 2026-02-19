const navigationService = require('../services/navigationService');

const mockMenu = [
  {
    name: 'Personal Data Mngr',
    items: [
      {
        label: 'Students',
        submenu: true,
        submenuItems: [
          { label: 'Student List', link: '/student/student-list' },
          { label: 'Class List', link: '/academic/class-list' },
          { label: 'ID Card Generator', link: '/student/id-card-generator' }
        ]
      },
      {
        label: 'Staff',
        submenu: true,
        submenuItems: [
          { label: 'Add Staff', link: '/teacher/add-teacher' },
          { label: 'Staff List', link: '/teacher/teacher-list' }
        ]
      }
    ]
  },
  {
    name: 'Class Management',
    items: [
      {
        label: 'Daily Routine',
        submenu: true,
        submenuItems: [
          { label: 'Class Time Table', link: '/academic/class-time-table' },
          { label: 'Class Attendance', link: '/academic/attendance-register' }
        ]
      }
    ]
  }
];

console.log('🧪 Testing Navigation Service\n');

const testQueries = [
  'where is student list',
  'show me attendance',
  'how do i find staff',
  'take me to timetable',
  'class list'
];

testQueries.forEach(query => {
  console.log(`\n📝 Query: "${query}"`);
  const results = navigationService.findNavigationPath(query, mockMenu);
  
  if (results.length > 0) {
    console.log(`✅ Found ${results.length} result(s):`);
    results.forEach((result, idx) => {
      console.log(`   ${idx + 1}. ${result.label} (Score: ${result.score})`);
      console.log(`      Path: ${result.path.join(' → ')}`);
      console.log(`      Link: ${result.link}`);
    });
  } else {
    console.log('❌ No results found');
  }
});

const response = navigationService.generateNavigationResponse(
  navigationService.findNavigationPath('student list', mockMenu),
  'student list'
);

console.log('\n\n📋 Sample Response:\n');
console.log(response.text);
console.log(`\nIntent: ${response.intent}`);
console.log(`Confidence: ${response.confidence}`);
console.log(`Primary Link: ${response.primaryLink}`);

console.log('\n✅ Navigation Service Test Complete');
