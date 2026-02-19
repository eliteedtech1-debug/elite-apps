module.exports = (sequelize, DataTypes) => {
  const GradingSystem = sequelize.define('GradingSystem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    system_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the grading system (e.g., "5-Point Scale", "Letter Grades", "10-Point Scale")'
    },
    system_type: {
      type: DataTypes.ENUM('numeric', 'alphanumeric', 'alphabetic'),
      allowNull: false,
      comment: 'Type of grading system: numeric (1-5, 0-10), alphanumeric (A1, B2), alphabetic (A, B, C)'
    },
    min_value: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Minimum value in the scale (e.g., "1", "0", "F")'
    },
    max_value: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Maximum value in the scale (e.g., "5", "10", "A")'
    },
    scale_definition: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON definition of the complete scale with descriptions'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is the default grading system for the school'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this grading system is active'
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
      comment: 'User who created this grading system'
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who last updated this grading system'
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
    tableName: 'grading_systems',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['system_name', 'school_id', 'branch_id'],
        name: 'unique_grading_system_per_school_branch'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_grading_systems_school_branch'
      },
      {
        fields: ['system_type'],
        name: 'idx_grading_systems_type'
      },
      {
        fields: ['is_default'],
        name: 'idx_grading_systems_default'
      },
      {
        fields: ['is_active'],
        name: 'idx_grading_systems_active'
      }
    ],
    comment: 'Grading systems for assessments (numeric, alphanumeric, alphabetic)'
  });

  GradingSystem.associate = function(models) {
    // A grading system can be used by many knowledge domains
    GradingSystem.hasMany(models.KnowledgeDomainEnhanced, {
      foreignKey: 'grading_system_id',
      as: 'knowledge_domains'
    });
  };

  return GradingSystem;
};