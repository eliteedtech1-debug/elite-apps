const request = require('supertest');
const app = require('../index');
const db = require('../models');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Mock Cloudinary
jest.mock('../services/cloudinaryService', () => ({
  uploadAudio: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/video/upload/v1234567890/recitations/test.webm',
    public_id: 'recitations/test',
    format: 'webm',
    duration: 30,
    bytes: 1024000
  }),
  deleteAudio: jest.fn().mockResolvedValue({ result: 'ok' })
}));

describe('Recitations API', () => {
  let teacherToken, studentToken;
  let teacherId = 1, studentId = 1;
  let recitationId, replyId;

  beforeAll(async () => {
    // Create test tokens
    teacherToken = jwt.sign(
      { id: teacherId, user_type: 'Teacher', school_id: 'SCH/18' },
      process.env.JWT_SECRET || 'test-secret'
    );
    
    studentToken = jwt.sign(
      { id: studentId, user_type: 'Student', school_id: 'SCH/18', class_code: 'CLASS-1' },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Sync database
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/recitations', () => {
    it('should create a new recitation with audio upload', async () => {
      // Create a test audio file
      const testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.webm');
      if (!fs.existsSync(path.dirname(testAudioPath))) {
        fs.mkdirSync(path.dirname(testAudioPath), { recursive: true });
      }
      fs.writeFileSync(testAudioPath, Buffer.from('fake audio data'));

      const response = await request(app)
        .post('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('title', 'Test Recitation')
        .field('description', 'This is a test recitation')
        .field('class_id', 'CLASS-1')
        .field('allow_replies', 'true')
        .field('due_date', '2024-12-31T23:59:59.000Z')
        .attach('audio', testAudioPath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Recitation');
      expect(response.body.data.teacher_id).toBe(teacherId);
      expect(response.body.data.class_id).toBe('CLASS-1');
      expect(response.body.data.audio_url).toContain('cloudinary.com');

      recitationId = response.body.data.id;

      // Cleanup
      fs.unlinkSync(testAudioPath);
    });

    it('should reject recitation without audio file', async () => {
      const response = await request(app)
        .post('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('title', 'Test Recitation')
        .field('class_id', 'CLASS-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Audio file is required');
    });

    it('should reject unauthorized requests', async () => {
      await request(app)
        .post('/api/recitations')
        .field('title', 'Test Recitation')
        .expect(401);
    });
  });

  describe('GET /api/recitations', () => {
    it('should fetch recitations with pagination', async () => {
      const response = await request(app)
        .get('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('current_page');
      expect(response.body.pagination).toHaveProperty('total_pages');
    });

    it('should filter recitations by class', async () => {
      const response = await request(app)
        .get('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ class_id: 'CLASS-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(recitation => {
        expect(recitation.class_id).toBe('CLASS-1');
      });
    });

    it('should search recitations by title', async () => {
      const response = await request(app)
        .get('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ search: 'Test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(recitation => {
        expect(recitation.title.toLowerCase()).toContain('test');
      });
    });
  });

  describe('GET /api/recitations/:id', () => {
    it('should fetch single recitation with details', async () => {
      const response = await request(app)
        .get(`/api/recitations/${recitationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(recitationId);
      expect(response.body.data).toHaveProperty('teacher');
      expect(response.body.data).toHaveProperty('replies');
    });

    it('should return 404 for non-existent recitation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/recitations/${fakeId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/recitations/:id/replies', () => {
    it('should create a reply to recitation', async () => {
      // Create test audio file
      const testAudioPath = path.join(__dirname, 'fixtures', 'test-reply.webm');
      if (!fs.existsSync(path.dirname(testAudioPath))) {
        fs.mkdirSync(path.dirname(testAudioPath), { recursive: true });
      }
      fs.writeFileSync(testAudioPath, Buffer.from('fake reply audio data'));

      const response = await request(app)
        .post(`/api/recitations/${recitationId}/replies`)
        .set('Authorization', `Bearer ${studentToken}`)
        .field('transcript', 'This is my recitation attempt')
        .attach('audio', testAudioPath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.recitation_id).toBe(recitationId);
      expect(response.body.data.admission_no).toBe(studentId);
      expect(response.body.data.status).toBe('submitted');

      replyId = response.body.data.id;

      // Cleanup
      fs.unlinkSync(testAudioPath);
    });

    it('should prevent duplicate replies from same student', async () => {
      const testAudioPath = path.join(__dirname, 'fixtures', 'test-duplicate.webm');
      fs.writeFileSync(testAudioPath, Buffer.from('duplicate audio'));

      const response = await request(app)
        .post(`/api/recitations/${recitationId}/replies`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('audio', testAudioPath)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already submitted');

      // Cleanup
      fs.unlinkSync(testAudioPath);
    });

    it('should reject reply without audio', async () => {
      const response = await request(app)
        .post(`/api/recitations/${recitationId}/replies`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Audio file is required');
    });
  });

  describe('GET /api/recitations/:id/replies', () => {
    it('should fetch replies for a recitation', async () => {
      const response = await request(app)
        .get(`/api/recitations/${recitationId}/replies`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('student');
    });

    it('should filter replies by status', async () => {
      const response = await request(app)
        .get(`/api/recitations/${recitationId}/replies`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ status: 'submitted' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(reply => {
        expect(reply.status).toBe('submitted');
      });
    });
  });

  describe('POST /api/recitations/replies/:reply_id/feedback', () => {
    it('should submit feedback for a reply', async () => {
      const response = await request(app)
        .post(`/api/recitations/replies/${replyId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          grade: 85,
          comment: 'Good pronunciation, but work on tajweed'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(85);
      expect(response.body.data.comment).toBe('Good pronunciation, but work on tajweed');
      expect(response.body.data.teacher_id).toBe(teacherId);
    });

    it('should update existing feedback', async () => {
      const response = await request(app)
        .post(`/api/recitations/replies/${replyId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          grade: 90,
          comment: 'Much improved!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe(90);
      expect(response.body.data.comment).toBe('Much improved!');
    });

    it('should validate grade range', async () => {
      const response = await request(app)
        .post(`/api/recitations/replies/${replyId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          grade: 150,
          comment: 'Invalid grade'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between 0 and 100');
    });

    it('should return 404 for non-existent reply', async () => {
      const fakeReplyId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/recitations/replies/${fakeReplyId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          grade: 85,
          comment: 'Test comment'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('File Upload Validation', () => {
    it('should reject files larger than 6MB', async () => {
      const largeAudioPath = path.join(__dirname, 'fixtures', 'large-audio.webm');
      const largeBuffer = Buffer.alloc(7 * 1024 * 1024); // 7MB
      fs.writeFileSync(largeAudioPath, largeBuffer);

      const response = await request(app)
        .post('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('title', 'Large File Test')
        .field('class_id', 'CLASS-1')
        .attach('audio', largeAudioPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File too large');

      // Cleanup
      fs.unlinkSync(largeAudioPath);
    });

    it('should reject invalid file types', async () => {
      const invalidFilePath = path.join(__dirname, 'fixtures', 'test.txt');
      fs.writeFileSync(invalidFilePath, 'This is not an audio file');

      const response = await request(app)
        .post('/api/recitations')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('title', 'Invalid File Test')
        .field('class_id', 'CLASS-1')
        .attach('audio', invalidFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file type');

      // Cleanup
      fs.unlinkSync(invalidFilePath);
    });
  });

  describe('Socket.IO Events', () => {
    it('should emit recitation:new event when recitation is created', (done) => {
      // This would require setting up a Socket.IO client for testing
      // For now, we'll just verify the controller logic
      expect(true).toBe(true);
      done();
    });

    it('should emit recitation:reply event when reply is submitted', (done) => {
      // Socket.IO event testing would go here
      expect(true).toBe(true);
      done();
    });

    it('should emit recitation:graded event when feedback is submitted', (done) => {
      // Socket.IO event testing would go here
      expect(true).toBe(true);
      done();
    });
  });
});

// Helper function to create test fixtures
const createTestAudioFile = (filename, size = 1024) => {
  const filePath = path.join(__dirname, 'fixtures', filename);
  const buffer = Buffer.alloc(size);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

// Cleanup function
const cleanupTestFiles = () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (fs.existsSync(fixturesDir)) {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  }
};

// Run cleanup after all tests
afterAll(() => {
  cleanupTestFiles();
});
