# 📚 Selective Subjects Setup Guide (Junction Table Implementation)

This guide explains how to set up and use the selective subjects feature, which allows students to choose between subjects like Islamic Studies OR Hausa.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Run Database Migration (1 min)

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api

# Run the migration
mysql -u root -p elite_db < database_migrations/create_student_subjects_table.sql
```

**What this creates:**
- `student_subjects` table (junction table for many-to-many relationship)
- Proper indexes for fast queries
- Unique constraint to prevent duplicate assignments

### Step 2: Restart Backend (1 min)

```bash
# If using PM2
pm2 restart elite

# OR if running manually
npm start
```

### Step 3: Build Frontend (3 min)

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-ui
npm run build
```

---

## 📊 How It Works

### Database Structure

```
students                    student_subjects                subjects
┌──────────────┐           ┌──────────────────┐          ┌──────────────┐
│ admission_no │◄─────────┤ admission_no     │          │ subject_code │
│ student_name │           │ subject_code     ├─────────►│ subject_name │
│ stream       │           │ school_id        │          │ type         │
└──────────────┘           │ branch_id        │          └──────────────┘
                           └──────────────────┘
```

**Example Data:**

```sql
-- Student ADM001 selects Islamic Studies and French
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id) VALUES
('ADM001', 'ISL101', 'SCH001', 'BRCH001'),
('ADM001', 'FRE102', 'SCH001', 'BRCH001');

-- Student ADM002 selects Hausa and French
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id) VALUES
('ADM002', 'HAU101', 'SCH001', 'BRCH001'),
('ADM002', 'FRE102', 'SCH001', 'BRCH001');
```

---

## 🎯 Subject Filtering Logic

When generating reports, subjects are filtered as follows:

### For Students with Stream Filtering ENABLED (`has_class_stream = 1`):

1. **Core Subjects** (type='core')
   - ✅ Shown to ALL students
   - Example: English, Mathematics

2. **Selective Subjects** (type='selective')
   - ✅ Shown ONLY if student selected it
   - ❌ Hidden if student didn't select it
   - Example: Student A selected Islamic Studies → sees it
   - Example: Student A did NOT select Hausa → doesn't see it

3. **Stream-Specific Subjects** (type='Science', 'Arts', etc.)
   - ✅ Shown only to students in matching stream
   - Example: Physics → only Science students see it

4. **General Stream Students**
   - ✅ See ALL subjects (Core + Stream-specific)
   - ⚠️ BUT selective subjects still require selection

### For Students with Stream Filtering DISABLED:
- ✅ See ALL subjects
- ⚠️ Selective subjects still require selection

---

## 🔧 API Endpoints

### 1. Get Student's Selective Subjects

```bash
GET /api/student-subjects/:admission_no
Headers: x-school-id: SCH001

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "admission_no": "ADM001",
      "subject_code": "ISL101",
      "subject_name": "Islamic Studies",
      "type": "selective",
      "created_at": "2025-01-15"
    }
  ]
}
```

### 2. Assign Selective Subjects to Student

```bash
POST /api/student-subjects
Headers: x-school-id: SCH001
Body:
{
  "admission_no": "ADM001",
  "subject_codes": ["ISL101", "FRE102"],
  "school_id": "SCH001",
  "branch_id": "BRCH001"
}

Response:
{
  "success": true,
  "message": "Successfully assigned 2 selective subjects to student ADM001"
}
```

### 3. Get All Students with Their Selective Subjects (for a class)

```bash
GET /api/student-subjects/class/:class_code?branch_id=BRCH001
Headers: x-school-id: SCH001

Response:
{
  "success": true,
  "data": [
    {
      "admission_no": "ADM001",
      "student_name": "Ahmad Ali",
      "stream": "Science",
      "selective_subject_codes": "ISL101,FRE102",
      "selective_subjects": "Islamic Studies, French"
    }
  ]
}
```

### 4. Remove a Selective Subject from Student

```bash
DELETE /api/student-subjects/:admission_no/:subject_code
Headers: x-school-id: SCH001

Response:
{
  "success": true,
  "message": "Subject removed successfully"
}
```

---

## 🧪 Testing

### Test Case 1: Islamic Studies vs Hausa

```sql
-- Setup: Create selective subjects
INSERT INTO subjects (subject_code, subject_name, type, class_code, school_id) VALUES
('ISL101', 'Islamic Studies', 'selective', 'CLS0539', 'SCH001'),
('HAU101', 'Hausa', 'selective', 'CLS0539', 'SCH001');

-- Student 1 selects Islamic Studies
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id) VALUES
('ADM001', 'ISL101', 'SCH001', 'BRCH00025');

-- Student 2 selects Hausa
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id) VALUES
('ADM002', 'HAU101', 'SCH001', 'BRCH00025');
```

**Expected Result:**
- Student 1's report: Shows Islamic Studies, does NOT show Hausa
- Student 2's report: Shows Hausa, does NOT show Islamic Studies

### Test Case 2: Multiple Selective Subjects

```sql
-- Student selects BOTH Islamic Studies AND French
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id) VALUES
('ADM003', 'ISL101', 'SCH001', 'BRCH00025'),
('ADM003', 'FRE102', 'SCH001', 'BRCH00025');
```

**Expected Result:**
- Student 3's report: Shows BOTH Islamic Studies AND French

---

## 🐛 Troubleshooting

### Issue 1: Selective subjects not showing

**Check:**
```sql
-- Verify student has selected subjects
SELECT * FROM student_subjects WHERE admission_no = 'ADM001';

-- Check if subject exists
SELECT * FROM subjects WHERE subject_code = 'ISL101';
```

**Solution:**
```sql
-- Assign selective subject to student
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id)
VALUES ('ADM001', 'ISL101', 'SCH001', 'BRCH00025');
```

### Issue 2: All selective subjects showing

**Check console logs:**
```
[Stream Filter] Student ADM001 selected selective subjects: ["ISL101"]
[Stream Filter] Selective Subject: "Islamic Studies" (ISL101) → INCLUDED (student selected it)
[Stream Filter] Selective Subject: "Hausa" (HAU101) → EXCLUDED (not selected)
```

**If logs show "None" or empty array:**
- Student data isn't being fetched from junction table
- Check that `fetchStudents()` is using new endpoint
- Verify backend API is working

### Issue 3: Backend API not found (404)

**Check:**
```bash
# Verify route is registered
grep -n "student-subjects" /Users/apple/Downloads/apps/elite/elscholar-api/src/index.js
```

**Should show:**
```
264:app.use('/api/student-subjects', require('./routes/studentSubjectsRoutes'));
```

**Solution:**
```bash
# Restart backend
pm2 restart elite
```

---

## 📝 How to Assign Selective Subjects to Students

### Method 1: Direct SQL (Quick for testing)

```sql
-- Assign Islamic Studies to student
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id)
VALUES ('YMA/1/0116', 'ISL101', 'SCH001', 'BRCH00025');

-- Assign Hausa to student
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id)
VALUES ('YMA/1/0117', 'HAU101', 'SCH001', 'BRCH00025');
```

### Method 2: Via API (Recommended for production)

```javascript
// Frontend code (to be added to student management UI)
const assignSelectiveSubjects = async (admissionNo, subjectCodes) => {
  await _post('student-subjects', {
    admission_no: admissionNo,
    subject_codes: subjectCodes,
    school_id: school.school_id,
    branch_id: selected_branch.branch_id
  });
};

// Example usage
assignSelectiveSubjects('YMA/1/0116', ['ISL101', 'FRE102']);
```

### Method 3: Bulk Assignment (For entire class)

```sql
-- Assign Islamic Studies to all students in class CLS0539
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id)
SELECT admission_no, 'ISL101', school_id, branch_id
FROM students
WHERE current_class = 'CLS0539'
  AND school_id = 'SCH001'
  AND branch_id = 'BRCH00025';
```

---

## 🎓 Console Logs to Verify It's Working

When generating a PDF, check browser console (F12) for:

```
✅ Students with selective subjects fetched: [...]
✅ Student streams breakdown: [{ name: "Ahmad", stream: "Science", selective_subjects: "Islamic Studies" }]
✅ [Stream Filter] Student ADM001 selected selective subjects: ["ISL101"]
✅ [Stream Filter] Selective Subject: "Islamic Studies" (ISL101) → INCLUDED (student selected it)
✅ [Stream Filter] Selective Subject: "Hausa" (HAU101) → EXCLUDED (not selected)
✅ [Stream Filter] Filtered 8 subjects out of 12 total subjects
```

---

## 🚀 Next Steps

1. ✅ Run database migration
2. ✅ Restart backend
3. ✅ Build frontend
4. ⏩ **Add UI for teachers/admins to assign selective subjects to students**
   - Suggested location: Student Management → Edit Student → Selective Subjects
   - Multi-select dropdown with subjects where `type='selective'`
5. ⏩ **Test with real data:**
   - Create Islamic Studies and Hausa as selective subjects
   - Assign different subjects to different students
   - Generate CA reports and verify correct subjects appear

---

## 🏆 Advantages of Junction Table Approach

✅ **Scalable**: Works for 1 or 1000 selective subjects
✅ **Fast**: Optimized with proper indexes
✅ **Data Integrity**: Foreign keys ensure valid data
✅ **Flexible**: Easy to add/remove subjects
✅ **Audit Trail**: Track when subjects were assigned
✅ **Industry Standard**: Proper database design
✅ **Future-Proof**: Easy to extend (e.g., track grades per subject)

---

## 📞 Support

If you encounter issues:

1. Check console logs (browser F12 and backend logs)
2. Verify database migration ran successfully
3. Ensure backend API endpoints are accessible
4. Test API endpoints with Postman/curl first

---

**Implementation Complete!** 🎉

The selective subjects feature is now ready to use. Students will only see subjects they've selected, and average calculations will only include those subjects.
