# Phase 1: Database & Backend Architecture Enhancement

**Team Lead**: DBA Expert  
**Duration**: Weeks 1-2  
**Dependencies**: None  
**Deliverables**: Enhanced schema, role system, APIs

---

## Task 1: Enhanced Teacher Roles Schema

### 1.1 Create Enhanced Roles Table
```sql
-- Enhanced teacher roles with granular permissions
CREATE TABLE teacher_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  role_type ENUM(
    'Form Master', 'Subject Teacher', 'Curriculum Designer',
    'Department Head', 'Mentor Teacher', 'Content Reviewer',
    'Senior Teacher', 'HOD'
  ) NOT NULL,
  department VARCHAR(100),
  permissions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_by INT,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  INDEX idx_teacher_role (teacher_id, role_type),
  INDEX idx_school_branch (school_id, branch_id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);
```

### 1.2 Enhanced Lesson Plans Table
```sql
CREATE TABLE lesson_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  syllabus_id INT NOT NULL,
  class_code VARCHAR(10) NOT NULL,
  subject_code VARCHAR(10) NOT NULL,
  title VARCHAR(300) NOT NULL,
  lesson_date DATE NOT NULL,
  duration_minutes INT DEFAULT 40,
  
  -- Content fields
  objectives TEXT,
  content TEXT,
  activities TEXT,
  resources TEXT,
  assessment_methods TEXT,
  homework TEXT,
  
  -- Workflow fields
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived') DEFAULT 'draft',
  submitted_at TIMESTAMP NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  review_comments TEXT,
  
  -- AI fields
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_enhancement_type VARCHAR(50),
  ai_confidence_score DECIMAL(3,2),
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  school_id VARCHAR(20) NOT NULL,
  branch_id INT,
  
  INDEX idx_teacher_date (teacher_id, lesson_date),
  INDEX idx_syllabus (syllabus_id),
  INDEX idx_status (status),
  INDEX idx_ai_generated (ai_generated),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (syllabus_id) REFERENCES syllabus(id),
  FOREIGN KEY (reviewed_by) REFERENCES teachers(id)
);
```

### 1.3 Lesson Notes Tracking Table
```sql
CREATE TABLE lesson_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_plan_id INT NOT NULL,
  teacher_id INT NOT NULL,
  actual_date DATE NOT NULL,
  actual_duration_minutes INT,
  
  -- Execution details
  topics_covered TEXT,
  teaching_method VARCHAR(100),
  resources_used TEXT,
  student_engagement_level ENUM('Low', 'Medium', 'High'),
  challenges_faced TEXT,
  next_lesson_preparation TEXT,
  
  -- Assessment results
  assessment_conducted BOOLEAN DEFAULT FALSE,
  assessment_results TEXT,
  students_present INT,
  students_absent INT,
  
  -- Status
  status ENUM('planned', 'in_progress', 'completed', 'postponed') DEFAULT 'planned',
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lesson_plan (lesson_plan_id),
  INDEX idx_teacher_date (teacher_id, actual_date),
  INDEX idx_status (status),
  FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);
```

---

## Task 2: Role-Based Permissions System

### 2.1 Permission Definitions
```javascript
// File: /elscholar-api/src/config/teacherPermissions.js
const TEACHER_PERMISSIONS = {
  'Form Master': {
    syllabus: ['view_class_syllabus', 'track_class_progress'],
    lesson_plans: ['create', 'edit_own', 'view_class_plans'],
    lesson_notes: ['create', 'edit_own', 'view_class_notes'],
    students: ['view_class_students', 'track_attendance'],
    reports: ['generate_class_reports']
  },
  
  'Subject Teacher': {
    syllabus: ['view_subject_syllabus', 'suggest_modifications'],
    lesson_plans: ['create', 'edit_own', 'submit_for_review'],
    lesson_notes: ['create', 'edit_own', 'track_coverage'],
    assessments: ['create_assessments', 'grade_assessments'],
    reports: ['generate_subject_reports']
  },
  
  'Curriculum Designer': {
    syllabus: ['create', 'edit', 'approve', 'archive'],
    lesson_plans: ['view_all', 'approve', 'suggest_improvements'],
    curriculum: ['design_schemes', 'align_standards', 'create_templates'],
    reports: ['curriculum_analytics', 'coverage_reports']
  },
  
  'Department Head': {
    syllabus: ['approve_department', 'review_coverage'],
    lesson_plans: ['approve_department', 'quality_review'],
    teachers: ['assign_roles', 'performance_review'],
    reports: ['department_analytics', 'teacher_performance']
  },
  
  'Content Reviewer': {
    lesson_plans: ['review_content', 'suggest_improvements', 'quality_check'],
    syllabus: ['content_audit', 'alignment_check'],
    standards: ['ensure_compliance', 'quality_assurance']
  },
  
  'Mentor Teacher': {
    teachers: ['mentor_junior', 'provide_feedback'],
    lesson_plans: ['peer_review', 'collaborative_planning'],
    professional_development: ['conduct_training', 'share_resources']
  }
};

module.exports = TEACHER_PERMISSIONS;
```

### 2.2 Permission Middleware
```javascript
// File: /elscholar-api/src/middleware/teacherPermissions.js
const TEACHER_PERMISSIONS = require('../config/teacherPermissions');
const db = require('../models');

const checkTeacherPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const { id: teacher_id, school_id } = req.user;
      
      // Get teacher roles
      const teacherRoles = await db.TeacherRole.findAll({
        where: { 
          teacher_id, 
          is_active: true,
          school_id 
        }
      });
      
      if (teacherRoles.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'No active roles found for teacher'
        });
      }
      
      // Check if any role has the required permission
      const hasPermission = teacherRoles.some(role => {
        const rolePermissions = TEACHER_PERMISSIONS[role.role_type];
        return rolePermissions && 
               rolePermissions[resource] && 
               rolePermissions[resource].includes(action);
      });
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions for ${action} on ${resource}`
        });
      }
      
      req.teacherRoles = teacherRoles;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

module.exports = { checkTeacherPermission };
```

---

## Task 3: Enhanced API Endpoints

### 3.1 Teacher Roles Management API
```javascript
// File: /elscholar-api/src/controllers/teacherRolesController.js
const db = require('../models');
const TEACHER_PERMISSIONS = require('../config/teacherPermissions');

class TeacherRolesController {
  // GET /api/v1/teacher-roles/:teacherId
  async getTeacherRoles(req, res) {
    try {
      const { teacherId } = req.params;
      const { school_id } = req.user;
      
      const roles = await db.TeacherRole.findAll({
        where: { 
          teacher_id: teacherId, 
          school_id,
          is_active: true 
        },
        include: [{
          model: db.Teacher,
          attributes: ['name', 'email']
        }]
      });
      
      const rolesWithPermissions = roles.map(role => ({
        ...role.toJSON(),
        permissions: TEACHER_PERMISSIONS[role.role_type] || {}
      }));
      
      res.json({
        success: true,
        data: rolesWithPermissions
      });
    } catch (error) {
      console.error('Get teacher roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve teacher roles'
      });
    }
  }
  
  // POST /api/v1/teacher-roles
  async assignRole(req, res) {
    try {
      const { teacher_id, role_type, department } = req.body;
      const { id: assigned_by, school_id, branch_id } = req.user;
      
      // Check if role already exists
      const existingRole = await db.TeacherRole.findOne({
        where: { 
          teacher_id, 
          role_type, 
          school_id,
          is_active: true 
        }
      });
      
      if (existingRole) {
        return res.status(400).json({
          success: false,
          error: 'Teacher already has this role'
        });
      }
      
      const newRole = await db.TeacherRole.create({
        teacher_id,
        role_type,
        department,
        permissions: TEACHER_PERMISSIONS[role_type],
        assigned_by,
        school_id,
        branch_id
      });
      
      res.status(201).json({
        success: true,
        data: newRole,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign role'
      });
    }
  }
}

module.exports = new TeacherRolesController();
```

### 3.2 Enhanced Lesson Plans API
```javascript
// File: /elscholar-api/src/controllers/lessonPlansController.js
const db = require('../models');
const { checkTeacherPermission } = require('../middleware/teacherPermissions');

class LessonPlansController {
  // GET /api/v1/lesson-plans - Get teacher's lesson plans
  async getLessonPlans(req, res) {
    try {
      const { id: teacher_id, school_id } = req.user;
      const { status, class_code, subject_code, date_from, date_to } = req.query;
      
      const whereClause = { 
        teacher_id, 
        school_id 
      };
      
      if (status) whereClause.status = status;
      if (class_code) whereClause.class_code = class_code;
      if (subject_code) whereClause.subject_code = subject_code;
      if (date_from && date_to) {
        whereClause.lesson_date = {
          [db.Sequelize.Op.between]: [date_from, date_to]
        };
      }
      
      const lessonPlans = await db.LessonPlan.findAll({
        where: whereClause,
        include: [
          {
            model: db.Syllabus,
            attributes: ['title', 'content', 'week_no']
          },
          {
            model: db.Teacher,
            as: 'reviewer',
            attributes: ['name'],
            required: false
          }
        ],
        order: [['lesson_date', 'DESC']]
      });
      
      res.json({
        success: true,
        data: lessonPlans
      });
    } catch (error) {
      console.error('Get lesson plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve lesson plans'
      });
    }
  }
  
  // POST /api/v1/lesson-plans - Create lesson plan
  async createLessonPlan(req, res) {
    try {
      const { id: teacher_id, school_id, branch_id } = req.user;
      const lessonPlanData = {
        ...req.body,
        teacher_id,
        school_id,
        branch_id,
        status: 'draft'
      };
      
      const lessonPlan = await db.LessonPlan.create(lessonPlanData);
      
      res.status(201).json({
        success: true,
        data: lessonPlan,
        message: 'Lesson plan created successfully'
      });
    } catch (error) {
      console.error('Create lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create lesson plan'
      });
    }
  }
  
  // PUT /api/v1/lesson-plans/:id/submit - Submit for review
  async submitForReview(req, res) {
    try {
      const { id } = req.params;
      const { id: teacher_id } = req.user;
      
      const lessonPlan = await db.LessonPlan.findOne({
        where: { id, teacher_id }
      });
      
      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          error: 'Lesson plan not found'
        });
      }
      
      await lessonPlan.update({
        status: 'submitted',
        submitted_at: new Date()
      });
      
      res.json({
        success: true,
        data: lessonPlan,
        message: 'Lesson plan submitted for review'
      });
    } catch (error) {
      console.error('Submit lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit lesson plan'
      });
    }
  }
}

module.exports = new LessonPlansController();
```

---

## Task 4: Database Migration Scripts

### 4.1 Migration Script
```javascript
// File: /elscholar-api/migrations/001-enhance-teacher-roles.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create teacher_roles table
    await queryInterface.createTable('teacher_roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      teacher_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'teachers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      role_type: {
        type: Sequelize.ENUM(
          'Form Master', 'Subject Teacher', 'Curriculum Designer',
          'Department Head', 'Mentor Teacher', 'Content Reviewer',
          'Senior Teacher', 'HOD'
        ),
        allowNull: false
      },
      department: Sequelize.STRING(100),
      permissions: Sequelize.JSON,
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      assigned_by: Sequelize.INTEGER,
      assigned_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      school_id: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      branch_id: Sequelize.INTEGER
    });
    
    // Add indexes
    await queryInterface.addIndex('teacher_roles', ['teacher_id', 'role_type']);
    await queryInterface.addIndex('teacher_roles', ['school_id', 'branch_id']);
    
    // Create lesson_plans table
    await queryInterface.createTable('lesson_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      teacher_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'teachers',
          key: 'id'
        }
      },
      syllabus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'syllabus',
          key: 'id'
        }
      },
      class_code: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      subject_code: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(300),
        allowNull: false
      },
      lesson_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 40
      },
      objectives: Sequelize.TEXT,
      content: Sequelize.TEXT,
      activities: Sequelize.TEXT,
      resources: Sequelize.TEXT,
      assessment_methods: Sequelize.TEXT,
      homework: Sequelize.TEXT,
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived'),
        defaultValue: 'draft'
      },
      submitted_at: Sequelize.DATE,
      reviewed_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'teachers',
          key: 'id'
        }
      },
      reviewed_at: Sequelize.DATE,
      review_comments: Sequelize.TEXT,
      ai_generated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      ai_enhancement_type: Sequelize.STRING(50),
      ai_confidence_score: Sequelize.DECIMAL(3,2),
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      school_id: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      branch_id: Sequelize.INTEGER
    });
    
    // Add indexes for lesson_plans
    await queryInterface.addIndex('lesson_plans', ['teacher_id', 'lesson_date']);
    await queryInterface.addIndex('lesson_plans', ['syllabus_id']);
    await queryInterface.addIndex('lesson_plans', ['status']);
    await queryInterface.addIndex('lesson_plans', ['ai_generated']);
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('lesson_plans');
    await queryInterface.dropTable('teacher_roles');
  }
};
```

---

## Task 5: Sequelize Models

### 5.1 TeacherRole Model
```javascript
// File: /elscholar-api/src/models/TeacherRole.js
module.exports = (sequelize, DataTypes) => {
  const TeacherRole = sequelize.define('TeacherRole', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role_type: {
      type: DataTypes.ENUM(
        'Form Master', 'Subject Teacher', 'Curriculum Designer',
        'Department Head', 'Mentor Teacher', 'Content Reviewer',
        'Senior Teacher', 'HOD'
      ),
      allowNull: false
    },
    department: DataTypes.STRING(100),
    permissions: DataTypes.JSON,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    assigned_by: DataTypes.INTEGER,
    assigned_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_id: DataTypes.INTEGER
  }, {
    tableName: 'teacher_roles',
    timestamps: false
  });
  
  TeacherRole.associate = function(models) {
    TeacherRole.belongsTo(models.Teacher, {
      foreignKey: 'teacher_id',
      as: 'teacher'
    });
    
    TeacherRole.belongsTo(models.Teacher, {
      foreignKey: 'assigned_by',
      as: 'assigner'
    });
  };
  
  return TeacherRole;
};
```

### 5.2 LessonPlan Model
```javascript
// File: /elscholar-api/src/models/LessonPlan.js
module.exports = (sequelize, DataTypes) => {
  const LessonPlan = sequelize.define('LessonPlan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    syllabus_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    class_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    subject_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    lesson_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 40
    },
    objectives: DataTypes.TEXT,
    content: DataTypes.TEXT,
    activities: DataTypes.TEXT,
    resources: DataTypes.TEXT,
    assessment_methods: DataTypes.TEXT,
    homework: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived'),
      defaultValue: 'draft'
    },
    submitted_at: DataTypes.DATE,
    reviewed_by: DataTypes.INTEGER,
    reviewed_at: DataTypes.DATE,
    review_comments: DataTypes.TEXT,
    ai_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ai_enhancement_type: DataTypes.STRING(50),
    ai_confidence_score: DataTypes.DECIMAL(3,2),
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_id: DataTypes.INTEGER
  }, {
    tableName: 'lesson_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  LessonPlan.associate = function(models) {
    LessonPlan.belongsTo(models.Teacher, {
      foreignKey: 'teacher_id',
      as: 'teacher'
    });
    
    LessonPlan.belongsTo(models.Syllabus, {
      foreignKey: 'syllabus_id',
      as: 'syllabus'
    });
    
    LessonPlan.belongsTo(models.Teacher, {
      foreignKey: 'reviewed_by',
      as: 'reviewer'
    });
    
    LessonPlan.hasMany(models.LessonNote, {
      foreignKey: 'lesson_plan_id',
      as: 'lesson_notes'
    });
  };
  
  return LessonPlan;
};
```

---

## Execution Checklist

### Database Tasks
- [ ] Create enhanced teacher_roles table
- [ ] Create lesson_plans table  
- [ ] Create lesson_notes table
- [ ] Add proper indexes and foreign keys
- [ ] Run migration scripts
- [ ] Test data integrity

### Backend API Tasks
- [ ] Implement TeacherRolesController
- [ ] Implement LessonPlansController
- [ ] Create permission middleware
- [ ] Add role-based route protection
- [ ] Test all API endpoints
- [ ] Add comprehensive error handling

### Model Tasks
- [ ] Create TeacherRole Sequelize model
- [ ] Create LessonPlan Sequelize model
- [ ] Create LessonNote Sequelize model
- [ ] Define model associations
- [ ] Test model relationships

### Testing Tasks
- [ ] Unit tests for controllers
- [ ] Integration tests for APIs
- [ ] Permission system testing
- [ ] Database migration testing
- [ ] Performance testing

---

**Completion Criteria**: All database schemas created, APIs functional, role-based permissions working, comprehensive test coverage achieved.

**Next Phase**: AI Integration & Services (Phase 2)
