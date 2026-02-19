module.exports = (sequelize, DataTypes) => {
  const KnowledgeDomainSimplified = sequelize.define('KnowledgeDomainSimplified', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    domain_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the knowledge domain (e.g., Critical Thinking, Communication)'
    },
    domain_type: {
      type: DataTypes.ENUM('cognitive', 'affective', 'psychomotor', 'social', 'spiritual'),
      allowNull: false,
      comment: 'Type of knowledge domain - this replaces character trait category'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what this domain assesses'
    },
    grading_system: {
      type: DataTypes.ENUM('numeric_1_5', 'numeric_1_10', 'alpha_a_f', 'alphanumeric_a1_f9', 'descriptive_excellent_poor'),
      allowNull: false,
      defaultValue: 'numeric_1_5',
      comment: 'Specific grading system with predefined standardized values'
    },
    grading_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Standardized grade values that teachers must use (e.g., [{value: "A", label: "Excellent"}])'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this domain is active and available for assessment'
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
      comment: 'User who created this domain'
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who last updated this domain'
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
    tableName: 'knowledge_domains_simplified',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['domain_name', 'domain_type', 'school_id', 'branch_id'],
        name: 'unique_simplified_domain_per_type_school_branch'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_knowledge_domains_simplified_school_branch'
      },
      {
        fields: ['domain_type'],
        name: 'idx_knowledge_domains_simplified_type'
      },
      {
        fields: ['grading_system'],
        name: 'idx_knowledge_domains_simplified_grading'
      },
      {
        fields: ['is_active'],
        name: 'idx_knowledge_domains_simplified_active'
      }
    ],
    comment: 'Simplified knowledge domains with standardized grading values - ensures all teachers use same grades'
  });

  KnowledgeDomainSimplified.associate = function(models) {
    // A knowledge domain has many assessment criteria
    KnowledgeDomainSimplified.hasMany(models.AssessmentCriteriaSimplified, {
      foreignKey: 'domain_id',
      as: 'assessment_criteria',
      onDelete: 'CASCADE'
    });
  };

  return KnowledgeDomainSimplified;
};