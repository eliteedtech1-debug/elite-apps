'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if class_id exists before renaming
    const tableDescription = await queryInterface.describeTable('recitations');
    
    if (tableDescription.class_id) {
      // Rename class_id to class_code
      await queryInterface.renameColumn('recitations', 'class_id', 'class_code');
    }
    
    // Add class_name if it doesn't exist
    if (!tableDescription.class_name) {
      await queryInterface.addColumn('recitations', 'class_name', {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: ''
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Rename back to class_id
    await queryInterface.renameColumn('recitations', 'class_code', 'class_id');
    
    // Remove class_name
    await queryInterface.removeColumn('recitations', 'class_name');
  }
};
