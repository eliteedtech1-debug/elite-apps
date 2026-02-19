// models/Class.js
module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define('Class', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    class_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    class_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },

    section: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    stream: {
      type: DataTypes.ENUM(
        'Science',
        'Art',
        'Commercial',
        'Technical',
        'Vocational',
        'General',
        'Mixed',
        'None'
      ),
      allowNull: false,
      defaultValue: 'General'
    },

    branch_id: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    level: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Active'
    },
    parent_id: {
      type: DataTypes.STRING(100), // references class_code, not id
      allowNull: true,
      references: {
        model: 'classes',
        key: 'class_code'
      }
    }
  }, {
    tableName: 'classes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Self-association: arms belong to a parent class
  Class.associate = (models) => {
    Class.hasMany(Class, {
      as: 'arms',
      foreignKey: 'parent_id',
      sourceKey: 'class_code' // parent uses class_code
    });

    Class.belongsTo(Class, {
      as: 'parentClass',
      foreignKey: 'parent_id',
      targetKey: 'class_code' // child references parent's class_code
    });
  };

  // Hook to automatically update related tables when class_name changes
  Class.addHook('afterUpdate', async (classInstance, options) => {
    // Check if the class_name was changed
    if (classInstance.changed('class_name') && classInstance._previousDataValues.class_name !== classInstance.class_name) {
      const oldClassName = classInstance._previousDataValues.class_name;
      const newClassName = classInstance.class_name;
      const classCode = classInstance.class_code;
      
      console.log(`🔄 Class name changed from "${oldClassName}" to "${newClassName}" for class ${classCode}`);
      
      try {
        // Update teacher_classes table
        const [teacherRows] = await sequelize.query(
          'UPDATE teacher_classes SET class_name = :newClassName WHERE class_name = :oldClassName AND class_code = :classCode',
          {
            replacements: { newClassName, oldClassName, classCode },
            type: sequelize.QueryTypes.UPDATE,
            transaction: options.transaction
          }
        );
        
        // Update students table
        const [studentRows] = await sequelize.query(
          'UPDATE students SET class_name = :newClassName WHERE class_name = :oldClassName AND current_class = :classCode',
          {
            replacements: { newClassName, oldClassName, classCode },
            type: sequelize.QueryTypes.UPDATE,
            transaction: options.transaction
          }
        );
        
        // Update class_role table
        const [roleRows] = await sequelize.query(
          'UPDATE class_role SET class_name = :newClassName WHERE class_name = :oldClassName AND class_code = :classCode',
          {
            replacements: { newClassName, oldClassName, classCode },
            type: sequelize.QueryTypes.UPDATE,
            transaction: options.transaction
          }
        );
        
        if (teacherRows > 0 || studentRows > 0 || roleRows > 0) {
          console.log(`✅ Updated ${teacherRows} teacher_classes, ${studentRows} students, and ${roleRows} class_role records for class name change`);
        }
      } catch (error) {
        console.error('❌ Error updating related tables after class name change:', error);
      }
    }
  });

  return Class;
};