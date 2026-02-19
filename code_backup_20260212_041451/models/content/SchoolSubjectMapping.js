module.exports = (sequelize, DataTypes) => {
  const SchoolSubjectMapping = sequelize.define('SchoolSubjectMapping', {
    // Auto-generated from school_subject_mapping table
    // TODO: Add proper field definitions based on schema
  }, {
    tableName: 'school_subject_mapping',
    timestamps: true,
    underscored: true
  });

  SchoolSubjectMapping.associate = (models) => {
    // TODO: Define associations
  };

  return SchoolSubjectMapping;
};
