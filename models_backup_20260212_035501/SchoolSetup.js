const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SchoolSetup = sequelize.define('SchoolSetup', {
    school_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false
    },
    school_name: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    school_second_name: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    section_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    short_name: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    school_motto: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lga: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    primary_contact_number: {
      type: DataTypes.STRING(13),
      allowNull: true
    },
    secondary_contact_number: {
      type: DataTypes.STRING(13),
      allowNull: true
    },
    email_address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    school_master: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    express_finance: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    cbt_center: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    result_station: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    term: {
      type: DataTypes.ENUM('First term', 'Second term', 'Third term'),
      allowNull: true
    },
    personal_dev_scale:{
      type: DataTypes.ENUM('Alphabet', 'Numeric'),
      defaultValue: 'Alphabet'
    },
    session_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    session_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'Active'
    },
    is_onboarding: {
      type: DataTypes.TINYINT(1),
      defaultValue: 1
    },
    is_arabic: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    badge_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    mission: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    vission: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    about_us: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    nursery_section: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    primary_section: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    junior_secondary_section: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    senior_secondary_section: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    islamiyya: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    tahfiz: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    school_url: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    cbt_url: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    cbt_stand_alone: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0
    },
    created_by: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    default_lang: {
      type: DataTypes.STRING(5),
      defaultValue: 'en',
      allowNull: false,
      comment: 'Primary language for the school (e.g., en, ar, fr, es)'
    },
    second_lang: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: 'Optional secondary language for bilingual schools (e.g., ar, fr, es)'
    }
  }, {
    tableName: 'school_setup',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Add associations if needed
  SchoolSetup.associate = (models) => {
    // Add associations here when other models are available
  };

  return SchoolSetup;
};

// Export alias for School model to maintain compatibility
module.exports.School = module.exports;