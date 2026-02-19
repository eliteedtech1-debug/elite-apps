'use strict';

const { ChatbotConversation, ChatbotKnowledgeBase, ChatbotIntent, SupportTicket, User } = require('../models');
const { Op } = require('sequelize');
const navigationService = require('../services/navigationService');
const chatbotActionsService = require('../services/chatbotActionsService');
const chatbotIntelligenceService = require('../services/chatbotIntelligenceService');
const chatbotWorkflowService = require('../services/chatbotWorkflowService');
const chatbotIntegrationService = require('../services/chatbotIntegrationService');

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class ChatbotController {
  constructor() {
    const appName = process.env.APP_NAME || 'Elite Scholar';
    this.defaultResponses = {
      greeting: [
        `Hello! I'm your ${appName} assistant. How can I help you today?`,
        `Hi there! I'm here to help with any questions about ${appName}. What can I do for you?`,
        `Welcome! I'm the ${appName} support bot. How may I assist you?`
      ],
      fallback: [
        "I'm not sure I understand that. Could you please rephrase your question?",
        "I didn't quite get that. Can you try asking in a different way?",
        "I'm still learning! Could you be more specific about what you need help with?"
      ],
      escalation: [
        "I'll connect you with a live support agent right away! Creating your support ticket now...",
        "Let me transfer you to our human support team who can provide personalized assistance.",
        "I understand you need to speak with a real person. Connecting you to our support agents now...",
        "No problem! I'm creating a support ticket to connect you directly with our live support team.",
        "I'll escalate this to our human agents who can give you the help you need."
      ]
    };
  }

  chat = async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user?.id || null;
      const userType = req.user?.user_type || 'guest';
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      // Prioritize headers over JWT for school/branch context
      const schoolId = req.headers['x-school-id'] || req.user?.school_id;
      const branchId = req.headers['x-branch-id'] || req.user?.branch_id;

      if (!message || !sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Message and sessionId are required'
        });
      }

      const response = await this.processMessage(message, sessionId, userId, {
        userType,
        token,
        schoolId,
        branchId
      });

      await ChatbotConversation.create({
        sessionId,
        userId,
        userMessage: message,
        botResponse: response.text,
        intent: response.intent,
        confidence: response.confidence,
        escalatedToHuman: response.escalated || false,
        ticketId: response.ticketId || null
      });

      return res.json({
        success: true,
        data: {
          response: response.text,
          intent: response.intent,
          confidence: response.confidence,
          escalated: response.escalated || false,
          ticketId: response.ticketId || null,
          suggestions: response.suggestions || [],
          openTicketModal: response.openTicketModal || false,
          navigationLink: response.primaryLink || null,
          navigationResults: response.navigationResults || []
        }
      });
    } catch (error) {
      console.error('Chatbot error:', error);
      return res.status(500).json({
        success: false,
        message: 'Sorry, I encountered an error. Please try again.',
        error: error.message
      });
    }
  }

  async processMessage(message, sessionId, userId, context = {}) {
    try {
      const normalizedMessage = message.toLowerCase().trim();

      // Check for alerts/anomalies query
      if (normalizedMessage.includes('alert') || normalizedMessage.includes('issue') || normalizedMessage.includes('problem')) {
        const alerts = await chatbotIntelligenceService.detectAnomalies(context);
        
        if (alerts.length > 0) {
          let text = '🚨 **Active Alerts**\n\n';
          alerts.forEach((alert, idx) => {
            text += `${idx + 1}. ${alert.message}\n`;
          });
          
          return {
            text,
            intent: 'anomaly_alerts',
            confidence: 0.95,
            actionButtons: alerts.map(a => ({
              type: 'action',
              label: '🔍 View Details',
              action: a.action
            })),
            suggestions: chatbotActionsService.getContextualSuggestions(userId)
          };
        } else {
          return {
            text: '✅ **All Clear!**\n\nNo issues detected. Everything is running smoothly.',
            intent: 'no_alerts',
            confidence: 0.95,
            suggestions: chatbotActionsService.getContextualSuggestions(userId)
          };
        }
      }

      if (this.isGreeting(normalizedMessage)) {
        const suggestions = chatbotActionsService.getContextualSuggestions(userId);
        const alerts = await chatbotIntelligenceService.detectAnomalies(context);
        
        let greetingText = this.getRandomResponse(this.defaultResponses.greeting);
        
        // Add alert summary to greeting if any
        if (alerts.length > 0) {
          greetingText += `\n\n⚠️ You have ${alerts.length} alert${alerts.length > 1 ? 's' : ''} that need attention.`;
        }
        
        return {
          text: greetingText,
          intent: 'greeting',
          confidence: 0.95,
          suggestions: alerts.length > 0 ? ['Show me alerts', ...suggestions.slice(0, 3)] : suggestions
        };
      }

      // Check for active workflow
      const activeWorkflow = chatbotWorkflowService.getActiveWorkflow(userId);
      if (activeWorkflow) {
        return await chatbotWorkflowService.processWorkflowInput(userId, message, context);
      }

      // Check for workflow start command
      if (chatbotWorkflowService.isWorkflowCommand(normalizedMessage)) {
        const workflowType = chatbotWorkflowService.detectWorkflowType(normalizedMessage);
        return chatbotWorkflowService.startWorkflow(userId, workflowType);
      }

      // Check for natural language queries
      if (chatbotIntelligenceService.isNaturalQuery(normalizedMessage)) {
        const result = await chatbotIntelligenceService.executeNaturalQuery(normalizedMessage, context);
        if (result) {
          // Only add personalized suggestions if none exist
          if (!result.suggestions || result.suggestions.length === 0) {
            result.suggestions = chatbotActionsService.getPersonalizedSuggestions(userId);
          }
          return result;
        }
      }

      // Check for integration commands (timetable, virtual classroom, etc.)
      if (chatbotIntegrationService.isIntegrationCommand(normalizedMessage)) {
        const result = await chatbotIntegrationService.processIntegrationCommand(normalizedMessage, userId, context);
        if (result) {
          // Only add personalized suggestions if none exist
          if (!result.suggestions || result.suggestions.length === 0) {
            result.suggestions = chatbotActionsService.getPersonalizedSuggestions(userId);
          }
          return result;
        }
      }

      if (this.needsTicketCreation(normalizedMessage)) {
        return {
          text: "I'd be happy to help you create a support ticket! You can describe your issue, and I'll create a ticket for our support team to assist you. What seems to be the problem?",
          intent: 'ticket_creation',
          confidence: 0.95,
          suggestions: [
            "Create Support Ticket",
            "Talk to a human agent",
            "Never mind, I have another question"
          ]
        };
      }

      if (this.needsEscalation(normalizedMessage)) {
        const ticket = await this.createSupportTicket(message, userId, 'agent_request');
        return {
          text: `${this.getRandomResponse(this.defaultResponses.escalation)} Your ticket #${ticket.id} has been created and our support agents will respond shortly. You can also check your support tickets in the main support chat.`,
          intent: 'escalation',
          confidence: 0.90,
          escalated: true,
          ticketId: ticket.id,
          suggestions: [
            "Open Support Chat",
            "Check my tickets",
            "What's my ticket status?"
          ]
        };
      }

      if (navigationService.detectNavigationIntent(normalizedMessage)) {
        const menu = await navigationService.getMenuForUser(
          context.userType,
          context.token,
          context.schoolId,
          context.branchId
        );
        
        const results = navigationService.findNavigationPath(normalizedMessage, menu);
        const navResponse = navigationService.generateNavigationResponse(results, normalizedMessage);
        
        if (results.length > 0) {
          return navResponse;
        }
      }

      const actionResponse = await chatbotActionsService.processAction(
        normalizedMessage,
        userId,
        { ...context, userId }
      );
      
      if (actionResponse) {
        return actionResponse;
      }

      const knowledgeAnswer = await this.searchKnowledgeBase(normalizedMessage);
      if (knowledgeAnswer) {
        return {
          text: knowledgeAnswer.answer,
          intent: knowledgeAnswer.intent || 'knowledge_base',
          confidence: knowledgeAnswer.confidence || 0.80
        };
      }

      const intentMatch = await this.matchIntent(normalizedMessage);
      if (intentMatch) {
        if (intentMatch.createsTicket) {
          const ticket = await this.createSupportTicket(message, userId);
          return {
            text: `${intentMatch.response} I've created ticket #${ticket.id} for you.`,
            intent: intentMatch.name,
            confidence: intentMatch.confidence,
            escalated: true,
            ticketId: ticket.id
          };
        }
        return {
          text: intentMatch.response,
          intent: intentMatch.name,
          confidence: intentMatch.confidence
        };
      }

      return {
        text: this.getRandomResponse(this.defaultResponses.fallback),
        intent: 'fallback',
        confidence: 0.30,
        suggestions: [
          "Where is student list?",
          "Show me attendance",
          "How do I contact support?",
          "Find payment records"
        ]
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        text: "I'm experiencing some technical difficulties. Please try again in a moment.",
        intent: 'error',
        confidence: 0.00
      };
    }
  }

  isGreeting(message) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
    const words = message.split(' ');
    return greetings.some(greeting => words.includes(greeting) || message === greeting);
  }

  // Check if message is requesting to create a ticket
  needsTicketCreation(message) {
    // Ignore if this is our own suggestion text being echoed back
    if (message.includes('create support ticket') && message.includes('click the button')) {
      return false;
    }

    const ticketKeywords = [
      'create ticket', 'open ticket', 'file ticket', 'submit ticket',
      'new ticket', 'make ticket', 'raise ticket',
      'file support', 'report issue', 'report problem', 'report bug',
      'technical support', 'i want to create a ticket', 'how do i create a ticket'
    ];

    // Only match if the message contains ticket-related action keywords
    // Don't match on the word "ticket" alone to avoid false positives
    return ticketKeywords.some(keyword => message.includes(keyword));
  }

  // Check if message needs escalation to human
  needsEscalation(message) {
    const escalationKeywords = [
      // Direct agent requests
      'speak to human', 'talk to person', 'human agent', 'real person',
      'contact support', 'talk to support', 'speak to agent', 'live agent',
      'human support', 'customer service', 'support team', 'help desk',
      'connect me to', 'transfer me to', 'escalate to', 'live chat',

      // Support contact phrases
      'how do i contact support', 'contact support team', 'get help',
      'need help from human', 'talk to someone', 'speak to someone',
      'human assistance', 'live support', 'real support',

      // Frustration indicators
      'not helpful', 'frustrated', 'angry', 'complaint', 'urgent',
      'emergency', 'critical', 'broken', 'not working', 'bug', 'error',
      'this is not working', 'you are not helping', 'i need real help'
    ];
    return escalationKeywords.some(keyword => message.includes(keyword));
  }

  // Search knowledge base for answers
  async searchKnowledgeBase(message) {
    try {
      const knowledgeEntries = await ChatbotKnowledgeBase.findAll({
        where: { isActive: true },
        order: [['priority', 'DESC']]
      });

      let bestMatch = null;
      let highestScore = 0;

      for (const entry of knowledgeEntries) {
        const score = this.calculateSimilarity(message, entry.keywords || entry.question);
        if (score > highestScore && score > 0.3) {
          highestScore = score;
          bestMatch = {
            answer: entry.answer,
            intent: entry.intent,
            confidence: score
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return null;
    }
  }

  // Match user intent
  async matchIntent(message) {
    try {
      const intents = await ChatbotIntent.findAll({
        where: { isActive: true }
      });

      let bestMatch = null;
      let highestScore = 0;

      for (const intent of intents) {
        const patterns = JSON.parse(intent.patterns);
        const responses = JSON.parse(intent.responses);
        
        for (const pattern of patterns) {
          const score = this.calculateSimilarity(message, pattern.toLowerCase());
          if (score > highestScore && score > 0.4) {
            highestScore = score;
            bestMatch = {
              name: intent.name,
              response: this.getRandomResponse(responses),
              confidence: score,
              createsTicket: intent.createsTicket,
              requiresEscalation: intent.requiresEscalation
            };
          }
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error matching intent:', error);
      return null;
    }
  }

  // Simple similarity calculation (can be enhanced with more sophisticated NLP)
  calculateSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  // Create support ticket
  async createSupportTicket(message, userId, escalationType = 'general') {
    try {
      // Ensure userId is a valid integer or null
      let validUserId = userId || null;
      if (validUserId === '' || validUserId === undefined || validUserId === 'undefined') {
        validUserId = null;
      }
      // Convert to integer if it's a string number
      if (typeof validUserId === 'string' && validUserId.trim() !== '') {
        validUserId = parseInt(validUserId, 10);
        if (isNaN(validUserId)) {
          validUserId = null;
        }
      }

      // Determine ticket details based on escalation type
      let title, description, category, priority;
      
      if (escalationType === 'agent_request') {
        title = 'Live Agent Request - Chatbot Escalation';
        description = `User requested to speak with a live support agent.\n\nOriginal message: "${message}"\n\n🤖 This ticket was created automatically by the chatbot when the user requested human assistance.\n\n⚡ Priority: User specifically requested live agent support.`;
        category = 'other';
        priority = 'high'; // Higher priority for direct agent requests
      } else {
        title = 'Chatbot Escalation';
        description = `User message: ${message}\n\nThis ticket was created automatically by the chatbot.`;
        category = 'other';
        priority = 'medium';
      }

      const ticket = await SupportTicket.create({
        user_id: validUserId,
        title,
        description,
        category,
        priority,
        status: 'open'
      });
      
      console.log(`📋 Support ticket #${ticket.id} created for ${escalationType} escalation`);
      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  // Get random response from array
  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Get conversation history
  getConversationHistory = async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { limit = 50 } = req.query;

      const conversations = await ChatbotConversation.findAll({
        where: { sessionId },
        order: [['createdAt', 'ASC']],
        limit: parseInt(limit)
      });

      return res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation history',
        error: error.message
      });
    }
  }

  // Admin: Get chatbot analytics
  getAnalytics = async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const analytics = await ChatbotConversation.findAll({
        where: {
          createdAt: {
            [Op.gte]: startDate
          }
        },
        attributes: [
          'intent',
          [ChatbotConversation.sequelize.fn('COUNT', '*'), 'count'],
          [ChatbotConversation.sequelize.fn('AVG', ChatbotConversation.sequelize.col('confidence')), 'avgConfidence']
        ],
        group: ['intent'],
        order: [[ChatbotConversation.sequelize.fn('COUNT', '*'), 'DESC']]
      });

      const totalConversations = await ChatbotConversation.count({
        where: {
          createdAt: {
            [Op.gte]: startDate
          }
        }
      });

      const escalations = await ChatbotConversation.count({
        where: {
          createdAt: {
            [Op.gte]: startDate
          },
          escalatedToHuman: true
        }
      });

      return res.json({
        success: true,
        data: {
          totalConversations,
          escalations,
          escalationRate: totalConversations > 0 ? (escalations / totalConversations * 100).toFixed(2) : 0,
          intentBreakdown: analytics
        }
      });
    } catch (error) {
      console.error('Error fetching chatbot analytics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }

  // Admin: Manage knowledge base
  addKnowledgeEntry = async (req, res) => {
    try {
      const { category, question, answer, keywords, intent, priority } = req.body;

      const entry = await ChatbotKnowledgeBase.create({
        category,
        question,
        answer,
        keywords,
        intent,
        priority: priority || 1
      });

      return res.status(201).json({
        success: true,
        message: 'Knowledge base entry created successfully',
        data: entry
      });
    } catch (error) {
      console.error('Error adding knowledge entry:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add knowledge entry',
        error: error.message
      });
    }
  }

  // Generate session ID
  generateSession = async (req, res) => {
    try {
      const sessionId = generateUUID();
      return res.json({
        success: true,
        data: { sessionId }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate session',
        error: error.message
      });
    }
  }
}

module.exports = new ChatbotController();