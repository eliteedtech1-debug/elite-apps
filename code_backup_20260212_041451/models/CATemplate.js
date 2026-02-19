const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CATemplate = sequelize.define('CATemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the template'
    },
    template_category: {
      type: DataTypes.ENUM('standard', 'enhanced', 'custom', 'knowledge_domain'),
      allowNull: false,
      defaultValue: 'standard',
      comment: 'Category of the template'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the template'
    },
    ca_types: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of CA types this template supports'
    },
    assessment_mode: {
      type: DataTypes.ENUM('week_based', 'week_based_enhanced', 'date_based'),
      allowNull: false,
      defaultValue: 'week_based',
      comment: 'Assessment mode for this template'
    },
    template_config: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Complete template configuration including weeks, assessments, grades'
    },
    knowledge_domains: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Knowledge domains configuration for this template'
    },
    overall_contribution_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.00,
      comment: 'Default overall contribution percentage'
    },
    is_system_template: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a system-provided template'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this template is active'
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'School identifier (null for system templates)'
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Branch identifier (null for system templates)'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID who created this template'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID who last updated this template'
    }
  }, {
    tableName: 'ca_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['template_name', 'school_id', 'branch_id'],
        name: 'unique_template_name_per_school_branch'
      },
      {
        fields: ['template_category']
      },
      {
        fields: ['assessment_mode']
      },
      {
        fields: ['is_system_template']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['school_id']
      },
      {
        fields: ['branch_id']
      }
    ]
  });

  CATemplate.associate = (models) => {
    // No direct associations needed, but could add usage tracking
  };

  return CATemplate;
};