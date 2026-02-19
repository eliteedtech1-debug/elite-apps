const db = require("../models");

/**
 * Get company information
 */
const getCompanyInfo = async (req, res) => {
  try {
    const results = await db.sequelize.query(
      `SELECT * FROM company_info WHERE is_active = 1 LIMIT 1`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company information not found",
      });
    }

    res.json({
      success: true,
      data: results[0],
    });
  } catch (err) {
    console.error("Error fetching company info:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching company info",
      error: err.message,
    });
  }
};

/**
 * Update company information
 */
const updateCompanyInfo = async (req, res) => {
  const {
    company_name,
    address,
    phone,
    email,
    website,
    logo_url,
    tax_id,
    business_reg_number,
    default_currency,
  } = req.body;

  try {
    // Check if company info exists
    const existingInfo = await db.sequelize.query(
      `SELECT id FROM company_info LIMIT 1`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (existingInfo.length > 0) {
      // Update existing record
      await db.sequelize.query(
        `UPDATE company_info SET
          company_name = :company_name,
          address = :address,
          phone = :phone,
          email = :email,
          website = :website,
          logo_url = :logo_url,
          tax_id = :tax_id,
          business_reg_number = :business_reg_number,
          default_currency = :default_currency,
          updated_at = NOW()
        WHERE id = :id`,
        {
          replacements: {
            id: existingInfo[0].id,
            company_name,
            address,
            phone,
            email,
            website,
            logo_url,
            tax_id,
            business_reg_number,
            default_currency: default_currency || 'NGN',
          },
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );
    } else {
      // Create new record
      await db.sequelize.query(
        `INSERT INTO company_info (
          company_name, address, phone, email, website, logo_url,
          tax_id, business_reg_number, default_currency
        ) VALUES (
          :company_name, :address, :phone, :email, :website, :logo_url,
          :tax_id, :business_reg_number, :default_currency
        )`,
        {
          replacements: {
            company_name,
            address,
            phone,
            email,
            website,
            logo_url,
            tax_id,
            business_reg_number,
            default_currency: default_currency || 'NGN',
          },
          type: db.sequelize.QueryTypes.INSERT,
        }
      );
    }

    res.json({
      success: true,
      message: "Company information updated successfully",
    });
  } catch (err) {
    console.error("Error updating company info:", err);
    res.status(500).json({
      success: false,
      message: "Error updating company info",
      error: err.message,
    });
  }
};

module.exports = {
  getCompanyInfo,
  updateCompanyInfo,
};