const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const SchoolAccessAudit = sequelize.define('SchoolAccessAudit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('GRANT', 'REVOKE', 'UPDATE'),
      allowNull: false
    },
    feature_key: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    permission_key: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    old_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    new_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'school_access_audit',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return SchoolAccessAudit;
};
