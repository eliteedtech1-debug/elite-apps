const db = require('../models');
const { QueryTypes } = require('sequelize');

class IdCardFinancialService {
  static async calculateCardCost(schoolId, branchId, templateId, quantity = 1) {
    try {
      const config = await db.IdCardBillingConfig.findOne({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          service_type: 'basic_generation',
          is_active: true
        }
      });

      if (!config) {
        return { baseCost: 5.00, totalCost: 5.00 * quantity, discount: 0 };
      }

      const baseCost = parseFloat(config.cost_per_unit);
      let totalCost = baseCost * quantity;
      let discount = 0;

      if (quantity >= config.bulk_discount_threshold) {
        discount = (totalCost * parseFloat(config.bulk_discount_percentage)) / 100;
        totalCost -= discount;
      }

      return { baseCost, totalCost, discount, quantity };
    } catch (error) {
      console.error('Error calculating card cost:', error);
      return { baseCost: 5.00, totalCost: 5.00 * quantity, discount: 0 };
    }
  }

  static async createFinancialEntry(cardGenerationId, costData, userId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const cardGeneration = await db.IdCardGeneration.findByPk(cardGenerationId);
      if (!cardGeneration) {
        throw new Error('Card generation record not found');
      }

      const financialTracking = await db.IdCardFinancialTracking.create({
        school_id: cardGeneration.school_id,
        branch_id: cardGeneration.branch_id,
        card_generation_id: cardGenerationId,
        template_id: cardGeneration.template_id,
        cost_type: 'generation',
        base_cost: costData.baseCost,
        quantity: costData.quantity,
        total_cost: costData.totalCost,
        billing_status: 'pending',
        created_by: userId
      }, { transaction });

      const paymentEntry = await db.PaymentEntry.create({
        ref_no: `IDCARD-${cardGenerationId}-${Date.now()}`,
        admission_no: cardGeneration.student_id || 'BULK',
        class_code: null,
        academic_year: new Date().getFullYear().toString(),
        term: 'Annual',
        dr: costData.totalCost,
        cr: 0.00,
        description: `ID Card Generation - ${costData.quantity} card(s)`,
        quantity: costData.quantity,
        item_category: 'ITEMS',
        payment_mode: 'Pending',
        payment_status: 'Pending',
        school_id: cardGeneration.school_id,
        branch_id: cardGeneration.branch_id,
        created_by: userId
      }, { transaction });

      const journalEntry = await db.JournalEntry.create({
        account: 'ID Card Revenue',
        account_code: '4100',
        account_type: 'REVENUE',
        debit: 0.00,
        credit: costData.totalCost,
        description: `ID Card generation revenue - ${costData.quantity} card(s)`,
        reference: `IDCARD-${cardGenerationId}`,
        transaction_date: new Date(),
        school_id: cardGeneration.school_id,
        branch_id: cardGeneration.branch_id,
        transaction_type: 'OTHER',
        status: 'POSTED',
        created_by: userId
      }, { transaction });

      await financialTracking.update({
        payment_entry_id: paymentEntry.item_id,
        journal_entry_id: journalEntry.entry_id,
        billing_status: 'billed'
      }, { transaction });

      await transaction.commit();
      return { financialTracking, paymentEntry, journalEntry };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async getUsageAnalytics(schoolId, branchId, dateRange = {}) {
    try {
      const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = dateRange;

      const analytics = await db.sequelize.query(`
        SELECT 
          DATE(ft.created_at) as date,
          ft.cost_type,
          COUNT(*) as card_count,
          SUM(ft.total_cost) as total_revenue,
          AVG(ft.total_cost) as avg_cost_per_card
        FROM id_card_financial_tracking ft
        WHERE ft.school_id = :schoolId
          AND (:branchId IS NULL OR ft.branch_id = :branchId)
          AND ft.created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE(ft.created_at), ft.cost_type
        ORDER BY date DESC, cost_type
      `, {
        replacements: { schoolId, branchId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      const summary = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total_cards,
          SUM(ft.total_cost) as total_revenue,
          AVG(ft.total_cost) as avg_revenue_per_card,
          COUNT(CASE WHEN ft.billing_status = 'paid' THEN 1 END) as paid_cards,
          COUNT(CASE WHEN ft.billing_status = 'pending' THEN 1 END) as pending_cards
        FROM id_card_financial_tracking ft
        WHERE ft.school_id = :schoolId
          AND (:branchId IS NULL OR ft.branch_id = :branchId)
          AND ft.created_at BETWEEN :startDate AND :endDate
      `, {
        replacements: { schoolId, branchId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      return { analytics, summary: summary[0] };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  static async processPayment(financialTrackingId, paymentData, userId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const tracking = await db.IdCardFinancialTracking.findByPk(financialTrackingId);
      if (!tracking) {
        throw new Error('Financial tracking record not found');
      }

      await db.PaymentEntry.update({
        payment_mode: paymentData.payment_mode || 'Cash',
        payment_status: 'Paid',
        updated_by: userId
      }, {
        where: { item_id: tracking.payment_entry_id },
        transaction
      });

      await tracking.update({
        billing_status: 'paid'
      }, { transaction });

      await transaction.commit();
      return tracking;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async generateFinancialReport(schoolId, branchId, reportType = 'monthly') {
    try {
      let dateCondition = '';
      const now = new Date();
      
      switch (reportType) {
        case 'daily':
          dateCondition = `AND DATE(ft.created_at) = CURDATE()`;
          break;
        case 'weekly':
          dateCondition = `AND ft.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
          break;
        case 'monthly':
          dateCondition = `AND MONTH(ft.created_at) = MONTH(NOW()) AND YEAR(ft.created_at) = YEAR(NOW())`;
          break;
        case 'quarterly':
          dateCondition = `AND ft.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`;
          break;
      }

      const report = await db.sequelize.query(`
        SELECT 
          ft.cost_type,
          COUNT(*) as total_transactions,
          SUM(ft.total_cost) as total_revenue,
          AVG(ft.total_cost) as avg_transaction_value,
          COUNT(CASE WHEN ft.billing_status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN ft.billing_status = 'pending' THEN 1 END) as pending_count,
          SUM(CASE WHEN ft.billing_status = 'paid' THEN ft.total_cost ELSE 0 END) as collected_revenue,
          SUM(CASE WHEN ft.billing_status = 'pending' THEN ft.total_cost ELSE 0 END) as pending_revenue
        FROM id_card_financial_tracking ft
        WHERE ft.school_id = :schoolId
          AND (:branchId IS NULL OR ft.branch_id = :branchId)
          ${dateCondition}
        GROUP BY ft.cost_type
        ORDER BY total_revenue DESC
      `, {
        replacements: { schoolId, branchId },
        type: QueryTypes.SELECT
      });

      return {
        reportType,
        generatedAt: new Date(),
        schoolId,
        branchId,
        data: report
      };
    } catch (error) {
      console.error('Error generating financial report:', error);
      throw error;
    }
  }
}

module.exports = IdCardFinancialService;