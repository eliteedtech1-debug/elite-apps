module.exports = (sequelize, DataTypes) => {
  const Remarks = sequelize.define('remarks', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    admission_no: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    class_code: {
      type: DataTypes.STRING(50)
    },
    academic_year: {
      type: DataTypes.STRING(20)
    },
    term: {
      type: DataTypes.STRING(50)
    },
    remark_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    remark: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'exam_remarks',
    timestamps: true
  });

  return Remarks;
};
