module.exports = (sequelize, DataTypes) => {
  const Asset = sequelize.define('Asset', {
    asset_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    asset_tag: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    asset_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    room_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    room_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    branch_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Operational', 'Under Maintenance', 'Damaged', 'Decommissioned', 'In Storage'),
      defaultValue: 'Operational'
    },
    purchase_cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    purchase_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expected_life: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Expected life in years'
    },
    last_inspection_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_inspection_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    school_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'assets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Asset;
};
