# 🚀 Quick Start Guide - Elite Core V2 API

## Step 1: Login First! 🔐

**You MUST login before using any other endpoints.**

### Using Swagger UI (Easiest)

1. Open: http://localhost:34567/api-docs

2. Find **"Authentication"** section (at the top)

3. Click on **"POST /auth/login"**

4. Click **"Try it out"**

5. Enter your credentials:
   ```json
   {
     "email": "your-email@school.com",
     "password": "your-password"
   }
   ```

6. Click **"Execute"**

7. Copy the **token** from the response

8. Click the **"Authorize"** button (top right, green lock icon)

9. Paste token in format: `Bearer YOUR_TOKEN_HERE`

10. Click **"Authorize"**

11. ✅ Now you can try all other endpoints!

---

## Step 2: Test V2 Endpoints

### Using Swagger UI

After authorization, try any endpoint:

**Example: Get Lessons**
1. Go to **"Lessons"** section
2. Click **"GET /api/v2/lessons"**
3. Click **"Try it out"**
4. Fill in headers:
   - X-School-Id: `SCH/20`
   - X-Branch-Id: `BRCH00027`
5. Click **"Execute"**
6. See results!

---

## Step 3: Using cURL

### 1. Login
```bash
curl -X POST http://localhost:34567/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "teacher@school.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "teacher@school.com",
    "school_id": "SCH/20",
    "branch_id": "BRCH00027"
  }
}
```

### 2. Copy the Token

Copy the entire token value (starts with `eyJ...`)

### 3. Use Token in Requests

```bash
# Get Lessons
curl -X GET 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027'

# Create Lesson
curl -X POST 'http://localhost:34567/api/v2/lessons' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Introduction to Algebra",
    "content": "Basic algebraic concepts",
    "class_code": "JSS1A",
    "subject_code": "MATH101",
    "lesson_date": "2026-02-15"
  }'

# Mark Attendance
curl -X POST 'http://localhost:34567/api/v2/attendance/mark' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'X-School-Id: SCH/20' \
  -H 'X-Branch-Id: BRCH00027' \
  -H 'Content-Type: application/json' \
  -d '{
    "student_id": 101,
    "class_code": "JSS1A",
    "date": "2026-02-12",
    "status": "Present"
  }'
```

---

## Common Issues

### ❌ "Unauthorized"
**Problem:** No token or invalid token

**Solution:**
1. Login first to get token
2. Make sure token is in format: `Bearer YOUR_TOKEN`
3. Check token hasn't expired

### ❌ "X-School-Id header required"
**Problem:** Missing multi-tenant headers

**Solution:** Add these headers to ALL requests:
```
X-School-Id: SCH/20
X-Branch-Id: BRCH00027
```

### ❌ "Validation error"
**Problem:** Missing required fields or invalid data

**Solution:** Check OpenAPI docs for required fields:
- http://localhost:34567/api-docs
- Look at the schema for each endpoint

---

## Testing Checklist

### ✅ Authentication
- [ ] Login successfully
- [ ] Get valid JWT token
- [ ] Token works in Swagger UI
- [ ] Token works in cURL

### ✅ Lessons
- [ ] Get all lessons
- [ ] Create new lesson
- [ ] Get lesson by ID
- [ ] Update lesson
- [ ] Delete lesson
- [ ] Add comment
- [ ] Get comments

### ✅ Assignments
- [ ] Get all assignments
- [ ] Create assignment
- [ ] Submit assignment
- [ ] Grade submission

### ✅ Attendance
- [ ] Mark single attendance
- [ ] Bulk mark attendance
- [ ] Get attendance stats
- [ ] Get class attendance
- [ ] Get student history

### ✅ Syllabus
- [ ] Get all syllabus
- [ ] Create syllabus
- [ ] Update syllabus

---

## Quick Reference

### Base URLs
- **API:** http://localhost:34567/api/v2
- **Docs:** http://localhost:34567/api-docs
- **Auth:** http://localhost:34567/auth/login

### Required Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
X-School-Id: SCH/20
X-Branch-Id: BRCH00027
Content-Type: application/json
```

### Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Next Steps

1. ✅ Login and get token
2. ✅ Test endpoints in Swagger UI
3. ✅ Verify data in database
4. ✅ Update frontend to use V2 API
5. ✅ Monitor for issues

---

**Need Help?**
- Check: http://localhost:34567/api-docs
- Read: API_DOCUMENTATION.md
- Review: ACTIONABLE_ROADMAP.md

**Happy Testing! 🚀**
