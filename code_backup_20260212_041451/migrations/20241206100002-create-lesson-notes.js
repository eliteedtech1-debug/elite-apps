'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lesson_notes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      lesson_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lesson_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      lesson_summary: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      student_participation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      challenges_faced: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      improvements_needed: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      next_lesson_preparation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lesson_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      actual_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      attendance_count: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'reviewed'),
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
    await queryInterface.addIndex('lesson_notes', ['lesson_plan_id']);
    await queryInterface.addIndex('lesson_notes', ['teacher_id']);
    await queryInterface.addIndex('lesson_notes', ['school_id', 'branch_id']);
    await queryInterface.addIndex('lesson_notes', ['subject_code', 'class_code']);
    await queryInterface.addIndex('lesson_notes', ['lesson_date']);
    await queryInterface.addIndex('lesson_notes', ['status']);
    await queryInterface.addIndex('lesson_notes', ['teacher_id', 'lesson_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('lesson_notes');
  }
};
