const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const UserRoles = sequelize.define('UserRoles', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'role_id'
      }
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    accessTo: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'user_roles',
    timestamps: false
  });

  return UserRoles;
};
