const { getFallbackPermissions } = require('../../services/fallbackPermissions');

describe('RBAC System - Basic Tests', () => {
  // Clean up after tests
  afterAll(async () => {
    // Close any open database connections
    if (global.db && global.db.sequelize) {
      await global.db.sequelize.close();
    }
  });

  describe('Fallback Permissions', () => {
    test('should return standard permissions for admin', async () => {
      const permissions = await getFallbackPermissions('admin', 'school1');
      expect(typeof permissions).toBe('object');
      expect(permissions.STUDENT_MANAGEMENT).toBeDefined();
      expect(permissions.STUDENT_MANAGEMENT.view).toBe(true);
    });

    test('should return teacher permissions', async () => {
      const permissions = await getFallbackPermissions('teacher', 'school1');
      expect(typeof permissions).toBe('object');
      expect(permissions.ATTENDANCE).toBeDefined();
    });

    test('should default to standard tier', async () => {
      const permissions = await getFallbackPermissions('admin', 'nonexistent_school');
      expect(typeof permissions).toBe('object');
      expect(Object.keys(permissions).length).toBeGreaterThan(0);
    });
  });
});
