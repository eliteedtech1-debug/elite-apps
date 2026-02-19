const db = require('../models');

/**
 * ID Card Audit Logging System
 * Comprehensive audit trail for template creation and card generation
 */

class IdCardAuditLogger {
  /**
   * Log template operations
   */
  static async logTemplateOperation(action, templateData, userContext, additionalData = {}) {
    try {
      const auditEntry = {
        action_type: action,
        entity_type: 'template',
        entity_id: templateData.id || null,
        user_id: userContext.id,
        user_type: userContext.user_type,
        school_id: userContext.school_id,
        branch_id: userContext.branch_id,
        ip_address: userContext.ip,
        user_agent: userContext.userAgent,
        request_data: {
          template_name: templateData.template_name,
          template_type: templateData.template_type,
          dimensions: templateData.dimensions,
          is_active: templateData.is_active,
          is_default: templateData.is_default,
          ...additionalData
        },
        timestamp: new Date()
      };

      // Store in database
      await this.storeAuditLog(auditEntry);

      // Log to console for monitoring
      console.log(`🔍 ID Card Template Audit: ${action}`, {
        user: `${userContext.user_type}(${userContext.id})`,
        school: userContext.school_id,
        template: templateData.template_name || templateData.id,
        ip: userContext.ip
      });

      return auditEntry;
    } catch (error) {
      console.error('Template audit logging error:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log card generation operations
   */
  static async logCardGeneration(action, cardData, userContext, additionalData = {}) {
    try {
      const auditEntry = {
        action_type: action,
        entity_type: 'card_generation',
        entity_id: cardData.id || null,
        user_id: userContext.id,
        user_type: userContext.user_type,
        school_id: userContext.school_id,
        branch_id: userContext.branch_id,
        ip_address: userContext.ip,
        user_agent: userContext.userAgent,
        request_data: {
          student_id: cardData.student_id,
          template_id: cardData.template_id,
          card_number: cardData.card_number,
          generation_status: cardData.generation_status,
          batch_id: cardData.batch_id,
          ...additionalData
        },
        timestamp: new Date()
      };

      await this.storeAuditLog(auditEntry);

      console.log(`🔍 ID Card Generation Audit: ${action}`, {
        user: `${userContext.user_type}(${userContext.id})`,
        school: userContext.school_id,
        student: cardData.student_id,
        template: cardData.template_id,
        ip: userContext.ip
      });

      return auditEntry;
    } catch (error) {
      console.error('Card generation audit logging error:', error);
    }
  }

  /**
   * Log file upload operations
   */
  static async logFileUpload(action, fileData, userContext, additionalData = {}) {
    try {
      const auditEntry = {
        action_type: action,
        entity_type: 'file_upload',
        entity_id: null,
        user_id: userContext.id,
        user_type: userContext.user_type,
        school_id: userContext.school_id,
        branch_id: userContext.branch_id,
        ip_address: userContext.ip,
        user_agent: userContext.userAgent,
        request_data: {
          upload_type: fileData.upload_type,
          filename: fileData.filename,
          original_name: fileData.original_name,
          file_size: fileData.file_size,
          mime_type: fileData.mime_type,
          student_id: fileData.student_id,
          ...additionalData
        },
        timestamp: new Date()
      };

      await this.storeAuditLog(auditEntry);

      console.log(`🔍 ID Card File Upload Audit: ${action}`, {
        user: `${userContext.user_type}(${userContext.id})`,
        school: userContext.school_id,
        file: fileData.filename,
        type: fileData.upload_type,
        ip: userContext.ip
      });

      return auditEntry;
    } catch (error) {
      console.error('File upload audit logging error:', error);
    }
  }

  /**
   * Log QR code verification attempts
   */
  static async logQRVerification(verificationData, userContext, additionalData = {}) {
    try {
      const auditEntry = {
        action_type: 'qr_verification',
        entity_type: 'verification',
        entity_id: null,
        user_id: userContext.id || null,
        user_type: userContext.user_type || 'anonymous',
        school_id: verificationData.school_id,
        branch_id: verificationData.branch_id,
        ip_address: userContext.ip,
        user_agent: userContext.userAgent,
        request_data: {
          student_id: verificationData.student_id,
          card_number: verificationData.card_number,
          verification_status: verificationData.status,
          verification_context: verificationData.context,
          location: verificationData.location,
          ...additionalData
        },
        timestamp: new Date()
      };

      await this.storeAuditLog(auditEntry);

      console.log(`🔍 ID Card QR Verification Audit:`, {
        user: userContext.user_type || 'anonymous',
        school: verificationData.school_id,
        student: verificationData.student_id,
        status: verificationData.status,
        ip: userContext.ip
      });

      return auditEntry;
    } catch (error) {
      console.error('QR verification audit logging error:', error);
    }
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(eventType, eventData, userContext, additionalData = {}) {
    try {
      const auditEntry = {
        action_type: `security_${eventType}`,
        entity_type: 'security',
        entity_id: null,
        user_id: userContext.id || null,
        user_type: userContext.user_type || 'anonymous',
        school_id: userContext.school_id || null,
        branch_id: userContext.branch_id || null,
        ip_address: userContext.ip,
        user_agent: userContext.userAgent,
        request_data: {
          event_type: eventType,
          severity: eventData.severity || 'medium',
          description: eventData.description,
          affected_resource: eventData.resource,
          ...additionalData
        },
        timestamp: new Date()
      };

      await this.storeAuditLog(auditEntry);

      // Log security events with higher visibility
      const logLevel = eventData.severity === 'high' ? 'error' : 'warn';
      console[logLevel](`🚨 ID Card Security Event: ${eventType}`, {
        user: userContext.user_type || 'anonymous',
        school: userContext.school_id,
        severity: eventData.severity,
        description: eventData.description,
        ip: userContext.ip
      });

      return auditEntry;
    } catch (error) {
      console.error('Security event audit logging error:', error);
    }
  }

  /**
   * Store audit log in database
   */
  static async storeAuditLog(auditEntry) {
    try {
      // Use raw query for better performance and to avoid model dependencies
      await db.sequelize.query(`
        INSERT INTO id_card_audit_log 
        (action_type, entity_type, entity_id, user_id, user_type, school_id, branch_id, 
         request_data, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, {
        replacements: [
          auditEntry.action_type,
          auditEntry.entity_type,
          auditEntry.entity_id,
          auditEntry.user_id,
          auditEntry.user_type,
          auditEntry.school_id,
          auditEntry.branch_id,
          JSON.stringify(auditEntry.request_data),
          auditEntry.ip_address,
          auditEntry.user_agent
        ]
      });
    } catch (error) {
      console.error('Failed to store audit log:', error);
      // Store in fallback log file if database fails
      await this.fallbackFileLog(auditEntry);
    }
  }

  /**
   * Fallback file logging when database is unavailable
   */
  static async fallbackFileLog(auditEntry) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `id-card-audit-${new Date().toISOString().split('T')[0]}.log`);
      
      // Ensure log directory exists
      try {
        await fs.access(logDir);
      } catch {
        await fs.mkdir(logDir, { recursive: true });
      }
      
      const logLine = JSON.stringify({
        ...auditEntry,
        fallback: true,
        logged_at: new Date().toISOString()
      }) + '\n';
      
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Fallback file logging failed:', error);
    }
  }

  /**
   * Create audit middleware for express routes
   */
  static createAuditMiddleware(action, entityType = 'general') {
    return async (req, res, next) => {
      // Store original send method
      const originalSend = res.send;
      
      // Override send method to capture response
      res.send = function(data) {
        // Log after response is sent
        setImmediate(async () => {
          try {
            const userContext = {
              id: req.user?.id,
              user_type: req.user?.user_type,
              school_id: req.user?.school_id,
              branch_id: req.user?.branch_id,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent')
            };

            const auditData = {
              action_type: action,
              entity_type: entityType,
              entity_id: req.params.id || req.body.id || null,
              user_id: userContext.id,
              user_type: userContext.user_type,
              school_id: userContext.school_id,
              branch_id: userContext.branch_id,
              ip_address: userContext.ip,
              user_agent: userContext.userAgent,
              request_data: {
                method: req.method,
                url: req.originalUrl,
                params: req.params,
                query: req.query,
                body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
              },
              response_status: res.statusCode,
              timestamp: new Date()
            };

            await IdCardAuditLogger.storeAuditLog(auditData);
          } catch (error) {
            console.error('Audit middleware error:', error);
          }
        });
        
        // Call original send method
        originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const replacements = [];

      if (filters.school_id) {
        whereClause += ' AND school_id = ?';
        replacements.push(filters.school_id);
      }

      if (filters.user_id) {
        whereClause += ' AND user_id = ?';
        replacements.push(filters.user_id);
      }

      if (filters.action_type) {
        whereClause += ' AND action_type = ?';
        replacements.push(filters.action_type);
      }

      if (filters.entity_type) {
        whereClause += ' AND entity_type = ?';
        replacements.push(filters.entity_type);
      }

      if (filters.from_date) {
        whereClause += ' AND created_at >= ?';
        replacements.push(filters.from_date);
      }

      if (filters.to_date) {
        whereClause += ' AND created_at <= ?';
        replacements.push(filters.to_date);
      }

      const limit = Math.min(filters.limit || 100, 1000);
      const offset = (filters.page - 1) * limit || 0;

      const [results] = await db.sequelize.query(`
        SELECT * FROM id_card_audit_log 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, {
        replacements: [...replacements, limit, offset]
      });

      return results;
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(schoolId, dateRange) {
    try {
      const [results] = await db.sequelize.query(`
        SELECT 
          action_type,
          entity_type,
          user_type,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM id_card_audit_log 
        WHERE school_id = ? 
          AND created_at BETWEEN ? AND ?
        GROUP BY action_type, entity_type, user_type, DATE(created_at)
        ORDER BY date DESC, count DESC
      `, {
        replacements: [schoolId, dateRange.from, dateRange.to]
      });

      return {
        school_id: schoolId,
        date_range: dateRange,
        summary: results,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw error;
    }
  }
}

module.exports = IdCardAuditLogger;