module.exports = (sequelize, DataTypes) => {
  const MessagingPackage = sequelize.define('MessagingPackage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    package_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Package name (e.g., Bronze, Silver, Gold)'
    },
    service_type: {
      type: DataTypes.ENUM('sms', 'whatsapp', 'email'),
      allowNull: false,
      comment: 'Type of messaging service'
    },
    package_type: {
      type: DataTypes.ENUM('payg', 'termly'),
      allowNull: false,
      comment: 'Pay-as-you-go (payg) or termly subscription'
    },
    messages_per_term: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of messages included per term for termly packages'
    },
    unit_cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: 'Cost per unit message for pay-as-you-go packages'
    },
    package_cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: 'Total cost of the package for termly packages'
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'NGN',
      comment: 'Currency code'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Package description and features'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether package is currently available'
    }
  }, {
    tableName: 'messaging_packages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return MessagingPackage;
};