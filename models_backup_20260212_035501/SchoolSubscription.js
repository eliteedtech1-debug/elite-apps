module.exports = (sequelize, DataTypes) => {
  const SchoolSubscription = sequelize.define('SchoolSubscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subscription_packages',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    features_override: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Custom feature enable/disable per school'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'rbac_school_packages',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['school_id', 'is_active']
      },
      {
        fields: ['package_id']
      }
    ]
  });

  SchoolSubscription.associate = (models) => {
    SchoolSubscription.belongsTo(models.SubscriptionPackage, {
      foreignKey: 'package_id',
      as: 'package'
    });
  };

  return SchoolSubscription;
};
