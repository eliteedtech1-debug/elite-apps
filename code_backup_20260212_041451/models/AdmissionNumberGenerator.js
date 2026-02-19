const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdmissionNumberGenerator = sequelize.define('AdmissionNumberGenerator', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school: DataTypes.STRING(100),
    class_type: DataTypes.STRING(50),
    admission_year: DataTypes.STRING(10),
    serial_no: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    type_of_school: DataTypes.STRING(50),
    last_generated_number: DataTypes.STRING(50)
  }, {
    tableName: 'admission_number_generators',
    timestamps: true
  });

  return AdmissionNumberGenerator;
};
