const { DataTypes } = require('sequelize');
const { execute } = require('../../config/database');

module.exports = (sequelize) => {
  // Define the AssetInspection model
const AssetInspection = sequelize.define('AssetInspection', {
  inspection_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  asset_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'assets',
      key: 'asset_id'
    }
  },
  inspection_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  condition_rating: {
    type: DataTypes.ENUM('Excellent', 'Good', 'Fair', 'Poor'),
    allowNull: false
  },
  status_after_inspection: {
    type: DataTypes.ENUM('Operational', 'Needs Repair', 'Damaged', 'Decommissioned'),
    defaultValue: 'Operational'
  },
  findings: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  photos_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  next_inspection_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  school_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'school_setup',
      key: 'school_id'
    }
  }
}, {
  tableName: 'asset_inspections',
  timestamps: true,
  indexes: [
    {
      fields: ['asset_id', 'inspection_date']
    },
    {
      fields: ['inspector_id', 'inspection_date']
    },
    {
      fields: ['next_inspection_date']
    }
  ]
});

AssetInspection.findBySchool = async (school_id, filters = {}) => {
  let query = `
    SELECT *
    FROM asset_inspections
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (filters.branch_id) {
    query += ' AND branch_id = ?';
    params.push(filters.branch_id);
  }

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  const [rows] = await execute(query, params);
  return rows;
};

  return AssetInspection;
};