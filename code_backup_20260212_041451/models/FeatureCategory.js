module.exports = (sequelize, DataTypes) => {
  const FeatureCategory = sequelize.define("FeatureCategory", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(7), // e.g. #1677ff
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: "feature_categories",
    timestamps: false,
  });

  FeatureCategory.associate = (models) => {
    FeatureCategory.hasMany(models.Feature, {
      foreignKey: "category_id",
      as: "features",
    });
  };

  return FeatureCategory;
};
