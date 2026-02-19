const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Asset = sequelize.define('Asset', {
    asset_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
    },
    asset_tag: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    asset_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    asset_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    category_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    serial_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    purchase_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    purchase_cost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    purchase_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    current_value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    depreciation_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    expected_life_years: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
    },
    warranty_expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    supplier_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    supplier_contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    room_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Operational', 'Damaged', 'Under Maintenance', 'Decommissioned', 'Lost', 'In Storage'),
      defaultValue: 'Operational',
    },
    condition_rating: {
      type: DataTypes.ENUM('Excellent', 'Good', 'Fair', 'Poor'),
      defaultValue: 'Good',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'assets',
    timestamps: false,
  });

  // Add static method for asset summary report
  Asset.getAssetSummaryReport = async (school_id, filters = {}) => {
    const whereClause = { school_id };

    if (filters.branch_id) {
      whereClause.branch_id = filters.branch_id;
    }
    if (filters.category_id) {
      whereClause.category_id = filters.category_id;
    }
    if (filters.room_id) {
      whereClause.room_id = filters.room_id;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }

    const assets = await Asset.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    return assets;
  };

  return Asset;
};
