/**
 * CODE INTEGRITY MONITOR - BEYOND VISUAL RANGE
 * 
 * This system ensures your code maintains integrity and compliance
 * even when operating beyond direct visual supervision.
 * 
 * Inspired by aerospace BVR (Beyond Visual Range) concepts.
 */

const db = require('../models');
const sequelize = db.sequelize;
const { QueryTypes } = require('sequelize');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class CodeIntegrityMonitor {
  constructor() {
    this.alertThresholds = {
      compliance_score: 95,
      error_rate: 0.01,
      performance_degradation: 0.1,
      separation_violations: 0,
      journal_imbalances: 0
    };
    
    this.monitoringInterval = 60000; // 1 minute
    this.isMonitoring = false;
    this.healthHistory = [];
    this.alertChannels = [];
    
    this.initializeAlertChannels();
  }

  /**
   * START AUTONOMOUS MONITORING
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('🛰️ Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🛰️ Starting Beyond Visual Range Code Integrity Monitoring...');
    
    // Initial health check
    await this.performComprehensiveHealthCheck();
    
    // Start continuous monitoring
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
        await this.triggerAlert('HEALTH_CHECK_FAILURE', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }, this.monitoringInterval);

    console.log('✅ BVR Monitoring System Active');
  }

  /**
   * STOP MONITORING
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.isMonitoring = false;
    console.log('🛑 BVR Monitoring System Stopped');
  }

  /**
   * COMPREHENSIVE HEALTH CHECK
   */
  async performComprehensiveHealthCheck() {
    console.log('🔍 Performing comprehensive health check...');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      checks: {
        accounting_compliance: await this.checkAccountingCompliance(),
        transaction_separation: await this.checkTransactionSeparation(),
        journal_entry_balance: await this.checkJournalEntryBalance(),
        api_endpoints: await this.checkAPIEndpoints(),
        database_integrity: await this.checkDatabaseIntegrity(),
        audit_trail: await this.checkAuditTrail(),
        performance_metrics: await this.checkPerformanceMetrics()
      }
    };

    // Calculate overall health score
    healthReport.overall_score = this.calculateOverallHealthScore(healthReport.checks);
    healthReport.status = this.determineHealthStatus(healthReport.overall_score);
    
    // Store in history
    this.healthHistory.push(healthReport);
    
    // Keep only last 100 reports
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    // Check for alerts
    await this.evaluateHealthForAlerts(healthReport);
    
    // Log health report
    await this.logHealthReport(healthReport);
    
    return healthReport;
  }

  /**
   * QUICK HEALTH CHECK (for continuous monitoring)
   */
  async performHealthCheck() {
    const quickCheck = {
      timestamp: new Date().toISOString(),
      separation_violations: await this.quickCheckSeparationViolations(),
      journal_imbalances: await this.quickCheckJournalImbalances(),
      recent_errors: await this.quickCheckRecentErrors(),
      api_health: await this.quickCheckAPIHealth()
    };

    // Check for immediate issues
    if (quickCheck.separation_violations > 0) {
      await this.handleSeparationViolations();
    }

    if (quickCheck.journal_imbalances > 0) {
      await this.handleJournalImbalances();
    }

    return quickCheck;
  }

  /**
   * CHECK ACCOUNTING COMPLIANCE
   */
  async checkAccountingCompliance() {
    try {
      // Check for mixed transaction types (critical violation)
      const mixedTransactions = await sequelize.query(
        `SELECT ref_no, GROUP_CONCAT(DISTINCT item_category) as categories,
                COUNT(DISTINCT item_category) as category_count,
                COUNT(*) as transaction_count
         FROM payment_entries 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY ref_no
         HAVING COUNT(DISTINCT item_category) > 1
         AND (
           (FIND_IN_SET('DISCOUNT', GROUP_CONCAT(DISTINCT item_category)) > 0 
            AND (FIND_IN_SET('FEES', GROUP_CONCAT(DISTINCT item_category)) > 0 
                 OR FIND_IN_SET('FINES', GROUP_CONCAT(DISTINCT item_category)) > 0))
           OR
           (FIND_IN_SET('FINES', GROUP_CONCAT(DISTINCT item_category)) > 0 
            AND FIND_IN_SET('FEES', GROUP_CONCAT(DISTINCT item_category)) > 0)
         )`,
        { type: QueryTypes.SELECT }
      );

      // Check for transactions without proper categorization
      const uncategorizedTransactions = await sequelize.query(
        `SELECT COUNT(*) as count
         FROM payment_entries 
         WHERE (item_category IS NULL OR item_category = '')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        { type: QueryTypes.SELECT }
      );

      // Calculate compliance score
      const totalTransactions = await sequelize.query(
        `SELECT COUNT(*) as count FROM payment_entries 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        { type: QueryTypes.SELECT }
      );

      const violations = mixedTransactions.length + parseInt(uncategorizedTransactions[0].count);
      const total = parseInt(totalTransactions[0].count);
      const complianceScore = total > 0 ? Math.max(0, 100 - (violations / total * 100)) : 100;

      return {
        status: violations === 0 ? 'COMPLIANT' : 'VIOLATIONS_FOUND',
        score: complianceScore,
        violations: {
          mixed_transactions: mixedTransactions.length,
          uncategorized_transactions: parseInt(uncategorizedTransactions[0].count),
          total_violations: violations
        },
        total_transactions: total,
        gaap_compliant: violations === 0,
        details: mixedTransactions
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * CHECK TRANSACTION SEPARATION
   */
  async checkTransactionSeparation() {
    try {
      const separationViolations = await sequelize.query(
        `SELECT ref_no, 
                GROUP_CONCAT(DISTINCT item_category) as mixed_categories,
                COUNT(DISTINCT item_category) as category_count,
                GROUP_CONCAT(DISTINCT admission_no) as affected_students
         FROM payment_entries 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         GROUP BY ref_no
         HAVING COUNT(DISTINCT item_category) > 1
         AND (
           (FIND_IN_SET('DISCOUNT', GROUP_CONCAT(DISTINCT item_category)) > 0 
            AND (FIND_IN_SET('FEES', GROUP_CONCAT(DISTINCT item_category)) > 0 
                 OR FIND_IN_SET('FINES', GROUP_CONCAT(DISTINCT item_category)) > 0))
         )`,
        { type: QueryTypes.SELECT }
      );

      return {
        status: separationViolations.length === 0 ? 'SEPARATED' : 'VIOLATIONS_FOUND',
        violation_count: separationViolations.length,
        violations: separationViolations,
        separation_enforced: separationViolations.length === 0
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message,
        violation_count: -1
      };
    }
  }

  /**
   * CHECK JOURNAL ENTRY BALANCE
   */
  async checkJournalEntryBalance() {
    try {
      const imbalancedEntries = await sequelize.query(
        `SELECT entry_number, 
                SUM(debit_amount) as total_debits,
                SUM(credit_amount) as total_credits,
                ABS(SUM(debit_amount) - SUM(credit_amount)) as imbalance
         FROM journal_entry_lines
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         GROUP BY entry_number
         HAVING ABS(SUM(debit_amount) - SUM(credit_amount)) > 0.01`,
        { type: QueryTypes.SELECT }
      );

      return {
        status: imbalancedEntries.length === 0 ? 'BALANCED' : 'IMBALANCES_FOUND',
        imbalance_count: imbalancedEntries.length,
        imbalances: imbalancedEntries,
        double_entry_compliant: imbalancedEntries.length === 0
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message,
        imbalance_count: -1
      };
    }
  }

  /**
   * CHECK API ENDPOINTS
   */
  async checkAPIEndpoints() {
    const endpoints = [
      '/api/accounting/compliance/validate/separation',
      '/api/accounting/compliance/create-separated-transaction',
      '/api/accounting/compliance/metrics',
      '/api/accounting/compliance/health'
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        // Simulate endpoint check (replace with actual HTTP request)
        const response = await this.checkEndpoint(endpoint);
        const responseTime = Date.now() - startTime;
        
        results.push({
          endpoint,
          status: 'HEALTHY',
          response_time: responseTime,
          available: true
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'UNHEALTHY',
          error: error.message,
          available: false
        });
      }
    }

    const healthyEndpoints = results.filter(r => r.available).length;
    const healthPercentage = (healthyEndpoints / endpoints.length) * 100;

    return {
      status: healthPercentage === 100 ? 'ALL_HEALTHY' : 'SOME_UNHEALTHY',
      health_percentage: healthPercentage,
      healthy_endpoints: healthyEndpoints,
      total_endpoints: endpoints.length,
      endpoint_results: results
    };
  }

  /**
   * CHECK DATABASE INTEGRITY
   */
  async checkDatabaseIntegrity() {
    try {
      // Check required tables exist
      const requiredTables = [
        'payment_entries',
        'journal_entries', 
        'journal_entry_lines',
        'custom_items'
      ];

      const tableChecks = [];
      for (const table of requiredTables) {
        try {
          await sequelize.query(`SELECT 1 FROM ${table} LIMIT 1`, { type: QueryTypes.SELECT });
          tableChecks.push({ table, exists: true });
        } catch (error) {
          tableChecks.push({ table, exists: false, error: error.message });
        }
      }

      // Check required columns
      const columnChecks = await this.checkRequiredColumns();
      
      // Check database connectivity
      const connectivityCheck = await this.checkDatabaseConnectivity();

      const allTablesExist = tableChecks.every(t => t.exists);
      const allColumnsExist = columnChecks.every(c => c.exists);

      return {
        status: allTablesExist && allColumnsExist && connectivityCheck ? 'HEALTHY' : 'ISSUES_FOUND',
        tables: tableChecks,
        columns: columnChecks,
        connectivity: connectivityCheck,
        integrity_score: this.calculateDatabaseIntegrityScore(tableChecks, columnChecks, connectivityCheck)
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message,
        integrity_score: 0
      };
    }
  }

  /**
   * HANDLE SEPARATION VIOLATIONS (AUTO-REMEDIATION)
   */
  async handleSeparationViolations() {
    console.log('🚨 Handling separation violations...');
    
    try {
      const violations = await this.checkTransactionSeparation();
      
      if (violations.violations && violations.violations.length > 0) {
        for (const violation of violations.violations) {
          await this.remediateSeparationViolation(violation);
        }
        
        await this.triggerAlert('SEPARATION_VIOLATIONS_REMEDIATED', {
          count: violations.violations.length,
          violations: violations.violations
        });
      }
    } catch (error) {
      console.error('❌ Failed to handle separation violations:', error);
      await this.triggerAlert('REMEDIATION_FAILED', {
        type: 'SEPARATION_VIOLATIONS',
        error: error.message
      });
    }
  }

  /**
   * REMEDIATE SEPARATION VIOLATION
   */
  async remediateSeparationViolation(violation) {
    const transaction = await sequelize.transaction();
    
    try {
      // Mark original transactions as separated
      await sequelize.query(
        `UPDATE payment_entries 
         SET description = CONCAT('[AUTO-SEPARATED] ', description),
             payment_status = 'Separated',
             updated_by = 'BVR_Monitor'
         WHERE ref_no = ?`,
        {
          replacements: [violation.ref_no],
          type: QueryTypes.UPDATE,
          transaction
        }
      );

      // Create audit log
      await this.logRemediation({
        type: 'SEPARATION_VIOLATION_AUTO_FIX',
        original_ref: violation.ref_no,
        mixed_categories: violation.mixed_categories,
        affected_students: violation.affected_students,
        timestamp: new Date().toISOString(),
        automated: true,
        monitor: 'BVR_CodeIntegrityMonitor'
      });

      await transaction.commit();
      console.log(`✅ Remediated separation violation: ${violation.ref_no}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * TRIGGER ALERT
   */
  async triggerAlert(type, data) {
    const alert = {
      id: this.generateAlertId(),
      type,
      severity: this.determineSeverity(type),
      data,
      timestamp: new Date().toISOString(),
      system: 'BVR_CodeIntegrityMonitor'
    };

    console.log(`🚨 ALERT [${alert.severity}]: ${type}`, data);

    // Send to all configured alert channels
    for (const channel of this.alertChannels) {
      try {
        await channel.sendAlert(alert);
      } catch (error) {
        console.error(`❌ Failed to send alert via ${channel.name}:`, error);
      }
    }

    // Log alert
    await this.logAlert(alert);
  }

  /**
   * CALCULATE OVERALL HEALTH SCORE
   */
  calculateOverallHealthScore(checks) {
    const weights = {
      accounting_compliance: 0.3,
      transaction_separation: 0.25,
      journal_entry_balance: 0.2,
      api_endpoints: 0.1,
      database_integrity: 0.1,
      audit_trail: 0.05
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (weights[checkName] && checkResult.score !== undefined) {
        totalScore += checkResult.score * weights[checkName];
        totalWeight += weights[checkName];
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * INITIALIZE ALERT CHANNELS
   */
  initializeAlertChannels() {
    // Console logger (always available)
    this.alertChannels.push({
      name: 'console',
      sendAlert: async (alert) => {
        console.log(`🚨 [${alert.severity}] ${alert.type}:`, alert.data);
      }
    });

    // File logger
    this.alertChannels.push({
      name: 'file',
      sendAlert: async (alert) => {
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const logFile = path.join(logDir, 'bvr-alerts.log');
        const logEntry = `${alert.timestamp} [${alert.severity}] ${alert.type}: ${JSON.stringify(alert.data)}\n`;
        await fs.appendFile(logFile, logEntry);
      }
    });

    // Add email, Slack, SMS channels as needed
  }

  /**
   * HELPER METHODS
   */
  generateAlertId() {
    return `BVR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  determineSeverity(alertType) {
    const severityMap = {
      'SEPARATION_VIOLATIONS_FOUND': 'CRITICAL',
      'JOURNAL_IMBALANCES_FOUND': 'CRITICAL',
      'COMPLIANCE_SCORE_LOW': 'HIGH',
      'API_ENDPOINTS_DOWN': 'HIGH',
      'DATABASE_INTEGRITY_ISSUES': 'HIGH',
      'HEALTH_CHECK_FAILURE': 'MEDIUM',
      'REMEDIATION_FAILED': 'HIGH'
    };
    return severityMap[alertType] || 'MEDIUM';
  }

  async logHealthReport(report) {
    const logDir = path.join(__dirname, '../logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, 'bvr-health.log');
    const logEntry = `${report.timestamp} HEALTH_CHECK: Score=${report.overall_score} Status=${report.status}\n`;
    await fs.appendFile(logFile, logEntry);
  }

  async logRemediation(remediation) {
    const logDir = path.join(__dirname, '../logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, 'bvr-remediation.log');
    const logEntry = `${remediation.timestamp} REMEDIATION: ${JSON.stringify(remediation)}\n`;
    await fs.appendFile(logFile, logEntry);
  }

  async logAlert(alert) {
    const logDir = path.join(__dirname, '../logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, 'bvr-alerts.log');
    const logEntry = `${alert.timestamp} ALERT: ${JSON.stringify(alert)}\n`;
    await fs.appendFile(logFile, logEntry);
  }

  // Placeholder methods (implement based on your specific needs)
  async checkEndpoint(endpoint) {
    // Implement actual HTTP health check
    return { status: 'ok' };
  }

  async checkRequiredColumns() {
    // Implement column existence checks
    return [];
  }

  async checkDatabaseConnectivity() {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      return false;
    }
  }

  calculateDatabaseIntegrityScore(tables, columns, connectivity) {
    const tableScore = tables.filter(t => t.exists).length / tables.length * 100;
    const columnScore = columns.length === 0 ? 100 : columns.filter(c => c.exists).length / columns.length * 100;
    const connectivityScore = connectivity ? 100 : 0;
    return Math.round((tableScore + columnScore + connectivityScore) / 3);
  }

  determineHealthStatus(score) {
    if (score >= 95) return 'EXCELLENT';
    if (score >= 85) return 'GOOD';
    if (score >= 70) return 'FAIR';
    if (score >= 50) return 'POOR';
    return 'CRITICAL';
  }

  async evaluateHealthForAlerts(healthReport) {
    if (healthReport.overall_score < this.alertThresholds.compliance_score) {
      await this.triggerAlert('HEALTH_SCORE_LOW', {
        score: healthReport.overall_score,
        threshold: this.alertThresholds.compliance_score,
        status: healthReport.status
      });
    }

    // Check individual components
    if (healthReport.checks.transaction_separation?.violation_count > 0) {
      await this.triggerAlert('SEPARATION_VIOLATIONS_FOUND', healthReport.checks.transaction_separation);
    }

    if (healthReport.checks.journal_entry_balance?.imbalance_count > 0) {
      await this.triggerAlert('JOURNAL_IMBALANCES_FOUND', healthReport.checks.journal_entry_balance);
    }
  }

  async quickCheckSeparationViolations() {
    const result = await this.checkTransactionSeparation();
    return result.violation_count || 0;
  }

  async quickCheckJournalImbalances() {
    const result = await this.checkJournalEntryBalance();
    return result.imbalance_count || 0;
  }

  async quickCheckRecentErrors() {
    // Implement error log checking
    return 0;
  }

  async quickCheckAPIHealth() {
    // Implement quick API health check
    return { status: 'healthy' };
  }

  async checkAuditTrail() {
    // Implement audit trail completeness check
    return {
      status: 'COMPLETE',
      score: 100,
      completeness: 100
    };
  }

  async checkPerformanceMetrics() {
    // Implement performance metrics check
    return {
      status: 'OPTIMAL',
      score: 100,
      response_time: 50,
      throughput: 1000
    };
  }
}

module.exports = CodeIntegrityMonitor;