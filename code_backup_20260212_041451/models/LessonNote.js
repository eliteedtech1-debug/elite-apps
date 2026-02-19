// LessonNote model for the new lesson_notes table
module.exports = (sequelize, DataTypes) => {
  const LessonNote = sequelize.define('LessonNote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lesson_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    actual_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    actual_duration_minutes: DataTypes.INTEGER,
    topics_covered: DataTypes.TEXT,
    teaching_method: DataTypes.STRING(100),
    resources_used: DataTypes.TEXT,
    student_engagement_level: {
      type: DataTypes.ENUM('Low', 'Medium', 'High')
    },
    challenges_faced: DataTypes.TEXT,
    next_lesson_preparation: DataTypes.TEXT,
    assessment_conducted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    assessment_results: DataTypes.TEXT,
    students_present: DataTypes.INTEGER,
    students_absent: DataTypes.INTEGER,
    completion_percentage: {
      type: DataTypes.DECIMAL(5,2),
      defaultValue: 0.00
    }
  }, {
    tableName: 'lesson_notes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['lesson_plan_id']
      },
      {
        fields: ['created_by', 'created_at']
      }
    ]
  });
  
  LessonNote.associate = function(models) {
    LessonNote.belongsTo(models.LessonPlan, {
      foreignKey: 'lesson_plan_id',
      as: 'lesson_plan'
    });
    
    LessonNote.belongsTo(models.Staff, {
      foreignKey: 'teacher_id',
      as: 'teacher'
    });
  };
  
  return LessonNote;
};
