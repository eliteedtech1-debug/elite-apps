'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recitation_replies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      recitation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recitations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'students',
          key: 'admission_no'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      transcript: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ai_score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('submitted', 'graded'),
        defaultValue: 'submitted'
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
    await queryInterface.addIndex('recitation_replies', ['recitation_id']);
    await queryInterface.addIndex('recitation_replies', ['student_id']);
    await queryInterface.addIndex('recitation_replies', ['status']);
    await queryInterface.addIndex('recitation_replies', ['created_at']);
    
    // Add unique constraint
    await queryInterface.addIndex('recitation_replies', ['recitation_id', 'student_id'], {
      unique: true,
      name: 'unique_student_recitation'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recitation_replies');
  }
};
