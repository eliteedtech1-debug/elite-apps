# Stream & Subject Assignment Implementation Report

**Date:** 2026-03-04  
**Feature:** Individual Student Stream & Subject Assignment for Mixed Classes  
**Status:** Planning Phase

---

## 📋 Executive Summary

Implement a comprehensive stream and subject assignment system that allows:
1. Individual stream assignment for students in Mixed classes
2. Automatic subject allocation based on stream rules
3. Manual selective subject assignment per student
4. Clear visibility of which subjects each student can access

---

## 🗄️ Current Database Schema Analysis

### 1. **students** Table
```sql
`stream` enum('Science','Commercial','Technical','Vocational','General','Mixed','None','Arts') 
  NOT NULL DEFAULT 'General'
```
- ✅ Already has stream column
- ✅ Supports all required stream types
- ✅ Default is 'General'

### 2. **classes** Table
```sql
`stream` enum('Science','Arts','Commercial','Technical','Vocational','General','Mixed','None','Selective') 
  DEFAULT 'General'
```
- ✅ Already has stream column
- ✅ Supports 'Mixed' for classes with multiple streams
- ✅ Supports 'Selective' for custom configurations

### 3. **subjects** Table
```sql
CREATE TABLE `subjects` (
  `subject_code` varchar(50) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `school_id` varchar(11) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `section` varchar(45) NOT NULL,
  `sub_section` varchar(50) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'core',  -- Stream indicator
  `class_code` varchar(50) NOT NULL,
  `is_elective` tinyint(1) DEFAULT 0,          -- ❌ DEPRECATED (all values = 0)
  `elective_group` varchar(45) DEFAULT NULL,   -- ❌ DEPRECATED (not used)
  `weekly_hours` decimal(3,1) DEFAULT 0.0,
  `branch_id` varchar(20) NOT NULL DEFAULT '',
  PRIMARY KEY (`subject`,`school_id`,`section`,`class_code`,`branch_id`),
  UNIQUE KEY `id` (`subject_code`)
)
```

**Key Findings:**
- ✅ `type` field is the ONLY stream classifier
- ✅ Current values: Core, Science, Arts, commercial, Technical, technology, Vocational, Selective, language, health
- ❌ `is_elective` = 0 for ALL 2,791 subjects (not used)
- ❌ `elective_group` is NULL for all subjects (not used)
- ⚠️ Inconsistent casing: 'Core' vs 'commercial', 'Science' vs 'technology'

### 4. **student_subjects** Table (Selective Subject Assignments ONLY)
```sql
CREATE TABLE `student_subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admission_no` varchar(50) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `class_code` varchar(50) NOT NULL,
  `school_id` varchar(50) NOT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_subject` (`admission_no`,`subject_code`,`school_id`)
)
```
- ✅ Stores ONLY selective subjects (manually assigned)
- ✅ General and stream-specific subjects are NOT stored here (auto-available)
- ✅ Has unique constraint to prevent duplicates
- ✅ Currently has 46 records

### 5. **subject_streams** Table (Subject-Stream Mapping)
```sql
CREATE TABLE `subject_streams` (
  `subject_code` varchar(50) NOT NULL,
  `stream` enum('Core','Science','Arts','Technical','Commercial','None') NOT NULL,
  PRIMARY KEY (`subject_code`,`stream`)
)
```
- ✅ Exists but currently EMPTY (0 records)
- ⚠️ Missing 'General' and 'Selective' in enum
- ⚠️ Not currently being used in the system

---

## 🔍 Current API Endpoints Analysis

### Existing Endpoints:

#### 1. **Update Student Stream**
```
POST /students/update-stream
```
**Controller:** `secondary_school_entrance_form.js:4389`  
**Function:** `updateStudentStream`

**Request Body:**
```json
{
  "admission_no": "PTS/1/0004",
  "stream": "Science",
  "branch_id": "BRCH00027"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student stream updated successfully",
  "data": {
    "admission_no": "PTS/1/0004",
    "stream": "Science",
    "student": { /* full student object */ }
  }
}
```

**Status:** ✅ Already implemented, only updates stream field

---

## 🎯 Subject Assignment Rules (To Be Implemented)

### Rule 1: General Subjects (Auto-Available)
**Definition:** Subjects with `type = 'General'` (formerly 'Core', 'language', 'health')  
**Assignment:** ALL students in the class get these subjects automatically  
**Storage:** NOT stored in `student_subjects` (auto-available based on class)  
**Examples:** Mathematics, English, Civic Education, Physical Education

### Rule 2: Stream-Specific Subjects (Auto-Available)
**Definition:** Subjects with `type IN ('Science', 'Arts', 'Commercial', 'Technical', 'Vocational')`  
**Assignment:** ONLY students with matching `student.stream` get these subjects  
**Storage:** NOT stored in `student_subjects` (auto-available based on stream match)  
**Examples:**
- Physics, Chemistry, Biology → Science stream only
- Literature, Government, CRS → Arts stream only
- Commerce, Accounting, Economics → Commercial stream only
- Technical Drawing, Woodwork → Technical stream only

### Rule 3: Selective Subjects (Manual Assignment)
**Definition:** Subjects with `type = 'Selective'`  
**Assignment:** Manually assigned per student via checkboxes in modal  
**Storage:** ONLY these are stored in `student_subjects` table  
**Examples:** Computer Science, Further Mathematics, Agricultural Science

**Note:** `is_elective` and `elective_group` columns are deprecated and should be ignored.

### Rule 4: Mixed Classes
**Definition:** Classes with `classes.stream = 'Mixed'`  
**Behavior:**
- Each student has their own `student.stream` value
- Student gets: General + Stream-specific (matching their stream) + Selective (manually assigned)

---

## 🛠️ Required Database Changes

### Standardize subjects.type Values

**Current Issues:**
- Inconsistent casing: 'Core' vs 'commercial', 'Science' vs 'technology'
- Non-standard values: 'language', 'health', 'technology'
- `is_elective` and `elective_group` columns are deprecated (not used)

**Standardization SQL:**
```sql
-- Standardize to proper case and valid stream types
UPDATE subjects SET type = 'General' WHERE type IN ('Core', 'core', 'language', 'health');
UPDATE subjects SET type = 'Commercial' WHERE type IN ('commercial', 'Commercial');
UPDATE subjects SET type = 'Technical' WHERE type IN ('Technical', 'technology');
UPDATE subjects SET type = 'Science' WHERE type = 'Science';
UPDATE subjects SET type = 'Arts' WHERE type = 'Arts';
UPDATE subjects SET type = 'Vocational' WHERE type = 'Vocational';
UPDATE subjects SET type = 'Selective' WHERE type = 'Selective';

-- Verify standardization
SELECT type, COUNT(*) as count FROM subjects GROUP BY type;
```

**Expected Result:**
- General (was: Core, language, health)
- Science
- Arts
- Commercial (was: commercial)
- Technical (was: Technical, technology)
- Vocational
- Selective

**Optional Cleanup (Future):**
```sql
-- Remove deprecated columns (after confirming not used anywhere)
ALTER TABLE subjects 
  DROP COLUMN is_elective,
  DROP COLUMN elective_group;
```

---

## 📡 Required API Endpoints

### 1. **Get Student Available Subjects** (NEW)
```
GET /students/:admission_no/available-subjects
```

**Purpose:** Get all subjects a student can access based on their stream

**Query Params:**
- `class_code` (required)
- `school_id` (from JWT)
- `branch_id` (from header)

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "admission_no": "PTS/1/0004",
      "name": "John Michael Doe",
      "stream": "Science",
      "class_code": "CLS0264"
    },
    "subjects": {
      "general": [
        {
          "subject_code": "SBJ001",
          "subject": "Mathematics",
          "type": "General",
          "reason": "All students"
        }
      ],
      "stream_specific": [
        {
          "subject_code": "SBJ002",
          "subject": "Physics",
          "type": "Science",
          "reason": "Matches student stream"
        }
      ],
      "selective": [
        {
          "subject_code": "SBJ003",
          "subject": "Computer Science",
          "type": "Selective",
          "is_assigned": true,
          "reason": "Individually assigned"
        }
      ]
    }
  }
}
```

**SQL Logic:**
```sql
-- General subjects (all students)
SELECT * FROM subjects 
WHERE class_code = ? 
  AND type = 'General'
  AND status = 'Active'

-- Stream-specific subjects (matching student stream)
SELECT * FROM subjects 
WHERE class_code = ? 
  AND type = ? -- student.stream (Science/Arts/Commercial/Technical/Vocational)
  AND status = 'Active'

-- Selective subjects (check student_subjects table)
SELECT s.*, 
  CASE WHEN ss.id IS NOT NULL THEN 1 ELSE 0 END as is_assigned
FROM subjects s
LEFT JOIN student_subjects ss 
  ON s.subject_code = ss.subject_code 
  AND ss.admission_no = ?
WHERE s.class_code = ? 
  AND s.type = 'Selective'
  AND s.status = 'Active'
```

---

### 2. **Assign Stream & Subjects** (NEW)
```
POST /students/assign-stream-subjects
```

**Purpose:** Update student stream and assign selective subjects in one transaction

**Request Body:**
```json
{
  "admission_no": "PTS/1/0004",
  "stream": "Science",
  "class_code": "CLS0264",
  "branch_id": "BRCH00027",
  "selective_subjects": ["SBJ003", "SBJ005"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stream and subjects assigned successfully",
  "data": {
    "student": {
      "admission_no": "PTS/1/0004",
      "stream": "Science"
    },
    "subjects_assigned": {
      "general": 5,
      "stream_specific": 8,
      "selective": 2,
      "total": 15
    }
  }
}
```

**Transaction Logic:**
```javascript
// 1. Update student stream
await student.update({ stream });

// 2. Clear existing selective subjects for this student
await db.query(`
  DELETE FROM student_subjects 
  WHERE admission_no = ? 
    AND school_id = ?
    AND class_code = ?
`, [admission_no, school_id, class_code]);

// 3. Insert new selective subjects ONLY (General and Stream-specific are auto-available)
if (selective_subjects.length > 0) {
  const values = selective_subjects.map(subject_code => 
    `('${admission_no}', '${subject_code}', '${class_code}', '${school_id}', '${branch_id}')`
  ).join(',');

  await db.query(`
    INSERT INTO student_subjects 
      (admission_no, subject_code, class_code, school_id, branch_id)
    VALUES ${values}
  `);
}
```

**Important:** Only selective subjects are stored in `student_subjects`. General and stream-specific subjects are automatically available and don't need database records.
  VALUES ${values}
`);
```

---

### 3. **Get Class Subjects by Stream** (NEW)
```
GET /classes/:class_code/subjects-by-stream
```

**Purpose:** Get all subjects grouped by stream for a class (used in modal)

**Response:**
```json
{
  "success": true,
  "data": {
    "class": {
      "class_code": "CLS0264",
      "class_name": "SS2 C",
      "stream": "Mixed"
    },
    "subjects_by_stream": {
      "General": [
        { "subject_code": "SBJ001", "subject": "Mathematics" }
      ],
      "Science": [
        { "subject_code": "SBJ002", "subject": "Physics" }
      ],
      "Arts": [
        { "subject_code": "SBJ010", "subject": "Literature" }
      ],
      "Selective": [
        { "subject_code": "SBJ003", "subject": "Computer Science" }
      ]
    }
  }
}
```

---

## 🎨 Frontend Implementation

### 1. **Update Assign Stream Modal**

**File:** `elscholar-ui/src/feature-module/peoples/students/student-list/index.tsx`

**Current State:**
- Modal exists with stream dropdown
- Only updates `student.stream` field
- No subject visibility

**Required Changes:**

```tsx
// State additions
const [availableSubjects, setAvailableSubjects] = useState({
  general: [],
  stream_specific: [],
  selective: []
});
const [selectedSelectiveSubjects, setSelectedSelectiveSubjects] = useState([]);

// Fetch subjects when stream changes
const handleStreamChange = async (stream) => {
  setSelectedStream(stream);
  
  // Fetch subjects for this stream
  const response = await _get(
    `classes/${student.class_code}/subjects-by-stream?stream=${stream}`
  );
  
  if (response.success) {
    setAvailableSubjects(response.data.subjects_by_stream);
  }
};

// Submit handler
const handleAssignStream = async () => {
  const payload = {
    admission_no: selectedStudent.admission_no,
    stream: selectedStream,
    class_code: selectedStudent.class_code,
    branch_id: selected_branch.branch_id,
    selective_subjects: selectedSelectiveSubjects
  };
  
  _post('students/assign-stream-subjects', payload, (res) => {
    if (res.success) {
      message.success('Stream and subjects assigned successfully');
      setStreamModalVisible(false);
      fetchStudents(); // Refresh list
    }
  });
};
```

**Modal UI Structure:**
```tsx
<Modal
  title={`Assign Stream for ${selectedStudent?.name}`}
  open={streamModalVisible}
  onCancel={() => setStreamModalVisible(false)}
  width={700}
  footer={[
    <Button key="cancel" onClick={() => setStreamModalVisible(false)}>
      Cancel
    </Button>,
    <Button key="submit" type="primary" onClick={handleAssignStream}>
      Assign Stream & Subjects
    </Button>
  ]}
>
  <Form layout="vertical">
    {/* Stream Selection */}
    <Form.Item label="Select Stream" required>
      <Select
        value={selectedStream}
        onChange={handleStreamChange}
        placeholder="Select stream"
      >
        <Option value="Science">Science</Option>
        <Option value="Arts">Arts</Option>
        <Option value="Commercial">Commercial</Option>
        <Option value="Technical">Technical</Option>
        <Option value="General">General</Option>
      </Select>
    </Form.Item>

    {/* Subject Preview */}
    <Divider>Subjects this student will have access to</Divider>

    {/* General Subjects */}
    <Card size="small" title="General Subjects (All Students)" style={{ marginBottom: 16 }}>
      {availableSubjects.general?.map(subject => (
        <Tag key={subject.subject_code} color="blue" style={{ marginBottom: 4 }}>
          ✓ {subject.subject}
        </Tag>
      ))}
    </Card>

    {/* Stream-Specific Subjects */}
    {selectedStream && availableSubjects[selectedStream]?.length > 0 && (
      <Card size="small" title={`${selectedStream} Stream Subjects`} style={{ marginBottom: 16 }}>
        {availableSubjects[selectedStream].map(subject => (
          <Tag key={subject.subject_code} color="green" style={{ marginBottom: 4 }}>
            ✓ {subject.subject}
          </Tag>
        ))}
      </Card>
    )}

    {/* Selective Subjects */}
    {availableSubjects.selective?.length > 0 && (
      <Card size="small" title="Optional Selective Subjects">
        <Checkbox.Group
          value={selectedSelectiveSubjects}
          onChange={setSelectedSelectiveSubjects}
          style={{ width: '100%' }}
        >
          <Row>
            {availableSubjects.selective.map(subject => (
              <Col span={24} key={subject.subject_code} style={{ marginBottom: 8 }}>
                <Checkbox value={subject.subject_code}>
                  {subject.subject}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Card>
    )}

    {/* Summary */}
    <Alert
      message={`Total Subjects: ${
        (availableSubjects.general?.length || 0) +
        (availableSubjects[selectedStream]?.length || 0) +
        selectedSelectiveSubjects.length
      }`}
      type="info"
      style={{ marginTop: 16 }}
    />
  </Form>
</Modal>
```

---

## 🧪 Testing Checklist

### Database Tests:
- [ ] Verify `subjects.type` values are standardized
- [ ] Check `student_subjects` table has correct indexes
- [ ] Test unique constraint on `student_subjects`

### API Tests:
- [ ] GET `/students/:admission_no/available-subjects` returns correct subjects
- [ ] POST `/students/assign-stream-subjects` updates stream and subjects
- [ ] Verify transaction rollback on error
- [ ] Test with different stream types (Science, Arts, Commercial)
- [ ] Test with Mixed class vs single-stream class

### Frontend Tests:
- [ ] Modal opens with current student data
- [ ] Stream dropdown shows all options
- [ ] Subjects update when stream changes
- [ ] Selective subjects can be checked/unchecked
- [ ] Submit button saves correctly
- [ ] Success message appears
- [ ] Student list refreshes with new stream

### Edge Cases:
- [ ] Student with no stream (default to General)
- [ ] Class with no selective subjects
- [ ] Student switching from one stream to another
- [ ] Selective subjects already assigned (should replace)
- [ ] Class with stream = 'Mixed' vs 'Science'

---

## 📦 Implementation Phases

### Phase 1: Database Standardization (1 hour)
1. Audit current `subjects.type` values
2. Standardize to: General, Science, Arts, Commercial, Technical, Selective
3. Add indexes if needed

### Phase 2: Backend API Development (4 hours)
1. Create `getStudentAvailableSubjects` controller
2. Create `assignStreamAndSubjects` controller
3. Create `getClassSubjectsByStream` controller
4. Add routes to `secondary_school_entrance_form.js`
5. Test with Postman/curl

### Phase 3: Frontend Modal Enhancement (3 hours)
1. Update modal state management
2. Add subject fetching logic
3. Build subject preview UI
4. Add selective subject checkboxes
5. Update submit handler

### Phase 4: Testing & Refinement (2 hours)
1. Test all scenarios
2. Fix bugs
3. Add loading states
4. Add error handling
5. User acceptance testing

**Total Estimated Time:** 10 hours

---

## 🚨 Critical Considerations

### 1. **Backward Compatibility**
- Existing students without stream should default to 'General'
- Existing `student_subjects` records should be preserved
- Classes without stream should default to 'General'

### 2. **Performance**
- Cache subject lists per class (Redis)
- Use indexes on `subjects.type` and `subjects.class_code`
- Batch insert for `student_subjects`

### 3. **Data Integrity**
- Use transactions for stream + subject assignment
- Validate stream matches class stream (if not Mixed)
- Prevent orphaned `student_subjects` records

### 4. **User Experience**
- Show loading state while fetching subjects
- Clear error messages for validation failures
- Confirmation before changing stream (if already assigned)
- Show subject count in summary

---

## 📝 SQL Queries Reference

### Get All Subjects for a Student
```sql
-- Combined query for all subject types
SELECT 
  s.subject_code,
  s.subject,
  s.type,
  CASE 
    WHEN s.type = 'General' THEN 'general'
    WHEN s.type = ? THEN 'stream_specific'  -- student.stream
    WHEN s.type = 'Selective' THEN 'selective'
    ELSE NULL
  END as category,
  ss.id IS NOT NULL as is_assigned
FROM subjects s
LEFT JOIN student_subjects ss 
  ON s.subject_code = ss.subject_code 
  AND ss.admission_no = ?
WHERE s.class_code = ?
  AND s.school_id = ?
  AND s.status = 'Active'
  AND (
    s.type = 'General'
    OR s.type = ?  -- student.stream
    OR s.type = 'Selective'
  )
ORDER BY s.type, s.subject
```

### Bulk Insert Selective Subjects
```sql
INSERT INTO student_subjects 
  (admission_no, subject_code, class_code, school_id, branch_id)
VALUES 
  (?, ?, ?, ?, ?),
  (?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE 
  updated_at = CURRENT_TIMESTAMP
```

---

## 🎯 Success Metrics

1. **Functionality:**
   - ✅ Students can be assigned individual streams
   - ✅ Subjects auto-populate based on stream
   - ✅ Selective subjects can be manually assigned
   - ✅ Modal shows clear subject breakdown

2. **Performance:**
   - ✅ Subject fetch < 500ms
   - ✅ Stream assignment < 1s
   - ✅ No N+1 queries

3. **User Experience:**
   - ✅ Clear visual distinction between subject types
   - ✅ No confusion about which subjects apply
   - ✅ Easy to assign selective subjects

---

## 📚 Related Files

### Backend:
- `elscholar-api/src/controllers/secondary_school_entrance_form.js` (existing)
- `elscholar-api/src/routes/secondary_school_entrance_form.js` (existing)
- `elscholar-api/src/controllers/studentSubjectsController.js` (NEW)

### Frontend:
- `elscholar-ui/src/feature-module/peoples/students/student-list/index.tsx` (modify)
- `elscholar-ui/src/feature-module/peoples/students/student-list/FormMasterStudentList.tsx` (modify)

### Database:
- `students` table (existing)
- `subjects` table (existing)
- `student_subjects` table (existing)
- `classes` table (existing)

---

**Report Generated:** 2026-03-04 17:52:05  
**Next Step:** Review and approve implementation plan
