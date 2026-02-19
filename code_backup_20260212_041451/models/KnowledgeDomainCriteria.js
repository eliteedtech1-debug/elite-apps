module.exports = (sequelize, DataTypes) => {
  const KnowledgeDomainCriteria = sequelize.define('KnowledgeDomainCriteria', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    domain_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'knowledge_domains',
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
    weight: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10
      },
      comment: 'Weight/importance of this criteria (1-10)'
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
    tableName: 'knowledge_domain_criteria',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['domain_id'],
        name: 'idx_knowledge_domain_criteria_domain'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_knowledge_domain_criteria_school_branch'
      },
      {
        fields: ['weight'],
        name: 'idx_knowledge_domain_criteria_weight'
      }
    ],
    comment: 'Assessment criteria for knowledge domains'
  });

  KnowledgeDomainCriteria.associate = function(models) {
    // A criteria belongs to a knowledge domain
    KnowledgeDomainCriteria.belongsTo(models.KnowledgeDomain, {
      foreignKey: 'domain_id',
      as: 'domain'
    });
  };

  return KnowledgeDomainCriteria;
};