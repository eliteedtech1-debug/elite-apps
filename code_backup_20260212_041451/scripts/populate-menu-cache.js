const db = require('../models');

async function populateMenuCache() {
  try {
    console.log('🔧 Populating RBAC Menu Cache...');

    // Standard menu structure for all schools
    const menuStructure = [
      {
        name: 'Students',
        icon: 'UserOutlined',
        items: [
          { key: 'STUDENT_MANAGEMENT', label: 'Student List', icon: 'UserOutlined', route: '/students' },
          { key: 'ATTENDANCE', label: 'Attendance', icon: 'CheckCircleOutlined', route: '/attendance' }
        ]
      },
      {
        name: 'Academic',
        icon: 'BookOutlined',
        items: [
          { key: 'CLASS_MANAGEMENT', label: 'Classes', icon: 'TeamOutlined', route: '/classes' },
          { key: 'SUBJECTS', label: 'Subjects', icon: 'BookOutlined', route: '/subjects' },
          { key: 'TIMETABLE', label: 'Timetable', icon: 'CalendarOutlined', route: '/timetable' }
        ]
      },
      {
        name: 'Staff',
        icon: 'TeamOutlined',
        items: [
          { key: 'TEACHER_MANAGEMENT', label: 'Teachers', icon: 'UserOutlined', route: '/teachers' }
        ]
      },
      {
        name: 'Finance',
        icon: 'DollarOutlined',
        items: [
          { key: 'COLLECT_FEES', label: 'Fee Collection', icon: 'DollarOutlined', route: '/payments' },
          { key: 'BASIC_REPORTS', label: 'Financial Reports', icon: 'FileTextOutlined', route: '/reports/financial' }
        ]
      },
      {
        name: 'Communication',
        icon: 'MessageOutlined',
        items: [
          { key: 'MESSAGING', label: 'SMS/WhatsApp', icon: 'MessageOutlined', route: '/messaging' }
        ]
      },
      {
        name: 'Settings',
        icon: 'SettingOutlined',
        items: [
          { key: 'SETTINGS', label: 'School Settings', icon: 'SettingOutlined', route: '/settings' }
        ]
      }
    ];

    // Insert menu data
    await db.sequelize.query(`
      INSERT INTO rbac_menu_cache (menu_data) VALUES (?)
      ON DUPLICATE KEY UPDATE menu_data = ?, updated_at = NOW()
    `, {
      replacements: [JSON.stringify(menuStructure), JSON.stringify(menuStructure)],
      type: db.Sequelize.QueryTypes.INSERT
    });

    console.log('✅ Menu cache populated successfully');
    console.log(`📋 Menu categories: ${menuStructure.length}`);
    console.log(`📋 Total menu items: ${menuStructure.reduce((acc, cat) => acc + cat.items.length, 0)}`);

  } catch (error) {
    console.error('❌ Error populating menu cache:', error.message);
  } finally {
    process.exit(0);
  }
}

populateMenuCache();
