const db = require("../models");

// Setup chart of accounts for a branch
const setupBranchChartOfAccounts = async (req, res) => {
  const { school_id, branch_id, copy_from_main = true } = req.body;

  try {
    // Validate required parameters
    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Branch ID are required"
      });
    }

    // Call stored procedure to setup chart of accounts
    const result = await db.sequelize.query(
      `CALL setup_branch_chart_of_accounts(:school_id, :branch_id, :copy_from_main)`,
      {
        replacements: {
          school_id,
          branch_id,
          copy_from_main
        },
        type: db.Sequelize.QueryTypes.RAW
      }
    );

    return res.status(200).json({
      success: true,
      message: "Chart of accounts setup successfully for branch",
      data: result
    });

  } catch (error) {
    console.error("Error setting up branch chart of accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to setup chart of accounts for branch",
      error: error.message
    });
  }
};

// Ensure all branches have required accounts
const ensureAllBranchesHaveAccounts = async (req, res) => {
  const { school_id } = req.body;

  try {
    // Validate required parameters
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: "School ID is required"
      });
    }

    // Call stored procedure to ensure all branches have accounts
    const result = await db.sequelize.query(
      `CALL ensure_all_branches_have_accounts(:school_id)`,
      {
        replacements: {
          school_id
        },
        type: db.Sequelize.QueryTypes.RAW
      }
    );

    return res.status(200).json({
      success: true,
      message: "Chart of accounts ensured for all branches",
      data: result
    });

  } catch (error) {
    console.error("Error ensuring branches have accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to ensure branches have chart of accounts",
      error: error.message
    });
  }
};

// Copy chart of accounts from one branch to another
const copyChartOfAccounts = async (req, res) => {
  const { school_id, source_branch_id, target_branch_id } = req.body;

  try {
    // Validate required parameters
    if (!school_id || !target_branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Target Branch ID are required"
      });
    }

    // Call stored procedure to copy chart of accounts
    const result = await db.sequelize.query(
      `CALL copy_chart_of_accounts_to_branch(:school_id, :source_branch_id, :target_branch_id)`,
      {
        replacements: {
          school_id,
          source_branch_id: source_branch_id || null,
          target_branch_id
        },
        type: db.Sequelize.QueryTypes.RAW
      }
    );

    return res.status(200).json({
      success: true,
      message: "Chart of accounts copied successfully",
      data: result
    });

  } catch (error) {
    console.error("Error copying chart of accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to copy chart of accounts",
      error: error.message
    });
  }
};

// Get chart of accounts for a school/branch
const getChartOfAccounts = async (req, res) => {
  const { school_id, branch_id } = req.query;

  try {
    // Validate required parameters
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: "School ID is required"
      });
    }

    // Get chart of accounts
    const accounts = await db.sequelize.query(
      `SELECT 
        account_id,
        account_code,
        account_name,
        account_type,
        account_subtype,
        normal_balance,
        is_active,
        is_system_account,
        description,
        school_id,
        branch_id,
        created_at
      FROM chart_of_accounts
      WHERE school_id = :school_id
      AND (:branch_id IS NULL OR branch_id = :branch_id OR branch_id IS NULL)
      AND is_active = 1
      ORDER BY account_code`,
      {
        replacements: {
          school_id,
          branch_id: branch_id || null
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({
      success: true,
      message: "Chart of accounts retrieved successfully",
      data: accounts
    });

  } catch (error) {
    console.error("Error getting chart of accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get chart of accounts",
      error: error.message
    });
  }
};

// Check if branch has required accounts
const checkBranchAccounts = async (req, res) => {
  const { school_id, branch_id } = req.query;

  try {
    // Validate required parameters
    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Branch ID are required"
      });
    }

    // Check required accounts
    const requiredAccounts = ['1112', '4110', '1121', '5230']; // Cash, Revenue, Receivable, Expense
    
    const accountsCheck = await db.sequelize.query(
      `SELECT 
        account_code,
        account_name,
        account_id,
        branch_id
      FROM chart_of_accounts
      WHERE school_id = :school_id
      AND account_code IN (:required_accounts)
      AND (branch_id = :branch_id OR branch_id IS NULL)
      AND is_active = 1
      ORDER BY 
        CASE WHEN branch_id = :branch_id THEN 1 ELSE 2 END,
        account_code`,
      {
        replacements: {
          school_id,
          branch_id,
          required_accounts: requiredAccounts
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    const foundAccounts = accountsCheck.map(acc => acc.account_code);
    const missingAccounts = requiredAccounts.filter(code => !foundAccounts.includes(code));

    return res.status(200).json({
      success: true,
      message: "Branch accounts check completed",
      data: {
        school_id,
        branch_id,
        required_accounts: requiredAccounts,
        found_accounts: accountsCheck,
        missing_accounts: missingAccounts,
        has_all_required: missingAccounts.length === 0,
        can_process_payments: missingAccounts.length === 0
      }
    });

  } catch (error) {
    console.error("Error checking branch accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check branch accounts",
      error: error.message
    });
  }
};

// Create default chart of accounts for school/branch
const createDefaultChartOfAccounts = async (req, res) => {
  const { school_id, branch_id } = req.body;

  try {
    // Validate required parameters
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: "School ID is required"
      });
    }

    // Call stored procedure to create default chart of accounts
    const result = await db.sequelize.query(
      `CALL create_default_chart_of_accounts(:school_id, :branch_id)`,
      {
        replacements: {
          school_id,
          branch_id: branch_id || null
        },
        type: db.Sequelize.QueryTypes.RAW
      }
    );

    return res.status(200).json({
      success: true,
      message: "Default chart of accounts created successfully",
      data: result
    });

  } catch (error) {
    console.error("Error creating default chart of accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create default chart of accounts",
      error: error.message
    });
  }
};

module.exports = {
  setupBranchChartOfAccounts,
  ensureAllBranchesHaveAccounts,
  copyChartOfAccounts,
  getChartOfAccounts,
  checkBranchAccounts,
  createDefaultChartOfAccounts
};