# V2 API Migration Guide for Frontend Developers

## Overview

The V2 API introduces a service layer architecture with improved security, validation, and maintainability. This guide helps you migrate from old endpoints to V2.

## Key Changes

### 1. Base URL
```javascript
// OLD
const url = '/lessons';

// NEW
const url = '/api/v2/lessons';
```

### 2. Authentication (No Change)
```javascript
// Still use JWT token in Authorization header
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 3. School/Branch Context (Automatic)
The frontend already sends these headers via `Helper.tsx`:
```javascript
// Already handled by Helper.tsx
headers: {
  'X-School-Id': user.school_id,      // From JWT (validated)
  'X-Branch-Id': selected_branch.id   // From Redux (flexible)
}
```

### 4. Response Format (Consistent)
```javascript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Error message"
}
```

## Migration Examples

### Lessons

#### Get All Lessons
```javascript
// OLD
const response = await axios.get('/lessons', {
  params: { class_code: 'JSS1A' }
});

// NEW
const response = await axios.get('/api/v2/lessons', {
  params: { class_code: 'JSS1A' }
});
```

#### Create Lesson
```javascript
// OLD
const response = await axios.post('/lessons', {
  title: 'Algebra',
  content: 'Introduction',
  class_code: 'JSS1A',
  subject_code: 'MATH101',
  school_id: user.school_id,  // ❌ Remove this
  branch_id: user.branch_id   // ❌ Remove this
});

// NEW
const response = await axios.post('/api/v2/lessons', {
  title: 'Algebra',
  content: 'Introduction',
  class_code: 'JSS1A',
  subject_code: 'MATH101',
  subject: 'Mathematics',      // ✅ Add display name
  lesson_date: '2026-02-15',
  academic_year: '2025/2026',  // ✅ Required
  term: 'Second Term',         // ✅ Required
  teacher_id: 'TCH001'
  // school_id and branch_id automatically added from JWT/headers
});
```

### Students

#### Get All Students
```javascript
// OLD
const response = await axios.get('/students', {
  params: { 
    school_id: user.school_id,  // ❌ Remove
    class_code: 'JSS1A' 
  }
});

// NEW
const response = await axios.get('/api/v2/students', {
  params: { 
    class_code: 'JSS1A',
    search: 'John'  // ✅ New: search by name or admission_no
  }
});
```

#### Create Student
```javascript
// NEW
const response = await axios.post('/api/v2/students', {
  admission_no: 'STD2026001',
  first_name: 'John',
  last_name: 'Doe',
  gender: 'Male',
  class_code: 'JSS1A',
  date_of_birth: '2010-05-15',
  parent_name: 'Jane Doe',
  parent_phone: '08012345678',
  parent_email: 'jane@example.com'
});
```

### Assignments

#### Get Assignments
```javascript
// NEW
const response = await axios.get('/api/v2/assignments', {
  params: {
    class_code: 'JSS1A',
    subject_code: 'MATH101',
    status: 'Active'
  }
});
```

#### Submit Assignment
```javascript
// NEW
const response = await axios.post(`/api/v2/assignments/${assignmentId}/submit`, {
  student_id: 'STD2026001',
  submission_text: 'My answer...',
  attachment_url: 'https://...'
});
```

### Attendance

#### Mark Attendance
```javascript
// NEW
const response = await axios.post('/api/v2/attendance', {
  student_id: 'STD2026001',
  class_code: 'JSS1A',
  date: '2026-02-12',
  status: 'Present',
  remarks: 'On time'
});
```

#### Bulk Mark Attendance
```javascript
// NEW
const response = await axios.post('/api/v2/attendance/bulk', {
  records: [
    { student_id: 'STD001', class_code: 'JSS1A', date: '2026-02-12', status: 'Present' },
    { student_id: 'STD002', class_code: 'JSS1A', date: '2026-02-12', status: 'Absent' }
  ]
});
```

### Classes

#### Get All Classes
```javascript
// NEW
const response = await axios.get('/api/v2/classes', {
  params: { academic_year: '2025/2026' }
});
```

#### Get Students in Class
```javascript
// NEW
const response = await axios.get(`/api/v2/classes/code/${classCode}/students`);
```

### Teachers

#### Get All Teachers
```javascript
// NEW
const response = await axios.get('/api/v2/teachers', {
  params: { 
    status: 'Active',
    search: 'John'
  }
});
```

#### Get Teacher's Classes
```javascript
// NEW
const response = await axios.get(`/api/v2/teachers/tid/${teacherId}/classes`);
```

## Error Handling

### Validation Errors
```javascript
try {
  await axios.post('/api/v2/lessons', data);
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error
    console.error('Validation:', error.response.data.error);
    // Example: "academic_year is required"
  }
}
```

### Authentication Errors
```javascript
try {
  await axios.get('/api/v2/lessons');
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired or invalid
    // Redirect to login
  }
}
```

### School Context Errors
```javascript
try {
  await axios.get('/api/v2/lessons');
} catch (error) {
  if (error.response?.status === 403) {
    // School ID mismatch
    console.error('Security:', error.response.data.error);
    // Example: "School ID mismatch: Cannot access different school data"
  }
}
```

## Helper Function (Recommended)

Create a wrapper for V2 API calls:

```javascript
// utils/apiV2.js
import axios from 'axios';

const apiV2 = axios.create({
  baseURL: '/api/v2',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically add auth token
apiV2.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiV2.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiV2;
```

Usage:
```javascript
import apiV2 from '@/utils/apiV2';

// Simple calls
const { data } = await apiV2.get('/lessons');
const { data } = await apiV2.post('/students', studentData);
```

## Migration Checklist

For each component:

- [ ] Change endpoint from `/resource` to `/api/v2/resource`
- [ ] Remove `school_id` and `branch_id` from request body (auto-added)
- [ ] Add required fields (check validators)
- [ ] Update error handling for 400/401/403 status codes
- [ ] Test with real data
- [ ] Verify multi-branch switching works (admin users)

## Available Endpoints

### Core Resources
- `/api/v2/lessons` - Lesson management
- `/api/v2/assignments` - Assignment & submissions
- `/api/v2/attendance` - Attendance tracking
- `/api/v2/syllabus` - Curriculum management

### Academic Resources
- `/api/v2/students` - Student enrollment
- `/api/v2/classes` - Class management
- `/api/v2/teachers` - Teacher management
- `/api/v2/subjects` - Subject management (coming soon)
- `/api/v2/exams` - Exam scheduling (coming soon)

### Documentation
- Swagger UI: `http://localhost:34567/api-docs`
- OpenAPI Spec: `/openapi-v2.yaml`

## Support

- Check Swagger UI for detailed endpoint documentation
- Review `AGENTS.md` for security patterns
- Contact backend team for issues

---

**Last Updated:** 2026-02-12  
**Version:** 2.0
