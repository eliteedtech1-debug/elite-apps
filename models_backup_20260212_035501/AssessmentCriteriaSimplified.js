module.exports = (sequelize, DataTypes) => {
  const AssessmentCriteriaSimplified = sequelize.define('AssessmentCriteriaSimplified', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    domain_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'knowledge_domains_simplified',
        key: 'id'
      },
      comment: 'Reference to the knowledge domain'
    },
    criteria_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the assessment criteria (e.g., Problem Solving, Communication, Handwriting)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what this criteria measures'
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
    tableName: 'assessment_criteria_simplified',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['domain_id'],
        name: 'idx_assessment_criteria_simplified_domain'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_assessment_criteria_simplified_school_branch'
      },
      {
        fields: ['is_required'],
        name: 'idx_assessment_criteria_simplified_required'
      }
    ],
    comment: 'Simplified assessment criteria - teachers assign grades based on domain grading system'
  });

  AssessmentCriteriaSimplified.associate = function(models) {
    // A criteria belongs to a knowledge domain
    AssessmentCriteriaSimplified.belongsTo(models.KnowledgeDomainSimplified, {
      foreignKey: 'domain_id',
      as: 'domain'
    });
  };

  return AssessmentCriteriaSimplified;
};