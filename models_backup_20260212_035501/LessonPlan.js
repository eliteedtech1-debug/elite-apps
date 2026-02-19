// LessonPlan model mapped to lesson_plans table
module.exports = (sequelize, DataTypes) => {
  const LessonPlan = sequelize.define('LessonPlan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    subject_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    class_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    teacher_id: {
      type: DataTypes.INTEGER,
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
      type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
      defaultValue: 'draft'
    },
    school_id: DataTypes.STRING(20),
    branch_id: DataTypes.STRING(20),
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    syllabus_id: DataTypes.STRING(50),
    syllabus_topic: DataTypes.STRING(255),
    nerdc_alignment: DataTypes.TEXT,
    ai_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ai_model_used: DataTypes.STRING(50),
    ai_prompt_version: DataTypes.STRING(20),
    teacher_edit_percentage: DataTypes.INTEGER,
    syllabus_topics: DataTypes.JSON,
    curriculum_alignment_percentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    syllabus_coverage_tags: DataTypes.TEXT,
    academic_year: DataTypes.STRING(20),
    term: DataTypes.STRING(50),
    week_no: {
      type: DataTypes.TINYINT,
      allowNull: true
    }
  }, {
    tableName: 'lesson_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['school_id']
      },
      {
        fields: ['teacher_id']
      },
      {
        fields: ['subject_code']
      },
      {
        fields: ['class_code']
      },
      {
        fields: ['lesson_date']
      },
      {
        fields: ['status']
      }
    ]
  });
  
  LessonPlan.associate = function(models) {
    // Association with Staff/Teachers table
    if (models.Staff) {
      LessonPlan.belongsTo(models.Staff, {
        foreignKey: 'teacher_id',
        as: 'teacher'
      });
    }
    
    // Association with Syllabus table if it exists
    if (models.Syllabus) {
      LessonPlan.belongsTo(models.Syllabus, {
        foreignKey: 'syllabus_id',
        as: 'syllabus'
      });
    }
  };
  
  return LessonPlan;
};
