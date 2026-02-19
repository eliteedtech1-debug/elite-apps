const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SchoolLocation = sequelize.define('SchoolLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    short_name: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    code: {
      type: DataTypes.STRING(9),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    },
    personal_dev_scale:{
      type: DataTypes.ENUM('Alphabet', 'Numeric'),
      defaultValue: 'Alphabet'
    },
    admin_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    primary_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    secondary_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    enable_ca_auto_lock: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    }
  }, {
    tableName: 'school_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Add associations
  SchoolLocation.associate = (models) => {
    // Association with School
    if (models.School) {
      SchoolLocation.belongsTo(models.School, {
        foreignKey: 'school_id',
        targetKey: 'school_id',
        as: 'school'
      });
    }

    // Association with SchoolSetup
    if (models.SchoolSetup) {
      SchoolLocation.belongsTo(models.SchoolSetup, {
        foreignKey: 'school_id',
        targetKey: 'school_id',
        as: 'schoolSetup'
      });
    }

    // Association with ChartOfAccounts
    if (models.ChartOfAccounts) {
      SchoolLocation.hasMany(models.ChartOfAccounts, {
        foreignKey: 'branch_id',
        sourceKey: 'branch_id',
        as: 'chartOfAccounts'
      });
    }
  };

  // Add convenience methods for Chart of Accounts integration
  SchoolLocation.prototype.getId = function() {
    return this.branch_id;
  };

  SchoolLocation.prototype.getName = function() {
    return this.branch_name;
  };

  SchoolLocation.prototype.getSchoolId = function() {
    return this.school_id;
  };

  SchoolLocation.prototype.getLocation = function() {
    return this.location;
  };

  return SchoolLocation;
};