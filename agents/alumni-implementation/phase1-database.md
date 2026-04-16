# Phase 1 — Database Schema (DBA Expert)

## Tasks

### 1. Extend `students` table

```sql
ALTER TABLE students
  ADD COLUMN status ENUM('active', 'graduated', 'withdrawn', 'transferred') NOT NULL DEFAULT 'active',
  ADD COLUMN status_date DATE NULL,
  ADD COLUMN status_reason VARCHAR(255) NULL;
```

### 2. Create `alumni` table

```sql
CREATE TABLE alumni (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  school_id VARCHAR(50) NOT NULL,
  branch_id VARCHAR(50) NOT NULL,
  graduation_year YEAR NOT NULL,
  last_class VARCHAR(50) NOT NULL DEFAULT 'SS3',
  certificate_number VARCHAR(100) NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

### 3. Create `student_status_log` table (audit trail)

```sql
CREATE TABLE student_status_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  school_id VARCHAR(50) NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  changed_by INT NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

### 4. Indexes for performance

```sql
CREATE INDEX idx_alumni_school_year ON alumni(school_id, graduation_year);
CREATE INDEX idx_students_status ON students(school_id, status);
CREATE INDEX idx_status_log_student ON student_status_log(student_id, school_id);
```

---

## Sample Queries

### Fetch all alumni for a school
```sql
SELECT s.first_name, s.last_name, s.admission_number,
       a.graduation_year, a.last_class, a.certificate_number
FROM alumni a
JOIN students s ON s.id = a.student_id
WHERE a.school_id = 'SCH/20'
ORDER BY a.graduation_year DESC;
```

### SS3 students eligible for graduation
```sql
SELECT id, first_name, last_name, admission_number
FROM students
WHERE school_id = 'SCH/20'
  AND class_name = 'SS3'
  AND status = 'active';
```

### Promote all JSS3 → SS1
```sql
UPDATE students
SET class_name = 'SS1'
WHERE school_id = 'SCH/20'
  AND class_name = 'JSS3'
  AND status = 'active';
```

### Alumni count by graduation year
```sql
SELECT graduation_year, COUNT(*) as total
FROM alumni
WHERE school_id = 'SCH/20'
GROUP BY graduation_year
ORDER BY graduation_year DESC;
```
