'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recitation_feedbacks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      reply_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recitation_replies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      teacher_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      grade: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('recitation_feedbacks', ['reply_id']);
    await queryInterface.addIndex('recitation_feedbacks', ['teacher_id']);
    await queryInterface.addIndex('recitation_feedbacks', ['grade']);
    await queryInterface.addIndex('recitation_feedbacks', ['created_at']);
    await queryInterface.addIndex('recitation_feedbacks', ['reply_id', 'teacher_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recitation_feedbacks');
  }
};
