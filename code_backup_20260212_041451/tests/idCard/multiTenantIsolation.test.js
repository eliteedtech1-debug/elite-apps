const request = require('supertest');
const app = require('../../index');
const db = require('../../models');

describe('Multi-Tenant Isolation Tests for ID Card System', () => {
  let school1Token, school2Token, school3Token;
  let school1Data, school2Data, school3Data;
  let template1Id, template2Id, template3Id;
  let generation1Id, generation2Id, generation3Id;

  beforeAll(async () => {
    // Setup test data for multiple schools
    school1Data = { school_id: 1, branch_id: 1, user_id: 101 };
    school2Data = { school_id: 2, branch_id: 2, user_id: 201 };
    school3Data = { school_id: 3, branch_id: 3, user_id: 301 };

    // Mock JWT tokens for different schools
    school1Token = 'school1-jwt-token';
    school2Token = 'school2-jwt-token';
    school3Token = 'school3-jwt-token';

    // Create test templates for each school
    const template1 = await db.IdCardTemplate.create({
      ...school1Data,
      template_name: 'School 1 Template',
      template_type: 'student',
      layout_config: { width: 336, height: 212 },
      created_by: school1Data.user_id
    });
    template1Id = template1.id;

    const template2 = await db.IdCardTemplate.create({
      ...school2Data,
      template_name: 'School 2 Template',
      template_type: 'student',
      layout_config: { width: 336, height: 212 },
      created_by: school2Data.user_id
    });
    template2Id = template2.id;

    const template3 = await db.IdCardTemplate.create({
      ...school3Data,
      template_name: 'School 3 Template',
      template_type: 'staff',
      layout_config: { width: 336, height: 212 },
      created_by: school3Data.user_id
    });
    template3Id = template3.id;

    // Create test generations for each school
    const generation1 = await db.IdCardGeneration.create({
      ...school1Data,
      template_id: template1Id,
      student_id: 1001,
      card_data: { first_name: 'John', last_name: 'Doe', student_id: '1001' },
      status: 'completed'
    });
    generation1Id = generation1.id;

    const generation2 = await db.IdCardGeneration.create({
      ...school2Data,
      template_id: template2Id,
      student_id: 2001,
      card_data: { first_name: 'Jane', last_name: 'Smith', student_id: '2001' },
      status: 'completed'
    });
    generation2Id = generation2.id;

    const generation3 = await db.IdCardGeneration.create({
      ...school3Data,
      template_id: template3Id,
      student_id: 3001,
      card_data: { first_name: 'Bob', last_name: 'Johnson', student_id: '3001' },
      status: 'completed'
    });
    generation3Id = generation3.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.IdCardGeneration.destroy({ where: { id: [generation1Id, generation2Id, generation3Id] } });
    await db.IdCardTemplate.destroy({ where: { id: [template1Id, template2Id, template3Id] } });
  });

  describe('Template Isolation', () => {
    it('should only return templates for authenticated school', async () => {
      // School 1 should only see their template
      const response1 = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].template_name).toBe('School 1 Template');
      expect(response1.body.data[0].school_id).toBe(school1Data.school_id);

      // School 2 should only see their template
      const response2 = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school2Token}`)
        .set('X-School-ID', school2Data.school_id.toString())
        .set('X-Branch-ID', school2Data.branch_id.toString())
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].template_name).toBe('School 2 Template');
      expect(response2.body.data[0].school_id).toBe(school2Data.school_id);
    });

    it('should prevent access to templates from other schools', async () => {
      // School 1 trying to access School 2's template
      const response = await request(app)
        .get(`/api/id-cards/templates/${template2Id}`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });

    it('should prevent updating templates from other schools', async () => {
      const updateData = { template_name: 'Hacked Template' };

      const response = await request(app)
        .put(`/api/id-cards/templates/${template2Id}`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);

      // Verify template wasn't changed
      const template = await db.IdCardTemplate.findByPk(template2Id);
      expect(template.template_name).toBe('School 2 Template');
    });

    it('should prevent deleting templates from other schools', async () => {
      const response = await request(app)
        .delete(`/api/id-cards/templates/${template2Id}`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(404);

      expect(response.body.success).toBe(false);

      // Verify template still exists and is active
      const template = await db.IdCardTemplate.findByPk(template2Id);
      expect(template.is_active).toBe(true);
    });
  });

  describe('Card Generation Isolation', () => {
    it('should only allow generation with own school templates', async () => {
      const cardData = {
        template_id: template2Id, // School 2's template
        student_id: 9999,
        card_data: { first_name: 'Hacker', last_name: 'Attempt' }
      };

      const response = await request(app)
        .post('/api/id-cards/generation/single')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .send(cardData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Template not found');
    });

    it('should isolate generated cards by school', async () => {
      // School 1 should only see their generations
      const response1 = await request(app)
        .get('/api/id-cards/generation/student/1001')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].school_id).toBe(school1Data.school_id);

      // School 2 should not see School 1's generations
      const response2 = await request(app)
        .get('/api/id-cards/generation/student/1001')
        .set('Authorization', `Bearer ${school2Token}`)
        .set('X-School-ID', school2Data.school_id.toString())
        .set('X-Branch-ID', school2Data.branch_id.toString())
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data).toHaveLength(0);
    });

    it('should prevent downloading cards from other schools', async () => {
      const response = await request(app)
        .get(`/api/id-cards/generation/${generation2Id}/download`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Batch Processing Isolation', () => {
    it('should isolate batch operations by school', async () => {
      const batchData = {
        template_id: template1Id,
        student_ids: [1002, 1003],
        card_data: [
          { first_name: 'Alice', last_name: 'Brown', student_id: '1002' },
          { first_name: 'Charlie', last_name: 'Davis', student_id: '1003' }
        ]
      };

      // Create batch for School 1
      const response1 = await request(app)
        .post('/api/id-cards/generation/batch')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .send(batchData)
        .expect(202);

      const batchId = response1.body.data.batch_id;

      // School 2 should not be able to access School 1's batch
      const response2 = await request(app)
        .get(`/api/id-cards/generation/batch/${batchId}/status`)
        .set('Authorization', `Bearer ${school2Token}`)
        .set('X-School-ID', school2Data.school_id.toString())
        .set('X-Branch-ID', school2Data.branch_id.toString())
        .expect(404);

      expect(response2.body.success).toBe(false);
    });
  });

  describe('File Upload Isolation', () => {
    it('should isolate uploaded files by school context', async () => {
      // Mock file upload for School 1
      const response1 = await request(app)
        .post('/api/id-cards/generation/upload-student-photo')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .field('student_id', '1001')
        .attach('photo', Buffer.from('fake-photo-data'), 'photo1.jpg')
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data.url).toContain(`school-${school1Data.school_id}`);

      // Mock file upload for School 2
      const response2 = await request(app)
        .post('/api/id-cards/generation/upload-student-photo')
        .set('Authorization', `Bearer ${school2Token}`)
        .set('X-School-ID', school2Data.school_id.toString())
        .set('X-Branch-ID', school2Data.branch_id.toString())
        .field('student_id', '2001')
        .attach('photo', Buffer.from('fake-photo-data'), 'photo2.jpg')
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data.url).toContain(`school-${school2Data.school_id}`);
      expect(response2.body.data.url).not.toContain(`school-${school1Data.school_id}`);
    });
  });

  describe('Branch-Level Isolation', () => {
    beforeAll(async () => {
      // Create additional branch for School 1
      const school1Branch2Template = await db.IdCardTemplate.create({
        school_id: school1Data.school_id,
        branch_id: 99, // Different branch
        template_name: 'School 1 Branch 2 Template',
        template_type: 'student',
        layout_config: { width: 336, height: 212 },
        created_by: school1Data.user_id
      });
      this.school1Branch2TemplateId = school1Branch2Template.id;
    });

    afterAll(async () => {
      if (this.school1Branch2TemplateId) {
        await db.IdCardTemplate.destroy({ where: { id: this.school1Branch2TemplateId } });
      }
    });

    it('should isolate templates by branch within same school', async () => {
      // Branch 1 should only see their templates
      const response1 = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].branch_id).toBe(school1Data.branch_id);

      // Branch 2 should only see their templates
      const response2 = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', '99')
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].branch_id).toBe(99);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in template queries', async () => {
      const maliciousId = "1; DROP TABLE id_card_templates; --";

      const response = await request(app)
        .get(`/api/id-cards/templates/${maliciousId}`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify table still exists
      const templates = await db.IdCardTemplate.findAll();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should prevent SQL injection in generation queries', async () => {
      const maliciousStudentId = "1001'; DROP TABLE id_card_generations; --";

      const response = await request(app)
        .get(`/api/id-cards/generation/student/${maliciousStudentId}`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify table still exists
      const generations = await db.IdCardGeneration.findAll();
      expect(generations.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization Header Validation', () => {
    it('should reject requests without proper school context', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        // Missing X-School-ID and X-Branch-ID headers
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('School context required');
    });

    it('should reject requests with mismatched school context', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school2Data.school_id.toString()) // Mismatched
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized access');
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not leak school information in error messages', async () => {
      const response = await request(app)
        .get(`/api/id-cards/templates/${template2Id}`)
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(404);

      expect(response.body.error).toBe('Template not found');
      expect(response.body.error).not.toContain('School 2');
      expect(response.body.error).not.toContain(school2Data.school_id.toString());
    });

    it('should not expose other schools data in API responses', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(200);

      // Check that response doesn't contain any data from other schools
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('School 2 Template');
      expect(responseString).not.toContain('School 3 Template');
      expect(responseString).not.toContain(school2Data.school_id.toString());
      expect(responseString).not.toContain(school3Data.school_id.toString());
    });
  });

  describe('Concurrent Access Control', () => {
    it('should handle concurrent requests from different schools', async () => {
      const promises = [
        request(app)
          .get('/api/id-cards/templates')
          .set('Authorization', `Bearer ${school1Token}`)
          .set('X-School-ID', school1Data.school_id.toString())
          .set('X-Branch-ID', school1Data.branch_id.toString()),
        request(app)
          .get('/api/id-cards/templates')
          .set('Authorization', `Bearer ${school2Token}`)
          .set('X-School-ID', school2Data.school_id.toString())
          .set('X-Branch-ID', school2Data.branch_id.toString()),
        request(app)
          .get('/api/id-cards/templates')
          .set('Authorization', `Bearer ${school3Token}`)
          .set('X-School-ID', school3Data.school_id.toString())
          .set('X-Branch-ID', school3Data.branch_id.toString())
      ];

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Each should only see their own data
      expect(responses[0].body.data[0].template_name).toBe('School 1 Template');
      expect(responses[1].body.data[0].template_name).toBe('School 2 Template');
      expect(responses[2].body.data[0].template_name).toBe('School 3 Template');
    });
  });

  describe('Audit Trail Verification', () => {
    it('should log all access attempts with school context', async () => {
      // This would require integration with your logging system
      // Mock audit log check
      const auditLogSpy = jest.spyOn(console, 'log');

      await request(app)
        .get('/api/id-cards/templates')
        .set('Authorization', `Bearer ${school1Token}`)
        .set('X-School-ID', school1Data.school_id.toString())
        .set('X-Branch-ID', school1Data.branch_id.toString())
        .expect(200);

      // Verify audit log contains school context
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`school_id: ${school1Data.school_id}`)
      );

      auditLogSpy.mockRestore();
    });
  });
});