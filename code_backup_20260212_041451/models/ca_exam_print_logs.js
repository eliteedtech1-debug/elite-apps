module.exports = (sequelize, DataTypes) => {
  const CAExamPrintLog = sequelize.define('ca_exam_print_logs', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    submission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ca_exam_submissions', key: 'id' }
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    printed_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    print_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    print_type: {
      type: DataTypes.ENUM('Preview', 'Download', 'Print'),
      allowNull: false
    },
    copies_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    pdf_file_url: {
      type: DataTypes.STRING(500)
    },
    pdf_file_size: {
      type: DataTypes.INTEGER
    },
    ip_address: {
      type: DataTypes.STRING(45)
    },
    user_agent: {
      type: DataTypes.STRING(255)
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    tableName: 'ca_exam_print_logs',
    indexes: [
      { fields: ['submission_id'] },
      { fields: ['school_id', 'branch_id'] },
      { fields: ['printed_by'] },
      { fields: ['print_date'] }
    ]
  });

  return CAExamPrintLog;
};
