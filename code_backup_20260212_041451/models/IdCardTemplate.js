const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IdCardTemplate = sequelize.define('IdCardTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: { model: 'school_setup', key: 'school_id' }
    },
    branch_id: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    template_type: {
      type: DataTypes.ENUM('student', 'staff', 'visitor'),
      defaultValue: 'student'
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Academic year for card validity'
    },
    class_filter: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Class codes/sections for template filtering'
    },
    section_filter: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Section filtering for template'
    },
    layout_config: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Template layout configuration'
    },
    school_logo_url: {
      type: DataTypes.STRING(500)
    },
    background_image_url: {
      type: DataTypes.STRING(500)
    },
    validity_period: {
      type: DataTypes.INTEGER,
      defaultValue: 365,
      comment: 'Card validity in days'
    },
    auto_generate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Auto-generate on enrollment'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'id_card_templates',
    timestamps: true,
    underscored: true
  });

  IdCardTemplate.associate = (models) => {
    IdCardTemplate.belongsTo(models.SchoolSetup, {
      foreignKey: 'school_id',
      targetKey: 'school_id',
      as: 'school'
    });
    
    IdCardTemplate.hasMany(models.IdCardGeneration, {
      foreignKey: 'template_id',
      as: 'generations'
    });
  };

  return IdCardTemplate;
};