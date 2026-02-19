module.exports = (sequelize, DataTypes) => {
  const AssignmentQuestionOption = sequelize.define('AssignmentQuestionOption', {
    // Auto-generated from assignment_question_options table
    // TODO: Add proper field definitions based on schema
  }, {
    tableName: 'assignment_question_options',
    timestamps: true,
    underscored: true
  });

  AssignmentQuestionOption.associate = (models) => {
    // TODO: Define associations
  };

  return AssignmentQuestionOption;
};
