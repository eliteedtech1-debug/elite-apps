'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recitations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      class_code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      class_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      audio_url: {
        type: Sequelize.STRING(1024),
        allowNull: false
      },
      audio_public_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      audio_format: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      duration_seconds: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      allow_replies: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      due_date: {
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
    await queryInterface.addIndex('recitations', ['teacher_id']);
    await queryInterface.addIndex('recitations', ['class_id']);
    await queryInterface.addIndex('recitations', ['due_date']);
    await queryInterface.addIndex('recitations', ['created_at']);
    await queryInterface.addIndex('recitations', ['teacher_id', 'class_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recitations');
  }
};
