'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const chatbotController = require('../controllers/ChatbotController');
const { authenticate: auth } = require('../middleware/auth');

// Support Ticket Routes
// Create a new support ticket
router.post('/tickets', auth, supportController.createTicket);

// Get all tickets for the authenticated user
router.get('/tickets/user', auth, supportController.getUserTickets);

// Get all tickets (admin/super admin only)
router.get('/tickets', auth, supportController.getAllTickets);

// Get details of a specific ticket including messages
router.get('/tickets/:ticketId', auth, supportController.getTicketDetails);

// Add a message to a ticket
router.post('/tickets/:ticketId/messages', auth, supportController.addMessageToTicket);

// Assign a ticket to an agent
router.put('/tickets/:ticketId/assign', auth, supportController.assignTicket);

// Update ticket status
router.put('/tickets/:ticketId/status', auth, supportController.updateTicketStatus);

// Agent Routes (for superadmin/developer)
// Get tickets for agents with filtering
router.get('/agent/tickets', auth, supportController.getAgentTickets);

// Get agent dashboard statistics
router.get('/agent/dashboard', auth, supportController.getAgentDashboard);

// Get available agents
router.get('/agent/list', auth, supportController.getAvailableAgents);

// Dashboard Analytics Routes
// Get comprehensive dashboard analytics (super admin only)
router.get('/dashboard/analytics', auth, supportController.getDashboardAnalytics);

// Get app configuration
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      appName: process.env.APP_NAME || 'Elite Scholar',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Silent error handler middleware for crash reporting
// Ensures crash reporting NEVER returns errors to the client
const silentCrashReportHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // Always return success for crash reports, even on failure
      // This prevents crash reporting from disrupting the user experience
      if (!res.headersSent) {
        res.status(200).json({
          success: true,
          message: 'Crash report received'
        });
      }
    }
  };
};

// Crash Report Routes
// Create a new crash report
router.post('/crash-reports', auth, silentCrashReportHandler(supportController.createCrashReport));

// Create crash report without authentication (for emergency error reporting)
router.post('/crash-reports-no-auth', silentCrashReportHandler(supportController.createCrashReport));

// Get all crash reports (admin/super admin only)
router.get('/crash-reports', auth, supportController.getCrashReports);

// Update crash report resolution status
router.put('/crash-reports/:reportId/resolution', auth, supportController.updateCrashReportResolution);

// App Health Indicator Routes
// Get app health indicators
router.get('/app-health', auth, supportController.getAppHealthIndicators);

// Create or update app health indicator
router.post('/app-health', auth, supportController.updateAppHealthIndicator);

// Chatbot Routes
// Generate new chat session
router.post('/chatbot/session', chatbotController.generateSession);

// Main chat endpoint
router.post('/chatbot/chat', chatbotController.chat);

// Get conversation history
router.get('/chatbot/history/:sessionId', chatbotController.getConversationHistory);

// Admin: Get chatbot analytics
router.get('/chatbot/analytics', auth, chatbotController.getAnalytics);

// Admin: Add knowledge base entry
router.post('/chatbot/knowledge', auth, chatbotController.addKnowledgeEntry);

// Test route to verify support routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Support routes are working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/support/test',
      'POST /api/support/crash-reports',
      'POST /api/support/crash-reports-no-auth',
      'GET /api/support/crash-reports',
      'PUT /api/support/crash-reports/:reportId/resolution',
      'POST /api/support/tickets',
      'GET /api/support/tickets',
      'GET /api/support/tickets/user',
      'GET /api/support/tickets/:ticketId',
      'POST /api/support/tickets/:ticketId/messages',
      'PUT /api/support/tickets/:ticketId/assign',
      'PUT /api/support/tickets/:ticketId/status',
      'GET /api/support/app-health',
      'POST /api/support/app-health',
      'POST /api/support/chatbot/session',
      'POST /api/support/chatbot/chat',
      'GET /api/support/chatbot/history/:sessionId',
      'GET /api/support/chatbot/analytics',
      'POST /api/support/chatbot/knowledge'
    ]
  });
});

module.exports = router;