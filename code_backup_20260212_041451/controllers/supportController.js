'use strict';

const { SupportTicket, TicketMessage, CrashReport, AppHealthIndicator, User } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');

class SupportController {
  // Create a new support ticket
  async createTicket(req, res) {
    try {
      const {
        title,
        description,
        category,
        priority,
        anonymous_name,
        anonymous_email,
        anonymous_phone
      } = req.body;

      // Ensure userId is a valid integer or null
      let userId = req.user?.id || null;
      if (userId === '' || userId === undefined || userId === 'undefined') {
        userId = null;
      }
      // Convert to integer if it's a string number
      if (typeof userId === 'string' && userId.trim() !== '') {
        userId = parseInt(userId, 10);
        if (isNaN(userId)) {
          userId = null;
        }
      }

      // Use raw SQL to avoid .tap issues
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

      console.log('🔧 Creating support ticket with raw SQL to avoid .tap issues...');
      console.log('📋 User ID:', userId, '| Anonymous:', !userId ? 'Yes' : 'No');

      const insertTicketSQL = `
        INSERT INTO support_tickets (
          user_id,
          anonymous_name,
          anonymous_email,
          anonymous_phone,
          title,
          description,
          category,
          priority,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertTicketValues = [
        userId,
        anonymous_name || null,
        anonymous_email || null,
        anonymous_phone || null,
        title,
        description,
        category,
        priority,
        'open',
        currentTimestamp,
        currentTimestamp
      ];
      
      // Execute raw SQL without transaction to avoid Sequelize .tap issues
      const [insertResult] = await db.sequelize.query(insertTicketSQL, {
        replacements: insertTicketValues,
        type: db.sequelize.QueryTypes.INSERT
      });
      
      const newTicketId = insertResult;
      
      console.log('✅ Support ticket created successfully with ID:', newTicketId);
      
      // Create a mock object for response (similar to Sequelize model)
      const ticket = {
        id: newTicketId,
        user_id: userId,
        title,
        description,
        category,
        priority,
        status: 'open',
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      };

      return res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create support ticket',
        error: error.message
      });
    }
  }

  // Get all tickets for a user
  async getUserTickets(req, res) {
    try {
      const userId = req.user?.id || null;
      const { status, category } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const whereConditions = { user_id: userId };
      
      if (status) whereConditions.status = status;
      if (category) whereConditions.category = category;

      const tickets = await SupportTicket.findAll({
        where: whereConditions,
        attributes: ['id', 'user_id', 'assigned_to', 'title', 'description', 'status', 'priority', 'category', 'created_at', 'updated_at'], // Exclude anonymous fields that might not exist in DB
        include: [
          {
            model: User,
            as: 'assignedAgent',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message
      });
    }
  }

  // Get all tickets (for admin/super admin)
  async getAllTickets(req, res) {
    try {
      const { status, category, priority, page = 1, limit = 10 } = req.query;
      
      const whereConditions = {};
      
      if (status) whereConditions.status = status;
      if (category) whereConditions.category = category;
      if (priority) whereConditions.priority = priority;

      const offset = (page - 1) * limit;

      const { count, rows: tickets } = await SupportTicket.findAndCountAll({
        where: whereConditions,
        attributes: ['id', 'user_id', 'assigned_to', 'title', 'description', 'status', 'priority', 'category', 'created_at', 'updated_at'], // Exclude anonymous fields that might not exist in DB
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'assignedAgent',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message
      });
    }
  }

  // Get ticket details with messages
  async getTicketDetails(req, res) {
    try {
      const { ticketId } = req.params;
      
      const ticket = await SupportTicket.findByPk(ticketId, {
        attributes: ['id', 'user_id', 'assigned_to', 'title', 'description', 'status', 'priority', 'category', 'created_at', 'updated_at'], // Exclude anonymous fields that might not exist in DB
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'assignedAgent',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      const messages = await TicketMessage.findAll({
        where: { ticket_id: ticketId },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        }],
        order: [['created_at', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: {
          ticket,
          messages
        }
      });
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket details',
        error: error.message
      });
    }
  }

  // Add message to ticket
  async addMessageToTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { message } = req.body;
      const userId = req.user?.id || null;

      const ticket = await SupportTicket.findByPk(ticketId, {
        attributes: ['id', 'user_id', 'assigned_to', 'title', 'description', 'status', 'priority', 'category', 'created_at', 'updated_at'] // Exclude anonymous fields that might not exist in DB
      });
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Check if user is an agent (superadmin or developer)
      const isAgent = req.user?.user_type === 'superadmin' || 
                     req.user?.user_type === 'developer' || 
                     req.user?.user_type === 'SuperAdmin' ||
                     req.user?.user_type === 'Developer';

      // Use raw SQL to avoid .tap issues
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      console.log('🔧 Creating ticket message with raw SQL to avoid .tap issues...');

      const insertMessageSQL = `
        INSERT INTO ticket_messages (
          ticket_id, sender_id, message, is_from_user, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const insertMessageValues = [
        ticketId,
        userId,
        message,
        !isAgent, // is_from_user
        currentTimestamp,
        currentTimestamp
      ];
      
      // Execute raw SQL without transaction to avoid Sequelize .tap issues
      const [insertResult] = await db.sequelize.query(insertMessageSQL, {
        replacements: insertMessageValues,
        type: db.sequelize.QueryTypes.INSERT
      });
      
      const newMessageId = insertResult;
      
      console.log('✅ Ticket message created successfully with ID:', newMessageId);
      
      // Create a mock object for response (similar to Sequelize model)
      const ticketMessage = {
        id: newMessageId,
        ticketId,
        senderId: userId,
        message,
        isFromUser: !isAgent,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      };

      // Update ticket status to in-progress if it was open and message is from agent
      if (ticket.status === 'open' && isAgent) {
        const updateTicketSQL = `
          UPDATE support_tickets 
          SET status = ?, assigned_to = ?, updated_at = ? 
          WHERE id = ?
        `;
        
        await db.sequelize.query(updateTicketSQL, {
          replacements: ['in-progress', userId, currentTimestamp, ticketId],
          type: db.sequelize.QueryTypes.UPDATE
        });
        
        console.log('✅ Ticket status updated to in-progress and assigned to agent:', userId);
      }

      // Include sender information in the response using raw SQL
      const messageWithSenderSQL = `
        SELECT 
          tm.id, tm.ticket_id, tm.sender_id, tm.message, tm.is_from_user, 
          tm.created_at, tm.updated_at,
          u.id as sender_id, u.name as sender_name, u.email as sender_email, u.user_type as sender_user_type
        FROM ticket_messages tm
        LEFT JOIN users u ON tm.sender_id = u.id
        WHERE tm.id = ?
      `;
      
      const [messageWithSenderResult] = await db.sequelize.query(messageWithSenderSQL, {
        replacements: [newMessageId],
        type: db.sequelize.QueryTypes.SELECT
      });
      
      // Format the response to match expected structure
      const messageWithSender = {
        id: messageWithSenderResult?.id || newMessageId,
        ticketId: messageWithSenderResult?.ticket_id || ticketId,
        senderId: messageWithSenderResult?.sender_id || userId,
        message: messageWithSenderResult?.message || message,
        isFromUser: messageWithSenderResult?.is_from_user || !isAgent,
        createdAt: messageWithSenderResult?.created_at || currentTimestamp,
        updatedAt: messageWithSenderResult?.updated_at || currentTimestamp,
        sender: messageWithSenderResult ? {
          id: messageWithSenderResult.sender_id,
          name: messageWithSenderResult.sender_name,
          email: messageWithSenderResult.sender_email,
          user_type: messageWithSenderResult.sender_user_type
        } : null
      };

      return res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: messageWithSender
      });
    } catch (error) {
      console.error('Error adding message to ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add message',
        error: error.message
      });
    }
  }

  // Assign ticket to agent
  async assignTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { agentId } = req.body;

      // Use raw SQL to check if ticket exists
      const findTicketSQL = `SELECT * FROM support_tickets WHERE id = ?`;
      const [ticket] = await db.sequelize.query(findTicketSQL, {
        replacements: [ticketId],
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Use raw SQL to update ticket assignment
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateTicketSQL = `
        UPDATE support_tickets 
        SET assigned_to = ?, updated_at = ? 
        WHERE id = ?
      `;
      
      await db.sequelize.query(updateTicketSQL, {
        replacements: [agentId, currentTimestamp, ticketId],
        type: db.sequelize.QueryTypes.UPDATE
      });

      // Get updated ticket data
      const [updatedTicket] = await db.sequelize.query(findTicketSQL, {
        replacements: [ticketId],
        type: db.sequelize.QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        message: 'Ticket assigned successfully',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to assign ticket',
        error: error.message
      });
    }
  }

  // Update ticket status
  async updateTicketStatus(req, res) {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      // Use raw SQL to check if ticket exists
      const findTicketSQL = `SELECT * FROM support_tickets WHERE id = ?`;
      const [ticket] = await db.sequelize.query(findTicketSQL, {
        replacements: [ticketId],
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Use raw SQL to update ticket status
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateTicketSQL = `
        UPDATE support_tickets 
        SET status = ?, updated_at = ? 
        WHERE id = ?
      `;
      
      await db.sequelize.query(updateTicketSQL, {
        replacements: [status, currentTimestamp, ticketId],
        type: db.sequelize.QueryTypes.UPDATE
      });

      // Get updated ticket data
      const [updatedTicket] = await db.sequelize.query(findTicketSQL, {
        replacements: [ticketId],
        type: db.sequelize.QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        message: 'Ticket status updated successfully',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update ticket status',
        error: error.message
      });
    }
  }

  // Create crash report
  async createCrashReport(req, res) {
    try {
      const {
        errorMessage,
        stackTrace,
        componentStack,
        url,
        userAgent,
        deviceInfo,
        appVersion,
        os,
        browser,
        type,
        severity,
        userId,
        schoolId,
        branchId
      } = req.body;

      // Use raw SQL to avoid .tap issues
      let finalUserId = userId || req.user?.id || null;
      const finalSchoolId = schoolId || req.user?.schoolId || null;
      const finalBranchId = branchId || req.user?.branchId || null;
      
      // Validate user_id exists if provided
      if (finalUserId) {
        const [userExists] = await db.sequelize.query(
          'SELECT id FROM users WHERE id = ? LIMIT 1',
          {
            replacements: [finalUserId],
            type: db.sequelize.QueryTypes.SELECT
          }
        );
        // If user doesn't exist, set to null to avoid foreign key constraint error
        if (!userExists) {
          finalUserId = null;
        }
      }
      
      const finalDeviceInfo = deviceInfo ? JSON.stringify(deviceInfo) : null;
      const finalSeverity = severity || 'medium';
      const finalType = type || 'generic_error';
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Use a simplified INSERT that relies on database defaults for timestamps
      const insertCrashReportSQL = `
        INSERT INTO crash_reports (
          user_id, school_id, branch_id, error_message, stack_trace,
          component_stack, url, user_agent, device_info, app_version,
          os, browser, type, severity, resolved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertCrashReportValues = [
        finalUserId,
        finalSchoolId,
        finalBranchId,
        errorMessage || 'No error message provided',
        stackTrace || 'No stack trace available',
        componentStack || null,
        url || 'Unknown URL',
        userAgent || 'Unknown User Agent',
        finalDeviceInfo,
        appVersion || 'Unknown Version',
        os || 'Unknown OS',
        browser || 'Unknown Browser',
        finalType,
        finalSeverity,
        false // resolved
      ];

      // Execute raw SQL without transaction to avoid Sequelize .tap issues
      const [insertResult] = await db.sequelize.query(insertCrashReportSQL, {
        replacements: insertCrashReportValues,
        type: db.sequelize.QueryTypes.INSERT
      });

      const newCrashReportId = insertResult;

      // Create a mock object for response (similar to Sequelize model)
      const crashReport = {
        id: newCrashReportId,
        userId: finalUserId,
        schoolId: finalSchoolId,
        branchId: finalBranchId,
        errorMessage: errorMessage || 'No error message provided',
        stackTrace: stackTrace || 'No stack trace available',
        componentStack: componentStack || null,
        url: url || 'Unknown URL',
        userAgent: userAgent || 'Unknown User Agent',
        deviceInfo: finalDeviceInfo,
        appVersion: appVersion || 'Unknown Version',
        os: os || 'Unknown OS',
        browser: browser || 'Unknown Browser',
        type: finalType,
        severity: finalSeverity,
        resolved: false,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      };

      return res.status(201).json({
        success: true,
        message: 'Crash report submitted successfully',
        data: crashReport
      });
    } catch (error) {
      // SILENT ERROR HANDLING - Always return success to prevent user-visible errors
      // Crash reporting should NEVER fail from the user's perspective
      // Even if DB constraints fail, we return 200 OK to keep the app running smoothly
      return res.status(200).json({
        success: true,
        message: 'Crash report received'
      });
    }
  }

  // Get crash reports (for admin/super admin)
  async getCrashReports(req, res) {
    try {
      const { days = 30, resolved, severity, type, page = 1, limit = 10 } = req.query;
      
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');

      // Build WHERE conditions for raw SQL
      let whereClause = `WHERE created_at >= ?`;
      const queryParams = [formattedStartDate];
      
      if (resolved !== undefined) {
        whereClause += ` AND resolved = ?`;
        queryParams.push(resolved === 'true' ? 1 : 0);
      }
      if (severity) {
        whereClause += ` AND severity = ?`;
        queryParams.push(severity);
      }
      if (type) {
        whereClause += ` AND type = ?`;
        queryParams.push(type);
      }

      const offset = (page - 1) * limit;

      // Get total count using raw SQL
      const countSQL = `
        SELECT COUNT(*) as total 
        FROM crash_reports 
        ${whereClause}
      `;
      
      const [countResult] = await db.sequelize.query(countSQL, {
        replacements: queryParams,
        type: db.sequelize.QueryTypes.SELECT
      });
      
      const totalCount = countResult.total;

      // Get paginated results using raw SQL
      const reportsSQL = `
        SELECT 
          cr.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM crash_reports cr
        LEFT JOIN users u ON cr.user_id = u.id
        ${whereClause}
        ORDER BY cr.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const reports = await db.sequelize.query(reportsSQL, {
        replacements: [...queryParams, parseInt(limit), parseInt(offset)],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Format the results to match expected structure
      const formattedReports = reports.map(report => ({
        id: report.id,
        userId: report.user_id,
        schoolId: report.school_id,
        branchId: report.branch_id,
        errorMessage: report.error_message,
        stackTrace: report.stack_trace,
        componentStack: report.component_stack,
        url: report.url,
        userAgent: report.user_agent,
        deviceInfo: report.device_info ? JSON.parse(report.device_info) : null,
        appVersion: report.app_version,
        os: report.os,
        browser: report.browser,
        type: report.type,
        severity: report.severity,
        resolved: Boolean(report.resolved),
        resolutionNotes: report.resolution_notes,
        timestamp: report.timestamp,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        user: report.user_name ? {
          id: report.user_id,
          name: report.user_name,
          email: report.user_email
        } : null
      }));

      return res.status(200).json({
        success: true,
        data: formattedReports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('❌ Error fetching crash reports:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch crash reports',
        error: error.message
      });
    }
  }

  // Update crash report resolution status
  async updateCrashReportResolution(req, res) {
    try {
      const { reportId } = req.params;
      const { resolved, resolutionNotes } = req.body;

      console.log('🔧 Updating crash report resolution with raw SQL...');
      console.log('📊 Update data:', { reportId, resolved, resolutionNotes });

      // Use raw SQL to check if crash report exists
      const findReportSQL = `SELECT * FROM crash_reports WHERE id = ?`;
      const [report] = await db.sequelize.query(findReportSQL, {
        replacements: [reportId],
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Crash report not found'
        });
      }

      // Use raw SQL to update crash report (let database handle updated_at with ON UPDATE CURRENT_TIMESTAMP)
      const updateReportSQL = `
        UPDATE crash_reports 
        SET resolved = ?, resolution_notes = ?
        WHERE id = ?
      `;
      
      await db.sequelize.query(updateReportSQL, {
        replacements: [resolved ? 1 : 0, resolutionNotes || null, reportId],
        type: db.sequelize.QueryTypes.UPDATE
      });

      console.log('✅ Crash report resolution updated successfully for ID:', reportId);

      // Get updated report data
      const [updatedReport] = await db.sequelize.query(findReportSQL, {
        replacements: [reportId],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Format the response to match expected structure
      const formattedReport = {
        id: updatedReport.id,
        userId: updatedReport.user_id,
        schoolId: updatedReport.school_id,
        branchId: updatedReport.branch_id,
        errorMessage: updatedReport.error_message,
        stackTrace: updatedReport.stack_trace,
        componentStack: updatedReport.component_stack,
        url: updatedReport.url,
        userAgent: updatedReport.user_agent,
        deviceInfo: updatedReport.device_info ? JSON.parse(updatedReport.device_info) : null,
        appVersion: updatedReport.app_version,
        os: updatedReport.os,
        browser: updatedReport.browser,
        type: updatedReport.type,
        severity: updatedReport.severity,
        resolved: Boolean(updatedReport.resolved),
        resolutionNotes: updatedReport.resolution_notes,
        timestamp: updatedReport.timestamp,
        createdAt: updatedReport.created_at,
        updatedAt: updatedReport.updated_at
      };

      return res.status(200).json({
        success: true,
        message: 'Crash report updated successfully',
        data: formattedReport
      });
    } catch (error) {
      console.error('❌ Error updating crash report:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to update crash report',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          sql: error.sql || 'No SQL available'
        } : undefined
      });
    }
  }

  // Get app health indicators
  async getAppHealthIndicators(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      const formattedStartDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      console.log('🔧 Fetching app health indicators with raw SQL...');
      console.log('📊 Query params:', { days, formattedStartDate });

      // Use raw SQL to avoid .tap issues
      const indicatorsSQL = `
        SELECT * FROM app_health_indicators 
        WHERE date >= ? 
        ORDER BY date ASC
      `;
      
      const indicators = await db.sequelize.query(indicatorsSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });

      console.log('✅ Retrieved', indicators.length, 'health indicators');

      return res.status(200).json({
        success: true,
        data: indicators
      });
    } catch (error) {
      console.error('❌ Error fetching app health indicators:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch app health indicators',
        error: error.message
      });
    }
  }

  // Get tickets for agents (superadmin/developer)
  async getAgentTickets(req, res) {
    try {
      const { status, category, priority, assigned, page = 1, limit = 20 } = req.query;
      const userId = req.user?.id;
      
      // Check if user is an agent
      const isAgent = req.user?.user_type === 'superadmin' || 
                     req.user?.user_type === 'developer' || 
                     req.user?.user_type === 'SuperAdmin' ||
                     req.user?.user_type === 'Developer';

      if (!isAgent) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Agent privileges required.'
        });
      }

      const whereConditions = {};
      
      if (status) whereConditions.status = status;
      if (category) whereConditions.category = category;
      if (priority) whereConditions.priority = priority;
      
      // Filter by assignment
      if (assigned === 'me') {
        whereConditions.assigned_to = userId;
      } else if (assigned === 'unassigned') {
        whereConditions.assigned_to = null;
      }

      const offset = (page - 1) * limit;

      const { count, rows: tickets } = await SupportTicket.findAndCountAll({
        where: whereConditions,
        attributes: ['id', 'user_id', 'assigned_to', 'title', 'description', 'status', 'priority', 'category', 'created_at', 'updated_at'], // Exclude anonymous fields that might not exist in DB
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'user_type']
          },
          {
            model: User,
            as: 'assignedAgent',
            attributes: ['id', 'name', 'email', 'user_type'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching agent tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message
      });
    }
  }

  // Get agent dashboard statistics
  async getAgentDashboard(req, res) {
    try {
      const userId = req.user?.id;
      
      // Check if user is an agent
      const isAgent = req.user?.user_type === 'superadmin' || 
                     req.user?.user_type === 'developer' || 
                     req.user?.user_type === 'SuperAdmin' ||
                     req.user?.user_type === 'Developer';

      if (!isAgent) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Agent privileges required.'
        });
      }

      // Get ticket statistics
      let totalTickets, openTickets, inProgressTickets, myTickets, unassignedTickets, recentTickets;
      try {
        totalTickets = await SupportTicket.count();
        openTickets = await SupportTicket.count({ where: { status: 'open' } });
        inProgressTickets = await SupportTicket.count({ where: { status: 'in-progress' } });
        myTickets = await SupportTicket.count({ where: { assigned_to: userId } });
        unassignedTickets = await SupportTicket.count({ where: { assigned_to: null } });

        // Get recent tickets - explicitly specify attributes to avoid issues with non-existent columns
        recentTickets = await SupportTicket.findAll({
          limit: 5,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'user_id', 'assigned_to', 'title', 'description', 'status', 'priority', 'category', 'created_at', 'updated_at'], // Exclude anonymous fields that might not exist in DB
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }
          ]
        });
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in support dashboard:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      return res.status(200).json({
        success: true,
        data: {
          statistics: {
            total: totalTickets,
            open: openTickets,
            inProgress: inProgressTickets,
            myTickets: myTickets,
            unassigned: unassignedTickets
          },
          recentTickets
        }
      });
    } catch (error) {
      console.error('Error fetching agent dashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }

  // Get available agents
  async getAvailableAgents(req, res) {
    try {
      // Check if user has permission to view agents
      const isAgent = req.user?.user_type === 'superadmin' || 
                     req.user?.user_type === 'developer' || 
                     req.user?.user_type === 'SuperAdmin' ||
                     req.user?.user_type === 'Developer';

      if (!isAgent) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Agent privileges required.'
        });
      }

      const agents = await User.findAll({
        where: {
          user_type: {
            [Op.in]: ['superadmin', 'developer', 'SuperAdmin', 'Developer']
          }
        },
        attributes: ['id', 'name', 'email', 'user_type'],
        order: [['name', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error('Error fetching available agents:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: error.message
      });
    }
  }

  // Get comprehensive dashboard analytics for super admin
  async getDashboardAnalytics(req, res) {
    try {
      const { days = 30 } = req.query;

      // Check if user is an admin
      const isAdmin = req.user?.user_type === 'superadmin' ||
                     req.user?.user_type === 'developer' ||
                     req.user?.user_type === 'SuperAdmin' ||
                     req.user?.user_type === 'Developer';

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');

      // Get ticket statistics
      const totalTicketsSQL = `SELECT COUNT(*) as count FROM support_tickets`;
      const openTicketsSQL = `SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'`;
      const inProgressTicketsSQL = `SELECT COUNT(*) as count FROM support_tickets WHERE status = 'in-progress'`;
      const resolvedTicketsSQL = `SELECT COUNT(*) as count FROM support_tickets WHERE status = 'resolved'`;
      const recentTicketsSQL = `SELECT COUNT(*) as count FROM support_tickets WHERE created_at >= ?`;

      const [totalTickets] = await db.sequelize.query(totalTicketsSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [openTickets] = await db.sequelize.query(openTicketsSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [inProgressTickets] = await db.sequelize.query(inProgressTicketsSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [resolvedTickets] = await db.sequelize.query(resolvedTicketsSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [recentTickets] = await db.sequelize.query(recentTicketsSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Get crash report statistics
      const totalCrashesSQL = `SELECT COUNT(*) as count FROM crash_reports`;
      const unresolvedCrashesSQL = `SELECT COUNT(*) as count FROM crash_reports WHERE resolved = 0`;
      const resolvedCrashesSQL = `SELECT COUNT(*) as count FROM crash_reports WHERE resolved = 1`;
      const recentCrashesSQL = `SELECT COUNT(*) as count FROM crash_reports WHERE created_at >= ?`;
      const criticalCrashesSQL = `SELECT COUNT(*) as count FROM crash_reports WHERE severity = 'high' AND resolved = 0`;

      const [totalCrashes] = await db.sequelize.query(totalCrashesSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [unresolvedCrashes] = await db.sequelize.query(unresolvedCrashesSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [resolvedCrashes] = await db.sequelize.query(resolvedCrashesSQL, { type: db.sequelize.QueryTypes.SELECT });
      const [recentCrashes] = await db.sequelize.query(recentCrashesSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });
      const [criticalCrashes] = await db.sequelize.query(criticalCrashesSQL, { type: db.sequelize.QueryTypes.SELECT });

      // Get chatbot statistics
      const totalConversationsSQL = `SELECT COUNT(*) as count FROM chatbot_conversations WHERE created_at >= ?`;
      const escalatedConversationsSQL = `SELECT COUNT(*) as count FROM chatbot_conversations WHERE escalated_to_human = 1 AND created_at >= ?`;
      const avgConfidenceSQL = `SELECT AVG(confidence) as avg FROM chatbot_conversations WHERE created_at >= ?`;

      const [totalConversations] = await db.sequelize.query(totalConversationsSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });
      const [escalatedConversations] = await db.sequelize.query(escalatedConversationsSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });
      const [avgConfidence] = await db.sequelize.query(avgConfidenceSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Get app health metrics (latest values)
      const latestHealthSQL = `
        SELECT * FROM app_health_indicators
        ORDER BY date DESC
        LIMIT 1
      `;
      const [latestHealth] = await db.sequelize.query(latestHealthSQL, { type: db.sequelize.QueryTypes.SELECT });

      // Get recent crash reports for the table
      const recentCrashReportsSQL = `
        SELECT
          cr.*,
          u.name as user_name,
          u.email as user_email
        FROM crash_reports cr
        LEFT JOIN users u ON cr.user_id = u.id
        WHERE cr.created_at >= ?
        ORDER BY cr.created_at DESC
        LIMIT 10
      `;
      const recentCrashReports = await db.sequelize.query(recentCrashReportsSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Get recent support tickets for the table
      const recentSupportTicketsSQL = `
        SELECT
          st.*,
          u.name as user_name,
          u.email as user_email,
          a.name as agent_name,
          a.email as agent_email
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN users a ON st.assigned_to = a.id
        WHERE st.created_at >= ?
        ORDER BY st.created_at DESC
        LIMIT 10
      `;
      const recentSupportTickets = await db.sequelize.query(recentSupportTicketsSQL, {
        replacements: [formattedStartDate],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Calculate resolution rate
      const resolvedCount = resolvedTickets?.count || 0;
      const totalCount = totalTickets?.count || 0;
      const resolutionRate = totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(2) : 0;

      // Calculate crash resolution rate
      const resolvedCrashCount = resolvedCrashes?.count || 0;
      const totalCrashCount = totalCrashes?.count || 0;
      const crashResolutionRate = totalCrashCount > 0 ? ((resolvedCrashCount / totalCrashCount) * 100).toFixed(2) : 0;

      // Calculate chatbot escalation rate
      const escalatedCount = escalatedConversations?.count || 0;
      const conversationsCount = totalConversations?.count || 0;
      const escalationRate = conversationsCount > 0 ? ((escalatedCount / conversationsCount) * 100).toFixed(2) : 0;

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalTickets: totalCount,
            openTickets: openTickets?.count || 0,
            inProgressTickets: inProgressTickets?.count || 0,
            resolvedTickets: resolvedCount,
            recentTickets: recentTickets?.count || 0,
            resolutionRate: parseFloat(resolutionRate),
            totalCrashes: totalCrashCount,
            unresolvedCrashes: unresolvedCrashes?.count || 0,
            resolvedCrashes: resolvedCrashCount,
            criticalCrashes: criticalCrashes?.count || 0,
            recentCrashes: recentCrashes?.count || 0,
            crashResolutionRate: parseFloat(crashResolutionRate),
            totalConversations: conversationsCount,
            escalatedConversations: escalatedCount,
            escalationRate: parseFloat(escalationRate),
            avgChatbotConfidence: parseFloat((avgConfidence?.avg || 0).toFixed(2))
          },
          appHealth: latestHealth || {
            uptimePercentage: 99.0,
            averageResponseTime: 150,
            errorRate: 0.2,
            crashCount: 0
          },
          recentCrashReports: recentCrashReports.map(report => ({
            id: report.id,
            errorMessage: report.error_message,
            url: report.url,
            browser: report.browser,
            severity: report.severity,
            resolved: Boolean(report.resolved),
            createdAt: report.created_at,
            user: report.user_name ? {
              name: report.user_name,
              email: report.user_email
            } : null
          })),
          recentSupportTickets: recentSupportTickets.map(ticket => ({
            id: ticket.id,
            title: ticket.title,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            createdAt: ticket.created_at,
            user: ticket.user_name ? {
              name: ticket.user_name,
              email: ticket.user_email
            } : null,
            assignedAgent: ticket.agent_name ? {
              name: ticket.agent_name,
              email: ticket.agent_email
            } : null
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard analytics',
        error: error.message
      });
    }
  }

  // Create or update app health indicator
  async updateAppHealthIndicator(req, res) {
    try {
      const {
        date,
        uptimePercentage,
        averageResponseTime,
        errorRate,
        crashCount,
        userSatisfaction,
        activeUsers,
        apiSuccessRate
      } = req.body;

      const formattedDate = new Date(date).toISOString().split('T')[0]; // Ensure date is in YYYY-MM-DD format
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Check if indicator already exists
      const findIndicatorSQL = `SELECT * FROM app_health_indicators WHERE date = ?`;
      const [existingIndicator] = await db.sequelize.query(findIndicatorSQL, {
        replacements: [formattedDate],
        type: db.sequelize.QueryTypes.SELECT
      });

      let indicator;
      let created = false;

      if (!existingIndicator) {
        // Create new indicator
        const insertIndicatorSQL = `
          INSERT INTO app_health_indicators (
            date, uptime_percentage, average_response_time, error_rate, 
            crash_count, user_satisfaction, active_users, api_success_rate, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const insertValues = [
          formattedDate,
          parseFloat(uptimePercentage) || 0,
          parseInt(averageResponseTime) || 0,
          parseFloat(errorRate) || 0,
          parseInt(crashCount) || 0,
          userSatisfaction ? parseFloat(userSatisfaction) : null,
          parseInt(activeUsers) || 0,
          apiSuccessRate ? parseFloat(apiSuccessRate) : null,
          currentTimestamp,
          currentTimestamp
        ];
        
        const [insertResult] = await db.sequelize.query(insertIndicatorSQL, {
          replacements: insertValues,
          type: db.sequelize.QueryTypes.INSERT
        });
        
        // Get the created indicator
        const [newIndicator] = await db.sequelize.query(findIndicatorSQL, {
          replacements: [formattedDate],
          type: db.sequelize.QueryTypes.SELECT
        });
        
        indicator = newIndicator;
        created = true;
      } else {
        // Update existing indicator
        const updateIndicatorSQL = `
          UPDATE app_health_indicators 
          SET 
            uptime_percentage = ?, 
            average_response_time = ?, 
            error_rate = ?, 
            crash_count = ?, 
            user_satisfaction = ?, 
            active_users = ?, 
            api_success_rate = ?, 
            updated_at = ?
          WHERE date = ?
        `;
        
        const updateValues = [
          parseFloat(uptimePercentage) || existingIndicator.uptime_percentage,
          parseInt(averageResponseTime) || existingIndicator.average_response_time,
          parseFloat(errorRate) || existingIndicator.error_rate,
          parseInt(crashCount) || existingIndicator.crash_count,
          userSatisfaction !== undefined ? (userSatisfaction ? parseFloat(userSatisfaction) : null) : existingIndicator.user_satisfaction,
          parseInt(activeUsers) || existingIndicator.active_users,
          apiSuccessRate !== undefined ? (apiSuccessRate ? parseFloat(apiSuccessRate) : null) : existingIndicator.api_success_rate,
          currentTimestamp,
          formattedDate
        ];
        
        await db.sequelize.query(updateIndicatorSQL, {
          replacements: updateValues,
          type: db.sequelize.QueryTypes.UPDATE
        });
        
        // Get the updated indicator
        const [updatedIndicator] = await db.sequelize.query(findIndicatorSQL, {
          replacements: [formattedDate],
          type: db.sequelize.QueryTypes.SELECT
        });
        
        indicator = updatedIndicator;
      }

      return res.status(201).json({
        success: true,
        message: created ? 'App health indicator created successfully' : 'App health indicator updated successfully',
        data: indicator
      });
    } catch (error) {
      console.error('Error updating app health indicator:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update app health indicator',
        error: error.message
      });
    }
  }
}

module.exports = new SupportController();