const db = require('./elscholar-api/src/models');

async function testMenuData() {
  try {
    // Check what's in the menu cache
    const menuCache = await db.sequelize.query(
      `SELECT menu_data FROM rbac_menu_cache ORDER BY id DESC LIMIT 1`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    
    if (menuCache.length > 0) {
      const menuData = JSON.parse(menuCache[0].menu_data);
      console.log('Menu structure found:');
      console.log('Number of categories:', menuData.length);
      
      // Show first category as example
      if (menuData.length > 0) {
        console.log('\nFirst category:');
        console.log('Name:', menuData[0].name);
        console.log('Required Access:', menuData[0].requiredAccess);
        console.log('Number of items:', menuData[0].items?.length || 0);
      }
      
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
      console.log('Number of accessible categories:', filteredMenu.length);
      
      filteredMenu.forEach(category => {
        console.log(`- ${category.name}: ${category.items.length} items`);
      });
      
    } else {
      console.log('No menu data found in cache');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testMenuData();