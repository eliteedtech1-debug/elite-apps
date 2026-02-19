module.exports = (sequelize, DataTypes) => {
  const CAGroup = sequelize.define('CAGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    group_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the CA group (e.g., "Primary 1 Assessment Group", "JSS 1 CA Group")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the CA group and its purpose'
    },
    academic_level: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Academic level this group applies to (e.g., "Primary", "JSS", "SSS")'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this CA group is currently active (only one can be active at a time)'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is the default CA group for the school'
    },
    total_contribution: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      comment: 'Total contribution percentage (should always be 100%)'
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
      comment: 'User who created this CA group'
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who last updated this CA group'
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
    tableName: 'ca_groups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['group_name', 'school_id', 'branch_id'],
        name: 'unique_ca_group_per_school_branch'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_ca_groups_school_branch'
      },
      {
        fields: ['is_active'],
        name: 'idx_ca_groups_active'
      },
      {
        fields: ['is_default'],
        name: 'idx_ca_groups_default'
      },
      {
        fields: ['academic_level'],
        name: 'idx_ca_groups_level'
      }
    ],
    comment: 'CA Groups containing multiple CAs (CA1, CA2, CA3) + Exam with shared grade boundaries'
  });

  CAGroup.associate = function(models) {
    // A CA group has many CA configurations
    CAGroup.hasMany(models.CAConfiguration, {
      foreignKey: 'group_id',
      as: 'ca_configurations',
      onDelete: 'CASCADE'
    });

    // A CA group has many grade boundaries
    CAGroup.hasMany(models.GradeBoundary, {
      foreignKey: 'group_id',
      as: 'grade_boundaries',
      onDelete: 'CASCADE'
    });
  };

  return CAGroup;
};