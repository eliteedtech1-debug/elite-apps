'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('recitation_replies', 'student_id', {
      type: Sequelize.STRING(50),
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('recitation_replies', 'student_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
