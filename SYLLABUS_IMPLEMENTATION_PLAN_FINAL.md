# FINAL Syllabus Module Implementation Plan
**Based on ACTUAL Database Schema Analysis**

## ✅ **CONFIRMED Existing Tables (8 tables):**

### **1. users**
- **ID**: `int(11)` auto_increment
- **school_id**: `varchar(10)` (format: "SCH/1") ⚠️ Contains "/"
- **branch_id**: `varchar(20)` nullable
- **user_type**: `varchar(255)` (Teacher, Admin, etc.)

### **2. subjects** 
- **Composite Primary Key**: `(subject, school_id, section, class_code, branch_id)`
- **subject_code**: `varchar(50)` (e.g., "SBJ2108")
- **subject**: `varchar(100)` (e.g., "Mathematics")
- **school_id**: `varchar(11)` (e.g., "SCH/15")
- **branch_id**: `varchar(20)` (e.g., "BRCH00023")
- **class_code**: `varchar(50)` (e.g., "CLS0531")

### **3. classes**
- **ID**: `int(11)` auto_increment
- **class_code**: `varchar(30)` unique (e.g., "CLS0519")
- **class_name**: `varchar(100)` (e.g., "Year 5")
- **school_id**: `varchar(20)` (e.g., "SCH/15")
- **branch_id**: `varchar(20)` (e.g., "BRCH00024")

### **4. teacher_classes** ✅ CRITICAL
- **ID**: `int(11)` auto_increment
- **teacher_id**: `int(11)` → users.id
- **class_code**: `varchar(20)` → classes.class_code
- **subject_code**: `varchar(100)` → subjects.subject_code
- **school_id**: `varchar(20)`

### **5. school_setup** ✅ (singular, not plural)
- **school_id**: `varchar(20)` PRIMARY KEY (e.g., "SCH/1")
- **school_name**: `varchar(500)` (e.g., "ABC ACADEMY")
- **academic_year**: `varchar(20)`
- **term**: `enum('First term','Second term','Third term')`
- **status**: `varchar(20)`

### **6. school_locations** ✅
- **ID**: `int(11)` auto_increment
- **branch_id**: `varchar(20)` (e.g., "BRCH00001")
- **school_id**: `varchar(20)` (e.g., "SCH/1")
- **branch_name**: `varchar(50)` (e.g., "Main Branch")
- **status**: `enum('Active','Inactive')`

### **7. system_configs**
- Global system preferences

### **8. audit_logs**
- Audit trail system

## 🔧 **CORRECTED Model Design**

### **1. SyllabusTemplate Model**
```javascript
const SyllabusTemplate = sequelize.define('SyllabusTemplate', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  curriculum_code: { type: DataTypes.STRING, unique: true },
  
  // Reference actual subjects table structure
  subject_code: { type: DataTypes.STRING(50), allowNull: false },
  subject_name: { type: DataTypes.STRING(100), allowNull: false },
  
  // Reference actual classes table structure  
  class_code: { type: DataTypes.STRING(30), allowNull: false },
  class_name: { type: DataTypes.STRING(100), allowNull: false },
  
  term: { type: DataTypes.ENUM, values: ['First term', 'Second term', 'Third term'] },
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
  
  // Use actual school_id format from school_setup
  school_id: { type: DataTypes.STRING(20), allowNull: false }, // "SCH/1"
  branch_id: { type: DataTypes.STRING(20), allowNull: true }   // "BRCH00001"
});
```

### **2. LessonPlan Model**
```javascript
const LessonPlan = sequelize.define('LessonPlan', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  syllabus_template_id: { type: DataTypes.UUID, allowNull: false },
  
  // Reference actual users and teacher_classes
  teacher_id: { type: DataTypes.INTEGER, allowNull: false }, // users.id
  teacher_class_id: { type: DataTypes.INTEGER, allowNull: false }, // teacher_classes.id
  
  // Store codes as strings (not integers)
  class_code: { type: DataTypes.STRING(30), allowNull: false }, // classes.class_code
  subject_code: { type: DataTypes.STRING(50), allowNull: false }, // subjects.subject_code
  
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
  approved_by: { type: DataTypes.INTEGER }, // users.id
  rejection_reason: DataTypes.TEXT,
  ai_generated: { type: DataTypes.BOOLEAN, defaultValue: false },
  ai_model_used: DataTypes.STRING,
  
  // Use actual school_id format
  school_id: { type: DataTypes.STRING(20), allowNull: false }, // "SCH/1"
  branch_id: { type: DataTypes.STRING(20), allowNull: true }   // "BRCH00001"
});
```

### **3. Model Associations**
```javascript
// Link to actual table structures
User.hasMany(LessonPlan, { foreignKey: 'teacher_id', as: 'lesson_plans' });
User.hasMany(LessonPlan, { foreignKey: 'approved_by', as: 'approved_plans' });

// Use teacher_classes as bridge table
TeacherClass.hasMany(LessonPlan, { foreignKey: 'teacher_class_id' });
LessonPlan.belongsTo(TeacherClass, { foreignKey: 'teacher_class_id' });

// Syllabus associations
SyllabusTemplate.hasMany(LessonPlan, { foreignKey: 'syllabus_template_id' });
LessonPlan.belongsTo(SyllabusTemplate, { foreignKey: 'syllabus_template_id' });
LessonPlan.hasOne(LessonNote, { foreignKey: 'lesson_plan_id' });
LessonNote.belongsTo(LessonPlan, { foreignKey: 'lesson_plan_id' });

// Reference school_setup and school_locations by string IDs
// No direct foreign key constraints due to string format with "/"
```

## 🔧 **CORRECTED API Implementation**

### **Teacher Assignment Validation**
```javascript
const validateTeacherAssignment = async (req, res, next) => {
  const { subject_code, class_code } = req.body;
  
  // Query actual teacher_classes table structure
  const assignment = await sequelize.query(`
    SELECT tc.*, u.name as teacher_name 
    FROM teacher_classes tc
    JOIN users u ON tc.teacher_id = u.id
    WHERE tc.teacher_id = ? 
      AND tc.subject_code = ? 
      AND tc.class_code = ?
      AND tc.school_id = ?
  `, {
    replacements: [req.user.id, subject_code, class_code, req.user.school_id],
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

### **Syllabus Filtering by Teacher Assignments**
```javascript
const getSyllabusTemplates = async (req, res) => {
  const { subject_code, class_code, term, search } = req.query;
  
  // Get teacher's assignments from actual table structure
  const teacherAssignments = await sequelize.query(`
    SELECT DISTINCT tc.subject_code, tc.class_code, tc.subject, tc.class_name
    FROM teacher_classes tc
    WHERE tc.teacher_id = ? AND tc.school_id = ?
  `, {
    replacements: [req.user.id, req.user.school_id],
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

### **School Information Lookup**
```javascript
const getSchoolInfo = async (schoolId) => {
  const school = await sequelize.query(`
    SELECT * FROM school_setup WHERE school_id = ?
  `, {
    replacements: [schoolId],
    type: QueryTypes.SELECT
  });
  
  return school[0] || null;
};

const getBranchInfo = async (branchId) => {
  const branch = await sequelize.query(`
    SELECT * FROM school_locations WHERE branch_id = ?
  `, {
    replacements: [branchId],
    type: QueryTypes.SELECT
  });
  
  return branch[0] || null;
};
```

## ⚠️ **Critical URL Parameter Fixes**

### **Problem**: School IDs contain "/" which breaks URL routing
- `school_id: "SCH/1"` → Cannot use as `/api/schools/SCH/1`

### **Solutions**:
```javascript
// Option 1: Query parameters (RECOMMENDED)
// GET /api/syllabus/coverage?school_id=SCH%2F1&class_code=CLS0001

// Option 2: Base64 encoding for URLs
const encodeId = (id) => Buffer.from(id).toString('base64url');
const decodeId = (encoded) => Buffer.from(encoded, 'base64url').toString();

// URL: /api/syllabus/U0NILzE/coverage (SCH/1 encoded)

// Option 3: Replace "/" with "-" for URLs
const urlSafeId = (id) => id.replace(/\//g, '-');
const restoreId = (urlId) => urlId.replace(/-/g, '/');

// URL: /api/syllabus/SCH-1/coverage
```

## 📊 **Final Table Count: 14 Total**

### **Existing Tables (8):**
1. `users` - Authentication (id: int, school_id: varchar with "/")
2. `subjects` - Composite primary key, no integer ID
3. `classes` - Integer ID + class_code
4. `teacher_classes` - Teacher-subject-class assignments ✅
5. `school_setup` - School configuration (singular name)
6. `school_locations` - Branch management
7. `system_configs` - Global preferences
8. `audit_logs` - Audit trail

### **New Tables (6):**
1. `syllabus_templates` - NERDC curriculum
2. `lesson_plans` - Teacher planning
3. `lesson_notes` - Lesson content
4. `ai_usage_logs` - AI tracking
5. `lesson_attachments` - File uploads
6. `approval_workflows` - Approval process

## 🚨 **Implementation Warnings**

1. **String IDs with "/"**: Use query parameters or encoding for URLs
2. **Composite Keys**: Subjects table has no integer ID - validate manually
3. **Table Names**: `school_setup` (singular), not `school_setups`
4. **No Foreign Key Constraints**: String IDs prevent standard FK relationships
5. **Branch ID Nullable**: Handle cases where branch_id is null
6. **Manual Validation**: Must validate subject_code and class_code existence manually

This final plan accurately reflects the actual database structure and provides working solutions for the identified issues.
