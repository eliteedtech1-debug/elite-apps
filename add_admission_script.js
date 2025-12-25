const mysql = require('mysql2/promise');

async function addAdmissionMenu() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Kiro@2024',
    database: 'elite_test_db'
  });

  try {
    // Get current menu
    const [rows] = await connection.execute('SELECT menu_data FROM rbac_menu_cache ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      console.log('No menu cache found');
      return;
    }

    const currentMenu = JSON.parse(rows[0].menu_data);
    
    // Create Admission section
    const admissionSection = {
      name: "Admission",
      requiredAccess: ["admin", "branchadmin"],
      premium: true,
      items: [
        {
          key: "ADMISSION_DASHBOARD",
          label: "Dashboard",
          icon: "ti ti-dashboard",
          link: "/admission/dashboard",
          feature: "admission",
          premium: true,
          requiredAccess: ["admin", "branchadmin"]
        },
        {
          key: "ADMISSION_APPLICATIONS", 
          label: "Applications",
          icon: "ti ti-file-text",
          link: "/admission/applications",
          feature: "admission",
          premium: true,
          requiredAccess: ["admin", "branchadmin"]
        },
        {
          key: "ADMISSION_ANALYTICS",
          label: "Analytics", 
          icon: "ti ti-chart-bar",
          link: "/admission/analytics",
          feature: "admission",
          premium: true,
          requiredAccess: ["admin", "branchadmin"]
        }
      ]
    };

    // Insert Admission section at position 1 (after Personal Data Mngr)
    currentMenu.splice(1, 0, admissionSection);

    // Update the menu cache
    await connection.execute(
      'UPDATE rbac_menu_cache SET menu_data = ?, updated_at = NOW() WHERE id = (SELECT MAX(id) FROM (SELECT id FROM rbac_menu_cache) AS temp)',
      [JSON.stringify(currentMenu)]
    );

    console.log('✅ Admission section added successfully!');
    console.log('New menu sections:', currentMenu.map(s => s.name));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addAdmissionMenu();
