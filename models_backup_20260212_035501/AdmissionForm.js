const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdmissionForm = sequelize.define('AdmissionForm', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pupils_name: DataTypes.STRING(255),
    pupils_last_name: DataTypes.STRING(255),
    date_of_birth: DataTypes.DATE,
    religion: DataTypes.STRING(50),
    health_needs: DataTypes.TEXT,
    medical_report: DataTypes.TEXT,
    last_school: DataTypes.STRING(255),
    last_class: DataTypes.STRING(50),
    nationality: DataTypes.STRING(50),
    state_of_origin: DataTypes.STRING(50),
    town_lga: DataTypes.STRING(100),
    father_name: DataTypes.STRING(255),
    father_occupation: DataTypes.STRING(100),
    father_contact_address: DataTypes.TEXT,
    father_postal_address: DataTypes.TEXT,
    father_place_of_work: DataTypes.STRING(255),
    father_telephone: DataTypes.STRING(20),
    father_email: DataTypes.STRING(100),
    mother_name: DataTypes.STRING(255),
    mother_occupation: DataTypes.STRING(100),
    mother_address: DataTypes.TEXT,
    mother_place_of_work: DataTypes.STRING(255),
    mother_telephone: DataTypes.STRING(20),
    mother_email: DataTypes.STRING(100),
    next_of_kin: DataTypes.STRING(255),
    next_of_kin_occupation: DataTypes.STRING(100),
    next_of_kin_contact_address: DataTypes.TEXT,
    next_of_kin_email: DataTypes.STRING(100),
    next_of_kin_tel: DataTypes.STRING(20),
    student_signature: DataTypes.STRING(255),
    sponsor_signature: DataTypes.STRING(255)
  }, {
    tableName: 'admission_forms',
    timestamps: true
  });

  return AdmissionForm;
};
