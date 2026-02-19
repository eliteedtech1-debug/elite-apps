const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdmissionToken = sequelize.define('AdmissionToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  school_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  usage_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  },
  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'used', 'expired', 'disabled'),
    defaultValue: 'active',
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  tableName: 'admission_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

  return AdmissionToken;
};
