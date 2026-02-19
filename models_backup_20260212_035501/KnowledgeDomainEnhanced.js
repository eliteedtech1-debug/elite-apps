module.exports = (sequelize, DataTypes) => {
  const KnowledgeDomainEnhanced = sequelize.define('KnowledgeDomainEnhanced', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    domain_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the knowledge domain (e.g., Critical Thinking, Emotional Intelligence)'
    },
    domain_type: {
      type: DataTypes.ENUM('cognitive', 'affective', 'psychomotor', 'social', 'spiritual'),
      allowNull: false,
      comment: 'Type of knowledge domain'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what this domain assesses'
    },
    grading_system_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'grading_systems',
        key: 'id'
      },
      comment: 'Reference to the grading system used for this domain'
    },
    character_trait_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Maps to character_traits.category for integration'
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Section this domain applies to (maps to character_traits.section)'
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.00,
      comment: 'Weight/importance of this domain in overall assessment'
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
    tableName: 'knowledge_domains_enhanced',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['domain_name', 'domain_type', 'school_id', 'branch_id'],
        name: 'unique_enhanced_domain_per_type_school_branch'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_knowledge_domains_enhanced_school_branch'
      },
      {
        fields: ['domain_type'],
        name: 'idx_knowledge_domains_enhanced_type'
      },
      {
        fields: ['grading_system_id'],
        name: 'idx_knowledge_domains_enhanced_grading_system'
      },
      {
        fields: ['character_trait_category'],
        name: 'idx_knowledge_domains_enhanced_trait_category'
      },
      {
        fields: ['is_active'],
        name: 'idx_knowledge_domains_enhanced_active'
      }
    ],
    comment: 'Enhanced knowledge domains with grading system integration and character traits mapping'
  });

  KnowledgeDomainEnhanced.associate = function(models) {
    // A knowledge domain belongs to a grading system
    KnowledgeDomainEnhanced.belongsTo(models.GradingSystem, {
      foreignKey: 'grading_system_id',
      as: 'grading_system'
    });

    // A knowledge domain has many assessment criteria
    KnowledgeDomainEnhanced.hasMany(models.AssessmentCriteriaEnhanced, {
      foreignKey: 'domain_id',
      as: 'assessment_criteria',
      onDelete: 'CASCADE'
    });
  };

  return KnowledgeDomainEnhanced;
};