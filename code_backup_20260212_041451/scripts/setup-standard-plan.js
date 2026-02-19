const db = require('../models');

async function setupStandardPlanForAllSchools() {
  console.log('🚀 Starting Standard Plan Setup for All Schools...');
  
  try {
    // 1. Create/Update Standard Plan
    console.log('📋 Setting up Standard subscription plan...');
    
    const [standardPlan] = await db.sequelize.query(`
      INSERT INTO subscription_pricing (
        pricing_name, 
        base_price_per_student, 
        discount_per_annum,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        'Standard Plan',
        50.00,
        10.00,
        1,
        NOW(),
        NOW()
      ) ON DUPLICATE KEY UPDATE
        pricing_name = 'Standard Plan',
        is_active = 1,
        updated_at = NOW()
    `, { type: db.Sequelize.QueryTypes.INSERT });

    const standardPlanId = standardPlan || 1;
    console.log(`✅ Standard Plan ID: ${standardPlanId}`);

    // 2. Define Standard Features (EXCLUDING: Payroll, Exam Analytics, Asset, Supply Mgmt, Admission, Staff Attendance)
    const standardFeatures = [
      { key: 'STUDENT_MANAGEMENT', name: 'Student Management', icon: 'UserOutlined', route: '/students', order: 1 },
      { key: 'COLLECT_FEES', name: 'Fee Collection', icon: 'DollarOutlined', route: '/payments', order: 2 },
      { key: 'CLASS_MANAGEMENT', name: 'Class Management', icon: 'TeamOutlined', route: '/classes', order: 3 },
      { key: 'TEACHER_MANAGEMENT', name: 'Teacher Management', icon: 'UserOutlined', route: '/teachers', order: 4 },
      { key: 'ATTENDANCE', name: 'Student Attendance', icon: 'CheckCircleOutlined', route: '/attendance', order: 5 },
      { key: 'BASIC_REPORTS', name: 'Basic Reports', icon: 'FileTextOutlined', route: '/reports', order: 6 },
      { key: 'SUBJECTS', name: 'Subject Management', icon: 'BookOutlined', route: '/subjects', order: 7 },
      { key: 'TIMETABLE', name: 'Timetable', icon: 'CalendarOutlined', route: '/timetable', order: 8 },
      { key: 'MESSAGING', name: 'SMS/WhatsApp', icon: 'MessageOutlined', route: '/messaging', order: 9 },
      { key: 'SETTINGS', name: 'School Settings', icon: 'SettingOutlined', route: '/settings', order: 10 }
    ];

    // 3. Insert Standard Features
    console.log('🔧 Setting up standard features...');
    
    for (const feature of standardFeatures) {
      await db.sequelize.query(`
        INSERT INTO features (
          feature_key, 
          feature_name, 
          menu_icon, 
          route_path, 
          display_order, 
          is_active,
          is_menu_item,
          required_user_types,
          created_at,
          updated_at
        ) VALUES (
          :key, :name, :icon, :route, :order, 1, 1, 'admin,teacher,student', NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE
          feature_name = :name,
          menu_icon = :icon,
          route_path = :route,
          display_order = :order,
          is_active = 1,
          updated_at = NOW()
      `, {
        replacements: feature,
        type: db.Sequelize.QueryTypes.INSERT
      });
    }

    // 4. Create Menu Structure
    console.log('📱 Setting up menu structure...');
    
    const menuStructure = [
      {
        name: 'Dashboard',
        icon: 'DashboardOutlined',
        items: [
          { key: 'DASHBOARD', label: 'Dashboard', icon: 'DashboardOutlined', route: '/dashboard' }
        ]
      },
      {
        name: 'Student Management',
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

    // Store menu structure for API endpoint
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS rbac_menu_cache (
        id INT PRIMARY KEY AUTO_INCREMENT,
        menu_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.sequelize.query(`
      INSERT INTO rbac_menu_cache (menu_data) VALUES (?)
      ON DUPLICATE KEY UPDATE menu_data = ?, updated_at = NOW()
    `, {
      replacements: [JSON.stringify(menuStructure), JSON.stringify(menuStructure)],
      type: db.Sequelize.QueryTypes.INSERT
    });

    // 5. Get All Active Schools
    console.log('🏫 Finding all active schools...');
    
    const schools = await db.sequelize.query(`
      SELECT school_id, school_name FROM school_setup WHERE status = 'active'
    `, { type: db.Sequelize.QueryTypes.SELECT });

    console.log(`📊 Found ${schools.length} active schools`);

    // 6. Assign Standard Plan to All Schools
    console.log('🎯 Assigning standard plan to all schools...');
    
    for (const school of schools) {
      await db.sequelize.query(`
        INSERT INTO school_subscriptions (
          school_id,
          pricing_plan_id,
          subscription_type,
          status,
          total_cost,
          amount_paid,
          balance,
          subscription_start_date,
          subscription_end_date,
          created_at,
          updated_at
        ) VALUES (
          :school_id,
          :plan_id,
          'annual',
          'active',
          500.00,
          500.00,
          0.00,
          NOW(),
          DATE_ADD(NOW(), INTERVAL 1 YEAR),
          NOW(),
          NOW()
        ) ON DUPLICATE KEY UPDATE
          pricing_plan_id = :plan_id,
          status = 'active',
          updated_at = NOW()
      `, {
        replacements: {
          school_id: school.school_id,
          plan_id: standardPlanId
        },
        type: db.Sequelize.QueryTypes.INSERT
      });

      console.log(`✅ ${school.school_name} → Standard Plan`);
    }

    console.log('\n🎉 SETUP COMPLETE!');
    console.log(`📋 Standard Plan: ${standardFeatures.length} features`);
    console.log(`🏫 Schools Updated: ${schools.length}`);
    console.log(`📱 Menu Categories: ${menuStructure.length}`);
    console.log('\n🚫 EXCLUDED FEATURES:');
    console.log('   - Payroll');
    console.log('   - Exam Analytics');
    console.log('   - Asset Management');
    console.log('   - Supply Management');
    console.log('   - Admission');
    console.log('   - Staff Attendance');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  setupStandardPlanForAllSchools()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { setupStandardPlanForAllSchools };
