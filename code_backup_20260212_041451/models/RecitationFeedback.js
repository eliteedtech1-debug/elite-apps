const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecitationFeedback = sequelize.define('RecitationFeedback', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reply_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recitation_replies',
        key: 'id'
      }
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    grade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'recitation_feedbacks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Only track creation time
    indexes: [
      {
        fields: ['reply_id']
      },
      {
        fields: ['teacher_id']
      },
      {
        fields: ['grade']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['reply_id', 'teacher_id']
      }
    ]
  });

  // Define associations
  RecitationFeedback.associate = (models) => {
    // A feedback belongs to a reply
    if (models.RecitationReply) {
      RecitationFeedback.belongsTo(models.RecitationReply, {
        foreignKey: 'reply_id',
        as: 'reply'
      });
    }

    // A feedback belongs to a staff (teacher)
    if (models.Staff) {
      RecitationFeedback.belongsTo(models.Staff, {
        foreignKey: 'teacher_id',
        as: 'teacher'
      });
    }
  };

  return RecitationFeedback;
};
