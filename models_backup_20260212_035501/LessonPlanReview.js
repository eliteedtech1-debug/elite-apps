module.exports = (sequelize, DataTypes) => {
  const LessonPlanReview = sequelize.define('LessonPlanReview', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lesson_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('approved', 'rejected'),
      allowNull: false
    },
    remark: DataTypes.TEXT,
    reviewed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    deleted_at: DataTypes.DATE
  }, {
    tableName: 'lesson_plan_reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['lesson_plan_id'] },
      { fields: ['reviewed_by'] },
      { fields: ['reviewed_at'] },
      { fields: ['status'] }
    ]
  });

  return LessonPlanReview;
};
