# CORRECTED Syllabus Module Implementation Plan
**Based on Actual Database Schema Analysis**

## 🚨 **Critical Schema Corrections**

### **Actual Table Analysis Results:**

#### **1. USERS Table**
- **ID**: `int(11)` auto_increment ✅
- **school_id**: `varchar(10)` with format "SCH/1" ⚠️ 
- **branch_id**: `varchar(20)` nullable ⚠️
- **user_type**: `varchar(255)` (Teacher, Admin, etc.)

#### **2. SUBJECTS Table** 
- **NO integer ID** - Uses composite primary key ⚠️
- **Primary Key**: `(subject, school_id, section, class_code, branch_id)`
- **subject_code**: `varchar(50)` (e.g., "SBJ2108")
- **subject**: `varchar(100)` (e.g., "Mathematics")
- **school_id**: `varchar(11)` (e.g., "SCH/15")
- **branch_id**: `varchar(20)` (e.g., "BRCH00023")
- **class_code**: `varchar(50)` (e.g., "CLS0531")

#### **3. CLASSES Table**
- **ID**: `int(11)` auto_increment ✅
- **class_code**: `varchar(30)` unique (e.g., "CLS0519")
- **class_name**: `varchar(100)` (e.g., "Abdallah bin salman")
- **school_id**: `varchar(20)` (e.g., "SCH/15")
- **branch_id**: `varchar(20)` (e.g., "BRCH00024")

#### **4. TEACHER_CLASSES Table** ✅ EXISTS
- **ID**: `int(11)` auto_increment
- **teacher_id**: `int(11)` (references users.id)
- **class_code**: `varchar(20)` (references classes.class_code)
- **subject_code**: `varchar(100)` (references subjects.subject_code)
- **school_id**: `varchar(20)`

#### **5. MISSING TABLES**
- ❌ `school_setups` table does NOT exist
- ❌ `school_locations` table does NOT exist

## **🔧 Corrected Model Design**

### **1. SyllabusTemplate Model (CORRECTED)**
```javascript
const SyllabusTemplate = sequelize.define('SyllabusTemplate', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  curriculum_code: { type: DataTypes.STRING, unique: true },
  
  // CORRECTED: Reference actual subjects table structure
  subject_code: { type: DataTypes.STRING(50), allowNull: false }, // Links to subjects.subject_code
  subject_name: { type: DataTypes.STRING(100), allowNull: false }, // Store subject name
  
  // CORRECTED: Reference actual classes table structure  
  class_code: { type: DataTypes.STRING(30), allowNull: false }, // Links to classes.class_code
  class_name: { type: DataTypes.STRING(100), allowNull: false }, // Store class name
  
  term: { type: DataTypes.ENUM, values: ['FIRST', 'SECOND', 'THIRD'] },
  theme: DataTypes.STRING,
  topic: { type: DataTypes.STRING, allowNull: false },
  sub_topic: DataTypes.STRING,
  learning_objectives: DataTypes.JSON,
  recommended_periods: DataTypes.INTEGER,
  teaching_methods: DataTypes.JSON,
  instructional_materials: DataTypes.JSON,
  assessment_criteria: DataTypes.JSON,
  nerdc_page_reference: DataTypes.STRING,
  exam_priority: { type: DataTypes.ENUM, values: ['HIGH', 'MEDIUM', 'LOW'] },
  academic_year: DataTypes.STRING,
  status: { type: DataTypes.ENUM, values: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
  
  // CORRECTED: Use actual school_id format
  school_id: { type: DataTypes.STRING(20), allowNull: false }, // Format: "SCH/15"
  branch_id: { type: DataTypes.STRING(20), allowNull: true }   // Format: "BRCH00023"
});
```

### **2. LessonPlan Model (CORRECTED)**
```javascript
const LessonPlan = sequelize.define('LessonPlan', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  syllabus_template_id: { type: DataTypes.UUID, allowNull: false },
  
  // CORRECTED: Reference actual users and teacher_classes
  teacher_id: { type: DataTypes.INTEGER, allowNull: false }, // Links to users.id
  teacher_class_id: { type: DataTypes.INTEGER, allowNull: false }, // Links to teacher_classes.id
  
  // CORRECTED: Store codes as strings, not integers
  class_code: { type: DataTypes.STRING(30), allowNull: false }, // Links to classes.class_code
  subject_code: { type: DataTypes.STRING(50), allowNull: false }, // Links to subjects.subject_code
  
  planned_date: { type: DataTypes.DATEONLY, allowNull: false },
  duration_periods: { type: DataTypes.INTEGER, defaultValue: 1 },
  actual_delivery_date: DataTypes.DATEONLY,
  methodology: { type: DataTypes.ENUM, values: ['LECTURE', 'DEMONSTRATION', 'PROJECT_BASED', 'PLAY_WAY'] },
  instructional_materials_needed: DataTypes.JSON,
  differentiation_notes: DataTypes.TEXT,
  formative_assessment_plan: DataTypes.TEXT,
  summative_assessment_plan: DataTypes.TEXT,
  status: { type: DataTypes.ENUM, values: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED'] },
  submitted_at: DataTypes.DATE,
  approved_at: DataTypes.DATE,
  approved_by: { type: DataTypes.INTEGER }, // Links to users.id
  rejection_reason: DataTypes.TEXT,
  ai_generated: { type: DataTypes.BOOLEAN, defaultValue: false },
  ai_model_used: DataTypes.STRING,
  
  // CORRECTED: Use actual school_id format
  school_id: { type: DataTypes.STRING(20), allowNull: false },
  branch_id: { type: DataTypes.STRING(20), allowNull: true }
});
```

### **3. Corrected Associations**
```javascript
// CORRECTED: Link to actual table structures
User.hasMany(LessonPlan, { foreignKey: 'teacher_id', as: 'lesson_plans' });
User.hasMany(LessonPlan, { foreignKey: 'approved_by', as: 'approved_plans' });

// CORRECTED: No direct Subject/Class model associations (composite keys)
// Instead, use string references to codes

TeacherClass.hasMany(LessonPlan, { foreignKey: 'teacher_class_id' });
LessonPlan.belongsTo(TeacherClass, { foreignKey: 'teacher_class_id' });

SyllabusTemplate.hasMany(LessonPlan, { foreignKey: 'syllabus_template_id' });
LessonPlan.belongsTo(SyllabusTemplate, { foreignKey: 'syllabus_template_id' });
```

## **🔧 Corrected API Implementation**

### **Teacher Assignment Validation (CORRECTED)**
```javascript
const validateTeacherAssignment = async (req, res, next) => {
  const { subject_code, class_code } = req.body;
  
  // CORRECTED: Query actual teacher_classes table structure
  const assignment = await sequelize.query(`
    SELECT tc.*, u.name as teacher_name 
    FROM teacher_classes tc
    JOIN users u ON tc.teacher_id = u.id
    WHERE tc.teacher_id = :teacher_id 
      AND tc.subject_code = :subject_code 
      AND tc.class_code = :class_code
      AND tc.school_id = :school_id
  `, {
    replacements: {
      teacher_id: req.user.id,
      subject_code,
      class_code,
      school_id: req.user.school_id
    },
    type: QueryTypes.SELECT
  });
  
  if (!assignment.length) {
    return res.status(403).json({
      success: false,
      message: 'You are not assigned to teach this subject/class combination'
    });
  }
  
  req.teacherAssignment = assignment[0];
  next();
};
```

### **Syllabus Filtering (CORRECTED)**
```javascript
const getSyllabusTemplates = async (req, res) => {
  const { subject_code, class_code, term, search } = req.query;
  
  // CORRECTED: Get teacher's assignments from actual table structure
  const teacherAssignments = await sequelize.query(`
    SELECT DISTINCT tc.subject_code, tc.class_code, tc.subject, tc.class_name
    FROM teacher_classes tc
    WHERE tc.teacher_id = :teacher_id 
      AND tc.school_id = :school_id
  `, {
    replacements: {
      teacher_id: req.user.id,
      school_id: req.user.school_id
    },
    type: QueryTypes.SELECT
  });
  
  const assignedSubjectCodes = teacherAssignments.map(tc => tc.subject_code);
  const assignedClassCodes = teacherAssignments.map(tc => tc.class_code);
  
  const where = { 
    school_id: req.user.school_id,
    subject_code: { [Op.in]: assignedSubjectCodes },
    class_code: { [Op.in]: assignedClassCodes },
    status: 'PUBLISHED'
  };
  
  if (subject_code) where.subject_code = subject_code;
  if (class_code) where.class_code = class_code;
  if (term) where.term = term;
  if (search) {
    where[Op.or] = [
      { topic: { [Op.like]: `%${search}%` } },
      { sub_topic: { [Op.like]: `%${search}%` } }
    ];
  }
  
  const templates = await SyllabusTemplate.findAll({
    where,
    order: [['topic', 'ASC']]
  });
  
  res.json({ success: true, data: templates });
};
```

## **🚨 Critical URL Parameter Fixes**

### **Problem**: School IDs contain "/" which breaks URL params
- `school_id: "SCH/15"` → Cannot use as URL parameter `/api/schools/SCH/15`

### **Solution**: Use query parameters or encode IDs
```javascript
// WRONG: /api/syllabus/SCH/15/coverage
// RIGHT: /api/syllabus/coverage?school_id=SCH%2F15

// OR use base64 encoding for URLs
const encodeSchoolId = (schoolId) => Buffer.from(schoolId).toString('base64');
const decodeSchoolId = (encoded) => Buffer.from(encoded, 'base64').toString();

// URL: /api/syllabus/U0NILzE1/coverage (SCH/15 encoded)
```

## **📊 Updated Table Count**

### **Existing Tables (7 confirmed):**
1. `users` - Authentication (id: int, school_id: varchar with "/")
2. `subjects` - Composite primary key, no integer ID
3. `classes` - Integer ID + class_code
4. `teacher_classes` - Teacher-subject-class assignments ✅
5. `system_configs` - Global preferences
6. `audit_logs` - Audit trail  
7. `user_roles` - Permission management

### **New Tables (6):**
1. `syllabus_templates` - NERDC curriculum
2. `lesson_plans` - Teacher planning
3. `lesson_notes` - Lesson content
4. `ai_usage_logs` - AI tracking
5. `lesson_attachments` - File uploads
6. `approval_workflows` - Approval process

### **Missing Tables (Handle Gracefully):**
- `school_setups` - Does not exist, use school_id directly
- `school_locations` - Does not exist, use branch_id directly

## **⚠️ Implementation Warnings**

1. **No Foreign Key Constraints**: Subjects table uses composite keys - validate manually
2. **String IDs with Special Characters**: School IDs contain "/" - use query params
3. **No School Setup Table**: Reference schools by ID only
4. **Branch ID Nullable**: Handle cases where branch_id is null
5. **Subject-Class Relationship**: Many-to-many through teacher_classes table

This corrected plan reflects the actual database structure and avoids the pitfalls of assuming standard integer foreign keys and simple table relationships.
