const request = require('supertest');
const app = require('../../index');
const db = require('../../models');

describe('ID Card Template CRUD Operations', () => {
  let authToken;
  let testSchoolId = 1;
  let testBranchId = 1;
  let templateId;

  beforeAll(async () => {
    // Mock authentication
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test data
    if (templateId) {
      await db.IdCardTemplate.destroy({ where: { id: templateId } });
    }
  });

  describe('POST /api/id-cards/templates', () => {
    it('should create a new template', async () => {
      const templateData = {
        template_name: 'Test Student ID Card',
        template_type: 'student',
        layout_config: {
          width: 336,
          height: 212,
          elements: {
            logo: { x: 10, y: 10, width: 40, height: 40 },
            photo: { x: 180, y: 10, width: 50, height: 60 },
            name: { x: 10, y: 60, fontSize: 12 }
          }
        }
      };

      const response = await request(app)
        .post('/api/id-cards/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template_name).toBe(templateData.template_name);
      templateId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/id-cards/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce multi-tenant isolation', async () => {
      const templateData = {
        template_name: 'Unauthorized Template',
        template_type: 'student',
        layout_config: { width: 336, height: 212 }
      };

      // Mock different school context
      const response = await request(app)
        .post('/api/id-cards/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-School-ID', '999')
        .send(templateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/id-cards/templates', () => {
    it('should retrieve templates for authenticated school', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by template type', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates?template_type=student')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(template => {
        expect(template.template_type).toBe('student');
      });
    });
  });

  describe('GET /api/id-cards/templates/:id', () => {
    it('should retrieve specific template', async () => {
      const response = await request(app)
        .get(`/api/id-cards/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(templateId);
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/id-cards/templates/:id', () => {
    it('should update template', async () => {
      const updateData = {
        template_name: 'Updated Template Name',
        layout_config: { width: 400, height: 250 }
      };

      const response = await request(app)
        .put(`/api/id-cards/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template_name).toBe(updateData.template_name);
    });
  });

  describe('DELETE /api/id-cards/templates/:id', () => {
    it('should soft delete template', async () => {
      const response = await request(app)
        .delete(`/api/id-cards/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify soft delete
      const template = await db.IdCardTemplate.findByPk(templateId);
      expect(template.is_active).toBe(false);
    });
  });

  describe('GET /api/id-cards/templates/default', () => {
    it('should retrieve default template', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates/default?template_type=student')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template_type).toBe('student');
    });
  });
});