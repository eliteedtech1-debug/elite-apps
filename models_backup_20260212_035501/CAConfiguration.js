module.exports = (sequelize, DataTypes) => {
  const CAConfiguration = sequelize.define('CAConfiguration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ca_groups',
        key: 'id'
      },
      comment: 'Reference to the CA group this configuration belongs to'
    },
    ca_type: {
      type: DataTypes.ENUM('CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'EXAM'),
      allowNull: false,
      comment: 'Type of CA or Exam'
    },
    ca_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Order of this CA in the sequence (1, 2, 3, 4, etc.)'
    },
    ca_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Custom name for this CA (optional, defaults to ca_type)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of this specific CA configuration'
    },
    contribution_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Percentage contribution of this CA to overall assessment'
    },
    weeks_config: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON array of week configurations with max scores'
    },
    total_max_score: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      comment: 'Total maximum score for this CA (calculated from weeks)'
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this CA is required (first 3 CAs + Exam are always required)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this CA configuration is active'
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'School identifier'
    },
    branch_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Branch identifier'
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who created this CA configuration'
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who last updated this CA configuration'
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
    tableName: 'ca_configurations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['group_id', 'ca_type'],
        name: 'unique_ca_type_per_group'
      },
      {
        unique: true,
        fields: ['group_id', 'ca_order'],
        name: 'unique_ca_order_per_group'
      },
      {
        fields: ['group_id'],
        name: 'idx_ca_configurations_group'
      },
      {
        fields: ['ca_type'],
        name: 'idx_ca_configurations_type'
      },
      {
        fields: ['ca_order'],
        name: 'idx_ca_configurations_order'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_ca_configurations_school_branch'
      },
      {
        fields: ['is_required'],
        name: 'idx_ca_configurations_required'
      },
      {
        fields: ['is_active'],
        name: 'idx_ca_configurations_active'
      }
    ],
    comment: 'Individual CA configurations within a CA group (CA1, CA2, CA3, EXAM, etc.)'
  });

  CAConfiguration.associate = function(models) {
    // A CA configuration belongs to a CA group
    CAConfiguration.belongsTo(models.CAGroup, {
      foreignKey: 'group_id',
      as: 'ca_group'
    });
  };

  return CAConfiguration;
};