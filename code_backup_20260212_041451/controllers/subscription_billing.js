const db = require("../models");

// ============================================================
// PRICING PLAN MANAGEMENT
// ============================================================

/**
 * Get all active pricing plans with their features
 */
const getPricingPlans = async (req, res) => {
  try {
    const results = await db.sequelize.query(
      `SELECT DISTINCT sp.*, spf.features
       FROM subscription_pricing sp
       LEFT JOIN subscription_plan_features spf ON sp.id = spf.pricing_plan_id
       WHERE sp.is_active = 1
       GROUP BY sp.id
       ORDER BY sp.id ASC`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    // Parse the features JSON and merge with plan data
    const plansWithFeatures = results.map(plan => {
      // Store original plan properties to ensure they're not overwritten
      const originalPlanData = {
        id: plan.id,
        pricing_name: plan.pricing_name,
        base_price_per_student: plan.base_price_per_student,
        discount_per_annum: plan.discount_per_annum,
        cbt_stand_alone_cost: plan.cbt_stand_alone_cost,
        sms_subscription_cost: plan.sms_subscription_cost,
        whatsapp_subscription_cost: plan.whatsapp_subscription_cost,
        email_subscription_cost: plan.email_subscription_cost,
        express_finance_cost: plan.express_finance_cost,
        is_active: plan.is_active,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      };
      
      let features = {};
      if (plan.features) {
        try {
          features = typeof plan.features === 'string' 
            ? JSON.parse(plan.features) 
            : plan.features;
        } catch (e) {
          console.error("Error parsing features JSON:", e);
          features = {};
        }
      }
      
      // Merge original plan data with features, ensuring plan properties take precedence
      return { ...features, ...originalPlanData };
    });

    // For debugging, let's log the first plan to see what data we're sending
    if (plansWithFeatures.length > 0) {
      console.log('Sample pricing plan data:', {
        id: plansWithFeatures[0].id,
        pricing_name: plansWithFeatures[0].pricing_name,
        base_price_per_student: plansWithFeatures[0].base_price_per_student,
        discount_per_annum: plansWithFeatures[0].discount_per_annum,
      });
    }

    res.json({
      success: true,
      data: plansWithFeatures,
    });
  } catch (err) {
    console.error("Error fetching pricing plans:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching pricing plans",
      error: err.message,
    });
  }
};

/**
 * Get features for a specific pricing plan
 */
const getPricingPlanFeatures = async (req, res) => {
  const { plan_id } = req.params;
  
  try {
    const results = await db.sequelize.query(
      `SELECT features FROM subscription_plan_features WHERE pricing_plan_id = :plan_id`,
      {
        replacements: { plan_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pricing plan features not found",
      });
    }

    let features = {};
    if (results[0].features) {
      try {
        features = typeof results[0].features === 'string' 
          ? JSON.parse(results[0].features) 
          : results[0].features;
      } catch (e) {
        console.error("Error parsing features JSON:", e);
        return res.status(500).json({
          success: false,
          message: "Error parsing features data",
          error: e.message,
        });
      }
    }

    res.json({
      success: true,
      data: features,
    });
  } catch (err) {
    console.error("Error fetching pricing plan features:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching pricing plan features",
      error: err.message,
    });
  }
};

/**
 * Update features for a specific pricing plan
 */
const updatePricingPlanFeatures = async (req, res) => {
  const { plan_id } = req.params;
  const features = req.body; // Expecting the entire features object

  try {
    // Check if features record exists
    const existingFeatures = await db.sequelize.query(
      `SELECT id FROM subscription_plan_features WHERE pricing_plan_id = :plan_id`,
      {
        replacements: { plan_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    // Stringify the features object for storage
    const featuresJson = JSON.stringify(features);

    if (existingFeatures.length > 0) {
      // Update existing record
      await db.sequelize.query(
        `UPDATE subscription_plan_features SET
          features = :features,
          updated_at = NOW()
         WHERE pricing_plan_id = :plan_id`,
        {
          replacements: {
            plan_id,
            features: featuresJson
          },
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );
    } else {
      // Create new record
      await db.sequelize.query(
        `INSERT INTO subscription_plan_features (
          pricing_plan_id, features
        ) VALUES (
          :plan_id, :features
        )`,
        {
          replacements: {
            plan_id,
            features: featuresJson
          },
          type: db.sequelize.QueryTypes.INSERT,
        }
      );
    }

    res.json({
      success: true,
      message: "Pricing plan features updated successfully",
    });
  } catch (err) {
    console.error("Error updating pricing plan features:", err);
    res.status(500).json({
      success: false,
      message: "Error updating pricing plan features",
      error: err.message,
    });
  }
};

/**
 * Create or update pricing plan
 */
const savePricingPlan = async (req, res) => {
  const {
    id = null,
    pricing_name,
    base_price_per_student,
    discount_per_annum,
    cbt_stand_alone_cost,
    sms_subscription_cost,
    whatsapp_subscription_cost,
    email_subscription_cost,
    express_finance_cost,
  } = req.body;

  try {
    if (id) {
      // Update existing plan
      await db.sequelize.query(
        `UPDATE subscription_pricing SET
          pricing_name = :pricing_name,
          base_price_per_student = :base_price_per_student,
          discount_per_annum = :discount_per_annum,
          cbt_stand_alone_cost = :cbt_stand_alone_cost,
          sms_subscription_cost = :sms_subscription_cost,
          whatsapp_subscription_cost = :whatsapp_subscription_cost,
          email_subscription_cost = :email_subscription_cost,
          express_finance_cost = :express_finance_cost,
          updated_at = NOW()
        WHERE id = :id`,
        {
          replacements: {
            id,
            pricing_name,
            base_price_per_student,
            discount_per_annum,
            cbt_stand_alone_cost,
            sms_subscription_cost,
            whatsapp_subscription_cost,
            email_subscription_cost,
            express_finance_cost,
          },
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );

      res.json({
        success: true,
        message: "Pricing plan updated successfully",
      });
    } else {
      // Create new plan
      await db.sequelize.query(
        `INSERT INTO subscription_pricing (
          pricing_name, base_price_per_student, discount_per_annum,
          cbt_stand_alone_cost, sms_subscription_cost, whatsapp_subscription_cost,
          email_subscription_cost, express_finance_cost
        ) VALUES (
          :pricing_name, :base_price_per_student, :discount_per_annum,
          :cbt_stand_alone_cost, :sms_subscription_cost, :whatsapp_subscription_cost,
          :email_subscription_cost, :express_finance_cost
        )`,
        {
          replacements: {
            pricing_name,
            base_price_per_student,
            discount_per_annum,
            cbt_stand_alone_cost,
            sms_subscription_cost,
            whatsapp_subscription_cost,
            email_subscription_cost,
            express_finance_cost,
          },
          type: db.sequelize.QueryTypes.INSERT,
        }
      );

      res.json({
        success: true,
        message: "Pricing plan created successfully",
      });
    }
  } catch (err) {
    console.error("Error saving pricing plan:", err);
    res.status(500).json({
      success: false,
      message: "Error saving pricing plan",
      error: err.message,
    });
  }
};

// ============================================================
// STUDENT COUNT
// ============================================================

/**
 * Get active student count for a school
 */
const getStudentCount = async (req, res) => {
  const { school_id } = req.query;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "school_id is required",
    });
  }

  try {
    const results = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM students
       WHERE school_id = :school_id
       AND status = 'active'`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: {
        count: results[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error("Error fetching student count:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching student count",
      error: err.message,
    });
  }
};

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

/**
 * Create a new school subscription
 */
const createSubscription = async (req, res) => {
  const {
    school_id,
    subscription_type,
    pricing_plan_id,
    active_students_count,
    cbt_stand_alone_enabled,
    sms_subscription_enabled,
    whatsapp_subscription_enabled,
    email_subscription_enabled,
    express_finance_enabled,
    current_term,
    academic_year,
    agreed_discount_percentage = 0,
    partner_guaranteed = 0,
  } = req.body;

  // Convert string values to numbers where needed
  const studentCount = parseInt(active_students_count) || 0;
  const agreed_discount = parseFloat(agreed_discount_percentage) || 0;

  // Validation - Allow student count >= 0 to support onboarding scenarios
  if (!school_id || !subscription_type || !pricing_plan_id || studentCount < 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: school_id, subscription_type, pricing_plan_id, and active_students_count must be 0 or greater",
    });
  }

  try {
    // Fetch the pricing plan to calculate costs
    const pricingPlanResult = await db.sequelize.query(
      `SELECT * FROM subscription_pricing WHERE id = :pricing_plan_id`,
      {
        replacements: { pricing_plan_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (!pricingPlanResult || pricingPlanResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pricing plan not found",
      });
    }

    const pricingPlan = pricingPlanResult[0];

    // Validate that pricing plan values are valid numbers
    if (isNaN(pricingPlan.base_price_per_student) || isNaN(pricingPlan.discount_per_annum) ||
        isNaN(pricingPlan.cbt_stand_alone_cost) || isNaN(pricingPlan.sms_subscription_cost) ||
        isNaN(pricingPlan.whatsapp_subscription_cost) || isNaN(pricingPlan.email_subscription_cost) ||
        isNaN(pricingPlan.express_finance_cost)) {
      return res.status(500).json({
        success: false,
        message: "Invalid pricing plan data",
      });
    }

    // Validate all pricing plan fields are valid numbers before doing calculations
    const base_price = parseFloat(pricingPlan.base_price_per_student) || 0;
    const discount_per_annum = parseFloat(pricingPlan.discount_per_annum) || 0;
    const cbt_cost = parseFloat(pricingPlan.cbt_stand_alone_cost) || 0;
    const sms_cost = parseFloat(pricingPlan.sms_subscription_cost) || 0;
    const whatsapp_cost = parseFloat(pricingPlan.whatsapp_subscription_cost) || 0;
    const email_cost = parseFloat(pricingPlan.email_subscription_cost) || 0;
    const express_finance_cost = parseFloat(pricingPlan.express_finance_cost) || 0;

    // Calculate base cost: base_price_per_student * active_students_count
    let base_cost = base_price * studentCount;

    // Calculate addon costs based on enabled features
    let addon_cost = 0;
    if (cbt_stand_alone_enabled) addon_cost += cbt_cost;
    if (sms_subscription_enabled) addon_cost += sms_cost;
    if (whatsapp_subscription_enabled) addon_cost += whatsapp_cost;
    if (email_subscription_enabled) addon_cost += email_cost;
    if (express_finance_enabled) addon_cost += express_finance_cost;

    // Calculate discount amount
    // Apply the plan's standard annual discount (for annual subscriptions)
    let standard_discount_amount = 0;
    if (subscription_type === 'annually') {
      standard_discount_amount = (base_cost * discount_per_annum) / 100;
    }

    // Apply any additional agreed discount
    const additional_discount_amount = (base_cost * agreed_discount) / 100;

    // Total discount is the sum of standard and agreed discounts
    const total_discount_amount = standard_discount_amount + additional_discount_amount;

    // Calculate total cost
    let total_cost = (base_cost + addon_cost) - total_discount_amount;

    // Ensure total cost doesn't go negative
    total_cost = Math.max(0, total_cost);

    // Validation: Ensure all calculated values are valid numbers
    if (isNaN(base_cost) || isNaN(addon_cost) || isNaN(total_discount_amount) || isNaN(total_cost)) {
      console.error("Calculated values contain NaN:", {
        base_cost,
        addon_cost,
        total_discount_amount,
        total_cost,
        studentCount,
        base_price
      });
      return res.status(500).json({
        success: false,
        message: "Error calculating subscription costs - invalid numeric values",
      });
    }

    // Calculate subscription period
    const start_date = new Date();
    let end_date = new Date();

    if (subscription_type === "termly") {
      // 4 months per term
      end_date.setMonth(end_date.getMonth() + 4);
    } else {
      // 12 months for annual
      end_date.setMonth(end_date.getMonth() + 12);
    }

    // Insert subscription
    const subscriptionResult = await db.sequelize.query(
      `INSERT INTO school_subscriptions (
        school_id, subscription_type, pricing_plan_id, subscription_start_date, subscription_end_date,
        current_term, academic_year, active_students_count, cbt_stand_alone_enabled,
        sms_subscription_enabled, whatsapp_subscription_enabled, email_subscription_enabled,
        express_finance_enabled, base_cost, addon_cost, discount_amount, partner_guaranteed, total_cost,
        payment_status, balance, status, created_by
      ) VALUES (
        :school_id, :subscription_type, :pricing_plan_id, :start_date, :end_date,
        :current_term, :academic_year, :active_students_count, :cbt_stand_alone_enabled,
        :sms_subscription_enabled, :whatsapp_subscription_enabled, :email_subscription_enabled,
        :express_finance_enabled, :base_cost, :addon_cost, :discount_amount, :partner_guaranteed, :total_cost,
        'pending', :total_cost, 'active', :created_by
      )`,
      {
        replacements: {
          school_id,
          subscription_type,
          pricing_plan_id,
          start_date: start_date.toISOString().split("T")[0],
          end_date: end_date.toISOString().split("T")[0],
          current_term: current_term || null,
          academic_year: academic_year || null,
          active_students_count: studentCount,
          cbt_stand_alone_enabled: cbt_stand_alone_enabled || 0,
          sms_subscription_enabled: sms_subscription_enabled || 0,
          whatsapp_subscription_enabled: whatsapp_subscription_enabled || 0,
          email_subscription_enabled: email_subscription_enabled || 0,
          express_finance_enabled: express_finance_enabled || 0,
          base_cost,
          addon_cost,
          discount_amount: total_discount_amount,
          partner_guaranteed: partner_guaranteed || 0,
          total_cost,
          created_by: req.user?.id || null,
        },
        type: db.sequelize.QueryTypes.INSERT,
      }
    );

    const subscription_id = subscriptionResult[0];

    // Update rbac_school_packages for sidebar access control
    // Lookup package_id from subscription_packages based on pricing_plan_id
    const packageResult = await db.sequelize.query(
      `SELECT pkg.id as package_id
       FROM subscription_pricing sp
       JOIN subscription_packages pkg ON LOWER(REPLACE(sp.pricing_name, ' Plan', '')) = LOWER(pkg.package_name)
       WHERE sp.id = ? AND pkg.is_active = 1
       LIMIT 1`,
      { replacements: [pricing_plan_id], type: db.sequelize.QueryTypes.SELECT }
    );
    
    const package_id = packageResult && packageResult.length > 0 ? packageResult[0].package_id : null;
    
    if (package_id) {
      // First deactivate any existing active packages for this school
      await db.sequelize.query(
        `UPDATE rbac_school_packages SET is_active = 0, updated_at = NOW() WHERE school_id = :school_id AND is_active = 1`,
        {
          replacements: { school_id },
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );

      // Then insert the new package
      await db.sequelize.query(
        `INSERT INTO rbac_school_packages (school_id, package_id, start_date, end_date, is_active, created_by, created_at, updated_at)
         VALUES (:school_id, :package_id, :start_date, :end_date, 1, :created_by, NOW(), NOW())`,
        {
          replacements: {
            school_id,
            package_id,
            start_date: start_date.toISOString().split("T")[0],
            end_date: end_date.toISOString().split("T")[0],
            created_by: req.user?.id || null,
          },
          type: db.sequelize.QueryTypes.INSERT,
        }
      );
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice
    const due_date = new Date(start_date);
    due_date.setDate(due_date.getDate() + 30); // 30 days to pay

    await db.sequelize.query(
      `INSERT INTO subscription_invoices (
        invoice_number, school_id, subscription_id, invoice_date, due_date,
        subtotal, discount, total_amount, payment_status, invoice_status, balance, created_by
      ) VALUES (
        :invoice_number, :school_id, :subscription_id, :invoice_date, :due_date,
        :subtotal, :discount, :total_amount, 'unpaid', 'draft', :balance, :created_by
      )`,
      {
        replacements: {
          invoice_number: invoiceNumber,
          school_id,
          subscription_id,
          invoice_date: start_date.toISOString().split("T")[0],
          due_date: due_date.toISOString().split("T")[0],
          subtotal: base_cost + addon_cost,
          discount: total_discount_amount,
          total_amount: total_cost,
          balance: total_cost, // Set balance explicitly
          created_by: req.user?.id || null,
        },
        type: db.sequelize.QueryTypes.INSERT,
      }
    );

    res.json({
      success: true,
      message: "Subscription created and invoice generated successfully",
      data: {
        subscription_id,
        invoice_number: invoiceNumber,
      },
    });
  } catch (err) {
    console.error("Error creating subscription:", err);
    res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error: err.message,
    });
  }
};

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  let invoiceNumber;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    const results = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM subscription_invoices
       WHERE YEAR(invoice_date) = :year`,
      {
        replacements: { year },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    const count = (results[0]?.count || 0) + 1 + attempts;
    invoiceNumber = `INV-${year}-${String(count).padStart(4, "0")}`;
    
    // Check if this number already exists
    const existing = await db.sequelize.query(
      `SELECT id FROM subscription_invoices WHERE invoice_number = :invoiceNumber`,
      {
        replacements: { invoiceNumber },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );
    
    if (existing.length === 0) {
      break;
    }
    
    attempts++;
  } while (attempts < maxAttempts);

  return invoiceNumber;
};

/**
 * Get subscriptions for a school
 */
const getSchoolSubscriptions = async (req, res) => {
  const { school_id } = req.query;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "school_id is required",
    });
  }

  try {
    const results = await db.sequelize.query(
      `SELECT
        ss.*,
        sp.pricing_name,
        sp.base_price_per_student,
        sp.discount_per_annum
      FROM school_subscriptions ss
      JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
      WHERE ss.school_id = :school_id
      ORDER BY ss.created_at DESC`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriptions",
      error: err.message,
    });
  }
};

/**
 * Get all subscriptions (Super Admin)
 */
const getAllSubscriptions = async (req, res) => {
  try {
    const results = await db.sequelize.query(
      `SELECT
        ss.*,
        sch.school_name,
        sch.short_name,
        sp.pricing_name,
        sp.base_price_per_student,
        sp.discount_per_annum
      FROM school_subscriptions ss
      JOIN school_setup sch ON ss.school_id = sch.school_id
      JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
      ORDER BY ss.created_at DESC`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching all subscriptions:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriptions",
      error: err.message,
    });
  }
};

// ============================================================
// INVOICE MANAGEMENT
// ============================================================

/**
 * Get invoices for a school
 */
const getSchoolInvoices = async (req, res) => {
  const { school_id } = req.query;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "school_id is required",
    });
  }

  try {
    const results = await db.sequelize.query(
      `SELECT
        si.*,
        ss.subscription_type,
        sp.pricing_name
      FROM subscription_invoices si
      JOIN school_subscriptions ss ON si.subscription_id = ss.id
      JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
      WHERE si.school_id = :school_id
      ORDER BY si.invoice_date DESC`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching invoices",
      error: err.message,
    });
  }
};

/**
 * Get all invoices (Super Admin)
 */
const getAllInvoices = async (req, res) => {
  try {
    const results = await db.sequelize.query(
      `SELECT
        si.*,
        sch.school_name,
        sch.short_name,
        ss.subscription_type,
        sp.pricing_name,
        sp.base_price_per_student,
        sp.discount_per_annum
      FROM subscription_invoices si
      JOIN school_setup sch ON si.school_id = sch.school_id
      JOIN school_subscriptions ss ON si.subscription_id = ss.id
      JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
      ORDER BY si.invoice_date DESC`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching all invoices:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching invoices",
      error: err.message,
    });
  }
};

// ============================================================
// PAYMENT MANAGEMENT
// ============================================================

/**
 * Record a payment
 */
const recordPayment = async (req, res) => {
  const {
    school_id,
    subscription_id,
    invoice_id,
    amount,
    payment_method,
    payment_date,
    transaction_id,
    bank_name,
    depositor_name,
    notes,
    reference_number,
  } = req.body;

  // Validation
  if (!school_id || !subscription_id || !amount || !payment_method) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const transaction = await db.sequelize.transaction();

  try {
    // If invoice_id is not provided, find the invoice associated with the subscription
    let resolved_invoice_id = invoice_id;
    if (!invoice_id) {
      const invoiceResult = await db.sequelize.query(
        `SELECT id FROM subscription_invoices 
         WHERE subscription_id = :subscription_id 
         ORDER BY created_at DESC 
         LIMIT 1`,
        {
          replacements: { subscription_id },
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      
      if (invoiceResult.length > 0) {
        resolved_invoice_id = invoiceResult[0].id;
      } else {
        throw new Error("No invoice found for the given subscription");
      }
    }

    const payment_ref = reference_number || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert payment record
    await db.sequelize.query(
      `INSERT INTO subscription_payments (
        subscription_id, invoice_id, payment_date, amount_paid, 
        payment_method, reference_number, payment_status, notes, 
        created_by, school_id
      ) VALUES (
        :subscription_id, :resolved_invoice_id, :payment_date, :amount,
        :payment_method, :payment_reference, :payment_status, :notes,
        :created_by, :school_id
      )`,
      {
        replacements: {
          subscription_id,
          resolved_invoice_id,
          payment_date: payment_date || new Date().toISOString().split("T")[0],
          amount,
          payment_method,
          payment_reference: payment_ref,
          payment_status: 'completed',
          notes: notes || null,
          created_by: req.user?.id || null,
          school_id,
        },
        type: db.sequelize.QueryTypes.INSERT,
        transaction
      }
    );
// verification_status
    // Update the invoice with payment info
    await db.sequelize.query(
      `UPDATE subscription_invoices 
       SET 
         amount_paid = amount_paid + :amount,
         balance = total_amount - (amount_paid + :amount),
         payment_status = CASE 
           WHEN (amount_paid + :amount) >= total_amount THEN 'paid'
           WHEN (amount_paid + :amount) > 0 THEN 'partial'
           ELSE 'unpaid'
         END,
         last_payment_date = NOW()
       WHERE id = :resolved_invoice_id`,
      {
        replacements: {
          amount,
          resolved_invoice_id
        },
        type: db.sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    // Update the subscription with payment info
    await db.sequelize.query(
      `UPDATE school_subscriptions 
       SET 
         amount_paid = amount_paid + :amount,
         balance = total_cost - (amount_paid + :amount),
         payment_status = CASE 
           WHEN (amount_paid + :amount) >= total_cost THEN 'paid'
           WHEN (amount_paid + :amount) > 0 THEN 'partial'
           ELSE 'pending'
         END,
         last_payment_date = NOW()
       WHERE id = :subscription_id`,
      {
        replacements: {
          amount,
          subscription_id
        },
        type: db.sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    // Commit transaction
    await transaction.commit();

    res.json({
      success: true,
      message: "Payment recorded successfully and balances updated",
      data: {
        payment_reference: payment_ref,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error recording payment:", err);
    res.status(500).json({
      success: false,
      message: "Error recording payment",
      error: err.message,
    });
  }
};

/**
 * Verify payment (Super Admin)
 */
const verifyPayment = async (req, res) => {
  const { payment_id, verification_status } = req.body;

  if (!payment_id || !verification_status) {
    return res.status(400).json({
      success: false,
      message: "payment_id and verification_status are required",
    });
  }

  try {
    // Update payment verification status
    await db.sequelize.query(
      `UPDATE subscription_payments SET
        verification_status = :verification_status,
        verified_by = :verified_by,
        verified_at = NOW()
      WHERE id = :payment_id`,
      {
        replacements: {
          payment_id,
          verification_status,
          verified_by: req.user?.id || null,
        },
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );

    // If verified, update subscription and invoice
    if (verification_status === "verified") {
      const payment = await db.sequelize.query(
        `SELECT * FROM subscription_payments WHERE id = :payment_id`,
        {
          replacements: { payment_id },
          type: db.sequelize.QueryTypes.SELECT,
        }
      );

      if (payment.length > 0) {
        const { subscription_id, invoice_id, amount } = payment[0];

        // Update subscription
        await db.sequelize.query(
          `UPDATE school_subscriptions SET
            amount_paid = amount_paid + :amount,
            balance = total_cost - (amount_paid + :amount),
            payment_status = CASE
              WHEN (amount_paid + :amount) >= total_cost THEN 'paid'
              WHEN (amount_paid + :amount) > 0 THEN 'partial'
              ELSE 'pending'
            END
          WHERE id = :subscription_id`,
          {
            replacements: { subscription_id, amount },
            type: db.sequelize.QueryTypes.UPDATE,
          }
        );

        // Update invoice if provided
        if (invoice_id) {
          await db.sequelize.query(
            `UPDATE subscription_invoices SET
              amount_paid = amount_paid + :amount,
              balance = total_amount - (amount_paid + :amount),
              payment_status = CASE
                WHEN (amount_paid + :amount) >= total_amount THEN 'paid'
                WHEN (amount_paid + :amount) > 0 THEN 'partial'
                ELSE 'unpaid'
              END,
              payment_date = :payment_date,
              payment_method = :payment_method,
              payment_reference = :payment_reference
            WHERE id = :invoice_id`,
            {
              replacements: {
                invoice_id,
                amount,
                payment_date: payment[0].payment_date,
                payment_method: payment[0].payment_method,
                payment_reference: payment[0].payment_reference,
              },
              type: db.sequelize.QueryTypes.UPDATE,
            }
          );
        }
      }
    }

    res.json({
      success: true,
      message: `Payment ${verification_status} successfully`,
    });
  } catch (err) {
    console.error("Error verifying payment:", err);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: err.message,
    });
  }
};

/**
 * Get pending payments (Super Admin)
 */
const getPendingPayments = async (req, res) => {
  try {
    const results = await db.sequelize.query(
      `SELECT
        sp.*,
        sch.school_name,
        sch.short_name
      FROM subscription_payments sp
      JOIN school_setup sch ON sp.school_id = sch.school_id
      WHERE sp.verification_status = 'pending'
      ORDER BY sp.created_at DESC`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching pending payments:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching pending payments",
      error: err.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

// Function to get school subscription by school ID or all subscriptions for super admin/partners
const getSchoolSubscription = async (req, res) => {
  const { school_id, limit = 10, sort = 'created_at', order = 'desc', start_date, end_date } = req.query;
  const userId = req.user?.id;

  console.log('🔍 =================================');
  console.log('🔍 getSchoolSubscription API CALLED');
  console.log('🔍 Query params:', { school_id, limit, sort, order, start_date, end_date });
  console.log('🔍 User ID:', userId);
  console.log('🔍 Full req.user:', req.user);
  console.log('🔍 =================================');

  try {
    let query;
    let replacements = {};

    // Build date range filter
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = ` AND ss.created_at BETWEEN :start_date AND :end_date`;
      replacements.start_date = start_date;
      replacements.end_date = end_date;
    }

    // If school_id is provided, get that specific school's subscription (original behavior)
    if (school_id) {
      query = `SELECT
                 ss.id,
                 ss.school_id,
                 sch.school_name,
                 sch.short_name,
                 ss.pricing_plan_id,
                 sp.pricing_name as display_name,
                 sp.pricing_name as package_name,
                 pkg.features,
                 ss.subscription_type,
                 ss.total_cost,
                 ss.subscription_end_date as due_date,
                 COALESCE(ss.payment_status, 'pending') as payment_status,
                 ss.status,
                 ss.created_at,
                 COALESCE(ss.amount_paid, 0) as amount_paid,
                 COALESCE(ss.balance, ss.total_cost) as balance,
                 si.invoice_number,
                 ss.academic_year,
                 ss.current_term
               FROM school_subscriptions ss
               LEFT JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
               LEFT JOIN subscription_packages pkg ON LOWER(REPLACE(sp.pricing_name, ' Plan', '')) = LOWER(pkg.package_name)
               LEFT JOIN subscription_invoices si ON ss.id = si.subscription_id
               LEFT JOIN school_setup sch ON ss.school_id = sch.school_id
               WHERE ss.school_id = :school_id
               ${dateFilter}
               ORDER BY ss.${sort} ${order.toUpperCase()}
               LIMIT 1`;
      replacements.school_id = school_id;
    }
    // If no school_id, implement partner/super admin logic
    else {
      // Super Admin (user.id = 1) sees ALL subscriptions, OR if userId is undefined (fallback to show all)
      if (!userId || userId === 1 || userId === '1') {
        console.log('✅ Super admin detected (or no user) - showing all subscriptions');
        query = `SELECT
                   ss.id,
                   ss.school_id,
                   sch.school_name,
                   sch.short_name,
                   ss.pricing_plan_id,
                   sp.pricing_name,
                   ss.subscription_type,
                   ss.total_cost,
                   ss.subscription_end_date as due_date,
                   COALESCE(ss.payment_status, 'pending') as payment_status,
                   ss.status,
                   ss.created_at,
                   COALESCE(ss.amount_paid, 0) as amount_paid,
                   COALESCE(ss.balance, ss.total_cost) as balance,
                   si.invoice_number,
                   ss.academic_year,
                   ss.current_term
                 FROM school_subscriptions ss
                 LEFT JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
                 LEFT JOIN subscription_invoices si ON ss.id = si.subscription_id
                 LEFT JOIN school_setup sch ON ss.school_id = sch.school_id
                 WHERE ss.status = 'active'
                 ${dateFilter}
                 ORDER BY ss.${sort} ${order.toUpperCase()}
                 LIMIT :limit`;
      }
      // Partner user sees only their schools (where school_setup.created_by = user.id)
      else {
        console.log('👤 Partner user detected - filtering by created_by:', userId);
        query = `SELECT
                   ss.id,
                   ss.school_id,
                   sch.school_name,
                   sch.short_name,
                   ss.pricing_plan_id,
                   sp.pricing_name,
                   ss.subscription_type,
                   ss.total_cost,
                   ss.subscription_end_date as due_date,
                   COALESCE(ss.payment_status, 'pending') as payment_status,
                   ss.status,
                   ss.created_at,
                   COALESCE(ss.amount_paid, 0) as amount_paid,
                   COALESCE(ss.balance, ss.total_cost) as balance,
                   si.invoice_number,
                   ss.academic_year,
                   ss.current_term
                 FROM school_subscriptions ss
                 LEFT JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
                 LEFT JOIN subscription_invoices si ON ss.id = si.subscription_id
                 LEFT JOIN school_setup sch ON ss.school_id = sch.school_id
                 WHERE sch.created_by = :created_by
                 AND ss.status = 'active'
                 ${dateFilter}
                 ORDER BY ss.${sort} ${order.toUpperCase()}
                 LIMIT :limit`;
        replacements.created_by = userId;
      }

      replacements.limit = parseInt(limit);
    }

    console.log('📝 Executing query:', query);
    console.log('📝 With replacements:', replacements);

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT,
    });

    console.log('✅ Query results:', results.length, 'subscriptions found');
    console.log('✅ First result sample:', results[0]);

    // Feature mapping for human-readable names
    const featureMap = {
      'students': 'Student Information Management',
      'teachers': 'Staff & Teacher Management', 
      'classes': 'Class & Subject Management',
      'exams': 'Examination & Assessment',
      'fees': 'Fee Management & Billing',
      'accounting': 'Accounting & Financial Reports',
      'reports': 'Report Card Generation',
      'communication': 'Communication Tools',
      'recitation': 'Quran Recitation Management',
      'lesson_plans': 'Lesson Plans & Curriculum',
      'payroll': 'Payroll Management',
      'assets': 'Asset Management (Inventory & Retail)',
      'attendance': 'Attendance Tracking',
      'parent_portal': 'Parent Portal Access',
      'academic_calendar': 'Academic Calendar'
    };

    // Process results to add human-readable features
    const processedResults = results.map(result => {
      if (result.features) {
        try {
          const featureKeys = JSON.parse(result.features);
          const humanReadableFeatures = featureKeys.map(key => featureMap[key] || key);
          return {
            ...result,
            human_readable_features: humanReadableFeatures
          };
        } catch (e) {
          console.error('Error parsing features JSON:', e);
          return result;
        }
      }
      return result;
    });

    // If querying for a specific school_id and no results, return single null
    if (school_id && processedResults.length === 0) {
      console.log('⚠️ No subscription found for school_id:', school_id);
      return res.json({
        success: true,
        data: null,
        message: "No active subscription found for this school",
      });
    }

    // Return single result for specific school_id, array for list queries
    const responseData = school_id ? (processedResults[0] || null) : processedResults;
    console.log('📤 Sending response - data type:', Array.isArray(responseData) ? 'array' : 'object');
    console.log('📤 Response data count:', Array.isArray(responseData) ? responseData.length : 'single object');

    res.json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    console.error("❌ Error fetching school subscription:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching school subscription",
      error: err.message,
    });
  }
};

/**
 * Update school subscription settings (SMS, WhatsApp, Email)
 */
const updateSchoolSubscription = async (req, res) => {
  const { school_id, sms_subscription, whatsapp_subscription, email_subscription } = req.body;

  // Validation
  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "school_id is required",
    });
  }

  try {
    // Update the school_setup table with subscription flags
    await db.sequelize.query(
      `UPDATE school_setup SET
        sms_subscription = :sms_subscription,
        whatsapp_subscription = :whatsapp_subscription,
        email_subscription = :email_subscription,
        updated_at = NOW()
      WHERE school_id = :school_id`,
      {
        replacements: {
          school_id,
          sms_subscription: sms_subscription || 0,
          whatsapp_subscription: whatsapp_subscription || 0,
          email_subscription: email_subscription || 0,
        },
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );

    // Also update the latest active subscription if it exists
    await db.sequelize.query(
      `UPDATE school_subscriptions SET
        sms_subscription_enabled = :sms_subscription,
        whatsapp_subscription_enabled = :whatsapp_subscription,
        email_subscription_enabled = :email_subscription,
        updated_at = NOW()
      WHERE school_id = :school_id 
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
      {
        replacements: {
          school_id,
          sms_subscription: sms_subscription || 0,
          whatsapp_subscription: whatsapp_subscription || 0,
          email_subscription: email_subscription || 0,
        },
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      message: "School subscription settings updated successfully",
    });
  } catch (err) {
    console.error("Error updating school subscription:", err);
    res.status(500).json({
      success: false,
      message: "Error updating school subscription",
      error: err.message,
    });
  }
};

module.exports = {
  // Pricing
  getPricingPlans,
  savePricingPlan,
  getPricingPlanFeatures,
  updatePricingPlanFeatures,

  // Student count
  getStudentCount,

  // Subscriptions
  createSubscription,
  getSchoolSubscriptions,
  getAllSubscriptions,
  getSchoolSubscription, // Added new function
  updateSchoolSubscription, // Added update function

  // Invoices
  getSchoolInvoices,
  getAllInvoices,

  // Payments
  recordPayment,
  verifyPayment,
  getPendingPayments,
};
