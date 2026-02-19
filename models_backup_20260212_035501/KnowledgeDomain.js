module.exports = (sequelize, DataTypes) => {
  const KnowledgeDomain = sequelize.define('KnowledgeDomain', {
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
    tableName: 'knowledge_domains',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['domain_name', 'domain_type', 'school_id', 'branch_id'],
        name: 'unique_domain_per_type_school_branch'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_knowledge_domains_school_branch'
      },
      {
        fields: ['domain_type'],
        name: 'idx_knowledge_domains_type'
      },
      {
        fields: ['is_active'],
        name: 'idx_knowledge_domains_active'
      }
    ],
    comment: 'Knowledge domains for assessment (cognitive, affective, psychomotor, social, spiritual)'
  });

  KnowledgeDomain.associate = function(models) {
    // A knowledge domain has many assessment criteria
    KnowledgeDomain.hasMany(models.KnowledgeDomainCriteria, {
      foreignKey: 'domain_id',
      as: 'assessment_criteria',
      onDelete: 'CASCADE'
    });
  };

  return KnowledgeDomain;
};