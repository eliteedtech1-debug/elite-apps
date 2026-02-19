module.exports = (sequelize, DataTypes) => {
  const GradeBoundary = sequelize.define('GradeBoundary', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Made nullable to handle legacy data
      references: {
        model: 'ca_groups',
        key: 'id'
      },
      comment: 'Reference to the CA group these grade boundaries apply to (nullable for legacy compatibility)'
    },
    grade: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Grade letter or symbol (e.g., A+, A, B, C, D, F)'
    },
    min_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Minimum percentage for this grade'
    },
    max_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Maximum percentage for this grade'
    },
    remark: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Remark or description for this grade (e.g., Excellent, Good, Fair)'
    },
    grade_point: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Grade point value for GPA calculation (optional)'
    },
    is_passing: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this grade is considered a passing grade'
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'School identifier'
    },
    branch_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Branch identifier'
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who created this grade boundary'
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User who last updated this grade boundary'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'grade_boundaries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Note: Indexes are commented out to prevent migration errors
    // They should be created manually after ensuring table structure is correct
    // indexes: [
    //   {
    //     unique: true,
    //     fields: ['group_id', 'grade'],
    //     name: 'unique_grade_per_group'
    //   },
    //   {
    //     fields: ['group_id'],
    //     name: 'idx_grade_boundaries_group'
    //   },
    //   {
    //     fields: ['min_percentage'],
    //     name: 'idx_grade_boundaries_min_percentage'
    //   },
    //   {
    //     fields: ['max_percentage'],
    //     name: 'idx_grade_boundaries_max_percentage'
    //   },
    //   {
    //     fields: ['school_id', 'branch_id'],
    //     name: 'idx_grade_boundaries_school_branch'
    //   },
    //   {
    //     fields: ['is_passing'],
    //     name: 'idx_grade_boundaries_passing'
    //   }
    // ],
    comment: 'Grade boundaries shared by all CAs and Exam within a CA group'
  });

  GradeBoundary.associate = function(models) {
    // A grade boundary belongs to a CA group
    GradeBoundary.belongsTo(models.CAGroup, {
      foreignKey: 'group_id',
      as: 'ca_group'
    });
  };

  return GradeBoundary;
};