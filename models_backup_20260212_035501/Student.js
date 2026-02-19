const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Student = sequelize.define(
    'Student',
    {
      app_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      parent_id: {
        type: DataTypes.STRING(25),
        allowNull: true,
      },
      guardian_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      student_name: { type: DataTypes.STRING(300), allowNull: true },
      surname: { type: DataTypes.STRING(100), allowNull: false },
      first_name: { type: DataTypes.STRING(100), allowNull: false },
      other_names: { type: DataTypes.STRING(100), allowNull: true },

      user_type: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'Student',
      },
      home_address: { type: DataTypes.TEXT, allowNull: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      sex: { type: DataTypes.STRING(10), allowNull: true },
      religion: { type: DataTypes.STRING(50), allowNull: true },
      tribe: { type: DataTypes.STRING(50), allowNull: true },
      state_of_origin: { type: DataTypes.STRING(100), allowNull: true },
      l_g_a: { type: DataTypes.STRING(100), allowNull: true },
      nationality: { type: DataTypes.STRING(100), allowNull: true },
      last_school_attended: { type: DataTypes.STRING(100), allowNull: true },
      special_health_needs: { type: DataTypes.STRING(100), allowNull: true },
      blood_group: { type: DataTypes.STRING(100), allowNull: true },

      admission_no: {
        type: DataTypes.STRING(50),
        allowNull: false, // 👈 Should NOT be null — it's your PK!
        primaryKey: true,
      },

      admission_date: { type: DataTypes.DATEONLY, allowNull: true },
      academic_year: { type: DataTypes.STRING(20), allowNull: true },
      status: {
        type: DataTypes.STRING(100),
        defaultValue: 'Active',
        allowNull: true,
      },
      student_type: {
        type: DataTypes.ENUM('Fresh', 'Returning', 'Alumni'),
        allowNull: true,
        defaultValue: 'Returning',
      },
      section: { type: DataTypes.STRING(100), allowNull: true },
      stream: {
      type: DataTypes.ENUM(
        'Science',
        'Art',
        'Commercial',
        'Technical',
        'Vocational',
        'General',
        'None'
      ),
      allowNull: false,
      defaultValue: 'General'
    },
      mother_tongue: { type: DataTypes.STRING(100), allowNull: true },
      language_known: { type: DataTypes.STRING(100), allowNull: true },
      current_class: { type: DataTypes.STRING(50), allowNull: true },
      class_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Standardized class identifier'
      },
      class_name: { type: DataTypes.STRING(50), allowNull: true },
      profile_picture: { type: DataTypes.STRING(300), allowNull: true },
      medical_condition: { type: DataTypes.STRING(300), allowNull: true },
      transfer_certificate: { type: DataTypes.STRING(500), allowNull: true },
      branch_id: { type: DataTypes.STRING(200), allowNull: false },
      school_id: { type: DataTypes.STRING(20), allowNull: false },
      password: { type: DataTypes.STRING(255), allowNull: false },

      // Scholarship fields
      scholarship_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
        validate: {
          min: 0.00,
          max: 100.00
        }
      },
      scholarship_type: {
        type: DataTypes.ENUM('None', 'Merit', 'Need-based', 'Sports', 'Academic', 'Other'),
        allowNull: true,
        defaultValue: 'None'
      },
      scholarship_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      scholarship_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      scholarship_notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      // Credit balance for overpayments and future bill settlements
      credit_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Student credit balance for future bill settlements'
      },

      // VIRTUAL field — computed, not stored
      // student_name: {
      //   type: DataTypes.VIRTUAL,
      //   get() {
      //     const parts = [
      //       this.getDataValue('surname'),
      //       this.getDataValue('first_name'),
      //       this.getDataValue('other_names')
      //     ].filter(Boolean);
      //     return parts.join(' ');
      //   },
      //   set(value) {
      //     if (typeof value !== 'string' || !value.trim()) {
      //       throw new Error('student_name must be a non-empty string');
      //     }
      //     const parts = value.trim().split(/\s+/);
      //     if (parts.length < 2) {
      //       throw new Error('Student name must include at least surname and first name');
      //     }
      //     this.setDataValue('surname', parts[0]);
      //     this.setDataValue('first_name', parts[1]);
      //     this.setDataValue('other_names', parts.slice(2).join(' ') || null);
      //   }
      // }
    },
    {
      tableName: 'students',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      hooks: {
        beforeCreate(student) {
          if (student.current_class && !student.class_code) {
            student.class_code = student.current_class;
          }
          if (student.class_code && !student.current_class) {
            student.current_class = student.class_code;
          }
        },
        beforeUpdate(student) {
          if (student.changed('current_class')) {
            student.class_code = student.current_class;
          }
          if (student.changed('class_code')) {
            student.current_class = student.class_code;
          }
        }
      }
    }
  );

  return Student;
};