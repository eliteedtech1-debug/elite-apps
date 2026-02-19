const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChartOfAccounts = sequelize.define('ChartOfAccounts', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    account_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    account_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    account_type: {
      type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_REVENUE', 'CONTRA_ASSET'),
      allowNull: false
    },
    account_category: {
      type: DataTypes.ENUM('CURRENT_ASSET', 'NON_CURRENT_ASSET', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'OWNERS_EQUITY', 'OPERATING_REVENUE', 'NON_OPERATING_REVENUE', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE'),
      allowNull: false
    },
    normal_balance: {
      type: DataTypes.ENUM('DEBIT', 'CREDIT'),
      allowNull: false
    },
    parent_account_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_system_account: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    current_balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    updated_by: {
      type: DataTypes.STRING(100),
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
    tableName: 'chart_of_accounts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['account_code', 'school_id', 'branch_id']
      },
      {
        fields: ['school_id', 'branch_id']
      },
      {
        fields: ['account_type']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Define associations
  ChartOfAccounts.associate = (models) => {
    if (models.School) {
      ChartOfAccounts.belongsTo(models.School, {
        foreignKey: 'school_id',
        targetKey: 'school_id',
        as: 'school'
      });
    }
    if (models.SchoolSetup) {
      ChartOfAccounts.belongsTo(models.SchoolSetup, {
        foreignKey: 'school_id',
        targetKey: 'school_id',
        as: 'schoolSetup'
      });
    }
  };

  return ChartOfAccounts;
};