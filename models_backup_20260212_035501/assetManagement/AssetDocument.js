const { DataTypes } = require('sequelize');
const { sequelize } = require('../../models');

// Define the AssetDocument model
const AssetDocument = sequelize.define('AssetDocument', {
  document_id: {
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
  document_type: {
    type: DataTypes.ENUM('Purchase Invoice', 'Warranty', 'Manual', 'Service Record', 'Photo', 'Other'),
    allowNull: false
  },
  document_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  document_url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
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
  tableName: 'asset_documents',
  timestamps: true,
  indexes: [
    {
      fields: ['asset_id', 'document_type']
    }
  ]
});

module.exports = AssetDocument;