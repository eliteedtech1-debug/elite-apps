const db = require("../models");

const getstudentpayment = async (req, res) => {
  try {
    const {
      admission_no = "",
      term = "",
      academic_year = "",
      branch_id
    } = req.query;

    const school_id = req.user?.school_id || req.headers['x-school-id'] || req.headers['X-School-Id'];

    if (!school_id || !admission_no) {
      return res.status(400).json({ 
        success: false, 
        message: "School ID and admission number are required"
      });
    }

    // Get payment entries for the student
    const entries = await db.sequelize.query(
      `SELECT 
        ref_no,
        description,
        cr,
        dr,
        payment_status,
        created_at,
        (cr - dr) as balance
      FROM payment_entries
      WHERE admission_no = :admission_no
        AND term = :term
        AND academic_year = :academic_year
        AND school_id = :school_id
        AND payment_status NOT IN ('Excluded', 'Cancelled')
      ORDER BY created_at ASC`,
      {
        replacements: { admission_no, term, academic_year, school_id },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      response: entries || []
    });

  } catch (error) {
    console.error('Error in getstudentpayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get student payment',
      error: error.message
    });
  }
};

// Stub functions for routes
const studentPayment = (req, res) => res.status(501).json({ error: 'Not implemented' });
const processPayment = (req, res) => res.status(501).json({ error: 'Not implemented' });
const getStudentBalance = (req, res) => res.status(501).json({ error: 'Not implemented' });
const getPaymentReceipts = (req, res) => res.status(501).json({ error: 'Not implemented' });
const studentpayment = (req, res) => res.status(501).json({ error: 'Not implemented' });
const completeProcessPayment = (req, res) => res.status(501).json({ error: 'Not implemented' });
const allChildPayment = (req, res) => res.status(501).json({ error: 'Not implemented' });
const getGeneralLedger = (req, res) => res.status(501).json({ error: 'Not implemented' });
const getIndividualLedeger = (req, res) => res.status(501).json({ error: 'Not implemented' });
const processParentPayment = (req, res) => res.status(501).json({ error: 'Not implemented' });

module.exports = {
  getstudentpayment,
  studentPayment,
  processPayment,
  getStudentBalance,
  getPaymentReceipts,
  studentpayment,
  completeProcessPayment,
  allChildPayment,
  getGeneralLedger,
  getIndividualLedeger,
  processParentPayment
};
