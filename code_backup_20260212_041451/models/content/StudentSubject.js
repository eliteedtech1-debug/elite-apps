module.exports = (sequelize, DataTypes) => {
  const StudentSubject = sequelize.define('StudentSubject', {
    // Auto-generated from student_subjects table
    // TODO: Add proper field definitions based on schema
  }, {
    tableName: 'student_subjects',
    timestamps: true,
    underscored: true
  });

  StudentSubject.associate = (models) => {
    // TODO: Define associations
  };

  return StudentSubject;
};
