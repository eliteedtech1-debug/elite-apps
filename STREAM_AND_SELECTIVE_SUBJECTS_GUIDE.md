# 🎓 Stream & Selective Subjects - Complete Guide

**IMPORTANT:** This entire feature ONLY applies when `school.has_class_stream = 1`

---

## 🔥 Critical Understanding

### **When `school.has_class_stream = 0` (DISABLED):**
- ❌ NO stream filtering
- ❌ NO selective subject filtering
- ✅ ALL students see ALL subjects
- ✅ Works like a traditional school (no streams)

### **When `school.has_class_stream = 1` (ENABLED):**
- ✅ Stream filtering applies
- ✅ Selective subject filtering applies
- ✅ Students see subjects based on their stream
- ✅ Students only see selective subjects they selected

---

## 📊 How It Works (When ENABLED)

### **School Configuration**

```sql
-- Enable stream feature for a school
UPDATE school_setup
SET has_class_stream = 1
WHERE school_id = 'SCH001';

-- Disable stream feature for a school
UPDATE school_setup
SET has_class_stream = 0
WHERE school_id = 'SCH001';
```

---

## 🎯 Subject Types & Visibility

### **1. Core Subjects** (type='core')
**Always visible to ALL students** (regardless of stream)

```
Examples: English, Mathematics, Civic Education
Who sees it: Everyone
```

### **2. Selective Subjects** (type='selective')
**Only visible if student selected it**

```
Examples: Islamic Studies OR Hausa, French OR Arabic
Who sees it: Only students who selected it
How to assign: Via student_subjects table
```

### **3. Stream-Specific Subjects** (type='Science', 'Arts', etc.)
**Only visible to matching stream**

```
Examples:
- Physics (type='Science') → Only Science students
- Literature (type='Arts') → Only Arts students
- Accounting (type='Commercial') → Only Commercial students
```

### **4. General Stream Students** (student.stream='General')
**See ALL non-selective subjects**

```
See: Core + All stream subjects (Science, Arts, etc.)
Don't see: Non-selected selective subjects
```

---

## 🧪 Testing Scenarios

### **Scenario 1: School WITHOUT Stream Feature**

```sql
-- School setup
has_class_stream = 0

-- Expected behavior:
- Student A sees: English, Math, Physics, Chemistry, Islamic Studies, Hausa, French
- Student B sees: English, Math, Physics, Chemistry, Islamic Studies, Hausa, French
- ALL students see ALL subjects (no filtering)
```

### **Scenario 2: School WITH Stream Feature**

```sql
-- School setup
has_class_stream = 1

-- Class SS2 subjects:
English (core)
Mathematics (core)
Physics (Science)
Chemistry (Science)
Literature (Arts)
Government (Arts)
Islamic Studies (selective)
Hausa (selective)

-- Student A: stream='Science', selected Islamic Studies
Sees: English, Math, Physics, Chemistry, Islamic Studies
Doesn't see: Literature, Government, Hausa

-- Student B: stream='Arts', selected Hausa
Sees: English, Math, Literature, Government, Hausa
Doesn't see: Physics, Chemistry, Islamic Studies

-- Student C: stream='General', selected Islamic Studies
Sees: English, Math, Physics, Chemistry, Literature, Government, Islamic Studies
Doesn't see: Hausa (didn't select it)
```

---

## 🔍 Console Logs Reference

### **When Stream is DISABLED:**

```
[Stream Filter] School SCH001 has_class_stream: 0 → DISABLED
[Stream Filter] ⚠️ Stream filtering is DISABLED (has_class_stream = 0)
[Stream Filter] → Returning ALL subjects for all students (no stream/selective filtering)
[Stream Filter] → Student ADM001 will see all 12 subjects
```

### **When Stream is ENABLED:**

```
[Stream Filter] School SCH001 has_class_stream: 1 → ENABLED
[Stream Filter] ✅ Stream filtering is ENABLED (has_class_stream = 1)
[Stream Filter] Student ADM001 has stream: "Science"
[Stream Filter] Student ADM001 selected selective subjects: ["ISL101"]
[Stream Filter] Subject: "English" (ENG101), Type: "core" → ✅ INCLUDED
[Stream Filter] Subject: "Physics" (PHY101), Type: "Science" → ✅ INCLUDED
[Stream Filter] Subject: "Literature" (LIT101), Type: "Arts" → ❌ EXCLUDED
[Stream Filter] Selective Subject: "Islamic Studies" (ISL101) → ✅ INCLUDED (student selected it)
[Stream Filter] Selective Subject: "Hausa" (HAU101) → ❌ EXCLUDED (not selected)
[Stream Filter] ✅ Filtered 8 subjects out of 12 total subjects
```

---

## 🎓 Subject Filtering Decision Tree

```
Has stream enabled (has_class_stream = 1)?
│
├─ NO → Return ALL subjects
│       (End - no filtering)
│
└─ YES → Continue filtering
           │
           ├─ Is subject type = 'core'?
           │  └─ YES → INCLUDE (core subjects for everyone)
           │
           ├─ Is subject type = 'selective'?
           │  └─ YES → Check if student selected it
           │           ├─ Selected → INCLUDE
           │           └─ Not selected → EXCLUDE
           │
           ├─ Is student stream = 'General' or 'None'?
           │  └─ YES → INCLUDE (general students see all non-selective)
           │
           └─ Does subject type match student stream?
              ├─ YES → INCLUDE (e.g., Science student + Science subject)
              └─ NO → EXCLUDE (e.g., Science student + Arts subject)
```

---

## 📋 Database Schema

### **Required Tables:**

```sql
-- 1. School setup (enable/disable stream)
school_setup
├─ school_id
└─ has_class_stream (0 or 1) ← THIS CONTROLS EVERYTHING

-- 2. Students (with stream field)
students
├─ admission_no
├─ student_name
├─ stream (Science, Arts, General, etc.)
└─ current_class

-- 3. Subjects (with type field)
subjects
├─ subject_code
├─ subject_name
├─ type (core, selective, Science, Arts, etc.)
└─ class_code

-- 4. Student selective subjects (junction table)
student_subjects
├─ admission_no
├─ subject_code
├─ school_id
└─ branch_id
```

---

## ⚙️ Configuration Checklist

### **To Enable Stream Feature:**

```sql
-- Step 1: Enable stream for school
UPDATE school_setup
SET has_class_stream = 1
WHERE school_id = 'SCH001';

-- Step 2: Set student streams
UPDATE students
SET stream = 'Science'
WHERE admission_no = 'ADM001';

-- Step 3: Set subject types
UPDATE subjects
SET type = 'selective'
WHERE subject_code IN ('ISL101', 'HAU101');

UPDATE subjects
SET type = 'Science'
WHERE subject_code IN ('PHY101', 'CHE101', 'BIO101');

-- Step 4: Assign selective subjects to students
INSERT INTO student_subjects (admission_no, subject_code, school_id, branch_id)
VALUES ('ADM001', 'ISL101', 'SCH001', 'BRCH001');
```

### **To Disable Stream Feature:**

```sql
-- Just disable the flag - everything else can stay
UPDATE school_setup
SET has_class_stream = 0
WHERE school_id = 'SCH001';

-- Now ALL students see ALL subjects (filtering disabled)
```

---

## 🚨 Common Mistakes to Avoid

### **Mistake 1: Forgetting to set has_class_stream**

```sql
-- ❌ Wrong: Subject types set but has_class_stream = 0
-- Result: All students see all subjects (filtering ignored)

-- ✅ Correct: Set has_class_stream = 1
UPDATE school_setup SET has_class_stream = 1 WHERE school_id = 'SCH001';
```

### **Mistake 2: Not assigning selective subjects**

```sql
-- ❌ Wrong: Subject type='selective' but not assigned to student
-- Result: Student doesn't see the subject

-- ✅ Correct: Assign selective subject to student
INSERT INTO student_subjects (admission_no, subject_code, school_id)
VALUES ('ADM001', 'ISL101', 'SCH001');
```

### **Mistake 3: Using wrong subject types**

```sql
-- ❌ Wrong: type='elective' (unknown type)
-- Result: Subject might not show correctly

-- ✅ Correct: Use defined types
-- core, selective, Science, Arts, Commercial, Technical, etc.
```

---

## 🎯 Quick Reference

| School Setting | Student Stream | Subject Type | Visible? |
|---|---|---|---|
| `has_class_stream = 0` | Any | Any | ✅ YES (all subjects visible) |
| `has_class_stream = 1` | Science | core | ✅ YES |
| `has_class_stream = 1` | Science | Science | ✅ YES |
| `has_class_stream = 1` | Science | Arts | ❌ NO |
| `has_class_stream = 1` | Science | selective (selected) | ✅ YES |
| `has_class_stream = 1` | Science | selective (not selected) | ❌ NO |
| `has_class_stream = 1` | General | Science | ✅ YES |
| `has_class_stream = 1` | General | Arts | ✅ YES |
| `has_class_stream = 1` | General | selective (selected) | ✅ YES |
| `has_class_stream = 1` | General | selective (not selected) | ❌ NO |

---

## 🔧 Troubleshooting

### **Issue: All students seeing all subjects (when stream is enabled)**

**Check:**
```sql
-- Verify school has stream enabled
SELECT has_class_stream FROM school_setup WHERE school_id = 'SCH001';
-- Should return 1

-- Check browser console
-- Should see: "Stream filtering is ENABLED"
```

### **Issue: Students not seeing subjects they should**

**Check:**
```sql
-- Verify student has correct stream
SELECT admission_no, student_name, stream FROM students WHERE admission_no = 'ADM001';

-- Verify subject has correct type
SELECT subject_code, subject_name, type FROM subjects WHERE class_code = 'CLS0539';

-- For selective subjects, verify assignment
SELECT * FROM student_subjects WHERE admission_no = 'ADM001';
```

### **Issue: Stream disabled but subjects still filtered**

**Check:**
```javascript
// Open browser console and look for:
[Stream Filter] School SCH001 has_class_stream: 0 → DISABLED
[Stream Filter] ⚠️ Stream filtering is DISABLED

// If you see "ENABLED", check database:
SELECT has_class_stream FROM school_setup WHERE school_id = 'SCH001';
```

---

## 📞 Summary

✅ **Stream feature is controlled by ONE flag**: `school.has_class_stream`
✅ **When disabled (0)**: ALL students see ALL subjects
✅ **When enabled (1)**: Smart filtering based on stream + selective subjects
✅ **Selective subjects**: Require assignment via `student_subjects` table
✅ **Core subjects**: Always visible to everyone
✅ **General stream**: Sees all subjects except non-selected selective

**The system is now flexible, scalable, and respects school configuration!** 🎉
