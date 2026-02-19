const db = require('../models');

class AdmissionHelpers {
  // Get school details by school_id (for login-based context)
  static async getSchoolById(school_id) {
    const [schools] = await db.sequelize.query(
      `SELECT s.*, sl.* FROM school_setup s 
       JOIN school_locations sl ON s.school_id = sl.school_id 
       WHERE s.school_id = :school_id AND s.status = 'Active' LIMIT 1`,
      { replacements: { school_id } }
    );

    if (!schools.length) {
      throw new Error('School not found');
    }

    return {
      school: schools[0],
      school_id: schools[0].school_id,
      branch_id: schools[0].branch_id
    };
  }

  // Resolve school context from subdomain
  static async resolveSchoolContext(subdomain) {
    if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
      throw new Error('Invalid subdomain');
    }

    const [schools] = await db.sequelize.query(
      `SELECT s.*, sl.* FROM school_setup s 
       JOIN school_locations sl ON s.school_id = sl.school_id 
       WHERE s.short_name = :subdomain AND s.status = 'Active' LIMIT 1`,
      { replacements: { subdomain } }
    );

    if (!schools.length) {
      throw new Error('School not found');
    }

    return {
      school: schools[0],
      school_id: schools[0].school_id,
      branch_id: schools[0].branch_id
    };
  }

  // Validate branch belongs to school
  static async validateBranch(school_id, branch_id) {
    const [branches] = await db.sequelize.query(
      `SELECT * FROM school_locations 
       WHERE school_id = :school_id AND branch_id = :branch_id`,
      { replacements: { school_id, branch_id } }
    );

    return branches.length > 0;
  }

  // Get active classes for school/branch
  static async getActiveClasses(school_id, branch_id) {
    const [classes] = await db.sequelize.query(
      `SELECT id, class_name, school_id, branch_id, status 
       FROM classes 
       WHERE school_id = :school_id 
       AND branch_id = :branch_id 
       AND status = 'Active'
       ORDER BY class_name`,
      { replacements: { school_id, branch_id } }
    );

    return classes;
  }

  // Validate class belongs to school/branch
  static async validateClass(class_id, school_id, branch_id) {
    const [classes] = await db.sequelize.query(
      `SELECT * FROM classes 
       WHERE id = :class_id 
       AND school_id = :school_id 
       AND branch_id = :branch_id 
       AND status = 'Active'`,
      { replacements: { class_id, school_id, branch_id } }
    );

    return classes.length > 0;
  }

  // Validate admission access (token or payment)
  static async validateAccess(school_id, branch_id, token_code, payment_reference) {
    try {
      // Get school admission access mode
      const accessMode = await this.getAdmissionAccessMode(school_id, branch_id);
      
      switch (accessMode) {
        case 'FREE':
          return { valid: true, method: 'free' };
          
        case 'TOKEN_REQUIRED':
          if (!token_code) {
            return { valid: false, message: 'Admission token is required' };
          }
          return await this.validateToken(token_code, school_id, branch_id);
          
        case 'PAYMENT_REQUIRED':
          if (!payment_reference) {
            return { valid: false, message: 'Payment is required for admission application' };
          }
          return await this.validatePayment(payment_reference, school_id, branch_id);
          
        case 'TOKEN_OR_PAYMENT':
          if (token_code) {
            return await this.validateToken(token_code, school_id, branch_id);
          }
          if (payment_reference) {
            return await this.validatePayment(payment_reference, school_id, branch_id);
          }
          return { valid: false, message: 'Either admission token or payment is required' };
          
        default:
          return { valid: true, method: 'free' };
      }
    } catch (error) {
      return { valid: false, message: 'Access validation failed' };
    }
  }

  // Get admission access mode for school/branch
  static async getAdmissionAccessMode(school_id, branch_id) {
    // Default to FREE if no configuration found
    // This would typically come from school_settings or branch_settings table
    return 'FREE'; // TODO: Implement school configuration lookup
  }

  // Validate admission token
  static async validateToken(token_code, school_id, branch_id) {
    const AdmissionToken = require('../models/AdmissionToken');
    const { Op } = require('sequelize');

    const token = await AdmissionToken.findOne({
      where: {
        token_code,
        school_id,
        branch_id,
        status: 'active',
        used_count: { [Op.lt]: db.sequelize.col('usage_limit') },
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (!token) {
      return { valid: false, message: 'Invalid, expired, or used admission token' };
    }

    return { 
      valid: true, 
      method: 'token', 
      token: token 
    };
  }

  // Validate payment reference
  static async validatePayment(payment_reference, school_id, branch_id) {
    // TODO: Implement Paystack payment verification
    // This would verify the payment_reference with Paystack API
    // and ensure it's for the correct school/branch
    
    return { 
      valid: true, 
      method: 'payment', 
      payment_reference 
    };
  }
}

module.exports = AdmissionHelpers;
