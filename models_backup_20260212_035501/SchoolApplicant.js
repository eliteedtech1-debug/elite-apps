const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SchoolApplicant = sequelize.define('SchoolApplicant', {
    applicant_id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    name_of_applicant: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    home_address: DataTypes.TEXT,
    date_of_birth: DataTypes.DATE,
    sex: DataTypes.ENUM('male', 'female'),
    guardian_name: DataTypes.STRING(255),
    guardian_phone_no: DataTypes.STRING(20),
    guardian_email: DataTypes.STRING(100),
    guardian_address: DataTypes.TEXT,
    guardian_relationship: DataTypes.STRING(50),
    parent_fullname: DataTypes.STRING(255),
    parent_phone_no: DataTypes.STRING(20),
    parent_email: DataTypes.STRING(100),
    parent_address: DataTypes.TEXT,
    parent_occupation: DataTypes.STRING(100),
    state_of_origin: DataTypes.STRING(50),
    l_g_a: DataTypes.STRING(50),
    last_school_attended: DataTypes.STRING(255),
    last_class: DataTypes.STRING(50),
    mathematics: DataTypes.INTEGER,
    english: DataTypes.INTEGER,
    other_score: DataTypes.INTEGER,
    special_health_needs: DataTypes.TEXT,
    admission_no: DataTypes.STRING(50),
    school_id: DataTypes.STRING(20),
    branch_id: DataTypes.STRING(20),
    academic_year: DataTypes.STRING(20),
    admission_token_used: DataTypes.STRING(20),
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'documents_required', 'exam_scheduled', 'approved', 'rejected', 'admitted', 'enrolled'),
      defaultValue: 'pending'
    },
    type_of_application: DataTypes.STRING(50),
    upload: DataTypes.STRING(255)
  }, {
    tableName: 'school_applicants',
    timestamps: true
  });

  SchoolApplicant.associate = (models) => {
    SchoolApplicant.hasMany(models.ApplicationStatusHistory, {
      foreignKey: 'applicant_id',
      sourceKey: 'applicant_id'
    });
  };

  return SchoolApplicant;
};
