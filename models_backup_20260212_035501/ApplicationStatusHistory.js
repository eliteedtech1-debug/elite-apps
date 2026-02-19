const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApplicationStatusHistory = sequelize.define('ApplicationStatusHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    applicant_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    previous_status: DataTypes.STRING(50),
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    changed_by: DataTypes.INTEGER,
    change_reason: DataTypes.TEXT,
    notes: DataTypes.TEXT
  }, {
    tableName: 'application_status_history',
    timestamps: true
  });

  ApplicationStatusHistory.associate = (models) => {
    ApplicationStatusHistory.belongsTo(models.SchoolApplicant, {
      foreignKey: 'applicant_id',
      targetKey: 'applicant_id'
    });
  };

  return ApplicationStatusHistory;
};
