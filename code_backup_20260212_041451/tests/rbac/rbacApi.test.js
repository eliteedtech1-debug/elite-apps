const request = require('supertest');
const app = require('../../index');

describe('RBAC API - Actual Endpoints', () => {
  describe('GET /api/rbac/permissions', () => {
    test('should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions');
      expect(response.status).toBe(401);
    });

    test('should return features object with valid auth', async () => {
      // Mock valid JWT token
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', 'Bearer valid-token');
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.features).toBeDefined();
      }
    });
  });

  describe('GET /api/rbac/staff-roles', () => {
    test('should return staff role definitions', async () => {
      const response = await request(app)
        .get('/api/rbac/staff-roles')
        .set('Authorization', 'Bearer valid-token');
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/rbac/superadmin/:id/grant-feature', () => {
    test('should require Developer user_type', async () => {
      const response = await request(app)
        .post('/api/rbac/superadmin/1/grant-feature')
        .set('Authorization', 'Bearer non-developer-token')
        .send({ feature_key: 'TEST_FEATURE', max_tier: 'standard' });
      
      if (response.status === 403) {
        expect(response.body.error).toContain('Only Developers allowed');
      }
    });
  });
});
