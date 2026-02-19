module.exports = (sequelize, DataTypes) => {
  const MessagingUsage = sequelize.define('MessagingUsage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'School ID from school_setup'
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference to messaging_subscriptions table (nullable for payg)'
    },
    service_type: {
      type: DataTypes.ENUM('sms', 'whatsapp', 'email'),
      allowNull: false,
      comment: 'Type of messaging service'
    },
    message_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Number of messages sent'
    },
    cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: 'Cost of this message or batch'
    }
  }, {
    tableName: 'messaging_usage',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false  // We don't need updatedAt for usage records
  });

  // Define associations
  MessagingUsage.associate = function(models) {
    MessagingUsage.belongsTo(models.MessagingSubscription, {
      foreignKey: 'subscription_id',
      as: 'subscription'
    });
  };

  return MessagingUsage;
};