const bcrypt = require("bcryptjs");
const db = require("../models");
const nodemailer = require("nodemailer");
const axios = require("axios");
const wbm = require("wbm");

// Load environment variables
require("dotenv").config();

// Configure Nodemailer for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Function to send email
const sendEmail = async (to, subject, text, html = null) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html: html || text, // If HTML is provided, use it; otherwise, use text
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// Function to send SMS using BulkSMSNigeria API
const sendSMS = async (to, message) => {
  try {
    const response = await axios.post(
      "https://www.bulksmsnigeria.com/api/v2/sms",
      {
        from: process.env.SMS_SENDER_ID, // Sender ID from environment variables
        to,
        body: message,
        api_token: process.env.BULKSMS_API_TOKEN, // API token from environment variables
        gateway: "direct-refund" // Default gateway
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data.data.status === "success") {
      return true;
    } else {
      console.error("Error sending SMS:", response.data.error);
      return false;
    }
  } catch (error) {
    console.error(
      "Error sending SMS:",
      error.response ? error.response.data : error.message
    );
    return false;
  }
};

// Function to send WhatsApp message using wbm
const sendWhatsApp = async (to, message) => {
  try {
    await wbm.start({ showBrowser: false, session: true });
    await wbm.sendTo(to, message);
    await wbm.end();
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
};

// Function to create a new subscription and invoice
const createSubscriptionAndInvoice = async (
  school_id,
  pricing_plan_id,
  subscription_type,
  active_students_count,
  agreed_discount_percentage
) => {
  if (!pricing_plan_id) {
    console.log("No pricing plan selected, skipping invoice creation.");
    return;
  }

  try {
    // Get pricing plan details
    const [pricingPlan] = await db.sequelize.query(
      "SELECT * FROM subscription_pricing WHERE id = :pricing_plan_id",
      {
        replacements: { pricing_plan_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (!pricingPlan) {
      throw new Error("Pricing plan not found");
    }

    // Calculate invoice amount
    const base_price = pricingPlan.base_price_per_student;
    const num_students = active_students_count;
    const discount_percentage =
      subscription_type === "annually"
        ? pricingPlan.discount_per_annum
        : agreed_discount_percentage;

    const total_amount = base_price * num_students;
    const discount_amount = (total_amount * discount_percentage) / 100;
    const final_amount = total_amount - discount_amount;

    // Create subscription
    await db.sequelize.query(
      `INSERT INTO school_subscriptions (
        school_id, pricing_plan_id, subscription_type, 
        subscription_start_date, subscription_end_date, 
        active_students_count, base_cost, total_cost, balance, status
      ) VALUES (
        :school_id, :pricing_plan_id, :subscription_type, 
        NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 
        :active_students_count, :base_cost, :total_cost, :total_cost, 'active'
      )`,
      {
        replacements: {
          school_id,
          pricing_plan_id,
          subscription_type,
          active_students_count: num_students,
          base_cost: total_amount,
          total_cost: final_amount,
        },
      }
    );

    // Create invoice
    await db.sequelize.query(
      `INSERT INTO subscription_invoices (
        school_id, amount, discount_amount, total_amount, 
        due_date, status, invoice_type
      ) VALUES (
        :school_id, :base_amount, :discount_amount, :final_amount, 
        DATE_ADD(NOW(), INTERVAL 1 MONTH), 'unpaid', 'subscription'
      )`,
      {
        replacements: {
          school_id,
          base_amount: total_amount,
          discount_amount: discount_amount,
          final_amount: final_amount,
        },
      }
    );

    console.log("Subscription and invoice created successfully");
  } catch (error) {
    console.error("Error creating subscription and invoice:", error);
  }
};

// Function to update backdated attendance settings
const updateAttendanceSettings = async (req, res) => {
  const {
    school_id,
    allow_backdated_attendance,
    backdated_days,
  } = req.body;

  // Validation
  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: 'school_id is required',
    });
  }

  if (typeof allow_backdated_attendance !== 'number' || ![0, 1].includes(allow_backdated_attendance)) {
    return res.status(400).json({
      success: false,
      message: 'allow_backdated_attendance must be 0 or 1',
    });
  }

  if (!backdated_days || backdated_days < 1 || backdated_days > 365) {
    return res.status(400).json({
      success: false,
      message: 'backdated_days must be between 1 and 365',
    });
  }

  try {
    // Update the school_setup table (school-wide setting, no branch_id)
    await db.sequelize.query(
      `UPDATE school_setup
       SET allow_backdated_attendance = :allow_backdated_attendance,
           backdated_days = :backdated_days,
           updated_at = NOW()
       WHERE school_id = :school_id`,
      {
        replacements: {
          allow_backdated_attendance,
          backdated_days,
          school_id,
        },
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      message: 'Attendance settings updated successfully',
    });
  } catch (err) {
    console.error('Error updating attendance settings:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating settings',
      error: err.message,
    });
  }
};

// Function to create a new school and admin user
const createSchool = async (req, res) => {
  const { query_type } = req.body;

  // Handle attendance settings update
  if (query_type === 'update-attendance-settings') {
    return updateAttendanceSettings(req, res);
  }

  // Handle status update requests from SuperAdmin dashboard
  if (query_type === 'update') {
    return updateSchoolStatus(req, res);
  }

  const {
    school_id,
    school_name,
    school_second_name=null,  // New multilingual field
    short_name,
    school_motto,
    state,
    lga,
    address,
    primary_contact_number,
    secondary_contact_number,
    email_address,
    schoolMaster,
    expressFinance,
    cbtPoint,
    resultStation,
    academic_year = null,
    session_start_date = null,
    session_end_date = null,
    status = null,
    badge_url = null,
    mission = null,
    vission = null,
    about_us = null,
    nurserySection,
    primarySection,
    juniorSecondary,
    seniorSecondary,
    islamiyyah,
    tahfizu,
    admin_name,
    admin_email,
    admin_password,
    section_type = 'nigerian',
    created_by = null,
    is_arabic = 0,
    default_lang = 'en',
    second_lang = null,
    assessment_type = 'Fixed',
    personal_dev_scale = 'Alphabet',
    require_verification = 0,
    has_class_stream = 0
  } = req.body;

  // Validate admin_password
  if (!admin_password || typeof admin_password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Admin password is required and must be a string.",
    });
  }

  // Generate salt and hash the password using bcryptjs
  const saltRounds = 10;
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(admin_password, saltRounds);
  } catch (err) {
    console.error("Error hashing password:", err);
    return res.status(500).json({
      success: false,
      message: "Error hashing password",
      error: err.message,
    });
  }

  // Get the domain from environment variables
  const domain = process.env.DOMAIN || "http://localhost:3000";

  // Let the stored procedure handle school ID generation if not provided
  const finalSchoolId = school_id || null; // Pass as null or undefined and let the stored procedure handle it

  try {
    // Attempt to execute the query with special error handling
    const query = `CALL school_setup(
      'CREATE', :school_id, :school_name, :school_second_name,
      :short_name, :academic_year, :session_start_date, :session_end_date, :status, :badge_url,
      :mission, :vission, :about_us, :school_motto, :state, :lga,
      :address, :primary_contact_number, :secondary_contact_number,
      :email, :school_master, :express_finance,
      :cbt_center, :result_station, :nursery, :primary,
      :junior_secondary, :senior_secondary, :islamiyya,
      :tahfiz, :admin_name, :admin_email, :admin_password, :domain, :section_type, :created_by,
      :cbt_stand_alone, :sms_subscription, :whatsapp_subscription, :email_subscription, :assessmentType,
      :is_arabic, :default_lang, :second_lang, :personal_dev_scale, :require_verification, :has_class_stream
    )`;

    const replacements = {
      school_id: finalSchoolId, // Use the generated or provided school ID
      school_name,
      school_second_name,
      short_name,
      academic_year,
      session_start_date,
      session_end_date,
      status: status === null ? "Active" : status,
      badge_url,
      mission,
      vission,
      about_us,
      school_motto,
      state,
      lga,
      address,
      primary_contact_number,
      secondary_contact_number,
      email: email_address,
      school_master: schoolMaster ? 1 : 0,
      express_finance: expressFinance ? 1 : 0,
      cbt_center: cbtPoint ? 1 : 0,
      result_station: resultStation ? 1 : 0,
      nursery: nurserySection ? 1 : 0,
      primary: primarySection ? 1 : 0,
      junior_secondary: juniorSecondary ? 1 : 0,
      senior_secondary: seniorSecondary ? 1 : 0,
      islamiyya: islamiyyah ? 1 : 0,
      tahfiz: tahfizu ? 1 : 0,
      admin_name,
      admin_email,
      admin_password: hashedPassword,
      domain,
      section_type, // Add section_type to the query parameters
      created_by: req.user?.id || null,
      // Additional parameters for the updated procedure
      cbt_stand_alone: req.body.cbt_stand_alone ? 1 : 0,
      sms_subscription: req.body.sms_subscription ? 1 : 0,
      whatsapp_subscription: req.body.whatsapp_subscription ? 1 : 0,
      email_subscription: req.body.email_subscription ? 1 : 0,
      assessmentType: req.body.assessmentType || assessment_type || 'Fixed',
      is_arabic,
      default_lang,
      second_lang,
      personal_dev_scale,
      require_verification: require_verification ? 1 : 0,
      has_class_stream: has_class_stream ? 1 : 0
    };

    let results;
    try {
      // Execute the query with the replacements - let stored procedure handle ID generation
      results = await db.sequelize.query(query, { replacements });
    } catch (dbErr) {
      // Check if this is specifically the logger error
      if (dbErr.message && (dbErr.message.includes('logger.logQueryError is not a function') ||
          typeof dbErr.original?.message === 'string' && dbErr.original.message.includes('logger.logQueryError is not a function'))) {
        console.error('Database logging error caught:', dbErr);
        return res.status(500).json({
          success: false,
          message: "Database configuration error",
          error: "Internal database logging configuration issue",
        });
      }
      // If it's another error, re-throw it to be caught by the outer catch block
      throw dbErr;
    }

    const {
      pricing_plan_id,
      subscription_type,
      active_students_count,
      agreed_discount_percentage,
    } = req.body;
    
    // Create subscription and invoice
    await createSubscriptionAndInvoice(
      results[0].school_id,
      pricing_plan_id,
      subscription_type,
      active_students_count,
      agreed_discount_percentage
    );

    // Send the response first
    res.json({
      success: true,
      data: results,
    });

    // Prepare welcome message after a short delay to ensure the response is sent
    // Send notifications in the background
    setTimeout(async () => {
      const welcomeMessage = `Welcome! Your school ${school_name} has been successfully registered. Visit your dashboard: https://${short_name}.${domain}`;
      const smsMessage = `Welcome! Your school ${school_name} has been registered. Dashboard: ${short_name}.${domain}`;
      const emailSubject = "Welcome! Your School Has Been Successfully Registered";

      // HTML email template with brand logo
      const emailHtml = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { text-align: center; padding: 20px; }
              .logo { max-width: 200px; margin: 0 auto; display: block; }
              .content { padding: 20px; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${process.env.BRAND_LOGO_URL || 'https://via.placeholder.com/200x100'}" alt="Brand Logo" class="logo" />
            </div>
            <div class="content">
              <h2>Congratulations!</h2>
              <p>Your school <strong>${school_name}</strong> has been successfully registered with ${process.env.APP_NAME || 'Elite Scholar'}.</p>
              <p>Access your dashboard at: <a href="https://${short_name}.${domain}">https://${short_name}.${domain}</a></p>
              <p>Username: ${admin_email}</p>
              <p>We're excited to have you on board!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Elite Edutech LTD'}. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;

      // Send email notifications
      const emailResults = await Promise.allSettled([
        sendEmail(email_address, emailSubject, welcomeMessage, emailHtml),
        sendEmail(admin_email, emailSubject, welcomeMessage, emailHtml),
      ]);

      // Send SMS notifications
      const smsResults = await Promise.allSettled([
        sendSMS(primary_contact_number, smsMessage),
        secondary_contact_number ? sendSMS(secondary_contact_number, smsMessage) : Promise.resolve(false), // Skip if no secondary number
      ]);

      // Send WhatsApp notifications
      const whatsappResults = await Promise.allSettled([
        sendWhatsApp(primary_contact_number, welcomeMessage),
        secondary_contact_number ? sendWhatsApp(secondary_contact_number, welcomeMessage) : Promise.resolve(false), // Skip if no secondary number
      ]);

      // Check results and log errors
      emailResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Email failed to ${index === 0 ? "school email" : "admin email"}:`,
            result.reason
          );
        }
      });

      smsResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `SMS failed to ${index === 0 ? "primary" : "secondary"} number:`,
            result.reason
          );
        }
      });

      whatsappResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `WhatsApp failed to ${index === 0 ? "primary" : "secondary"} number:`,
            result.reason
          );
        }
      });

      // Notify if all notifications failed
      if (emailResults.every((result) => result.status === "rejected")) {
        console.error("All email notifications failed.");
      }
      if (smsResults.every((result) => result.status === "rejected" || !result.value)) {
        console.error("All SMS notifications failed.");
      }
      if (whatsappResults.every((result) => result.status === "rejected")) {
        console.error("All WhatsApp notifications failed.");
      }
    }, 100); // Small delay to ensure the response is sent
  } catch (err) {
    console.error("Error executing stored procedure:", err);
    // Check if the error is related to logger.logQueryError
    if (err.message && (err.message.includes('logger.logQueryError is not a function') ||
        err.message.includes('Database configuration error'))) {
      res.status(500).json({
        success: false,
        message: "Database configuration error",
        error: "Internal database logging configuration issue",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error creating school",
        error: err.message,
      });
    }
  }
};
// Function to fetch all schools
const getAllSchools = async (req, res) => {
  const { query_type = "select", school_id = null } = req.query;

  // Handle direct SQL queries for select, select-all, select-all-with-student-count, and getAllWithRoles
  if (query_type === "select" || query_type === "select-all" || query_type === "select-all-with-student-count" || query_type === "getAllWithRoles") {
    try {
      const userId = req.user?.id;
      const userType = req.user?.user_type || req.headers['x-user-type'];
      const isDeveloper = userType?.toLowerCase() === 'developer';

      console.log('🔍 School query debug:', { userId, userType, isDeveloper, query_type });

      let query;
      const replacements = {};

      if (query_type === "getAllWithRoles") {
        // Get schools with user access data
        query = `
          SELECT ss.school_id, ss.school_name, ss.short_name, ss.state, ss.lga, 
                 ss.address, ss.email_address, ss.status, ss.section_type,
                 COALESCE(sc.total_students, 0) as total_students
          FROM school_setup ss
          LEFT JOIN (
            SELECT school_id, COUNT(DISTINCT admission_no) as total_students
            FROM students GROUP BY school_id
          ) sc ON ss.school_id = sc.school_id
          WHERE 1=1
        `;
        if (!isDeveloper) {
          query += ` AND ss.created_by = :created_by`;
          replacements.created_by = userId;
        }
        query += ` ORDER BY ss.school_name`;

        const results = await db.sequelize.query(query, { replacements, type: db.sequelize.QueryTypes.SELECT });

        return res.json({ success: true, data: results });
      } else if (query_type === "select-all-with-student-count") {
        // Special query with student count using subquery
        query = `
          SELECT ss.*, 
                 COALESCE(student_counts.total_students, 0) as total_students
          FROM school_setup ss
          LEFT JOIN (
            SELECT school_id, COUNT(DISTINCT admission_no) as total_students
            FROM students
            GROUP BY school_id
          ) student_counts ON ss.school_id = student_counts.school_id
          WHERE 1=1
        `;

        // Filter by created_by if provided in query params
        if (req.query.created_by) {
          query += ` AND ss.created_by = :created_by`;
          replacements.created_by = req.query.created_by;
        } else if (!isDeveloper) {
          query += ` AND ss.created_by = :created_by`;
          replacements.created_by = userId;
        }

        query += ` ORDER BY ss.created_at DESC`;
      } else {
        // Regular select or select-all
        query = `SELECT * FROM school_setup WHERE 1=1`;

        if (!isDeveloper && query_type === "select-all") {
          // Partners see only their schools for select-all
          query += ` AND created_by = :created_by`;
          replacements.created_by = userId;
        }

        // Don't filter by school_id for select-all queries
        if (school_id && !isDeveloper && query_type !== "select-all" && query_type !== "select-all-with-student-count") {
          query += ` AND school_id = :school_id`;
          replacements.school_id = school_id;
        }

        query += ` ORDER BY created_at DESC`;
      }

      console.log('📊 Executing query:', query);
      console.log('📊 With replacements:', replacements);

      const results = await db.sequelize.query(query, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT,
      });

      console.log('✅ Query returned', results.length, 'schools');

      return res.json({
        success: true,
        data: results,
      });
    } catch (err) {
      console.error("Error fetching school setup:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching school setup",
        error: err.message,
      });
    }
  }

  try {
    // Super admin (user.id = 1) sees ALL schools, partners see only their schools
    const userId = req.user?.id;
    const userType = req.user?.user_type || req.headers['x-user-type'];
      const isDeveloper = userType?.toLowerCase() === 'developer';
    const createdByFilter = isDeveloper ? null : userId;

    const results = await db.sequelize.query(
      `CALL school_setup(:query_type, :school_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, :created_by, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
      {
        replacements: { query_type, school_id, created_by: createdByFilter },
        type: db.sequelize.QueryTypes.RAW,
      }
    );

    if (query_type === "getAllWithRoles") {
      // Group results into {school_details, user_types}
      const schools = {};
      results.forEach((row) => {
        if (!schools[row.school_id]) {
          schools[row.school_id] = {
            school_details: {
              school_id: row.school_id,
              school_name: row.school_name,
              short_name: row.short_name,
              state: row.state,
              lga: row.lga,
              address: row.address,
              email: row.email_address,
              status: row.status,
            },
            user_types: {},
          };
        }

        if (row.user_type) {
          schools[row.school_id].user_types[row.user_type] = row.accessTo
            ? row.accessTo.split(",")
            : [];
        }
      });

      res.json({
        success: true,
        data: Object.values(schools),
      });
    } else {
      // Normal "select" or other query_types
      res.json({
        success: true,
        data: results,
      });
    }
  } catch (err) {
    console.error("Error fetching schools:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching schools",
      error: err.message,
    });
  }
};

const getSchoolByShortName = async (req, res) => {
  const {
    query_type = "select-by-short-name",
    school_id = null,
    school_name = null,
    short_name = null,
  } = req.query;

  try {
    // Call the stored procedure
    const results = await db.sequelize.query(
      `CALL school_setup(:query_type, :school_id, :school_name, NULL, :short_name, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
      {
        replacements: { school_name, short_name, query_type, school_id },
        type: db.sequelize.QueryTypes.RAW,
      }
    );

    // Flatten the results if necessary
    let schoolData = [];
    if (results && results.length > 0) {
      // Assuming the first result set contains the school data
      schoolData = results;
    }

    // Return the school data as an array
    res.status(200).json({
      success: true,
      data: schoolData, // Ensure this is an array
    });
  } catch (err) {
    console.error("Error fetching school:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching school",
      error: err.message,
    });
  }
};

const getSchoolById = async (req, res) => {
  const { school_id } = req.query;

  try {
    // Call the stored procedure
    const results = await db.sequelize.query(
      `CALL school_setup('select-school', :school_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.RAW,
      }
    );

    // Flatten the results if necessary
    let schoolData = [];
    if (results && results.length > 0) {
      // Assuming the first result set contains the school data
      schoolData = results[0];
    }

    // Return the school data as an array
    res.status(200).json({
      success: true,
      data: schoolData, // Ensure this is an array
    });
  } catch (err) {
    console.error("Error fetching school:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching school",
      error: err.message,
    });
  }
};

// Function to update the status of a school
const updateSchoolStatus = async (req, res) => {
  const {
    school_id,
    school_name = null,
    school_second_name = null,
    short_name = null,
    academic_year = null,
    session_start_date = null,
    session_end_date = null,
    status = null,
    badge_url = null,
    mission = null,
    vission = null,
    about_us = null,
    school_motto = null,
    state = null,
    lga = null,
    address = null,
    primary_contact_number = null,
    secondary_contact_number = null,
    email_address = null,
    school_master = null,
    express_finance = null,
    cbt_center = null,
    result_station = null,
    nursery = null,
    primary = null,
    junior_secondary = null,
    senior_secondary = null,
    islamiyya = null,
    tahfiz = null,
    admin_name = null,
    admin_email = null,
    admin_password = null,
    domain = null,
    section_type = null,
    created_by = null,
    cbt_stand_alone = null,
    sms_subscription = null,
    whatsapp_subscription = null,
    email_subscription = null,
    assessmentType = null,
    is_arabic = null,
    default_lang = null,
    second_lang = null,
    personal_dev_scale = null,
    require_verification = null,
    has_class_stream = null
  } = req.body;

  try {
    const results = await db.sequelize.query(
      `CALL school_setup(
        'update', :school_id, :school_name, :school_second_name, :short_name, :academic_year, 
        :session_start_date, :session_end_date, :status, :badge_url, :mission, :vission, 
        :about_us, :school_motto, :state, :lga, :address, :primary_contact_number, 
        :secondary_contact_number, :email_address, :school_master, :express_finance, 
        :cbt_center, :result_station, :nursery, :primary, :junior_secondary, :senior_secondary, 
        :islamiyya, :tahfiz, :admin_name, :admin_email, :admin_password, :domain, :section_type, 
        :created_by, :cbt_stand_alone, :sms_subscription, :whatsapp_subscription, :email_subscription, 
        :assessmentType, :is_arabic, :default_lang, :second_lang, :personal_dev_scale, 
        :require_verification, :has_class_stream
      )`,
      {
        replacements: {
          school_id, school_name, school_second_name, short_name, academic_year,
          session_start_date, session_end_date, status, badge_url, mission, vission,
          about_us, school_motto, state, lga, address, primary_contact_number,
          secondary_contact_number, email_address, school_master, express_finance,
          cbt_center, result_station, nursery, primary, junior_secondary, senior_secondary,
          islamiyya, tahfiz, admin_name, admin_email, admin_password, domain, section_type,
          created_by, cbt_stand_alone, sms_subscription, whatsapp_subscription, email_subscription,
          assessmentType, is_arabic, default_lang, second_lang, personal_dev_scale,
          require_verification, has_class_stream
        }
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error updating school status:", err);
    res.status(500).json({
      success: false,
      message: "Error updating school status",
      error: err.message,
    });
  }
};

// Function to update school information

const updateSchool = async (req, res) => {
  const {
    school_id=null,
    school_name=null,
    school_second_name=null,  // New multilingual field
    short_name=null,
    school_motto=null,
    state=null,
    lga=null,
    address=null,
    primary_contact_number=null,
    secondary_contact_number=null,
    email_address=null,
    school_master=null,
    express_finance=null,
    cbt_center=null,
    cbt_stand_alone=null,
    result_station=null,
    nursery_section=null,
    primary_section=null,
    junior_secondary_section=null,
    senior_secondary_section=null,
    islamiyya=null,
    tahfiz=null,
    section_type=null,
    sms_subscription=null,
    whatsapp_subscription=null,
    email_subscription=null,
    assessmentType=null,
    is_arabic=null,
    default_lang=null,
    second_lang=null,
    personal_dev_scale=null,
    require_verification=null,
    has_class_stream=null
  } = req.body;

  try {
    const results = await db.sequelize.query(
      `CALL school_setup(
        'update_school', :school_id, :school_name, :school_second_name, :short_name, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, :school_motto, :state, :lga,
        :address, :primary_contact_number, :secondary_contact_number, :email_address, :school_master, :express_finance,
        :cbt_center, :result_station, :nursery_section, :primary_section, :junior_secondary_section, :senior_secondary_section, :islamiyya, :tahfiz, NULL, NULL, NULL, NULL, :section_type, NULL, :cbt_stand_alone, :sms_subscription, :whatsapp_subscription, :email_subscription, :assessmentType,
        :is_arabic, :default_lang, :second_lang, :personal_dev_scale, :require_verification, :has_class_stream
      )`,
      {
        replacements: {
          school_id,
          school_name,
          school_second_name,
          short_name,
          school_motto,
          state,
          lga,
          address,
          primary_contact_number,
          secondary_contact_number,
          email_address,
          school_master,
          express_finance,
          cbt_center,
          cbt_stand_alone,
          result_station,
          nursery_section,
          primary_section,
          junior_secondary_section,
          senior_secondary_section,
          islamiyya,
          tahfiz,
          section_type,
          sms_subscription,
          whatsapp_subscription,
          email_subscription,
          assessmentType,
          is_arabic,
          default_lang,
          second_lang,
          personal_dev_scale,
          require_verification,
          has_class_stream
        },
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error updating school:", err);
    res.status(500).json({
      success: false,
      message: "Error updating school",
      error: err.message,
    });
  }
};

const getSchoolFeatures = async (req, res) => {
  try {
    const { school_id } = req.query;
    
    if (!school_id) {
      return res.status(400).json({ success: false, error: 'school_id query parameter is required' });
    }
    const [subscription] = await db.sequelize.query(
      `SELECT ss.pricing_plan_id, ss.subscription_type, ss.subscription_start_date, ss.subscription_end_date, ss.status,
              sp.pricing_name, spf.features
       FROM school_subscriptions ss
       JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
       LEFT JOIN subscription_plan_features spf ON sp.id = spf.pricing_plan_id
       WHERE ss.school_id = ?
       ORDER BY ss.created_at DESC LIMIT 1`,
      { replacements: [school_id], type: db.Sequelize.QueryTypes.SELECT }
    );
    const overrides = await db.sequelize.query(
      `SELECT feature_key, enabled FROM school_override_features WHERE school_id = ?`,
      { replacements: [school_id], type: db.Sequelize.QueryTypes.SELECT }
    );
    const planFeatures = subscription?.features ? JSON.parse(subscription.features) : {};
    res.json({
      success: true,
      data: {
        plan: subscription?.pricing_name || 'None',
        subscriptionType: subscription?.subscription_type || null,
        startDate: subscription?.subscription_start_date || null,
        endDate: subscription?.subscription_end_date || null,
        planFeatures,
        overrides: overrides || []
      }
    });
  } catch (err) {
    console.error("Error getting school features:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const saveSchoolOverrides = async (req, res) => {
  try {
    const { school_id } = req.params;
    const { overrides } = req.body;
    await db.sequelize.query(`DELETE FROM school_override_features WHERE school_id = ?`, { replacements: [school_id] });
    if (overrides && overrides.length > 0) {
      const values = overrides.map(o => `('${school_id}', '${o.feature_key}', ${o.enabled ? 1 : 0})`).join(',');
      await db.sequelize.query(`INSERT INTO school_override_features (school_id, feature_key, enabled) VALUES ${values}`);
    }
    res.json({ success: true, message: 'Overrides saved' });
  } catch (err) {
    console.error("Error saving school overrides:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchoolStatus,
  updateSchool,
  getSchoolByShortName,
  createSubscriptionAndInvoice,
  getSchoolFeatures,
  saveSchoolOverrides,
};
