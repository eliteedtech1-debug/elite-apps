module.exports = (sequelize, DataTypes) => {
  const AuditTrail = sequelize.define('AuditTrail', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM(
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
        'PAYMENT', 'REFUND', 'GRADE_CHANGE', 'PROMOTION'
      ),
      allowNull: false,
      index: true
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true
    },
    entity_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true
    },
    school_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
      index: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      index: true
    },
    is_rolled_back: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    rolled_back_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rolled_back_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rollback_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_trails',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'createdAt'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['school_id', 'createdAt'] },
      { fields: ['action', 'createdAt'] }
    ]
  });

  return AuditTrail;
};
