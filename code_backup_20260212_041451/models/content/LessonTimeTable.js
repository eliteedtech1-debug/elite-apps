module.exports = (sequelize, DataTypes) => {
  const LessonTimeTable = sequelize.define('LessonTimeTable', {
    // Auto-generated from lesson_time_table table
    // TODO: Add proper field definitions based on schema
  }, {
    tableName: 'lesson_time_table',
    timestamps: true,
    underscored: true
  });

  LessonTimeTable.associate = (models) => {
    // TODO: Define associations
  };

  return LessonTimeTable;
};
