module.exports = (sequelize, DataTypes) => {
  const AssetCategory = sequelize.define('AssetCategory', {
    category_id: {
      type: DataTypes.STRING(20),
      primaryKey: true
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    category_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    parent_category_id: {
      type: DataTypes.STRING(20)
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(20)
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    },
    depreciation_rate: {
      type: DataTypes.DECIMAL(5, 2)
    }
  }, {
    tableName: 'asset_categories',
    timestamps: false
  });

  return AssetCategory;
};
