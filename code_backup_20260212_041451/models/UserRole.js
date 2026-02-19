/**
 * UserRole Model for RBAC System
 * Junction table connecting users and roles with audit trail
 */

module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define(
    'UserRole',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        onDelete: 'CASCADE',
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        onDelete: 'CASCADE',
      },
      school_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'School context for this role assignment',
      },
      branch_id: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'NULL means role applies to all branches',
      },
      assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User who assigned this role',
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'NULL means no expiration',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      revoked_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revoke_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'user_roles',
      timestamps: false,
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['role_id'],
        },
        {
          fields: ['school_id'],
        },
        {
          fields: ['branch_id'],
        },
        {
          fields: ['is_active'],
        },
        {
          unique: true,
          fields: ['user_id', 'role_id', 'school_id', 'branch_id'],
          name: 'unique_user_role_school_branch',
        },
      ],
      // Prevent Sequelize from modifying the table structure
      freezeTableName: true
    }
  );

  UserRole.associate = (models) => {
    // Belongs to User
    if (models.User) {
      UserRole.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }

    // Belongs to Role
    if (models.Role) {
      UserRole.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
      });
    }

    // User who assigned the role
    if (models.User) {
      UserRole.belongsTo(models.User, {
        foreignKey: 'assigned_by',
        as: 'assigner',
      });
    }

    // User who revoked the role
    if (models.User) {
      UserRole.belongsTo(models.User, {
        foreignKey: 'revoked_by',
        as: 'revoker',
      });
    }
  };

  /**
   * Instance method to revoke this user role
   */
  UserRole.prototype.revoke = async function (revokedBy, reason = null) {
    this.is_active = false;
    this.revoked_by = revokedBy;
    this.revoked_at = new Date();
    this.revoke_reason = reason;
    return await this.save();
  };

  /**
   * Instance method to check if role is currently active
   */
  UserRole.prototype.isActive = function () {
    if (!this.is_active) return false;
    if (this.expires_at && new Date() > new Date(this.expires_at)) return false;
    return true;
  };

  return UserRole;
};
