const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recitation = sequelize.define('Recitation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    class_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    class_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    allow_replies: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'recitations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // Indexes will be added after migration
    ]
  });

  // Define associations
  Recitation.associate = (models) => {
    // A recitation belongs to a staff (teacher)
    if (models.Staff) {
      Recitation.belongsTo(models.Staff, {
        foreignKey: 'teacher_id',
        as: 'teacher'
      });
    }

    // A recitation has many replies
    if (models.RecitationReply) {
      Recitation.hasMany(models.RecitationReply, {
        foreignKey: 'recitation_id',
        as: 'replies',
        onDelete: 'CASCADE'
      });
    }
  };

  return Recitation;
};
