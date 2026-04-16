  /**
   * @route GET /api/pending-invoices
   * @desc Get pending invoices for a school
   * @access Private
   */
  app.get('/api/pending-invoices',
    authenticateToken,
    sanitizeInput,
    configLimiter,
    async (req, res) => {
    try {
      const school_id = req.headers['x-school-id'] || req.query.school_id;

      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required in headers or query parameters'
        });
      }

      // Find pending subscription invoices from the subscription_invoices table
      // Join with school_subscriptions table to get subscription type and details
      const subscriptionInvoices = await models.sequelize.query(`
        SELECT 
          si.id as invoice_id,
          si.invoice_number,
          si.subscription_id,
          si.invoice_date,
          si.due_date,
          CAST(si.total_amount AS DECIMAL(10,2)) as total_amount,
          CAST(si.amount_paid AS DECIMAL(10,2)) as amount_paid,
          CAST(si.balance AS DECIMAL(10,2)) as balance,
          si.payment_status,
          si.created_at,
          si.updated_at,
          'subscription-invoice' as invoice_type,
          COALESCE(ss.subscription_type, 'Application Subscription') as subscription_type,
          ss.pricing_plan_id,
          ss.subscription_start_date,
          ss.subscription_end_date,
          ss.current_term,
          ss.academic_year,
          ss.active_students_count,
          ss.cbt_stand_alone_enabled,
          ss.sms_subscription_enabled,
          ss.whatsapp_subscription_enabled,
          ss.email_subscription_enabled,
          ss.express_finance_enabled,
          ss.base_cost,
          ss.addon_cost,
          ss.discount_amount,
          ss.total_cost
        FROM subscription_invoices si
        LEFT JOIN school_subscriptions ss ON si.subscription_id = ss.id
        WHERE si.school_id = ?
          AND si.payment_status = 'unpaid' -- Only unpaid invoices
          AND si.balance > 0.01 -- Only invoices with outstanding balance
        ORDER BY si.due_date ASC
        LIMIT 100
      `, {
        replacements: [school_id],
        type: models.sequelize.QueryTypes.SELECT
      });

      // Sort by due date (ascending)
      subscriptionInvoices.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      // Return the first pending invoice that is due within 14 days and has balance > 0
      const today = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);

      const urgentInvoice = subscriptionInvoices.find(invoice => {
        const dueDate = new Date(invoice.due_date);
        return dueDate >= today && 
               dueDate <= twoWeeksFromNow && 
               invoice.balance > 0;
      });

      // Return the first urgent invoice or null if none found
      res.status(200).json({
        success: true,
        message: 'Pending invoices retrieved successfully',
        data: urgentInvoice || null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Pending invoices error details:', error);
      handleError(res, error, 500);
    }
  });