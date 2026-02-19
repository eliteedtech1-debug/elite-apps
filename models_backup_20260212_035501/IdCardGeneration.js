const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IdCardGeneration = sequelize.define('IdCardGeneration', {
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
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'id_card_templates', key: 'id' }
    },
    student_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: { model: 'students', key: 'admission_no' }
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Academic year for card validity'
    },
    class_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Student class at time of generation'
    },
    section: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Student section at time of generation'
    },
    batch_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Batch processing identifier'
    },
    enrollment_trigger: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Generated automatically on enrollment'
    },
    card_data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Complete card data snapshot'
    },
    qr_code_data: {
      type: DataTypes.TEXT,
      comment: 'QR code content'
    },
    barcode_data: {
      type: DataTypes.STRING(100),
      comment: 'Barcode content'
    },
    pdf_url: {
      type: DataTypes.STRING(500),
      comment: 'Generated PDF file path'
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Card expiry date'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'expired'),
      defaultValue: 'pending'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error details if generation failed'
    },
    generated_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'id_card_generations',
    timestamps: true,
    underscored: true
  });

  IdCardGeneration.associate = (models) => {
    IdCardGeneration.belongsTo(models.SchoolSetup, {
      foreignKey: 'school_id',
      targetKey: 'school_id',
      as: 'school'
    });
    
    IdCardGeneration.belongsTo(models.IdCardTemplate, {
      foreignKey: 'template_id',
      as: 'template'
    });
    
    IdCardGeneration.belongsTo(models.Student, {
      foreignKey: 'student_id',
      targetKey: 'admission_no',
      as: 'student'
    });
  };

  return IdCardGeneration;
};