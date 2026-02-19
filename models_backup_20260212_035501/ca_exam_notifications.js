module.exports = (sequelize, DataTypes) => {
  const CAExamNotification = sequelize.define('ca_exam_notifications', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    notification_code: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    ca_setup_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ca_setup', key: 'id' }
    },
    notification_type: {
      type: DataTypes.ENUM(
        'Upcoming Deadline',
        'Deadline Reminder',
        'Submission Received',
        'Moderation Update',
        'Approval',
        'Rejection',
        'Modification Request'
      ),
      allowNull: false
    },
    recipient_type: {
      type: DataTypes.ENUM('Teacher', 'Admin', 'Exam Officer', 'Moderation Committee', 'All'),
      allowNull: false
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    ca_type: {
      type: DataTypes.STRING(20)
    },
    subject_name: {
      type: DataTypes.STRING(100)
    },
    class_name: {
      type: DataTypes.STRING(100)
    },
    deadline_date: {
      type: DataTypes.DATEONLY
    },
    is_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sent_date: {
      type: DataTypes.DATE
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_date: {
      type: DataTypes.DATE
    },
    sent_via_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sent_via_sms: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sent_via_push: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sent_via_in_app: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    submission_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Normal', 'High', 'Urgent'),
      defaultValue: 'Normal'
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'ca_exam_notifications',
    indexes: [
      { fields: ['school_id', 'branch_id'] },
      { fields: ['ca_setup_id'] },
      { fields: ['recipient_id'] },
      { fields: ['notification_type'] },
      { fields: ['is_sent', 'is_read'] },
      { fields: ['deadline_date'] },
      { fields: ['submission_id'] }
    ]
  });

  return CAExamNotification;
};
