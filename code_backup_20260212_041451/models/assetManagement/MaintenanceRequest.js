const { DataTypes } = require('sequelize');
const { execute } = require('../../config/database');

module.exports = (sequelize) => {
const db = require('../../config/database');

// Define the MaintenanceRequest model
const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
  request_id: {
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
  request_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Medium'
  },
  issue_description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'In Progress', 'Completed', 'Rejected', 'Cancelled'),
    defaultValue: 'Pending'
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  actual_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  work_performed: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  vendor_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  vendor_contact: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  school_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'school_setup',
      key: 'school_id'
    }
  },
  branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'school_locations',
      key: 'branch_id'
    }
  }
}, {
  tableName: 'maintenance_requests',
  timestamps: true,
  indexes: [
    {
      fields: ['asset_id', 'request_date']
    },
    {
      fields: ['status', 'priority']
    },
    {
      fields: ['assigned_to', 'status']
    }
  ]
});

MaintenanceRequest.findBySchool = async (school_id, filters = {}) => {
  let query = `
    SELECT *
    FROM maintenance_requests
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

  return MaintenanceRequest;
};