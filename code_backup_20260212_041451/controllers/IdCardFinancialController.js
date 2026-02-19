const IdCardFinancialService = require('../services/IdCardFinancialService');
const db = require('../models');
const { QueryTypes } = require('sequelize');

class IdCardFinancialController {
  static async getBillingConfig(req, res) {
    try {
      const { school_id, branch_id } = req.user;

      const config = await db.IdCardBillingConfig.findAll({
        where: {
          school_id,
          branch_id,
          is_active: true
        },
        order: [['service_type', 'ASC']]
      });

      res.json({ success: true, data: config });
    } catch (error) {
      console.error('Error fetching billing config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateBillingConfig(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { service_type, cost_per_unit, bulk_discount_threshold, bulk_discount_percentage } = req.body;

      const [config, created] = await db.IdCardBillingConfig.findOrCreate({
        where: { school_id, branch_id, service_type },
        defaults: {
          cost_per_unit,
          bulk_discount_threshold,
          bulk_discount_percentage,
          created_by: req.user.id
        }
      });

      if (!created) {
        await config.update({
          cost_per_unit,
          bulk_discount_threshold,
          bulk_discount_percentage
        });
      }

      res.json({ success: true, data: config });
    } catch (error) {
      console.error('Error updating billing config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async calculateCost(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { template_id, quantity = 1 } = req.body;

      const costData = await IdCardFinancialService.calculateCardCost(
        school_id, 
        branch_id, 
        template_id, 
        quantity
      );

      res.json({ success: true, data: costData });
    } catch (error) {
      console.error('Error calculating cost:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createBilling(req, res) {
    try {
      const { card_generation_id, cost_data } = req.body;

      const result = await IdCardFinancialService.createFinancialEntry(
        card_generation_id,
        cost_data,
        req.user.id
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error creating billing:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getUsageAnalytics(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { start_date, end_date } = req.query;

      const dateRange = {};
      if (start_date) dateRange.startDate = new Date(start_date);
      if (end_date) dateRange.endDate = new Date(end_date);

      const analytics = await IdCardFinancialService.getUsageAnalytics(
        school_id,
        branch_id,
        dateRange
      );

      res.json({ success: true, data: analytics });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async processPayment(req, res) {
    try {
      const { financial_tracking_id } = req.params;
      const { payment_mode } = req.body;

      const result = await IdCardFinancialService.processPayment(
        financial_tracking_id,
        { payment_mode },
        req.user.id
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getFinancialReport(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { report_type = 'monthly' } = req.query;

      const report = await IdCardFinancialService.generateFinancialReport(
        school_id,
        branch_id,
        report_type
      );

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getAuditTrail(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { limit = 50, offset = 0 } = req.query;

      const auditTrail = await db.sequelize.query(`
        SELECT 
          ft.*,
          pe.ref_no,
          pe.payment_status,
          pe.payment_mode,
          je.entry_number,
          je.description as journal_description
        FROM id_card_financial_tracking ft
        LEFT JOIN payment_entries pe ON ft.payment_entry_id = pe.item_id
        LEFT JOIN journal_entries je ON ft.journal_entry_id = je.entry_id
        WHERE ft.school_id = :school_id
          AND (:branch_id IS NULL OR ft.branch_id = :branch_id)
        ORDER BY ft.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { school_id, branch_id, limit: parseInt(limit), offset: parseInt(offset) },
        type: QueryTypes.SELECT
      });

      const totalCount = await db.IdCardFinancialTracking.count({
        where: {
          school_id,
          ...(branch_id && { branch_id })
        }
      });

      res.json({ 
        success: true, 
        data: {
          records: auditTrail,
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = IdCardFinancialController;