module.exports = (sequelize, DataTypes) => {
  const ExamRemarks = sequelize.define('exam_remarks', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    admission_no: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    term: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remark_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'exam_remarks',
    timestamps: false // exam_remarks table doesn't have createdAt/updatedAt
  });

  return ExamRemarks;
};
