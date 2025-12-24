const mysql = require('mysql2/promise');

async function testMenuData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'elite'
  });

  try {
    // Check what's in the menu cache
    const [rows] = await connection.execute('SELECT menu_data FROM rbac_menu_cache ORDER BY id DESC LIMIT 1');
    
    if (rows.length > 0) {
      const menuData = JSON.parse(rows[0].menu_data);
      console.log('Menu structure:');
      console.log(JSON.stringify(menuData, null, 2));
      
      // Test the filtering logic for admin user
      const userType = 'admin';
      
      const hasAccess = (item) => {
        if (!item.requiredAccess || item.requiredAccess.length === 0) return true;
        return item.requiredAccess.some(a => a.toLowerCase() === userType);
      };
      
      const filteredMenu = menuData
        .filter(category => hasAccess(category))
        .map(category => ({
          ...category,
          items: category.items.filter(item => hasAccess(item))
        }))
        .filter(category => category.items.length > 0);
      
      console.log('\nFiltered menu for admin user:');
      console.log(JSON.stringify(filteredMenu, null, 2));
    } else {
      console.log('No menu data found in cache');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testMenuData();