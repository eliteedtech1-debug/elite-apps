/**
 * Syllabus API Test File
 * 
 * This file contains test examples for the new syllabus API endpoints.
 * Use these examples with Postman, curl, or any HTTP client.
 */

// ============================================================================
// 1. GET /api/v1/syllabus/topics - Get syllabus topics filtered by teacher assignments
// ============================================================================

/*
GET /api/v1/syllabus/topics
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Query Parameters (optional):
  - class_code: Filter by specific class
  - subject: Filter by specific subject
  - term: Filter by term (e.g., "First Term", "Second Term")
  - week: Filter by specific week number

Example Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subject": "Mathematics",
      "class_code": "JSS1A",
      "term": "First Term",
      "week": 1,
      "title": "Introduction to Algebra",
      "content": "Basic algebraic concepts and operations",
      "status": "Pending",
      "created_by": "teacher123",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "teacher_assignments": [
    {
      "class_code": "JSS1A",
      "subject": "Mathematics",
      "class_name": "JSS 1A"
    }
  ],
  "message": "Syllabus topics retrieved successfully"
}
*/

// ============================================================================
// 2. POST /api/v1/lesson-plans/generate - AI-powered lesson plan generation
// ============================================================================

/*
POST /api/v1/lesson-plans/generate
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "syllabus_topic_ids": [1, 2, 3],
  "class_code": "JSS1A",
  "subject_code": "MATH001",
  "duration_minutes": 40,
  "lesson_date": "2025-01-15",
  "title": "Introduction to Algebra - Week 1"
}

Example Response:
{
  "success": true,
  "data": {
    "lesson_plan": {
      "id": 123,
      "title": "Introduction to Algebra - Week 1",
      "teacher_id": 456,
      "school_id": "SCH/1",
      "branch_id": "BR001",
      "subject_code": "MATH001",
      "class_code": "JSS1A",
      "lesson_date": "2025-01-15T00:00:00.000Z",
      "duration_minutes": 40,
      "objectives": "1. Students will understand basic algebraic concepts...",
      "content": "Introduction to variables, constants, and expressions...",
      "activities": "1. Interactive demonstration with real-world examples...",
      "resources": "Whiteboard, algebra tiles, worksheets...",
      "assessment_methods": "Formative assessment through questioning...",
      "homework": "Complete exercises 1-10 from textbook...",
      "status": "draft",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    "syllabus_topics": [...],
    "ai_generated": true
  },
  "message": "AI-powered lesson plan generated successfully"
}
*/

// ============================================================================
// 3. GET /api/v1/syllabus/coverage - Calculate curriculum coverage
// ============================================================================

/*
GET /api/v1/syllabus/coverage
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Query Parameters (optional):
  - class_code: Filter by specific class
  - subject: Filter by specific subject
  - term: Filter by term
  - academic_year: Filter by academic year

Example Response:
{
  "success": true,
  "data": {
    "overall_coverage_percentage": 75,
    "total_topics": 40,
    "completed_topics": 30,
    "details": [
      {
        "class_code": "JSS1A",
        "class_name": "JSS 1A",
        "subject": "Mathematics",
        "total_topics": 20,
        "completed_topics": 15,
        "coverage_percentage": 75,
        "status": "Good"
      },
      {
        "class_code": "JSS1B",
        "class_name": "JSS 1B",
        "subject": "English",
        "total_topics": 20,
        "completed_topics": 15,
        "coverage_percentage": 75,
        "status": "Good"
      }
    ]
  },
  "message": "Curriculum coverage calculated successfully"
}
*/

// ============================================================================
// 4. PUT /api/v1/lesson-plans/:id/enhance - AI enhancement of existing plans
// ============================================================================

/*
PUT /api/v1/lesson-plans/123/enhance
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "enhancement_type": "technology"
}

Enhancement Types:
- "general": General improvements and modern teaching methods
- "technology": Add technology integration and digital tools
- "differentiation": Add strategies for diverse learners
- "assessment": Enhance assessment methods

Example Response:
{
  "success": true,
  "data": {
    "lesson_plan": {
      "id": 123,
      "title": "Introduction to Algebra - Week 1",
      "objectives": "Enhanced objectives with technology integration...",
      "content": "Updated content with digital resources...",
      "activities": "Interactive activities using tablets and apps...",
      "resources": "Digital whiteboard, algebra apps, online simulations...",
      "assessment_methods": "Digital quizzes and real-time feedback tools...",
      "homework": "Online practice exercises and video tutorials...",
      "status": "draft",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    "enhancement_type": "technology",
    "ai_enhanced": true
  },
  "message": "Lesson plan enhanced with technology improvements"
}
*/

// ============================================================================
// CURL Examples
// ============================================================================

/*
# 1. Get syllabus topics
curl -X GET "http://localhost:34567/api/v1/syllabus/topics?class_code=JSS1A" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 2. Generate AI lesson plan
curl -X POST "http://localhost:34567/api/v1/lesson-plans/generate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "syllabus_topic_ids": [1, 2],
    "class_code": "JSS1A",
    "subject_code": "MATH001",
    "duration_minutes": 40,
    "title": "Algebra Introduction"
  }'

# 3. Get curriculum coverage
curl -X GET "http://localhost:34567/api/v1/syllabus/coverage" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 4. Enhance lesson plan
curl -X PUT "http://localhost:34567/api/v1/lesson-plans/123/enhance" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enhancement_type": "technology"
  }'
*/

// ============================================================================
// Environment Variables Required
// ============================================================================

/*
Add to your .env file:
GEMINI_API_KEY=your_google_gemini_api_key_here

Get your API key from: https://makersuite.google.com/app/apikey
*/

module.exports = {
  // This file is for documentation purposes
  // The actual API endpoints are implemented in the controllers and routes
};