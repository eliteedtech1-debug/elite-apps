module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false, // Add constraints as necessary
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Ensure unique email addresses
        validate: {
          isEmail: true, // Validate email format
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // permissions: {
      //     type: DataTypes.TEXT, // Use JSONB for flexible permissions structure
      //     allowNull: true,
      //   },
      // accessTo: {
      //   type: DataTypes.TEXT, // Use JSONB for flexible access structure
      //   allowNull: true,
      // },
      branch_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      school_id: { type: DataTypes.STRING, allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "active", "suspended"),
        allowNull: false,
        defaultValue: "pending",
      },
      last_activity: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp of user's last activity"
      },
      digital_signature: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Digital signature data (base64 or URL)"
      },
      // Account activation fields
      is_activated: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: "Account activation status (0=not activated, 1=activated)"
      },
      activation_otp: {
        type: DataTypes.STRING(6),
        allowNull: true,
        comment: "OTP for account activation"
      },
      activation_otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "OTP expiry time"
      },
      activation_otp_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of failed OTP attempts"
      },
      must_change_password: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: "Force password change on next login"
      },
      first_login_completed: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: "Whether user completed first login setup"
      },
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last password change timestamp"
      },
      activated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Account activation timestamp"
      },
      activation_method: {
        type: DataTypes.ENUM('otp_sms', 'otp_email', 'manual_admin'),
        allowNull: true,
        comment: "How account was activated"
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "User phone number (for direct storage)"
      },

    },
    {
      tableName: "users", // Correct property for specifying the table name
      timestamps: true, // Enable timestamps (createdAt, updatedAt)
      // Prevent Sequelize from modifying the table structure
      freezeTableName: true
    }
  );

  User.associate = function (models) {
    // Associate with LoginSession only if the model is present
    if (models.LoginSession) {
      User.hasMany(models.LoginSession, {
        foreignKey: 'user_id',
        as: 'loginSessions'
      });
    }
  };

  return User;
};
