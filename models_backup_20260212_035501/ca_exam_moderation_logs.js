module.exports = (sequelize, DataTypes) => {
  const CAExamModerationLog = sequelize.define('ca_exam_moderation_logs', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    submission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ca_exam_submissions', key: 'id' }
    },
    moderator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    action: {
      type: DataTypes.ENUM('Approved', 'Rejected', 'Modification Requested', 'File Replaced'),
      allowNull: false
    },
    comments: {
      type: DataTypes.TEXT
    },
    previous_status: {
      type: DataTypes.STRING(50)
    },
    new_status: {
      type: DataTypes.STRING(50)
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'ca_exam_moderation_logs'
  });

  return CAExamModerationLog;
};
