module.exports = (sequelize, DataTypes) => {
  const FacilityRoom = sequelize.define('FacilityRoom', {
    room_id: {
      type: DataTypes.STRING(20),
      primaryKey: true
    },
    room_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    room_type: {
      type: DataTypes.ENUM('Classroom', 'Laboratory', 'Library', 'Office', 'Storage', 'Hall', 'Sports', 'Other'),
      allowNull: false,
      defaultValue: 'Classroom'
    },
    room_code: {
      type: DataTypes.STRING(20)
    },
    floor_number: {
      type: DataTypes.INTEGER
    },
    capacity: {
      type: DataTypes.INTEGER
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    }
  }, {
    tableName: 'facility_rooms',
    timestamps: false
  });

  return FacilityRoom;
};
