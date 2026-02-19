const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Define the ProductVariant model
  const ProductVariant = sequelize.define('ProductVariant', {
    variant_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false
    },
    product_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    variant_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    variant_sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    attribute_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    attribute_value: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    additional_cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'product_variants',
    timestamps: true,
    indexes: [
      {
        fields: ['product_id', 'variant_id']
      },
      {
        fields: ['variant_sku']
      }
    ],
    uniqueKeys: {
      unique_product_variant: {
        fields: ['product_id', 'attribute_type', 'attribute_value']
      }
    }
  });

  // Find variants by product ID
  ProductVariant.findByProduct = async (product_id) => {
    const query = `
      SELECT *
      FROM product_variants
      WHERE product_id = ? AND is_active = true
      ORDER BY variant_name
    `;

    const rows = await sequelize.query(query, {
      replacements: [product_id],
      type: sequelize.QueryTypes.SELECT
    });

    return rows;
  };

  return ProductVariant;
};