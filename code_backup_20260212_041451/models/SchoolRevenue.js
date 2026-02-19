const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SchoolRevenue = sequelize.define('SchoolRevenue', {
    code: {
      type: DataTypes.BIGINT.UNSIGNED.ZEROFILL,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    term: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'Each Term'
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    class_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'All Classes'
    },
    class_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    section: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    revenue_type: {
      type: DataTypes.ENUM('Fees', 'Items'),
      defaultValue: 'Fees',
      allowNull: false,
      index: true
    },
    source: {
      type: DataTypes.ENUM('School Fees', 'Other Revenue'),
      defaultValue: 'School Fees',
      allowNull: false
    },
    student_type: {
      type: DataTypes.ENUM('All', 'Returning', 'Fresh', 'None'),
      defaultValue: 'All',
      allowNull: false
    },
    is_optional: {
      type: DataTypes.ENUM('Yes', 'No'),
      defaultValue: 'No',
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active',
      allowNull: true,
      index: true
    },
    account_type: {
      type: DataTypes.ENUM('Revenue', 'Expenditure'),
      defaultValue: 'Revenue',
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      index: true
    }
  }, {
    tableName: 'school_revenues',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_school_revenues_class_code',
        fields: ['class_code']
      },
      {
        name: 'idx_school_revenues_revenue_type',
        fields: ['revenue_type']
      },
      {
        name: 'idx_school_revenues_status',
        fields: ['status']
      },
      {
        name: 'idx_school_revenues_branch_id',
        fields: ['branch_id']
      },
      {
        name: 'idx_school_revenues_school_id',
        fields: ['school_id']
      }
    ]
  });

  // Instance methods
  SchoolRevenue.prototype.getTotalAmount = function() {
    return parseFloat(this.amount || 0) * parseInt(this.quantity || 1);
  };

  SchoolRevenue.prototype.isActive = function() {
    return this.status === 'Active';
  };

  SchoolRevenue.prototype.isOptional = function() {
    return this.is_optional === 'Yes';
  };

  // Class methods
  SchoolRevenue.getActiveRevenues = async function(school_id, options = {}) {
    const where = {
      school_id,
      status: 'Active'
    };

    if (options.class_code) where.class_code = options.class_code;
    if (options.term) where.term = options.term;
    if (options.academic_year) where.academic_year = options.academic_year;
    if (options.revenue_type) where.revenue_type = options.revenue_type;
    if (options.section) where.section = options.section;

    return await this.findAll({
      where,
      order: [['revenue_type', 'ASC'], ['description', 'ASC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  SchoolRevenue.getRevenuesByClass = async function(class_code, school_id, options = {}) {
    const where = {
      class_code,
      school_id,
      status: 'Active'
    };

    if (options.term) where.term = options.term;
    if (options.academic_year) where.academic_year = options.academic_year;

    return await this.findAll({
      where,
      order: [['revenue_type', 'ASC'], ['description', 'ASC']]
    });
  };

  SchoolRevenue.getTotalRevenueByClass = async function(class_code, school_id, options = {}) {
    const where = {
      class_code,
      school_id,
      status: 'Active'
    };

    if (options.term) where.term = options.term;
    if (options.academic_year) where.academic_year = options.academic_year;
    if (options.revenue_type) where.revenue_type = options.revenue_type;

    const result = await this.findAll({
      where,
      attributes: [
        [sequelize.fn('SUM', 
          sequelize.literal('amount * quantity')
        ), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('code')), 'total_items']
      ],
      raw: true
    });

    return {
      total_amount: parseFloat(result[0]?.total_amount || 0),
      total_items: parseInt(result[0]?.total_items || 0)
    };
  };

  SchoolRevenue.getRevenuesByTerm = async function(term, academic_year, school_id, options = {}) {
    const where = {
      term,
      academic_year,
      school_id,
      status: 'Active'
    };

    if (options.class_code) where.class_code = options.class_code;
    if (options.section) where.section = options.section;
    if (options.revenue_type) where.revenue_type = options.revenue_type;

    return await this.findAll({
      where,
      order: [['class_code', 'ASC'], ['revenue_type', 'ASC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  SchoolRevenue.createRevenue = async function(revenueData, transaction = null) {
    // Generate unique code if not provided
    if (!revenueData.code) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      revenueData.code = `REV-${timestamp}-${random}`;
    }

    return await this.create(revenueData, { transaction });
  };

  SchoolRevenue.updateRevenue = async function(id, updateData, transaction = null) {
    const revenue = await this.findByPk(id);
    if (!revenue) {
      throw new Error('Revenue not found');
    }

    return await revenue.update(updateData, { transaction });
  };

  SchoolRevenue.deleteRevenue = async function(id, transaction = null) {
    const revenue = await this.findByPk(id);
    if (!revenue) {
      throw new Error('Revenue not found');
    }

    // Soft delete by setting status to 'Archived'
    return await revenue.update({ status: 'Archived' }, { transaction });
  };

  // Associations will be defined in the index.js file
  SchoolRevenue.associate = function(models) {
    // Define associations here when other models are available
    // SchoolRevenue.belongsTo(models.School, { foreignKey: 'school_id' });
    // SchoolRevenue.belongsTo(models.Branch, { foreignKey: 'branch_id' });
    // SchoolRevenue.hasMany(models.PaymentEntry, { foreignKey: 'description', sourceKey: 'description' });
  };

  return SchoolRevenue;
};