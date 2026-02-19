const request = require('supertest');
const app = require('../../index');
const db = require('../../models');
const path = require('path');
const fs = require('fs');

describe('ID Card API Endpoints', () => {
  let authToken;
  let testSchoolId = 1;
  let testBranchId = 1;
  let templateId;
  let generationId;
  let batchId;

  beforeAll(async () => {
    // Mock authentication token
    authToken = 'mock-jwt-token';
    
    // Create test template
    const template = await db.IdCardTemplate.create({
      school_id: testSchoolId,
      branch_id: testBranchId,
      template_name: 'Test API Template',
      template_type: 'student',
      layout_config: { width: 336, height: 212 },
      created_by: 1
    });
    templateId = template.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.IdCardGeneration.destroy({ where: { template_id: templateId } });
    await db.IdCardTemplate.destroy({ where: { id: templateId } });
  });

  describe('Health Check Endpoint', () => {
    it('GET /api/id-cards/health should return service status', async () => {
      const response = await request(app)
        .get('/api/id-cards/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ID Card service is running');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/id-cards/health')
        .expect(401);
    });
  });

  describe('Template Upload Endpoints', () => {
    describe('POST /api/id-cards/templates/upload-logo', () => {
      it('should upload school logo', async () => {
        // Create a test image file
        const testImagePath = path.join(__dirname, 'test-logo.png');
        fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));

        const response = await request(app)
          .post('/api/id-cards/templates/upload-logo')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('logo', testImagePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.url).toBeDefined();

        // Cleanup
        fs.unlinkSync(testImagePath);
      });

      it('should validate file type', async () => {
        const testFilePath = path.join(__dirname, 'test-file.txt');
        fs.writeFileSync(testFilePath, 'not an image');

        const response = await request(app)
          .post('/api/id-cards/templates/upload-logo')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('logo', testFilePath)
          .expect(400);

        expect(response.body.success).toBe(false);

        // Cleanup
        fs.unlinkSync(testFilePath);
      });
    });

    describe('POST /api/id-cards/templates/upload-background', () => {
      it('should upload background image', async () => {
        const testImagePath = path.join(__dirname, 'test-bg.jpg');
        fs.writeFileSync(testImagePath, Buffer.from('fake-background-data'));

        const response = await request(app)
          .post('/api/id-cards/templates/upload-background')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('background', testImagePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.url).toBeDefined();

        // Cleanup
        fs.unlinkSync(testImagePath);
      });
    });
  });

  describe('Template Preview Endpoint', () => {
    it('POST /api/id-cards/templates/:id/preview should generate preview', async () => {
      const sampleData = {
        first_name: 'John',
        last_name: 'Doe',
        student_id: 'PREVIEW001',
        class_name: 'Grade 10'
      };

      const response = await request(app)
        .post(`/api/id-cards/templates/${templateId}/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(sampleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.barcode).toBeDefined();
    });
  });

  describe('Card Generation Endpoints', () => {
    describe('POST /api/id-cards/generation/single', () => {
      it('should generate single ID card', async () => {
        const cardData = {
          template_id: templateId,
          student_id: 12345,
          card_data: {
            first_name: 'Jane',
            last_name: 'Smith',
            student_id: '12345',
            class_name: 'Grade 9',
            admission_number: 'ADM12345'
          }
        };

        const response = await request(app)
          .post('/api/id-cards/generation/single')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cardData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.status).toBe('completed');
        
        generationId = response.body.data.id;
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/id-cards/generation/single')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should enforce multi-tenant isolation', async () => {
        const cardData = {
          template_id: templateId,
          student_id: 12345,
          card_data: { first_name: 'Test' }
        };

        const response = await request(app)
          .post('/api/id-cards/generation/single')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-School-ID', '999')
          .send(cardData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/id-cards/generation/batch', () => {
      it('should create batch generation job', async () => {
        const batchData = {
          template_id: templateId,
          student_ids: [1001, 1002, 1003],
          card_data: [
            { first_name: 'Student', last_name: 'One', student_id: '1001' },
            { first_name: 'Student', last_name: 'Two', student_id: '1002' },
            { first_name: 'Student', last_name: 'Three', student_id: '1003' }
          ]
        };

        const response = await request(app)
          .post('/api/id-cards/generation/batch')
          .set('Authorization', `Bearer ${authToken}`)
          .send(batchData)
          .expect(202);

        expect(response.body.success).toBe(true);
        expect(response.body.data.batch_id).toBeDefined();
        expect(response.body.data.total_cards).toBe(3);
        
        batchId = response.body.data.batch_id;
      });

      it('should validate batch size limits', async () => {
        const largeBatch = {
          template_id: templateId,
          student_ids: Array.from({ length: 1001 }, (_, i) => i + 1),
          card_data: Array.from({ length: 1001 }, (_, i) => ({ 
            first_name: `Student${i}`, 
            student_id: `${i + 1}` 
          }))
        };

        const response = await request(app)
          .post('/api/id-cards/generation/batch')
          .set('Authorization', `Bearer ${authToken}`)
          .send(largeBatch)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('batch size');
      });
    });

    describe('GET /api/id-cards/generation/batch/:batch_id/status', () => {
      it('should return batch processing status', async () => {
        const response = await request(app)
          .get(`/api/id-cards/generation/batch/${batchId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.batch_id).toBe(batchId);
        expect(response.body.data.total_cards).toBeDefined();
        expect(response.body.data.completed_cards).toBeDefined();
        expect(response.body.data.failed_cards).toBeDefined();
        expect(response.body.data.status).toBeDefined();
      });

      it('should return 404 for non-existent batch', async () => {
        const response = await request(app)
          .get('/api/id-cards/generation/batch/non-existent/status')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/id-cards/generation/:id/download', () => {
      it('should download generated card', async () => {
        const response = await request(app)
          .get(`/api/id-cards/generation/${generationId}/download`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/application\/pdf/);
      });

      it('should return 404 for non-existent card', async () => {
        const response = await request(app)
          .get('/api/id-cards/generation/99999/download')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/id-cards/generation/student/:student_id', () => {
      it('should retrieve all cards for a student', async () => {
        const response = await request(app)
          .get('/api/id-cards/generation/student/12345')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should enforce multi-tenant isolation for student cards', async () => {
        const response = await request(app)
          .get('/api/id-cards/generation/student/12345')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-School-ID', '999')
          .expect(200);

        expect(response.body.data.length).toBe(0);
      });
    });
  });

  describe('Student Photo Upload Endpoints', () => {
    describe('POST /api/id-cards/generation/upload-student-photo', () => {
      it('should upload single student photo', async () => {
        const testPhotoPath = path.join(__dirname, 'student-photo.jpg');
        fs.writeFileSync(testPhotoPath, Buffer.from('fake-photo-data'));

        const response = await request(app)
          .post('/api/id-cards/generation/upload-student-photo')
          .set('Authorization', `Bearer ${authToken}`)
          .field('student_id', '12345')
          .attach('photo', testPhotoPath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.url).toBeDefined();
        expect(response.body.data.student_id).toBe('12345');

        // Cleanup
        fs.unlinkSync(testPhotoPath);
      });

      it('should validate image format', async () => {
        const testFilePath = path.join(__dirname, 'invalid-file.txt');
        fs.writeFileSync(testFilePath, 'not an image');

        const response = await request(app)
          .post('/api/id-cards/generation/upload-student-photo')
          .set('Authorization', `Bearer ${authToken}`)
          .field('student_id', '12345')
          .attach('photo', testFilePath)
          .expect(400);

        expect(response.body.success).toBe(false);

        // Cleanup
        fs.unlinkSync(testFilePath);
      });
    });

    describe('POST /api/id-cards/generation/upload-bulk-photos', () => {
      it('should upload multiple student photos', async () => {
        const photo1Path = path.join(__dirname, 'photo1.jpg');
        const photo2Path = path.join(__dirname, 'photo2.jpg');
        
        fs.writeFileSync(photo1Path, Buffer.from('photo1-data'));
        fs.writeFileSync(photo2Path, Buffer.from('photo2-data'));

        const response = await request(app)
          .post('/api/id-cards/generation/upload-bulk-photos')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('photos', photo1Path)
          .attach('photos', photo2Path)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.uploaded_count).toBe(2);
        expect(response.body.data.failed_count).toBe(0);

        // Cleanup
        fs.unlinkSync(photo1Path);
        fs.unlinkSync(photo2Path);
      });

      it('should enforce file count limits', async () => {
        const photos = [];
        for (let i = 0; i < 51; i++) {
          const photoPath = path.join(__dirname, `bulk-photo-${i}.jpg`);
          fs.writeFileSync(photoPath, Buffer.from(`photo-${i}-data`));
          photos.push(photoPath);
        }

        let request_builder = request(app)
          .post('/api/id-cards/generation/upload-bulk-photos')
          .set('Authorization', `Bearer ${authToken}`);

        photos.forEach(photoPath => {
          request_builder = request_builder.attach('photos', photoPath);
        });

        const response = await request_builder.expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('maximum');

        // Cleanup
        photos.forEach(photoPath => {
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template ID gracefully', async () => {
      const cardData = {
        template_id: 99999,
        student_id: 12345,
        card_data: { first_name: 'Test' }
      };

      const response = await request(app)
        .post('/api/id-cards/generation/single')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cardData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Template not found');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/id-cards/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .get('/api/id-cards/templates')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on batch operations', async () => {
      const batchData = {
        template_id: templateId,
        student_ids: [2001, 2002],
        card_data: [
          { first_name: 'Rate', last_name: 'Test1', student_id: '2001' },
          { first_name: 'Rate', last_name: 'Test2', student_id: '2002' }
        ]
      };

      // Make multiple rapid requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/id-cards/generation/batch')
          .set('Authorization', `Bearer ${authToken}`)
          .send(batchData)
      );

      const responses = await Promise.all(promises);
      
      // At least some should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});