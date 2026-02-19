/**
 * CA Setup Model
 * Configuration for CA and Exam schedules
 * Note: This is a long-term configuration without academic_year/term
 */

module.exports = (sequelize, DataTypes) => {
  const CASetup = sequelize.define('ca_setup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ca_type: {
      type: DataTypes.ENUM('CA1', 'CA2', 'CA3', 'CA4', 'CA', 'TEST', 'TEST1', 'TEST2', 'TEST3', 'TEST4', 'EXAM'),
      allowNull: false
    },
    week_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Week number in academic calendar'
    },
    max_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    overall_contribution_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Contribution to overall grade (%)'
    },
    is_locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this week is locked for score entry'
    },
    school_id: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    },
    section: {
      type: DataTypes.STRING(20),
      defaultValue: 'All',
      comment: 'Section/Level (All, NURSERY, PRIMARY, etc.)'
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
    tableName: 'ca_setup',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'unique_ca_week',
        fields: ['ca_type', 'branch_id', 'section', 'week_number'],
        unique: true
      },
      {
        fields: ['status']
      }
    ]
  });

  return CASetup;
};
