const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentEntry = sequelize.define('PaymentEntry', {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ref_no: {
      type: DataTypes.STRING(30),
      allowNull: false,
      index: true
    },
    admission_no: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true
    },
    class_code: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    term: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    cr: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    dr: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    item_category: {
      type: DataTypes.ENUM(
        'FEES',
        'ITEMS', 
        'DISCOUNT', 
        'FINES', 
        'PENALTY', 
        'REFUND',
        'OTHER'
      ),
      defaultValue: 'FEES',
      allowNull: false
    },
    payment_mode: {
      type: DataTypes.STRING(30),
      defaultValue: 'Cash',
      allowNull: true
    },
    payment_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Pending',
      allowNull: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      index: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'payment_entries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_payment_entries_student',
        fields: ['admission_no', 'school_id']
      },
      {
        name: 'idx_payment_entries_academic',
        fields: ['academic_year', 'term', 'school_id']
      },
      {
        name: 'idx_payment_entries_ref',
        fields: ['ref_no']
      },
      {
        name: 'idx_payment_entries_status',
        fields: ['payment_status', 'school_id']
      }
    ]
  });

  // Instance methods
  PaymentEntry.prototype.getBalance = function() {
    return parseFloat(this.cr || 0) - parseFloat(this.dr || 0);
  };

  PaymentEntry.prototype.isCredit = function() {
    return parseFloat(this.cr || 0) > 0;
  };

  PaymentEntry.prototype.isDebit = function() {
    return parseFloat(this.dr || 0) > 0;
  };

  // Class methods
  PaymentEntry.getStudentBalance = async function(admission_no, academic_year, term, school_id) {
    const result = await this.findAll({
      where: {
        admission_no,
        academic_year,
        term,
        school_id,
        payment_status: ['Pending', 'Partial']
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('cr')), 'total_cr'],
        [sequelize.fn('SUM', sequelize.col('dr')), 'total_dr']
      ],
      raw: true
    });

    const totalCr = parseFloat(result[0]?.total_cr || 0);
    const totalDr = parseFloat(result[0]?.total_dr || 0);
    return totalCr - totalDr;
  };

  PaymentEntry.getStudentPayments = async function(admission_no, school_id, options = {}) {
    const where = {
      admission_no,
      school_id
    };

    if (options.academic_year) where.academic_year = options.academic_year;
    if (options.term) where.term = options.term;
    if (options.payment_status) where.payment_status = options.payment_status;

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  PaymentEntry.getClassBills = async function(class_code, school_id, options = {}) {
    const where = {
      class_code,
      school_id
    };

    if (options.academic_year) where.academic_year = options.academic_year;
    if (options.term) where.term = options.term;
    if (options.payment_status) where.payment_status = options.payment_status;

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  // Associations will be defined in the index.js file
  PaymentEntry.associate = function(models) {
    // Define associations here when other models are available
    // PaymentEntry.belongsTo(models.Student, { foreignKey: 'admission_no', targetKey: 'admission_no' });
    // PaymentEntry.belongsTo(models.School, { foreignKey: 'school_id' });
    // PaymentEntry.belongsTo(models.Branch, { foreignKey: 'branch_id' });
  };

  return PaymentEntry;
};