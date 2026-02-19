const db = require('../models');
const { KnowledgeDomain, KnowledgeDomainCriteria } = db;
const { Op } = require('sequelize');

/**
 * KNOWLEDGE DOMAINS CONTROLLER
 * 
 * This controller manages knowledge domains for assessment:
 * - Cognitive (Thinking & Knowledge)
 * - Affective (Emotions & Values) 
 * - Psychomotor (Physical Skills)
 * - Social (Interpersonal Skills)
 * - Spiritual (Moral & Ethical)
 * 
 * Each domain can have multiple assessment criteria with weights
 */

class KnowledgeDomainsController {

  /**
   * GET ALL KNOWLEDGE DOMAINS
   * @route GET /api/v2/knowledge-domains
   */
  async getAllDomains(req, res) {
    try {
      // Check authentication
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please ensure you are logged in and have a valid JWT token.',
          error: 'Missing or invalid user authentication'
        });
      }

      const { domain_type, is_active } = req.query;

      const where = {
        school_id: req.user.school_id,
        branch_id: req.user.branch_id
      };

      if (domain_type) {
        where.domain_type = domain_type;
      }

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const domains = await KnowledgeDomain.findAll({
        where,
        include: [{
          model: KnowledgeDomainCriteria,
          as: 'assessment_criteria',
          required: false
        }],
        order: [
          ['domain_type', 'ASC'],
          ['domain_name', 'ASC'],
          [{ model: KnowledgeDomainCriteria, as: 'assessment_criteria' }, 'weight', 'DESC']
        ]
      });

      console.log(`✅ Found ${domains.length} knowledge domains for school ${req.user.school_id}`);

      res.json({
        success: true,
        message: `Retrieved ${domains.length} knowledge domains`,
        data: domains
      });

    } catch (error) {
      console.error('❌ Error getting knowledge domains:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get knowledge domains',
        error: error.message
      });
    }
  }

  /**
   * GET KNOWLEDGE DOMAIN BY ID
   * @route GET /api/v2/knowledge-domains/:id
   */
  async getDomainById(req, res) {
    try {
      // Check authentication
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { id } = req.params;

      const domain = await KnowledgeDomain.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        },
        include: [{
          model: KnowledgeDomainCriteria,
          as: 'assessment_criteria',
          required: false
        }]
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Knowledge domain not found'
        });
      }

      res.json({
        success: true,
        message: 'Knowledge domain retrieved successfully',
        data: domain
      });

    } catch (error) {
      console.error('❌ Error getting knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * CREATE KNOWLEDGE DOMAIN
   * @route POST /api/v2/knowledge-domains
   */
  async createDomain(req, res) {
    const transaction = await db.sequelize.transaction();

    try {
      // Check authentication
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

      // Check for duplicate domain name within the same type
      const existingDomain = await KnowledgeDomain.findOne({
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

      // Create the knowledge domain
      const domain = await KnowledgeDomain.create({
        domain_name,
        domain_type,
        description,
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
        weight: criteria.weight || 1,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await KnowledgeDomainCriteria.bulkCreate(criteriaData, { transaction });

      await transaction.commit();

      // Fetch the complete domain with criteria
      const completeDomain = await KnowledgeDomain.findOne({
        where: { id: domain.id },
        include: [{
          model: KnowledgeDomainCriteria,
          as: 'assessment_criteria',
          required: false
        }]
      });

      console.log(`✅ Created knowledge domain: ${domain_name} (${domain_type})`);

      res.status(201).json({
        success: true,
        message: 'Knowledge domain created successfully',
        data: completeDomain
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * UPDATE KNOWLEDGE DOMAIN
   * @route PUT /api/v2/knowledge-domains/:id
   */
  async updateDomain(req, res) {
    const transaction = await db.sequelize.transaction();

    try {
      // Check authentication
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
        assessment_criteria = [],
        is_active
      } = req.body;

      // Find the domain
      const domain = await KnowledgeDomain.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Knowledge domain not found'
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
      const existingDomain = await KnowledgeDomain.findOne({
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
        is_active,
        updated_by: req.user.name || req.user.email
      }, { transaction });

      // Delete existing criteria and create new ones
      await KnowledgeDomainCriteria.destroy({
        where: { domain_id: id },
        transaction
      });

      const criteriaData = assessment_criteria.map(criteria => ({
        domain_id: domain.id,
        criteria_name: criteria.criteria_name,
        description: criteria.description,
        weight: criteria.weight || 1,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await KnowledgeDomainCriteria.bulkCreate(criteriaData, { transaction });

      await transaction.commit();

      // Fetch the updated domain with criteria
      const updatedDomain = await KnowledgeDomain.findOne({
        where: { id: domain.id },
        include: [{
          model: KnowledgeDomainCriteria,
          as: 'assessment_criteria',
          required: false
        }]
      });

      console.log(`✅ Updated knowledge domain: ${domain_name} (${domain_type})`);

      res.json({
        success: true,
        message: 'Knowledge domain updated successfully',
        data: updatedDomain
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error updating knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * DELETE KNOWLEDGE DOMAIN
   * @route DELETE /api/v2/knowledge-domains/:id
   */
  async deleteDomain(req, res) {
    const transaction = await db.sequelize.transaction();

    try {
      // Check authentication
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { id } = req.params;

      // Find the domain
      const domain = await KnowledgeDomain.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Knowledge domain not found'
        });
      }

      // Delete associated criteria first
      await KnowledgeDomainCriteria.destroy({
        where: { domain_id: id },
        transaction
      });

      // Delete the domain
      await domain.destroy({ transaction });

      await transaction.commit();

      console.log(`✅ Deleted knowledge domain: ${domain.domain_name} (${domain.domain_type})`);

      res.json({
        success: true,
        message: 'Knowledge domain deleted successfully'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error deleting knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * GET DOMAINS BY TYPE
   * @route GET /api/v2/knowledge-domains/by-type/:type
   */
  async getDomainsByType(req, res) {
    try {
      // Check authentication
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { type } = req.params;
      const { is_active } = req.query;

      const where = {
        domain_type: type,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id
      };

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const domains = await KnowledgeDomain.findAll({
        where,
        include: [{
          model: KnowledgeDomainCriteria,
          as: 'assessment_criteria',
          required: false
        }],
        order: [
          ['domain_name', 'ASC'],
          [{ model: KnowledgeDomainCriteria, as: 'assessment_criteria' }, 'weight', 'DESC']
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
   * @route GET /api/v2/knowledge-domains/types-summary
   */
  async getDomainTypesSummary(req, res) {
    try {
      // Check authentication
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const summary = await KnowledgeDomain.findAll({
        where: {
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        },
        attributes: [
          'domain_type',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_domains'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN is_active = true THEN 1 ELSE 0 END')), 'active_domains']
        ],
        group: ['domain_type'],
        order: [['domain_type', 'ASC']]
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
}

module.exports = new KnowledgeDomainsController();