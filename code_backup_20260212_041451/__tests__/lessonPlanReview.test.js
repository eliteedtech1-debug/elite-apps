const request = require('supertest');
const { sequelize } = require('../config/database');
const { LessonPlan, LessonPlanReview } = require('../models');

describe('Lesson Plan Review API', () => {
  const mockToken = 'Bearer test-token';
  const adminHeaders = {
    'Authorization': mockToken,
    'x-user-type': 'admin',
    'x-user-id': '1',
    'x-school-id': 'SCH/23',
    'x-branch-id': 'BRCH/29'
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/v1/lesson-plans/:id/review', () => {
    let lessonPlanId;

    beforeEach(async () => {
      const plan = await LessonPlan.create({
        title: 'Test Lesson',
        subject_code: 'ENG',
        class_code: 'JSS1',
        teacher_id: 1,
        lesson_date: new Date(),
        status: 'submitted',
        school_id: 'SCH/23',
        branch_id: 'BRCH/29'
      });
      lessonPlanId = plan.id;
    });

    test('should approve lesson plan with remarks', async () => {
      const res = await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(adminHeaders)
        .send({
          status: 'approved',
          remarks: 'Good lesson plan'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });

    test('should reject lesson plan with remarks', async () => {
      const res = await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(adminHeaders)
        .send({
          status: 'rejected',
          remarks: 'Needs improvement'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('rejected');
    });

    test('should fail without remarks', async () => {
      const res = await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(adminHeaders)
        .send({
          status: 'approved',
          remarks: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should fail with remarks > 500 chars', async () => {
      const longRemarks = 'a'.repeat(501);
      const res = await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(adminHeaders)
        .send({
          status: 'approved',
          remarks: longRemarks
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should fail with invalid status', async () => {
      const res = await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(adminHeaders)
        .send({
          status: 'invalid',
          remarks: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should create audit log entry', async () => {
      await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(adminHeaders)
        .send({
          status: 'approved',
          remarks: 'Good'
        });

      const review = await LessonPlanReview.findOne({
        where: { lesson_plan_id: lessonPlanId }
      });

      expect(review).toBeDefined();
      expect(review.status).toBe('approved');
      expect(review.remark).toBe('Good');
      expect(review.reviewed_by).toBe(1);
    });

    test('should fail without admin role', async () => {
      const teacherHeaders = { ...adminHeaders, 'x-user-type': 'teacher' };
      const res = await request(app)
        .post(`/api/v1/lesson-plans/${lessonPlanId}/review`)
        .set(teacherHeaders)
        .send({
          status: 'approved',
          remarks: 'Good'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/lesson-plans/:id/reviews', () => {
    let lessonPlanId;

    beforeEach(async () => {
      const plan = await LessonPlan.create({
        title: 'Test Lesson',
        subject_code: 'ENG',
        class_code: 'JSS1',
        teacher_id: 1,
        lesson_date: new Date(),
        status: 'approved',
        school_id: 'SCH/23',
        branch_id: 'BRCH/29'
      });
      lessonPlanId = plan.id;

      await LessonPlanReview.create({
        lesson_plan_id: lessonPlanId,
        reviewed_by: 1,
        status: 'approved',
        remark: 'Good lesson'
      });
    });

    test('should fetch review history', async () => {
      const res = await request(app)
        .get(`/api/v1/lesson-plans/${lessonPlanId}/reviews`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('approved');
    });
  });
});
