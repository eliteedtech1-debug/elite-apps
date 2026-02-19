const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  // Define the StockTransaction model
  const StockTransaction = sequelize.define('StockTransaction', {
    transaction_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false
    },
    transaction_type: {
      type: DataTypes.ENUM('Purchase', 'Sale', 'Adjustment', 'Transfer', 'Return', 'Damage'),
      allowNull: false
    },
    product_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    variant_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unit_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reference_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transaction_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'stock_transactions',
    timestamps: true,
    indexes: [
      {
        fields: ['product_id', 'transaction_date']
      },
      {
        fields: ['branch_id', 'transaction_date']
      },
      {
        fields: ['transaction_type']
      }
    ],
    // Add getter methods for computed fields
    getterMethods: {
      // Calculate total cost of transaction
      total_cost() {
        if (this.dataValues.quantity && this.dataValues.unit_cost) {
          return this.dataValues.quantity * this.dataValues.unit_cost;
        }
        return 0;
      }
    }
  });

  // Define associations for foreign key relationships
  StockTransaction.associate = (models) => {
    // Product association
    if (models.Product) {
      StockTransaction.belongsTo(models.Product, {
        foreignKey: 'product_id',
        targetKey: 'product_id',
        as: 'product'
      });
    }

    // Product Variant association
    if (models.ProductVariant) {
      StockTransaction.belongsTo(models.ProductVariant, {
        foreignKey: 'variant_id',
        targetKey: 'variant_id',
        as: 'variant'
      });
    }

    // School Location (Branch) association
    if (models.SchoolLocation) {
      StockTransaction.belongsTo(models.SchoolLocation, {
        foreignKey: 'branch_id',
        targetKey: 'branch_id',
        as: 'branch'
      });
    }

    // School Setup association
    if (models.SchoolSetup) {
      StockTransaction.belongsTo(models.SchoolSetup, {
        foreignKey: 'school_id',
        targetKey: 'school_id',
        as: 'school'
      });
    }

    // User association
    if (models.User) {
      StockTransaction.belongsTo(models.User, {
        foreignKey: 'created_by',
        targetKey: 'id',
        as: 'creator'
      });
    }

    // Purchase Order association (when reference_type is 'Purchase')
    if (models.PurchaseOrder) {
      StockTransaction.belongsTo(models.PurchaseOrder, {
        foreignKey: 'reference_id',
        targetKey: 'po_id',
        as: 'purchaseOrder',
        constraints: false  // Don't create foreign key constraint since reference_id can be other types too
      });
    }
  };

  StockTransaction.findBySchool = async (school_id, filters = {}) => {
    const whereClause = { school_id };

    if (filters.branch_id) {
      whereClause.branch_id = filters.branch_id;
    }
    if (filters.transaction_type) {
      whereClause.transaction_type = filters.transaction_type;
    }
    if (filters.product_id) {
      whereClause.product_id = filters.product_id;
    }
    if (filters.start_date && filters.end_date) {
      whereClause.transaction_date = {
        [Op.gte]: filters.start_date,
        [Op.lte]: filters.end_date,
      };
    }

    const transactions = await StockTransaction.findAll({
      where: whereClause,
      limit: filters.limit ? parseInt(filters.limit) : undefined,
      offset: filters.offset ? parseInt(filters.offset) : undefined,
      order: [['transaction_date', 'DESC'], ['createdAt', 'DESC']],
    });

    return transactions;
  };


  return StockTransaction;
};