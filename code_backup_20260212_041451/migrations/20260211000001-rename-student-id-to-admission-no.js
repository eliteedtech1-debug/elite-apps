'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('recitation_replies', 'student_id', 'admission_no');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('recitation_replies', 'admission_no', 'student_id');
  }
};
