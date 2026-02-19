// models/PermissionCache.js
module.exports = (sequelize, DataTypes) => {
  const PermissionCache = sequelize.define("PermissionCache", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    permissions_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'SHA256 hash of the permissions for quick comparison'
    },
    permissions_data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Cached permissions data in JSON format'
    },
    legacy_access_to: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Legacy accessTo string for backward compatibility'
    },
    legacy_permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Legacy permissions string for backward compatibility'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When this cache entry expires'
    },
    last_accessed: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "permission_cache",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['user_id', 'school_id'],
        unique: true,
        name: 'unique_user_school_cache'
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['permissions_hash']
      },
      {
        fields: ['last_accessed']
      }
    ]
  });

  PermissionCache.associate = (models) => {
    PermissionCache.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  // Instance method to check if cache is still valid
  PermissionCache.prototype.isValid = function() {
    return new Date() < this.expires_at;
  };

  // Instance method to update last accessed time
  PermissionCache.prototype.touch = function() {
    this.last_accessed = new Date();
    return this.save();
  };

  // Static method to clean expired cache entries
  PermissionCache.cleanExpired = async function() {
    return await this.destroy({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  return PermissionCache;
};