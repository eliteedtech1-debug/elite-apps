module.exports = (sequelize, DataTypes) => {
  const MessagingSubscription = sequelize.define('MessagingSubscription', {
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
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to messaging_packages table'
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Start date of the subscription'
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'End date of the subscription (term end)'
    },
    total_messages: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total messages included in package'
    },
    messages_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of messages already used'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired'),
      defaultValue: 'active',
      comment: 'Subscription status'
    }
  }, {
    tableName: 'messaging_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  MessagingSubscription.associate = function(models) {
    MessagingSubscription.belongsTo(models.MessagingPackage, {
      foreignKey: 'package_id',
      as: 'package'
    });
  };

  return MessagingSubscription;
};