const db = require("../models");
const logger = require("../logging/Logger");
const paystackService = require("../services/paystackService");

/**
 * Get all bank accounts for a school
 */
const getBankAccounts = async (req, res) => {
  const school_id = req.user?.school_id || req.headers['x-school-id'] || req.query.school_id;
  const branch_id = req.user?.branch_id || req.headers['x-branch-id'] || req.query.branch_id;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required"
    });
  }

  try {
    let query = `
      SELECT
        id,
        school_id,
        branch_id,
        account_name,
        account_number,
        bank_name,
        bank_code,
        swift_code,
        branch_address,
        is_default,
        status,
        created_at,
        updated_at
      FROM school_bank_accounts
      WHERE school_id = :school_id
    `;

    const replacements = { school_id };

    // Filter by branch if provided
    if (branch_id) {
      query += ` AND (branch_id = :branch_id OR branch_id IS NULL)`;
      replacements.branch_id = branch_id;
    }

    query += ` ORDER BY is_default DESC, created_at DESC`;

    const accounts = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    logger.error("Error fetching bank accounts", {
      error: error.message,
      stack: error.stack,
      school_id
    });

    res.status(500).json({
      success: false,
      message: "Error fetching bank accounts",
      error: error.message
    });
  }
};

/**
 * Get default bank account for a school
 */
const getDefaultBankAccount = async (req, res) => {
  const school_id = req.user?.school_id || req.headers['x-school-id'] || req.query.school_id;
  const branch_id = req.user?.branch_id || req.headers['x-branch-id'] || req.query.branch_id;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required"
    });
  }

  try {
    let query = `
      SELECT
        id,
        school_id,
        branch_id,
        account_name,
        account_number,
        bank_name,
        bank_code,
        swift_code,
        branch_address,
        is_default,
        status
      FROM school_bank_accounts
      WHERE school_id = :school_id
        AND is_default = 1
        AND status = 'Active'
    `;

    const replacements = { school_id };

    if (branch_id) {
      query += ` AND (branch_id = :branch_id OR branch_id IS NULL)`;
      replacements.branch_id = branch_id;
    }

    query += ` LIMIT 1`;

    const [account] = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    if (!account || account.length === 0) {
      return res.json({
        success: true,
        data: {},
        message: "No default bank account configured"
      });
    }

    res.json({
      success: true,
      data: account[0]
    });
  } catch (error) {
    logger.error("Error fetching default bank account", {
      error: error.message,
      stack: error.stack,
      school_id
    });

    res.status(500).json({
      success: false,
      message: "Error fetching default bank account",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new bank account
 */
const createBankAccount = async (req, res) => {
  const {
    account_name,
    account_number,
    bank_name,
    bank_code,
    swift_code,
    branch_address,
    is_default,
    branch_id
  } = req.body;

  const school_id = req.user?.school_id || req.headers['x-school-id'];

  // Validation
  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required"
    });
  }

  if (!account_name || !account_number || !bank_name) {
    return res.status(400).json({
      success: false,
      message: "Account name, account number, and bank name are required"
    });
  }

  const t = await db.sequelize.transaction();

  try {
    // Check if account number already exists for this school
    const [existingAccount] = await db.sequelize.query(
      `SELECT id FROM school_bank_accounts
       WHERE school_id = :school_id AND account_number = :account_number`,
      {
        replacements: { school_id, account_number },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (existingAccount) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "This account number already exists for your school"
      });
    }

    // If this is set as default, unset other defaults
    if (is_default === 1 || is_default === true) {
      await db.sequelize.query(
        `UPDATE school_bank_accounts
         SET is_default = 0
         WHERE school_id = :school_id`,
        {
          replacements: { school_id },
          transaction: t
        }
      );
    }

    // Insert new account
    const [result] = await db.sequelize.query(
      `INSERT INTO school_bank_accounts
       (school_id, branch_id, account_name, account_number, bank_name, bank_code,
        swift_code, branch_address, is_default, status)
       VALUES
       (:school_id, :branch_id, :account_name, :account_number, :bank_name, :bank_code,
        :swift_code, :branch_address, :is_default, 'Active')`,
      {
        replacements: {
          school_id,
          branch_id: branch_id || null,
          account_name,
          account_number,
          bank_name,
          bank_code: bank_code || null,
          swift_code: swift_code || null,
          branch_address: branch_address || null,
          is_default: is_default ? 1 : 0
        },
        transaction: t
      }
    );

    const accountId = result.insertId || result;

    // Register with Paystack as subaccount for settlement
    let paystackSubaccountCode = null;
    if (bank_code) {
      try {
        const subaccountData = {
          business_name: account_name,
          bank_code: bank_code,
          account_number: account_number,
          primary_contact_email: req.user?.email || null,
          metadata: { school_id, flat_charge: 20000 }
        };
        const paystackResponse = await paystackService.createSubaccount(subaccountData);
        paystackSubaccountCode = paystackResponse.subaccount_code;

        // Update the bank account
        // await db.sequelize.query(
        //   `UPDATE school_bank_accounts SET percentage_charge = 100 WHERE id = :id`,
        //   {
        //     replacements: { id: accountId },
        //     transaction: t
        //   }
        // );

        logger.info("Paystack subaccount created", { subaccount_code: paystackSubaccountCode, account_number });
      } catch (paystackError) {
        logger.warn("Failed to create Paystack subaccount", { error: paystackError.message, account_number });
      }
    }

    await t.commit();

    logger.info("Bank account created", {
      account_id: accountId,
      school_id,
      account_number,
      paystack_subaccount_code: paystackSubaccountCode
    });

    res.status(201).json({
      success: true,
      message: "Bank account created successfully",
      data: { id: accountId }
    });
  } catch (error) {
    await t.rollback();

    logger.error("Error creating bank account", {
      error: error.message,
      stack: error.stack,
      school_id,
      account_number
    });

    res.status(500).json({
      success: false,
      message: "Error creating bank account",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a bank account
 */
const updateBankAccount = async (req, res) => {
  const { accountId } = req.params;
  const {
    account_name,
    account_number,
    bank_name,
    bank_code,
    swift_code,
    branch_address,
    is_default,
    status,
    branch_id
  } = req.body;

  const school_id = req.user?.school_id || req.headers['x-school-id'];

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required"
    });
  }

  const t = await db.sequelize.transaction();

  try {
    // Verify account exists and belongs to school
    const [account] = await db.sequelize.query(
      `SELECT id FROM school_bank_accounts
       WHERE id = :accountId AND school_id = :school_id`,
      {
        replacements: { accountId, school_id },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!account) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Bank account not found or does not belong to your school"
      });
    }

    // If setting as default, unset other defaults
    if (is_default === 1 || is_default === true) {
      await db.sequelize.query(
        `UPDATE school_bank_accounts
         SET is_default = 0
         WHERE school_id = :school_id AND id != :accountId`,
        {
          replacements: { school_id, accountId },
          transaction: t
        }
      );
    }

    // Build update query dynamically
    const updates = [];
    const replacements = { accountId, school_id };

    if (account_name !== undefined) {
      updates.push('account_name = :account_name');
      replacements.account_name = account_name;
    }
    if (account_number !== undefined) {
      updates.push('account_number = :account_number');
      replacements.account_number = account_number;
    }
    if (bank_name !== undefined) {
      updates.push('bank_name = :bank_name');
      replacements.bank_name = bank_name;
    }
    if (bank_code !== undefined) {
      updates.push('bank_code = :bank_code');
      replacements.bank_code = bank_code;
    }
    if (swift_code !== undefined) {
      updates.push('swift_code = :swift_code');
      replacements.swift_code = swift_code;
    }
    if (branch_address !== undefined) {
      updates.push('branch_address = :branch_address');
      replacements.branch_address = branch_address;
    }
    if (is_default !== undefined) {
      updates.push('is_default = :is_default');
      replacements.is_default = is_default ? 1 : 0;
    }
    if (status !== undefined) {
      updates.push('status = :status');
      replacements.status = status;
    }
    if (branch_id !== undefined) {
      updates.push('branch_id = :branch_id');
      replacements.branch_id = branch_id;
    }

    if (updates.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    await db.sequelize.query(
      `UPDATE school_bank_accounts
       SET ${updates.join(', ')}
       WHERE id = :accountId AND school_id = :school_id`,
      {
        replacements,
        transaction: t
      }
    );

    await t.commit();

    logger.info("Bank account updated", {
      account_id: accountId,
      school_id
    });

    res.json({
      success: true,
      message: "Bank account updated successfully"
    });
  } catch (error) {
    await t.rollback();

    logger.error("Error updating bank account", {
      error: error.message,
      stack: error.stack,
      account_id: accountId,
      school_id
    });

    res.status(500).json({
      success: false,
      message: "Error updating bank account",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a bank account
 */
const deleteBankAccount = async (req, res) => {
  const { accountId } = req.params;
  const school_id = req.user?.school_id || req.headers['x-school-id'];

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required"
    });
  }

  try {
    const result = await db.sequelize.query(
      `DELETE FROM school_bank_accounts
       WHERE id = :accountId AND school_id = :school_id`,
      {
        replacements: { accountId, school_id }
      }
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found or does not belong to your school"
      });
    }

    logger.info("Bank account deleted", {
      account_id: accountId,
      school_id
    });

    res.json({
      success: true,
      message: "Bank account deleted successfully"
    });
  } catch (error) {
    logger.error("Error deleting bank account", {
      error: error.message,
      stack: error.stack,
      account_id: accountId,
      school_id
    });

    res.status(500).json({
      success: false,
      message: "Error deleting bank account",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Set default bank account
 */
const setDefaultBankAccount = async (req, res) => {
  const { accountId } = req.params;
  const school_id = req.user?.school_id || req.headers['x-school-id'];

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required"
    });
  }

  const t = await db.sequelize.transaction();

  try {
    // Verify account exists and belongs to school
    const [account] = await db.sequelize.query(
      `SELECT id FROM school_bank_accounts
       WHERE id = :accountId AND school_id = :school_id`,
      {
        replacements: { accountId, school_id },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!account) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Bank account not found or does not belong to your school"
      });
    }

    // Unset all defaults
    await db.sequelize.query(
      `UPDATE school_bank_accounts
       SET is_default = 0
       WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        transaction: t
      }
    );

    // Set new default
    await db.sequelize.query(
      `UPDATE school_bank_accounts
       SET is_default = 1
       WHERE id = :accountId AND school_id = :school_id`,
      {
        replacements: { accountId, school_id },
        transaction: t
      }
    );

    await t.commit();

    logger.info("Default bank account set", {
      account_id: accountId,
      school_id
    });

    res.json({
      success: true,
      message: "Default bank account updated successfully"
    });
  } catch (error) {
    await t.rollback();

    logger.error("Error setting default bank account", {
      error: error.message,
      stack: error.stack,
      account_id: accountId,
      school_id
    });

    res.status(500).json({
      success: false,
      message: "Error setting default bank account",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Register existing bank account with Paystack
 */
const registerWithPaystack = async (req, res) => {
  const { accountId } = req.params;
  const school_id = req.user?.school_id || req.headers['x-school-id'];

  if (!school_id) {
    return res.status(400).json({ success: false, message: "School ID is required" });
  }

  try {
    const [account] = await db.sequelize.query(
      `SELECT * FROM school_bank_accounts WHERE id = :accountId AND school_id = :school_id`,
      { replacements: { accountId, school_id }, type: db.Sequelize.QueryTypes.SELECT }
    );

    if (!account) {
      return res.status(404).json({ success: false, message: "Bank account not found" });
    }

    if (false) { // Temporarily disable paystack check
      return res.status(400).json({ success: false, message: "Account already registered with Paystack" });
    }

    if (!account.bank_code) {
      return res.status(400).json({ success: false, message: "Bank code is required for Paystack registration" });
    }

    const subaccountData = {
      business_name: account.account_name,
      bank_code: account.bank_code,
      account_number: account.account_number,
      primary_contact_email: req.user?.email || null
    };

    const paystackResponse = await paystackService.createSubaccount(subaccountData);

    // await db.sequelize.query(
    //   `UPDATE school_bank_accounts SET percentage_charge = 100 WHERE id = :id`,
    //   { replacements: { id: accountId } }
    // );

    logger.info("Paystack subaccount registered", { subaccount_code: paystackResponse.subaccount_code, accountId });

    res.json({
      success: true,
      message: "Successfully registered with Paystack",
      data: { status: "registered" }
    });
  } catch (error) {
    logger.error("Error registering with Paystack", { error: error.message, accountId });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to register with Paystack"
    });
  }
};

module.exports = {
  getBankAccounts,
  getDefaultBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  registerWithPaystack
};
