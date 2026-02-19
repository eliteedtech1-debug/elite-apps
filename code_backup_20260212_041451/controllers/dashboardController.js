const db = require("../models");

/**
 * Get recent subscriptions for Super Admin Dashboard
 * Simple, direct query - no complex logic
 */
const getRecentSubscriptions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user?.id;
    const userType = req.user?.user_type || req.headers['x-user-type'];
    const isDeveloper = userType?.toLowerCase() === 'developer';

    console.log('📊 Dashboard: getRecentSubscriptions called');
    console.log('📊 User ID:', userId, 'Type:', userType, 'isDeveloper:', isDeveloper);
    console.log('📊 Limit:', limit);

    // Simple query - get all active subscriptions with school and pricing info
    let query = `
      SELECT
        ss.id,
        ss.school_id,
        sch.school_name,
        sch.short_name,
        sp.pricing_name,
        ss.subscription_type,
        ss.total_cost,
        ss.subscription_end_date as due_date,
        ss.payment_status,
        ss.amount_paid,
        ss.balance,
        si.invoice_number,
        ss.created_at
      FROM school_subscriptions ss
      INNER JOIN school_setup sch ON ss.school_id = sch.school_id
      INNER JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
      LEFT JOIN subscription_invoices si ON ss.id = si.subscription_id
      WHERE ss.status = 'active'
    `;

    const replacements = { limit: parseInt(limit) };

    // Filter by created_by for non-developers
    if (!isDeveloper) {
      query += ` AND sch.created_by = :created_by`;
      replacements.created_by = userId;
    }

    query += ` ORDER BY ss.created_at DESC LIMIT :limit`;

    console.log('📊 Executing query...');

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT,
    });

    console.log('📊 Query completed. Found:', results.length, 'subscriptions');

    if (results.length > 0) {
      console.log('📊 Sample result:', JSON.stringify(results[0], null, 2));
    }

    res.json({
      success: true,
      count: results.length,
      data: results,
    });

  } catch (error) {
    console.error('❌ Dashboard subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message,
    });
  }
};

/**
 * Get subscription statistics for dashboard cards
 */
const getSubscriptionStats = async (req, res) => {
  try {
    console.log('📊 Dashboard: getSubscriptionStats called');

    const query = `
      SELECT
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN payment_status = 'paid' AND subscription_end_date >= CURDATE() THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN payment_status IN ('pending', 'partial') AND subscription_end_date >= CURDATE() THEN 1 ELSE 0 END) as pending_subscriptions,
        SUM(CASE WHEN subscription_end_date < CURDATE() THEN 1 ELSE 0 END) as expired_subscriptions,
        SUM(CASE WHEN payment_status = 'paid' THEN amount_paid ELSE 0 END) as total_revenue
      FROM school_subscriptions
      WHERE status = 'active'
    `;

    const results = await db.sequelize.query(query, {
      type: db.sequelize.QueryTypes.SELECT,
    });

    console.log('📊 Stats:', results[0]);

    res.json({
      success: true,
      data: results[0],
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getRecentSubscriptions,
  getSubscriptionStats,
};
