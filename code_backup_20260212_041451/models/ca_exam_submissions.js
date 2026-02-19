module.exports = (sequelize, DataTypes) => {
  const CAExamSubmission = sequelize.define('ca_exam_submissions', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    subject_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    class_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    ca_type: {
      type: DataTypes.ENUM('CA1', 'CA2', 'CA3', 'EXAM'),
      allowNull: false
    },
    question_file: {
      type: DataTypes.STRING(500)
    },
    comments: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Submitted', 'Under Moderation', 'Approved', 'Rejected'),
      defaultValue: 'Draft'
    },
    submitted_at: {
      type: DataTypes.DATE
    },
    deadline: {
      type: DataTypes.DATE
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(50)
    },
    academic_year: {
      type: DataTypes.STRING(20)
    },
    term: {
      type: DataTypes.STRING(50)
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'ca_exam_submissions'
  });

  return CAExamSubmission;
};
