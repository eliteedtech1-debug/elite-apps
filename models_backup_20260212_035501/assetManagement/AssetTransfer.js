const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  // Define the AssetTransfer model
  const AssetTransfer = sequelize.define('AssetTransfer', {
  transfer_id: {
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
  from_room_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    references: {
      model: 'facility_rooms',
      key: 'room_id'
    }
  },
  to_room_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    references: {
      model: 'facility_rooms',
      key: 'room_id'
    }
  },
  from_branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'school_locations',
      key: 'branch_id'
    }
  },
  to_branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'school_locations',
      key: 'branch_id'
    }
  },
  transfer_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  transferred_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In Transit', 'Completed', 'Cancelled'),
    defaultValue: 'Pending'
  },
  notes: {
    type: DataTypes.TEXT,
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
  tableName: 'asset_transfers',
  timestamps: true,
  indexes: [
    {
      fields: ['asset_id', 'transfer_date']
    },
    {
      fields: ['status']
    }
  ]
});

// Static methods for the model
AssetTransfer.findBySchool = async function(schoolId, filters = {}) {
  const whereClause = { school_id: schoolId };

  // Apply filters
  if (filters.asset_id) whereClause.asset_id = filters.asset_id;
  if (filters.from_room_id) whereClause.from_room_id = filters.from_room_id;
  if (filters.to_room_id) whereClause.to_room_id = filters.to_room_id;
  if (filters.from_branch_id) whereClause.from_branch_id = filters.from_branch_id;
  if (filters.to_branch_id) whereClause.to_branch_id = filters.to_branch_id;
  if (filters.status) whereClause.status = filters.status;

  // Date range filter
  if (filters.start_date || filters.end_date) {
    whereClause.transfer_date = {};
    if (filters.start_date) whereClause.transfer_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.transfer_date[Op.lte] = filters.end_date;
  }

  return await this.findAll({
    where: whereClause,
    limit: parseInt(filters.limit) || 50,
    offset: parseInt(filters.offset) || 0,
    order: [['transfer_date', 'DESC']]
  });
};

AssetTransfer.findById = async function(transferId) {
  return await this.findOne({
    where: { transfer_id: transferId }
  });
};

// Note: Using custom method name to avoid conflict with Sequelize's built-in update
AssetTransfer.updateById = async function(transferId, updateData) {
  const result = await this.update(updateData, {
    where: { transfer_id: transferId }
  });
  return { affectedRows: result[0] };
};

  return AssetTransfer;
};