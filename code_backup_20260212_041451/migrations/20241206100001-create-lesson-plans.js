'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lesson_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      teacher_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      school_id: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      branch_id: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      subject_code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      class_code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      topic: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      objectives: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      teaching_methods: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resources_needed: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      assessment_methods: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      homework_assignment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lesson_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 40
      },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'approved', 'rejected'),
        defaultValue: 'draft'
      },
      admin_feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      submission_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('lesson_plans', ['teacher_id']);
    await queryInterface.addIndex('lesson_plans', ['school_id', 'branch_id']);
    await queryInterface.addIndex('lesson_plans', ['subject_code', 'class_code']);
    await queryInterface.addIndex('lesson_plans', ['lesson_date']);
    await queryInterface.addIndex('lesson_plans', ['status']);
    await queryInterface.addIndex('lesson_plans', ['teacher_id', 'lesson_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('lesson_plans');
  }
};
