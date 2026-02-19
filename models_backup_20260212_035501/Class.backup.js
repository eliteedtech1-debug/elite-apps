// models/Class.js
module.exports = (sequelize, DataTypes) => {
    const Class = sequelize.define('Class', {
      class_name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      class_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true,
        unique: true
      },
      section: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      branch_id: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      school_id: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active'
      }
    }, {
      tableName: 'classes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  
    // No associations needed for this simple model
    Class.associate = (models) => {
      // Add associations here if needed in the future
    };
  
    return Class;
  };