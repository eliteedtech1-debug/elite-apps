# Teachers Table Structure - COMPLETE REFERENCE ✅

## 📊 ACTUAL TABLE STRUCTURE

Based on the database schema, here is the **actual** teachers table structure:

---

## 🗂️ Teachers Table Columns

### Primary Key
- **id** - Primary key (auto-increment)

### User & Authentication
- **user_id** - Links to users table
- **status** - Active/Inactive
- **user_type** - Teacher/Admin/etc
- **last_activity** - Last login timestamp

### Personal Information
- **name** - Full name (NOT first_name/last_name)
- **sex** - Male/Female
- **age** - Age
- **date_of_birth** - DOB
- **marital_status** - Single/Married/etc
- **state_of_origin** - State
- **religion** - Religion

### Contact Information
- **mobile_no** - Phone number
- **email** - Email address
- **address** - Physical address

### Professional Information
- **staff_type** - Academic Staff/Non-Academic Staff
- **staff_role** - Subject Teacher/Form Master/etc
- **qualification** - NCE/B.Ed/M.Ed/etc
- **working_experience** - Years of experience
- **last_place_of_work** - Previous employer

### School Assignment
- **school_id** - School identifier
- **branch_id** - Branch identifier
- **grade_id** - Grade/Level
- **step** - Step in grade

### Financial
- **account_name** - Bank account name
- **account_number** - Bank account number
- **bank** - Bank name
- **payroll_status** - Enrolled/Suspended/etc

### Documents
- **passport_url** - Profile picture URL
- **digital_signature** - Digital signature

### Dates
- **date_enrolled** - Enrollment date
- **date_suspended** - Suspension date (if any)
- **created_at** - Record creation
- **updated_at** - Last update

### Soft Delete
- **is_deleted** - 0 (active) or 1 (deleted)
- **deleted_at** - Deletion timestamp
- **deleted_by** - Who deleted

---

## ⚠️ IMPORTANT NOTES

### What DOES NOT Exist
```
❌ teacher_id (column doesn't exist)
❌ first_name (column doesn't exist)
❌ last_name (column doesn't exist)
❌ full_name (column doesn't exist)
❌ designation (column doesn't exist)
❌ role (column doesn't exist)
❌ department (column doesn't exist)
❌ profile_picture (column doesn't exist)
```

### What DOES Exist
```
✅ id (primary key)
✅ name (full name)
✅ staff_role (role/position)
✅ staff_type (type of staff)
✅ passport_url (profile picture)
✅ qualification (education level)
```

---

## 🔧 CORRECT QUERIES

### Select All Teachers
```sql
SELECT 
  id,
  user_id,
  name,
  sex,
  mobile_no,
  email,
  staff_type,
  staff_role,
  qualification,
  passport_url,
  school_id,
  branch_id,
  status,
  is_deleted
FROM teachers
WHERE school_id = 'SCH/1'
  AND branch_id = 'BRCH00001'
  AND is_deleted = 0
ORDER BY name ASC;
```

### Select Teacher by ID
```sql
SELECT * FROM teachers
WHERE id = 1
  AND is_deleted = 0;
```

### Select Active Teachers
```sql
SELECT * FROM teachers
WHERE status = 'Active'
  AND is_deleted = 0
  AND school_id = 'SCH/1';
```

---

## 🔄 FIELD MAPPINGS

### For API Responses

When returning data to frontend, map the columns:

```javascript
// Backend mapping
const teacherData = {
  teacher_id: teacher.id,           // ✅ Map id to teacher_id
  full_name: teacher.name,          // ✅ Map name to full_name
  profile_picture: teacher.passport_url,  // ✅ Map passport_url
  designation: teacher.staff_role,  // ✅ Map staff_role to designation
  role: teacher.staff_type,         // ✅ Map staff_type to role
  department: teacher.staff_type,   // ✅ Use staff_type as department
  // ... other fields
};
```

### Example Mapping Function
```javascript
function mapTeacherForAPI(teacher) {
  return {
    id: teacher.id,
    teacher_id: teacher.id,
    user_id: teacher.user_id,
    name: teacher.name,
    full_name: teacher.name,
    first_name: teacher.name.split(' ')[0] || '',
    last_name: teacher.name.split(' ').slice(1).join(' ') || '',
    email: teacher.email,
    mobile_no: teacher.mobile_no,
    phone: teacher.mobile_no,
    sex: teacher.sex,
    gender: teacher.sex,
    address: teacher.address,
    date_of_birth: teacher.date_of_birth,
    profile_picture: teacher.passport_url,
    img: teacher.passport_url,
    designation: teacher.staff_role,
    role: teacher.staff_type,
    department: teacher.staff_type,
    qualification: teacher.qualification,
    school_id: teacher.school_id,
    branch_id: teacher.branch_id,
    status: teacher.status,
    is_deleted: teacher.is_deleted,
    created_at: teacher.created_at,
    updated_at: teacher.updated_at
  };
}
```

---

## 📋 SAMPLE DATA

### Teacher 1
```json
{
  "id": 1,
  "user_id": 737,
  "name": "Ishaq Ibrahim",
  "sex": "Male",
  "mobile_no": "07035384184",
  "email": "ishaqb93@gmail.com",
  "staff_type": "Academic Staff",
  "staff_role": "Subject Teacher",
  "qualification": "NCE",
  "passport_url": null,
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "status": "Active",
  "is_deleted": 0
}
```

### Teacher 2
```json
{
  "id": 2,
  "user_id": 738,
  "name": "HALIFSA NAGUDU",
  "sex": "Male",
  "mobile_no": "0809874388",
  "email": "halifa1@gmail.com",
  "staff_type": "Academic Staff",
  "staff_role": "Form Master",
  "passport_url": "https://avatar.iran.liara.run/public/job/teacher/m...",
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "status": "Active",
  "is_deleted": 0
}
```

---

## 🔧 ATTENDANCE QUERY FIX

### Correct Query for Attendance
```sql
SELECT 
  sa.*,
  t.name as staff_name,
  t.id as teacher_id,
  t.staff_role as designation,
  t.staff_type as role,
  t.passport_url as profile_picture,
  u.email
FROM staff_attendance sa
LEFT JOIN teachers t ON sa.staff_id = t.id
LEFT JOIN users u ON sa.user_id = u.id
WHERE sa.school_id = :school_id
  AND sa.date = :date
ORDER BY sa.check_in_time DESC;
```

---

## ✅ VERIFICATION CHECKLIST

### Column Names
- [x] Use `id` not `teacher_id`
- [x] Use `name` not `full_name` or `first_name`
- [x] Use `staff_role` not `designation`
- [x] Use `staff_type` not `role` or `department`
- [x] Use `passport_url` not `profile_picture`

### Joins
- [x] Join on `t.id` not `t.teacher_id`
- [x] Reference `sa.staff_id = t.id`

### Filters
- [x] Filter by `is_deleted = 0`
- [x] Filter by `status = 'Active'`
- [x] Filter by `school_id` and `branch_id`

---

## 🎯 COMMON MISTAKES TO AVOID

### ❌ Wrong
```sql
SELECT teacher_id, full_name, designation, role, profile_picture
FROM teachers;
```

### ✅ Correct
```sql
SELECT id, name, staff_role, staff_type, passport_url
FROM teachers;
```

### ❌ Wrong Join
```sql
LEFT JOIN teachers t ON sa.staff_id = t.teacher_id
```

### ✅ Correct Join
```sql
LEFT JOIN teachers t ON sa.staff_id = t.id
```

---

## 📊 RELATIONSHIPS

### Teachers → Users
```sql
SELECT t.*, u.email, u.username
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id;
```

### Teachers → Attendance
```sql
SELECT t.name, sa.date, sa.check_in_time, sa.status
FROM teachers t
LEFT JOIN staff_attendance sa ON sa.staff_id = t.id
WHERE t.id = 1;
```

---

## 🎉 SUMMARY

### Actual Table Structure
- **Primary Key**: `id` (not `teacher_id`)
- **Name Field**: `name` (not `full_name`)
- **Role Field**: `staff_role` (not `designation`)
- **Type Field**: `staff_type` (not `role`)
- **Picture Field**: `passport_url` (not `profile_picture`)

### Always Use
```sql
✅ t.id
✅ t.name
✅ t.staff_role
✅ t.staff_type
✅ t.passport_url
✅ t.is_deleted = 0
```

### Never Use
```sql
❌ t.teacher_id
❌ t.full_name
❌ t.designation
❌ t.role
❌ t.profile_picture
```

---

**Reference Date**: December 2024  
**Status**: ✅ VERIFIED  
**Source**: Actual database schema  

---

**Always refer to this document when writing queries for the teachers table!** 📚
