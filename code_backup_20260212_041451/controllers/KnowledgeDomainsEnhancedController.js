const db = require('../models');
const { KnowledgeDomainEnhanced, AssessmentCriteriaEnhanced, GradingSystem } = db;
const { Op } = require('sequelize');

/**
 * ENHANCED KNOWLEDGE DOMAINS CONTROLLER
 * 
 * This controller manages enhanced knowledge domains with:
 * - Integration with existing character_traits table
 * - Flexible grading systems (numeric, alphanumeric, alphabetic)
 * - Support for multiple grade scales (1-5, 0-10, A-F, A1-B2, etc.)
 * - Foundation for teacher grading form selection
 */

class KnowledgeDomainsEnhancedController {

  /**
   * GET ALL GRADING SYSTEMS
   * @route GET /api/v2/grading-systems
   */
  async getAllGradingSystems(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { system_type, is_active } = req.query;

      const where = {
        school_id: req.user.school_id,
        branch_id: req.user.branch_id
      };

      if (system_type) {
        where.system_type = system_type;
      }

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const gradingSystems = await GradingSystem.findAll({
        where,
        order: [['is_default', 'DESC'], ['system_name', 'ASC']]
      });

      console.log(`✅ Found ${gradingSystems.length} grading systems for school ${req.user.school_id}`);

      res.json({
        success: true,
        message: `Retrieved ${gradingSystems.length} grading systems`,
        data: gradingSystems
      });

    } catch (error) {
      console.error('❌ Error getting grading systems:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get grading systems',
        error: error.message
      });
    }
  }

  /**
   * CREATE GRADING SYSTEM
   * @route POST /api/v2/grading-systems
   */
  async createGradingSystem(req, res) {
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
        system_name,
        system_type,
        min_value,
        max_value,
        scale_definition,
        is_default = false
      } = req.body;

      // Validation
      if (!system_name || !system_type) {
        return res.status(400).json({
          success: false,
          message: 'System name and type are required'
        });
      }

      // Check for duplicate system name
      const existingSystem = await GradingSystem.findOne({
        where: {
          system_name,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (existingSystem) {
        return res.status(400).json({
          success: false,
          message: `A grading system named "${system_name}" already exists`
        });
      }

      // If setting as default, unset other defaults
      if (is_default) {
        await GradingSystem.update(
          { is_default: false },
          {
            where: {
              school_id: req.user.school_id,
              branch_id: req.user.branch_id,
              is_default: true
            },
            transaction
          }
        );
      }

      // Create the grading system
      const gradingSystem = await GradingSystem.create({
        system_name,
        system_type,
        min_value,
        max_value,
        scale_definition,
        is_default,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }, { transaction });

      await transaction.commit();

      console.log(`✅ Created grading system: ${system_name} (${system_type})`);

      res.status(201).json({
        success: true,
        message: 'Grading system created successfully',
        data: gradingSystem
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating grading system:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create grading system',
        error: error.message
      });
    }
  }

  /**
   * GET ALL ENHANCED KNOWLEDGE DOMAINS
   * @route GET /api/v2/knowledge-domains-enhanced
   */
  async getAllDomainsEnhanced(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { domain_type, is_active, grading_system_id } = req.query;

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

      if (grading_system_id) {
        where.grading_system_id = grading_system_id;
      }

      const domains = await KnowledgeDomainEnhanced.findAll({
        where,
        include: [
          {
            model: GradingSystem,
            as: 'grading_system',
            required: false
          },
          {
            model: AssessmentCriteriaEnhanced,
            as: 'assessment_criteria',
            required: false
          }
        ],
        order: [
          ['domain_type', 'ASC'],
          ['domain_name', 'ASC'],
          [{ model: AssessmentCriteriaEnhanced, as: 'assessment_criteria' }, 'weight', 'DESC']
        ]
      });

      console.log(`✅ Found ${domains.length} enhanced knowledge domains for school ${req.user.school_id}`);

      res.json({
        success: true,
        message: `Retrieved ${domains.length} enhanced knowledge domains`,
        data: domains
      });

    } catch (error) {
      console.error('❌ Error getting enhanced knowledge domains:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get enhanced knowledge domains',
        error: error.message
      });
    }
  }

  /**
   * CREATE ENHANCED KNOWLEDGE DOMAIN
   * @route POST /api/v2/knowledge-domains-enhanced
   */
  async createDomainEnhanced(req, res) {
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
        grading_system_id,
        character_trait_category,
        section,
        weight = 1.00,
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
      const existingDomain = await KnowledgeDomainEnhanced.findOne({
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

      // Validate grading system if provided
      if (grading_system_id) {
        const gradingSystem = await GradingSystem.findOne({
          where: {
            id: grading_system_id,
            school_id: req.user.school_id,
            branch_id: req.user.branch_id
          }
        });

        if (!gradingSystem) {
          return res.status(400).json({
            success: false,
            message: 'Invalid grading system selected'
          });
        }
      }

      // Create the enhanced knowledge domain
      const domain = await KnowledgeDomainEnhanced.create({
        domain_name,
        domain_type,
        description,
        grading_system_id,
        character_trait_category,
        section,
        weight,
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
        character_trait_description: criteria.character_trait_description,
        grade_type: criteria.grade_type || 'numeric',
        grade_scale: criteria.grade_scale,
        weight: criteria.weight || 1.00,
        is_required: criteria.is_required !== false,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await AssessmentCriteriaEnhanced.bulkCreate(criteriaData, { transaction });

      await transaction.commit();

      // Fetch the complete domain with all associations
      const completeDomain = await KnowledgeDomainEnhanced.findOne({
        where: { id: domain.id },
        include: [
          {
            model: GradingSystem,
            as: 'grading_system',
            required: false
          },
          {
            model: AssessmentCriteriaEnhanced,
            as: 'assessment_criteria',
            required: false
          }
        ]
      });

      console.log(`✅ Created enhanced knowledge domain: ${domain_name} (${domain_type})`);

      res.status(201).json({
        success: true,
        message: 'Enhanced knowledge domain created successfully',
        data: completeDomain
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating enhanced knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create enhanced knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * UPDATE ENHANCED KNOWLEDGE DOMAIN
   * @route PUT /api/v2/knowledge-domains-enhanced/:id
   */
  async updateDomainEnhanced(req, res) {
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
        grading_system_id,
        character_trait_category,
        section,
        weight,
        assessment_criteria = [],
        is_active
      } = req.body;

      // Find the domain
      const domain = await KnowledgeDomainEnhanced.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Enhanced knowledge domain not found'
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
      const existingDomain = await KnowledgeDomainEnhanced.findOne({
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

      // Validate grading system if provided
      if (grading_system_id) {
        const gradingSystem = await GradingSystem.findOne({
          where: {
            id: grading_system_id,
            school_id: req.user.school_id,
            branch_id: req.user.branch_id
          }
        });

        if (!gradingSystem) {
          return res.status(400).json({
            success: false,
            message: 'Invalid grading system selected'
          });
        }
      }

      // Update the domain
      await domain.update({
        domain_name,
        domain_type,
        description,
        grading_system_id,
        character_trait_category,
        section,
        weight,
        is_active,
        updated_by: req.user.name || req.user.email
      }, { transaction });

      // Delete existing criteria and create new ones
      await AssessmentCriteriaEnhanced.destroy({
        where: { domain_id: id },
        transaction
      });

      const criteriaData = assessment_criteria.map(criteria => ({
        domain_id: domain.id,
        criteria_name: criteria.criteria_name,
        description: criteria.description,
        character_trait_description: criteria.character_trait_description,
        grade_type: criteria.grade_type || 'numeric',
        grade_scale: criteria.grade_scale,
        weight: criteria.weight || 1.00,
        is_required: criteria.is_required !== false,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await AssessmentCriteriaEnhanced.bulkCreate(criteriaData, { transaction });

      await transaction.commit();

      // Fetch the updated domain with all associations
      const updatedDomain = await KnowledgeDomainEnhanced.findOne({
        where: { id: domain.id },
        include: [
          {
            model: GradingSystem,
            as: 'grading_system',
            required: false
          },
          {
            model: AssessmentCriteriaEnhanced,
            as: 'assessment_criteria',
            required: false
          }
        ]
      });

      console.log(`✅ Updated enhanced knowledge domain: ${domain_name} (${domain_type})`);

      res.json({
        success: true,
        message: 'Enhanced knowledge domain updated successfully',
        data: updatedDomain
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error updating enhanced knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update enhanced knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * DELETE ENHANCED KNOWLEDGE DOMAIN
   * @route DELETE /api/v2/knowledge-domains-enhanced/:id
   */
  async deleteDomainEnhanced(req, res) {
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
      const domain = await KnowledgeDomainEnhanced.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          message: 'Enhanced knowledge domain not found'
        });
      }

      // Delete associated criteria first
      await AssessmentCriteriaEnhanced.destroy({
        where: { domain_id: id },
        transaction
      });

      // Delete the domain
      await domain.destroy({ transaction });

      await transaction.commit();

      console.log(`✅ Deleted enhanced knowledge domain: ${domain.domain_name} (${domain.domain_type})`);

      res.json({
        success: true,
        message: 'Enhanced knowledge domain deleted successfully'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error deleting enhanced knowledge domain:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete enhanced knowledge domain',
        error: error.message
      });
    }
  }

  /**
   * GET CHARACTER TRAITS INTEGRATION DATA
   * @route GET /api/v2/knowledge-domains-enhanced/character-traits
   */
  async getCharacterTraitsIntegration(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      // Query the existing character_traits table
      const characterTraits = await db.sequelize.query(
        `SELECT DISTINCT category, description, section 
         FROM character_traits 
         WHERE school_id = :school_id 
         ORDER BY category, section, description`,
        {
          replacements: { school_id: req.user.school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      // Group by category and section
      const groupedTraits = characterTraits.reduce((acc, trait) => {
        const key = `${trait.category}_${trait.section || 'general'}`;
        if (!acc[key]) {
          acc[key] = {
            category: trait.category,
            section: trait.section,
            descriptions: []
          };
        }
        acc[key].descriptions.push(trait.description);
        return acc;
      }, {});

      res.json({
        success: true,
        message: 'Character traits integration data retrieved successfully',
        data: {
          raw_traits: characterTraits,
          grouped_traits: Object.values(groupedTraits),
          total_traits: characterTraits.length,
          categories: [...new Set(characterTraits.map(t => t.category))],
          sections: [...new Set(characterTraits.map(t => t.section).filter(Boolean))]
        }
      });

    } catch (error) {
      console.error('❌ Error getting character traits integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get character traits integration data',
        error: error.message
      });
    }
  }

  /**
   * GET PREDEFINED GRADING SCALES
   * @route GET /api/v2/knowledge-domains-enhanced/grading-scales
   */
  async getPredefinedGradingScales(req, res) {
    try {
      const predefinedScales = {
        numeric: {
          '1-5': {
            name: '5-Point Scale',
            min_value: '1',
            max_value: '5',
            scale_definition: {
              '1': { label: 'Poor', description: 'Below expectations' },
              '2': { label: 'Fair', description: 'Approaching expectations' },
              '3': { label: 'Good', description: 'Meets expectations' },
              '4': { label: 'Very Good', description: 'Exceeds expectations' },
              '5': { label: 'Excellent', description: 'Far exceeds expectations' }
            }
          },
          '0-10': {
            name: '10-Point Scale',
            min_value: '0',
            max_value: '10',
            scale_definition: {
              '0-2': { label: 'Poor', description: 'Significant improvement needed' },
              '3-4': { label: 'Below Average', description: 'Some improvement needed' },
              '5-6': { label: 'Average', description: 'Meets basic expectations' },
              '7-8': { label: 'Good', description: 'Above average performance' },
              '9-10': { label: 'Excellent', description: 'Outstanding performance' }
            }
          },
          '1-10': {
            name: '10-Point Scale (1-10)',
            min_value: '1',
            max_value: '10',
            scale_definition: {
              '1-2': { label: 'Poor', description: 'Significant improvement needed' },
              '3-4': { label: 'Below Average', description: 'Some improvement needed' },
              '5-6': { label: 'Average', description: 'Meets basic expectations' },
              '7-8': { label: 'Good', description: 'Above average performance' },
              '9-10': { label: 'Excellent', description: 'Outstanding performance' }
            }
          }
        },
        alphabetic: {
          'A-F': {
            name: 'Letter Grades (A-F)',
            min_value: 'F',
            max_value: 'A',
            scale_definition: {
              'A': { label: 'Excellent', description: '90-100%' },
              'B': { label: 'Good', description: '80-89%' },
              'C': { label: 'Average', description: '70-79%' },
              'D': { label: 'Below Average', description: '60-69%' },
              'F': { label: 'Fail', description: 'Below 60%' }
            }
          },
          'A-E': {
            name: 'Letter Grades (A-E)',
            min_value: 'E',
            max_value: 'A',
            scale_definition: {
              'A': { label: 'Excellent', description: '85-100%' },
              'B': { label: 'Very Good', description: '75-84%' },
              'C': { label: 'Good', description: '65-74%' },
              'D': { label: 'Satisfactory', description: '55-64%' },
              'E': { label: 'Needs Improvement', description: 'Below 55%' }
            }
          }
        },
        alphanumeric: {
          'A1-C6': {
            name: 'WAEC Style (A1-C6)',
            min_value: 'C6',
            max_value: 'A1',
            scale_definition: {
              'A1': { label: 'Excellent', description: '75-100%' },
              'B2': { label: 'Very Good', description: '70-74%' },
              'B3': { label: 'Good', description: '65-69%' },
              'C4': { label: 'Credit', description: '60-64%' },
              'C5': { label: 'Credit', description: '55-59%' },
              'C6': { label: 'Credit', description: '50-54%' }
            }
          },
          'A1-F9': {
            name: 'WAEC Full Scale (A1-F9)',
            min_value: 'F9',
            max_value: 'A1',
            scale_definition: {
              'A1': { label: 'Excellent', description: '75-100%' },
              'B2': { label: 'Very Good', description: '70-74%' },
              'B3': { label: 'Good', description: '65-69%' },
              'C4': { label: 'Credit', description: '60-64%' },
              'C5': { label: 'Credit', description: '55-59%' },
              'C6': { label: 'Credit', description: '50-54%' },
              'D7': { label: 'Pass', description: '45-49%' },
              'E8': { label: 'Pass', description: '40-44%' },
              'F9': { label: 'Fail', description: 'Below 40%' }
            }
          }
        }
      };

      res.json({
        success: true,
        message: 'Predefined grading scales retrieved successfully',
        data: predefinedScales
      });

    } catch (error) {
      console.error('❌ Error getting predefined grading scales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get predefined grading scales',
        error: error.message
      });
    }
  }
}

module.exports = new KnowledgeDomainsEnhancedController();