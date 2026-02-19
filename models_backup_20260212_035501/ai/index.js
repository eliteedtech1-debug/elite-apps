const { aiDB } = require('../../config/databases');

const ChatbotConversation = require('./ChatbotConversation')(aiDB, aiDB.Sequelize.DataTypes);
const ChatbotIntent = require('./ChatbotIntent')(aiDB, aiDB.Sequelize.DataTypes);
const ChatbotKnowledgeBase = require('./ChatbotKnowledgeBase')(aiDB, aiDB.Sequelize.DataTypes);

module.exports = {
  sequelize: aiDB,
  ChatbotConversation,
  ChatbotIntent,
  ChatbotKnowledgeBase
};
