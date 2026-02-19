const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  // Define the Supplier model
  const Supplier = sequelize.define('Supplier', {
    supplier_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false
    },
    supplier_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    contact_person: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_terms: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    rating: {
      type: DataTypes.ENUM('Excellent', 'Good', 'Fair', 'Poor'),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'suppliers',
    timestamps: true,
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true,
    indexes: [
      {
        fields: ['school_id', 'supplier_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  Supplier.findBySchool = async function (school_id, filters = {}) {
    const where = { school_id };

    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.rating) where.rating = filters.rating;
    if (filters.search) {
      where[Op.or] = [
        { supplier_name: { [Op.like]: `%${filters.search}%` } },
        { contact_person: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    return await Supplier.findAll({
      where,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      order: [['createdAt', 'DESC']]
    });
  };

  return Supplier;
};