module.exports = (sequelize, DataTypes) => {
  const SubscriptionPackage = sequelize.define('SubscriptionPackage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    package_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    package_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of feature codes included in package'
    },
    price_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    price_yearly: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    max_students: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'NULL = unlimited'
    },
    max_teachers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'NULL = unlimited'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'subscription_packages',
    timestamps: true,
    underscored: true
  });

  SubscriptionPackage.associate = (models) => {
    SubscriptionPackage.hasMany(models.SchoolSubscription, {
      foreignKey: 'package_id',
      as: 'subscriptions'
    });
  };

  return SubscriptionPackage;
};
