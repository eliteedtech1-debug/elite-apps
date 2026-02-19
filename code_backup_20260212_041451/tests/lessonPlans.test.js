const request = require('supertest');
const app = require('../index');
const db = require('../models');
const jwt = require('jsonwebtoken');

describe('Lesson Plans API', () => {
  let teacherToken, adminToken;
  let teacherId = 1, adminId = 2;
  let lessonPlanId;

  beforeAll(async () => {
    // Create test tokens
    teacherToken = jwt.sign(
      { 
        id: teacherId, 
        user_type: 'Teacher', 
        school_id: 'SCH/18',
        branch_id: 'BRCH00025'
      },
      process.env.JWT_SECRET || 'test-secret'
    );
    
    adminToken = jwt.sign(
      { 
        id: adminId, 
        user_type: 'Admin', 
        school_id: 'SCH/18',
        branch_id: 'BRCH00025'
      },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Sync database
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/lesson-plans', () => {
    it('should create a new lesson plan', async () => {
      const lessonPlanData = {
        subject_code: 'MATH101',
        class_code: 'CLASS-1',
        topic: 'Introduction to Algebra',
        objectives: 'Students will understand basic algebraic concepts',
        content: 'Introduction to variables, constants, and basic operations',
        teaching_methods: 'Interactive teaching with examples',
        resources_needed: 'Whiteboard, markers, textbooks',
        assessment_methods: 'Quiz and homework',
        homework_assignment: 'Complete exercises 1-10',
        lesson_date: '2024-12-10',
        duration_minutes: 45
      };

      const response = await request(app)
        .post('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(lessonPlanData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.topic).toBe(lessonPlanData.topic);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.teacher_id).toBe(teacherId);

      lessonPlanId = response.body.data.id;
    });

    it('should reject lesson plan without required fields', async () => {
      const response = await request(app)
        .post('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          subject_code: 'MATH101'
          // Missing required fields
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized requests', async () => {
      await request(app)
        .post('/api/lesson-plans')
        .send({
          subject_code: 'MATH101',
          class_code: 'CLASS-1',
          topic: 'Test Topic',
          content: 'Test content',
          lesson_date: '2024-12-10'
        })
        .expect(401);
    });
  });

  describe('GET /api/lesson-plans', () => {
    it('should fetch lesson plans for teacher', async () => {
      const response = await request(app)
        .get('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('current_page');
      expect(response.body.pagination).toHaveProperty('total_items');
    });

    it('should filter lesson plans by status', async () => {
      const response = await request(app)
        .get('/api/lesson-plans?status=draft')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(plan => {
        expect(plan.status).toBe('draft');
      });
    });

    it('should filter lesson plans by date range', async () => {
      const response = await request(app)
        .get('/api/lesson-plans?date_from=2024-12-01&date_to=2024-12-31')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/lesson-plans/:id', () => {
    it('should fetch single lesson plan', async () => {
      const response = await request(app)
        .get(`/api/lesson-plans/${lessonPlanId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(lessonPlanId);
      expect(response.body.data.topic).toBe('Introduction to Algebra');
    });

    it('should return 404 for non-existent lesson plan', async () => {
      const response = await request(app)
        .get('/api/lesson-plans/99999')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/lesson-plans/:id', () => {
    it('should update lesson plan', async () => {
      const updateData = {
        topic: 'Advanced Algebra Concepts',
        objectives: 'Updated learning objectives'
      };

      const response = await request(app)
        .put(`/api/lesson-plans/${lessonPlanId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topic).toBe(updateData.topic);
      expect(response.body.data.objectives).toBe(updateData.objectives);
    });

    it('should not allow updating submitted lesson plan', async () => {
      // First submit the lesson plan
      await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      // Try to update submitted plan
      const response = await request(app)
        .put(`/api/lesson-plans/${lessonPlanId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ topic: 'Should not update' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/lesson-plans/:id/submit', () => {
    beforeEach(async () => {
      // Create a new draft lesson plan for each test
      const lessonPlanData = {
        subject_code: 'MATH102',
        class_code: 'CLASS-2',
        topic: 'Test Topic for Submission',
        content: 'Test content',
        lesson_date: '2024-12-11'
      };

      const response = await request(app)
        .post('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(lessonPlanData);

      lessonPlanId = response.body.data.id;
    });

    it('should submit lesson plan', async () => {
      const response = await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.submission_date).toBeTruthy();
    });

    it('should not allow submitting already submitted plan', async () => {
      // Submit first time
      await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      // Try to submit again
      const response = await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/lesson-plans/:id/review', () => {
    beforeEach(async () => {
      // Create and submit a lesson plan for review
      const lessonPlanData = {
        subject_code: 'MATH103',
        class_code: 'CLASS-3',
        topic: 'Test Topic for Review',
        content: 'Test content',
        lesson_date: '2024-12-12'
      };

      const createResponse = await request(app)
        .post('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(lessonPlanData);

      lessonPlanId = createResponse.body.data.id;

      // Submit the lesson plan
      await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`);
    });

    it('should approve lesson plan', async () => {
      const reviewData = {
        status: 'approved',
        admin_feedback: 'Well structured lesson plan'
      };

      const response = await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.admin_feedback).toBe(reviewData.admin_feedback);
    });

    it('should reject lesson plan', async () => {
      const reviewData = {
        status: 'rejected',
        admin_feedback: 'Needs more detailed objectives'
      };

      const response = await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.admin_feedback).toBe(reviewData.admin_feedback);
    });

    it('should validate review status', async () => {
      const response = await request(app)
        .post(`/api/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status');
    });
  });

  describe('DELETE /api/lesson-plans/:id', () => {
    it('should delete draft lesson plan', async () => {
      // Create a draft lesson plan
      const lessonPlanData = {
        subject_code: 'MATH104',
        class_code: 'CLASS-4',
        topic: 'Test Topic for Deletion',
        content: 'Test content',
        lesson_date: '2024-12-13'
      };

      const createResponse = await request(app)
        .post('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(lessonPlanData);

      const planId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/lesson-plans/${planId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should not allow deleting submitted lesson plan', async () => {
      // Create and submit a lesson plan
      const lessonPlanData = {
        subject_code: 'MATH105',
        class_code: 'CLASS-5',
        topic: 'Test Topic - Cannot Delete',
        content: 'Test content',
        lesson_date: '2024-12-14'
      };

      const createResponse = await request(app)
        .post('/api/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(lessonPlanData);

      const planId = createResponse.body.data.id;

      // Submit the plan
      await request(app)
        .post(`/api/lesson-plans/${planId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`);

      // Try to delete
      const response = await request(app)
        .delete(`/api/lesson-plans/${planId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/lesson-plans/stats', () => {
    it('should fetch lesson plan statistics', async () => {
      const response = await request(app)
        .get('/api/lesson-plans/stats')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('draft');
      expect(response.body.data).toHaveProperty('submitted');
      expect(response.body.data).toHaveProperty('approved');
      expect(response.body.data).toHaveProperty('rejected');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should filter stats by date range', async () => {
      const response = await request(app)
        .get('/api/lesson-plans/stats?date_from=2024-12-01&date_to=2024-12-31')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });
  });
});
