const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecitationReply = sequelize.define('RecitationReply', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    recitation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recitations',
        key: 'id'
      }
    },
    admission_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'students',
        key: 'admission_no'
      }
    },
    audio_url: {
      type: DataTypes.STRING(1024),
      allowNull: false
    },
    audio_public_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    audio_format: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    transcript: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ai_score: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('submitted', 'graded'),
      defaultValue: 'submitted'
    },
    allow_resubmit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'recitation_replies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['recitation_id']
      },
      {
        fields: ['admission_no']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['recitation_id', 'admission_no'],
        unique: true
      }
    ]
  });

  // Define associations
  RecitationReply.associate = (models) => {
    // A reply belongs to a recitation
    if (models.Recitation) {
      RecitationReply.belongsTo(models.Recitation, {
        foreignKey: 'recitation_id',
        as: 'recitation'
      });
    }

    // A reply belongs to a student
    if (models.Student) {
      RecitationReply.belongsTo(models.Student, {
        foreignKey: 'admission_no',
        targetKey: 'admission_no',
        as: 'student'
      });
    }

    // A reply has one feedback
    if (models.RecitationFeedback) {
      RecitationReply.hasOne(models.RecitationFeedback, {
        foreignKey: 'reply_id',
        as: 'feedback',
        onDelete: 'CASCADE'
      });
    }
  };

  return RecitationReply;
};
