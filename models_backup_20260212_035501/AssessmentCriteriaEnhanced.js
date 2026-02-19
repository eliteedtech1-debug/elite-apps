module.exports = (sequelize, DataTypes) => {
  const AssessmentCriteriaEnhanced = sequelize.define('AssessmentCriteriaEnhanced', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    domain_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'knowledge_domains_enhanced',
        key: 'id'
      },
      comment: 'Reference to the knowledge domain'
    },
    criteria_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the assessment criteria (e.g., Problem Solving, Communication)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what this criteria measures'
    },
    character_trait_description: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Maps to character_traits.description for integration'
    },
    grade_type: {
      type: DataTypes.ENUM('numeric', 'alphanumeric', 'alphabetic'),
      allowNull: false,
      defaultValue: 'numeric',
      comment: 'Type of grading for this criteria'
    },
    grade_scale: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON definition of the grade scale for this criteria'
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.00,
      comment: 'Weight/importance of this criteria within the domain'
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this criteria is required for assessment'
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
      comment: 'User who created this criteria'
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who last updated this criteria'
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
    tableName: 'assessment_criteria_enhanced',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['domain_id'],
        name: 'idx_assessment_criteria_enhanced_domain'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_assessment_criteria_enhanced_school_branch'
      },
      {
        fields: ['grade_type'],
        name: 'idx_assessment_criteria_enhanced_grade_type'
      },
      {
        fields: ['character_trait_description'],
        name: 'idx_assessment_criteria_enhanced_trait_desc'
      },
      {
        fields: ['weight'],
        name: 'idx_assessment_criteria_enhanced_weight'
      },
      {
        fields: ['is_required'],
        name: 'idx_assessment_criteria_enhanced_required'
      }
    ],
    comment: 'Enhanced assessment criteria with flexible grading systems and character traits integration'
  });

  AssessmentCriteriaEnhanced.associate = function(models) {
    // A criteria belongs to a knowledge domain
    AssessmentCriteriaEnhanced.belongsTo(models.KnowledgeDomainEnhanced, {
      foreignKey: 'domain_id',
      as: 'domain'
    });
  };

  return AssessmentCriteriaEnhanced;
};