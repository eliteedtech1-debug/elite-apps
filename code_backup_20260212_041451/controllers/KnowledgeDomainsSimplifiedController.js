const db = require('../models');
const { KnowledgeDomainSimplified, AssessmentCriteriaSimplified } = db;
const { Op } = require('sequelize');

/**
 * SIMPLIFIED KNOWLEDGE DOMAINS CONTROLLER
 * 
 * This controller manages simplified knowledge domains where:
 * - Domain Type replaces Character Trait Category
 * - Standardized grading systems with predefined values
 * - Teachers must use exact standardized grades (no variations)
 * - Ensures consistency across all teachers in the school
 */

class KnowledgeDomainsSimplifiedController {

  /**
   * GET ALL SIMPLIFIED KNOWLEDGE DOMAINS
   * @route GET /api/v2/knowledge-domains-simplified
   */
  async getAllDomainsSimplified(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { domain_type, grading_system, is_active } = req.query;

      const where = {
        school_id: req.user.school_id,
        branch_id: req.user.branch_id
      };

      if (domain_type) {
        where.domain_type = domain_type;
      }

      if (grading_system) {
        where.grading_system = grading_system;
      }

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const domains = await KnowledgeDomainSimplified.findAll({
        where,
        include: [
          {
            model: AssessmentCriteriaSimplified,
            as: 'assessment_criteria',
            required: false
          }
        ],
        order: [
          ['domain_type', 'ASC'],
          ['domain_name', 'ASC'],
          [{ model: AssessmentCriteriaSimplified, as: 'assessment_criteria' }, 'criteria_name', 'ASC']
        ]
      });

      console.log(`✅ Found ${domains.length} simplified knowledge domains for school ${req.user.school_id}`);

      res.json({
        success: true,
        message: `Retrieved ${domains.length} simplified knowledge domains`,
        data: domains
      });

    } catch (error) {
      console.error('❌ Error getting simplified knowledge domains:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get simplified knowledge domains',
        error: error.message
      });
    }
  }

  /**
   * GET SIMPLIFIED KNOWLEDGE DOMAIN BY ID
   * @route GET /api/v2/knowledge-domains-simplified/:id
   */
  async getDomainByIdSimplified(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { id } = req.params;

      const domain = await KnowledgeDomainSimplified.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        },
        include: [
          {
            model: AssessmentCriteriaSimplified,
            as: 'assessment_criteria',
            required: false
          }
        ]
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Simplified knowledge domain not found'
        });
      }

      res.json({
        success: true,
        message: 'Simplified knowledge domain retrieved successfully',
        data: domain
      });

    } catch (error) {
      console.error('❌ Error getting simplified knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get simplified knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * CREATE SIMPLIFIED KNOWLEDGE DOMAIN
   * @route POST /api/v2/knowledge-domains-simplified
   */
  async createDomainSimplified(req, res) {
    const transaction = await db.sequelize.transaction();

    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const {
        domain_name,
        domain_type,
        description,
        grading_system = 'numeric_1_5',
        grading_values = [],
        assessment_criteria = [],
        is_active = true
      } = req.body;

      // Validation
      if (!domain_name || !domain_type) {
        return res.status(400).json({
          success: false,
          message: 'Domain name and type are required'
        });
      }

      if (!assessment_criteria || assessment_criteria.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one assessment criterion is required'
        });
      }

      // Validate grading values
      if (!grading_values || grading_values.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Grading values are required for standardization'
        });
      }

      // Check for duplicate domain name within the same type
      const existingDomain = await KnowledgeDomainSimplified.findOne({
        where: {
          domain_name,
          domain_type,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (existingDomain) {
        return res.status(400).json({
          success: false,
          message: `A ${domain_type} domain named "${domain_name}" already exists`
        });
      }

      // Validate grading values
      if (!grading_values || grading_values.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Grading values are required for standardization'
        });
      }

      // Create the simplified knowledge domain
      const domain = await KnowledgeDomainSimplified.create({
        domain_name,
        domain_type,
        description,
        grading_system,
        grading_values,
        is_active,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }, { transaction });

      // Create assessment criteria
      const criteriaData = assessment_criteria.map(criteria => ({
        domain_id: domain.id,
        criteria_name: criteria.criteria_name,
        description: criteria.description,
        is_required: criteria.is_required !== false,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await AssessmentCriteriaSimplified.bulkCreate(criteriaData, { transaction });

      await transaction.commit();

      // Fetch the complete domain with criteria
      const completeDomain = await KnowledgeDomainSimplified.findOne({
        where: { id: domain.id },
        include: [
          {
            model: AssessmentCriteriaSimplified,
            as: 'assessment_criteria',
            required: false
          }
        ]
      });

      console.log(`✅ Created simplified knowledge domain: ${domain_name} (${domain_type}) - ${grading_system} with ${grading_values.length} standardized values`);

      res.status(201).json({
        success: true,
        message: 'Simplified knowledge domain created successfully',
        data: completeDomain
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating simplified knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create simplified knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * UPDATE SIMPLIFIED KNOWLEDGE DOMAIN
   * @route PUT /api/v2/knowledge-domains-simplified/:id
   */
  async updateDomainSimplified(req, res) {
    const transaction = await db.sequelize.transaction();

    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { id } = req.params;
      const {
        domain_name,
        domain_type,
        description,
        grading_system,
        grading_values = [],
        assessment_criteria = [],
        is_active
      } = req.body;

      // Find the domain
      const domain = await KnowledgeDomainSimplified.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Simplified knowledge domain not found'
        });
      }

      // Validation
      if (!domain_name || !domain_type) {
        return res.status(400).json({
          success: false,
          message: 'Domain name and type are required'
        });
      }

      if (!assessment_criteria || assessment_criteria.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one assessment criterion is required'
        });
      }

      // Check for duplicate domain name (excluding current domain)
      const existingDomain = await KnowledgeDomainSimplified.findOne({
        where: {
          domain_name,
          domain_type,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id,
          id: { [Op.ne]: id }
        }
      });

      if (existingDomain) {
        return res.status(400).json({
          success: false,
          message: `A ${domain_type} domain named "${domain_name}" already exists`
        });
      }

      // Update the domain
      await domain.update({
        domain_name,
        domain_type,
        description,
        grading_system,
        grading_values,
        is_active,
        updated_by: req.user.name || req.user.email
      }, { transaction });

      // Delete existing criteria and create new ones
      await AssessmentCriteriaSimplified.destroy({
        where: { domain_id: id },
        transaction
      });

      const criteriaData = assessment_criteria.map(criteria => ({
        domain_id: domain.id,
        criteria_name: criteria.criteria_name,
        description: criteria.description,
        is_required: criteria.is_required !== false,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await AssessmentCriteriaSimplified.bulkCreate(criteriaData, { transaction });

      await transaction.commit();

      // Fetch the updated domain with criteria
      const updatedDomain = await KnowledgeDomainSimplified.findOne({
        where: { id: domain.id },
        include: [
          {
            model: AssessmentCriteriaSimplified,
            as: 'assessment_criteria',
            required: false
          }
        ]
      });

      console.log(`✅ Updated simplified knowledge domain: ${domain_name} (${domain_type}) - ${grading_system} with ${grading_values.length} standardized values`);

      res.json({
        success: true,
        message: 'Simplified knowledge domain updated successfully',
        data: updatedDomain
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error updating simplified knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update simplified knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * DELETE SIMPLIFIED KNOWLEDGE DOMAIN
   * @route DELETE /api/v2/knowledge-domains-simplified/:id
   */
  async deleteDomainSimplified(req, res) {
    const transaction = await db.sequelize.transaction();

    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { id } = req.params;

      // Find the domain
      const domain = await KnowledgeDomainSimplified.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Simplified knowledge domain not found'
        });
      }

      // Delete associated criteria first
      await AssessmentCriteriaSimplified.destroy({
        where: { domain_id: id },
        transaction
      });

      // Delete the domain
      await domain.destroy({ transaction });

      await transaction.commit();

      console.log(`✅ Deleted simplified knowledge domain: ${domain.domain_name} (${domain.domain_type})`);

      res.json({
        success: true,
        message: 'Simplified knowledge domain deleted successfully'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error deleting simplified knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete simplified knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * GET DOMAINS BY TYPE
   * @route GET /api/v2/knowledge-domains-simplified/by-type/:type
   */
  async getDomainsByTypeSimplified(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { type } = req.params;
      const { grading_system, is_active } = req.query;

      const where = {
        domain_type: type,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id
      };

      if (grading_system) {
        where.grading_system = grading_system;
      }

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const domains = await KnowledgeDomainSimplified.findAll({
        where,
        include: [
          {
            model: AssessmentCriteriaSimplified,
            as: 'assessment_criteria',
            required: false
          }
        ],
        order: [
          ['domain_name', 'ASC'],
          [{ model: AssessmentCriteriaSimplified, as: 'assessment_criteria' }, 'criteria_name', 'ASC']
        ]
      });

      res.json({
        success: true,
        message: `Retrieved ${domains.length} ${type} domains`,
        data: domains
      });

    } catch (error) {
      console.error('❌ Error getting domains by type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get domains by type',
        error: error.message
      });
    }
  }

  /**
   * GET DOMAIN TYPES SUMMARY
   * @route GET /api/v2/knowledge-domains-simplified/types-summary
   */
  async getDomainTypesSummarySimplified(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const summary = await KnowledgeDomainSimplified.findAll({
        where: {
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        },
        attributes: [
          'domain_type',
          'grading_system',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_domains'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN is_active = true THEN 1 ELSE 0 END')), 'active_domains']
        ],
        group: ['domain_type', 'grading_system'],
        order: [['domain_type', 'ASC'], ['grading_system', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Domain types summary retrieved successfully',
        data: summary
      });

    } catch (error) {
      console.error('❌ Error getting domain types summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get domain types summary',
        error: error.message
      });
    }
  }

  /**
   * GET STANDARDIZED GRADING VALUES
   * @route GET /api/v2/knowledge-domains-simplified/grading-values/:system
   */
  async getStandardizedGradingValues(req, res) {
    try {
      const { system } = req.params;
      
      const gradingSystemsConfig = {
        numeric_1_5: [
          { value: '1', label: 'Poor', description: 'Below expectations' },
          { value: '2', label: 'Fair', description: 'Approaching expectations' },
          { value: '3', label: 'Good', description: 'Meets expectations' },
          { value: '4', label: 'Very Good', description: 'Exceeds expectations' },
          { value: '5', label: 'Excellent', description: 'Far exceeds expectations' }
        ],
        numeric_1_10: [
          { value: '1', label: 'Very Poor', description: '1/10' },
          { value: '2', label: 'Poor', description: '2/10' },
          { value: '3', label: 'Below Average', description: '3/10' },
          { value: '4', label: 'Below Average', description: '4/10' },
          { value: '5', label: 'Average', description: '5/10' },
          { value: '6', label: 'Above Average', description: '6/10' },
          { value: '7', label: 'Good', description: '7/10' },
          { value: '8', label: 'Very Good', description: '8/10' },
          { value: '9', label: 'Excellent', description: '9/10' },
          { value: '10', label: 'Outstanding', description: '10/10' }
        ],
        alpha_a_f: [
          { value: 'A', label: 'Excellent', description: '90-100%' },
          { value: 'B', label: 'Good', description: '80-89%' },
          { value: 'C', label: 'Average', description: '70-79%' },
          { value: 'D', label: 'Below Average', description: '60-69%' },
          { value: 'E', label: 'Poor', description: '50-59%' },
          { value: 'F', label: 'Fail', description: 'Below 50%' }
        ],
        alphanumeric_a1_f9: [
          { value: 'A1', label: 'Excellent', description: '75-100%' },
          { value: 'B2', label: 'Very Good', description: '70-74%' },
          { value: 'B3', label: 'Good', description: '65-69%' },
          { value: 'C4', label: 'Credit', description: '60-64%' },
          { value: 'C5', label: 'Credit', description: '55-59%' },
          { value: 'C6', label: 'Credit', description: '50-54%' },
          { value: 'D7', label: 'Pass', description: '45-49%' },
          { value: 'E8', label: 'Pass', description: '40-44%' },
          { value: 'F9', label: 'Fail', description: 'Below 40%' }
        ],
        descriptive_excellent_poor: [
          { value: 'Excellent', label: 'Excellent', description: 'Outstanding performance' },
          { value: 'Very Good', label: 'Very Good', description: 'Above average performance' },
          { value: 'Good', label: 'Good', description: 'Satisfactory performance' },
          { value: 'Fair', label: 'Fair', description: 'Below average performance' },
          { value: 'Poor', label: 'Poor', description: 'Needs significant improvement' }
        ]
      };

      const values = gradingSystemsConfig[system];
      
      if (!values) {
        return res.status(404).json({
          success: false,
          message: 'Grading system not found'
        });
      }

      res.json({
        success: true,
        message: `Standardized grading values for ${system} retrieved successfully`,
        data: {
          grading_system: system,
          values: values,
          total_values: values.length
        }
      });

    } catch (error) {
      console.error('❌ Error getting standardized grading values:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get standardized grading values',
        error: error.message
      });
    }
  }
}

module.exports = new KnowledgeDomainsSimplifiedController();