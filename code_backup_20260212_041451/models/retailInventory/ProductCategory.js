const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  // Define the ProductCategory model
  const ProductCategory = sequelize.define('ProductCategory', {
    category_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    category_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parent_category_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    tableName: 'product_categories',
    timestamps: true,
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true,
    indexes: [
      {
        fields: ['school_id', 'category_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Static method to find categories by school
  ProductCategory.findBySchool = async function (school_id, filters = {}) {
    const whereClause = { school_id };

    if (filters.search) {
      whereClause[Op.or] = [
        { category_name: { [Op.like]: `%${filters.search}%` } },
        { category_code: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    if (filters.is_active !== undefined) {
      whereClause.is_active = filters.is_active === 'true';
    }

    if (filters.parent_category_id) {
      whereClause.parent_category_id = filters.parent_category_id;
    }

    return await this.findAll({
      where: whereClause,
      limit: parseInt(filters.limit) || 50,
      offset: parseInt(filters.offset) || 0,
      order: [['category_name', 'ASC']]
    });
  };

  return ProductCategory;
};