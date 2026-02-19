const db = require('../models');
const { CAGroup, CAConfiguration, GradeBoundary } = db;
const { Op } = require('sequelize');

/**
 * CA GROUP CONTROLLER
 * 
 * This controller manages CA Groups which contain:
 * - Multiple CAs (CA1, CA2, CA3, etc.) + Exam
 * - Minimum 3 CAs + 1 Exam per group
 * - Single Grade Boundaries setup per group (shared by all CAs)
 * - Flexible CA configurations with different contributions
 */

class CAGroupController {

  /**
   * GET ALL CA GROUPS
   * @route GET /api/v2/ca-groups
   */
  async getAllCAGroups(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { is_active, academic_level } = req.query;

      const where = {
        school_id: req.user.school_id,
        branch_id: req.user.branch_id
      };

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      if (academic_level) {
        where.academic_level = academic_level;
      }

      const caGroups = await CAGroup.findAll({
        where,
        include: [
          {
            model: CAConfiguration,
            as: 'ca_configurations',
            required: false,
            order: [['ca_order', 'ASC']]
          },
          {
            model: GradeBoundary,
            as: 'grade_boundaries',
            required: false,
            order: [['min_percentage', 'DESC']]
          }
        ],
        order: [
          ['is_active', 'DESC'],
          ['is_default', 'DESC'],
          ['group_name', 'ASC']
        ]
      });

      console.log(`✅ Found ${caGroups.length} CA groups for school ${req.user.school_id}`);

      res.json({
        success: true,
        message: `Retrieved ${caGroups.length} CA groups`,
        data: caGroups
      });

    } catch (error) {
      console.error('❌ Error getting CA groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get CA groups',
        error: error.message
      });
    }
  }

  /**
   * GET CA GROUP BY ID
   * @route GET /api/v2/ca-groups/:id
   */
  async getCAGroupById(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const { id } = req.params;

      const caGroup = await CAGroup.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        },
        include: [
          {
            model: CAConfiguration,
            as: 'ca_configurations',
            required: false,
            order: [['ca_order', 'ASC']]
          },
          {
            model: GradeBoundary,
            as: 'grade_boundaries',
            required: false,
            order: [['min_percentage', 'DESC']]
          }
        ]
      });

      if (!caGroup) {
        return res.status(404).json({
          success: false,
          message: 'CA group not found'
        });
      }

      res.json({
        success: true,
        message: 'CA group retrieved successfully',
        data: caGroup
      });

    } catch (error) {
      console.error('❌ Error getting CA group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get CA group',
        error: error.message
      });
    }
  }

  /**
   * CREATE CA GROUP
   * @route POST /api/v2/ca-groups
   */
  async createCAGroup(req, res) {
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
        group_name,
        description,
        academic_level,
        ca_configurations = [],
        grade_boundaries = [],
        is_default = false,
        activate_on_create = false
      } = req.body;

      // Validation
      if (!group_name) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      if (!ca_configurations || ca_configurations.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'At least 4 CA configurations are required (3 CAs + 1 Exam)'
        });
      }

      // Validate minimum requirements: 3 CAs + 1 Exam
      const caTypes = ca_configurations.map(config => config.ca_type);
      const hasRequiredCAs = ['CA1', 'CA2', 'CA3'].every(ca => caTypes.includes(ca));
      const hasExam = caTypes.includes('EXAM');

      if (!hasRequiredCAs || !hasExam) {
        return res.status(400).json({
          success: false,
          message: 'CA group must include CA1, CA2, CA3, and EXAM'
        });
      }

      // Validate total contribution equals 100%
      const totalContribution = ca_configurations.reduce((sum, config) => sum + parseFloat(config.contribution_percent || 0), 0);
      if (Math.abs(totalContribution - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total contribution must equal 100%. Current total: ${totalContribution}%`
        });
      }

      // Check for duplicate group name
      const existingGroup = await CAGroup.findOne({
        where: {
          group_name,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: `A CA group named "${group_name}" already exists`
        });
      }

      // If setting as default or activating, unset other defaults/active groups
      if (is_default) {
        await CAGroup.update(
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

      if (activate_on_create) {
        await CAGroup.update(
          { is_active: false },
          {
            where: {
              school_id: req.user.school_id,
              branch_id: req.user.branch_id,
              is_active: true
            },
            transaction
          }
        );
      }

      // Create the CA group
      const caGroup = await CAGroup.create({
        group_name,
        description,
        academic_level,
        is_active: activate_on_create,
        is_default,
        total_contribution: totalContribution,
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }, { transaction });

      // Create CA configurations
      const configData = ca_configurations.map((config, index) => ({
        group_id: caGroup.id,
        ca_type: config.ca_type,
        ca_order: config.ca_order || (index + 1),
        ca_name: config.ca_name,
        description: config.description,
        contribution_percent: config.contribution_percent,
        weeks_config: config.weeks_config || [],
        total_max_score: config.total_max_score || 0,
        is_required: ['CA1', 'CA2', 'CA3', 'EXAM'].includes(config.ca_type),
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await CAConfiguration.bulkCreate(configData, { transaction });

      // Create grade boundaries if provided
      if (grade_boundaries && grade_boundaries.length > 0) {
        const boundaryData = grade_boundaries.map(boundary => ({
          group_id: caGroup.id,
          grade: boundary.grade,
          min_percentage: boundary.min_percentage,
          max_percentage: boundary.max_percentage,
          remark: boundary.remark,
          grade_point: boundary.grade_point,
          is_passing: boundary.is_passing !== false,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id,
          created_by: req.user.name || req.user.email
        }));

        await GradeBoundary.bulkCreate(boundaryData, { transaction });
      }

      await transaction.commit();

      // Fetch the complete CA group with all associations
      const completeCAGroup = await CAGroup.findOne({
        where: { id: caGroup.id },
        include: [
          {
            model: CAConfiguration,
            as: 'ca_configurations',
            order: [['ca_order', 'ASC']]
          },
          {
            model: GradeBoundary,
            as: 'grade_boundaries',
            order: [['min_percentage', 'DESC']]
          }
        ]
      });

      console.log(`✅ Created CA group: ${group_name} with ${ca_configurations.length} CAs`);

      res.status(201).json({
        success: true,
        message: 'CA group created successfully',
        data: completeCAGroup
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating CA group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create CA group',
        error: error.message
      });
    }
  }

  /**
   * UPDATE CA GROUP
   * @route PUT /api/v2/ca-groups/:id
   */
  async updateCAGroup(req, res) {
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
        group_name,
        description,
        academic_level,
        ca_configurations = [],
        grade_boundaries = [],
        is_default
      } = req.body;

      // Find the CA group
      const caGroup = await CAGroup.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!caGroup) {
        return res.status(404).json({
          success: false,
          message: 'CA group not found'
        });
      }

      // Validation
      if (!group_name) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      if (!ca_configurations || ca_configurations.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'At least 4 CA configurations are required (3 CAs + 1 Exam)'
        });
      }

      // Validate minimum requirements
      const caTypes = ca_configurations.map(config => config.ca_type);
      const hasRequiredCAs = ['CA1', 'CA2', 'CA3'].every(ca => caTypes.includes(ca));
      const hasExam = caTypes.includes('EXAM');

      if (!hasRequiredCAs || !hasExam) {
        return res.status(400).json({
          success: false,
          message: 'CA group must include CA1, CA2, CA3, and EXAM'
        });
      }

      // Validate total contribution
      const totalContribution = ca_configurations.reduce((sum, config) => sum + parseFloat(config.contribution_percent || 0), 0);
      if (Math.abs(totalContribution - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total contribution must equal 100%. Current total: ${totalContribution}%`
        });
      }

      // Check for duplicate group name (excluding current group)
      const existingGroup = await CAGroup.findOne({
        where: {
          group_name,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id,
          id: { [Op.ne]: id }
        }
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: `A CA group named "${group_name}" already exists`
        });
      }

      // If setting as default, unset other defaults
      if (is_default) {
        await CAGroup.update(
          { is_default: false },
          {
            where: {
              school_id: req.user.school_id,
              branch_id: req.user.branch_id,
              is_default: true,
              id: { [Op.ne]: id }
            },
            transaction
          }
        );
      }

      // Update the CA group
      await caGroup.update({
        group_name,
        description,
        academic_level,
        is_default,
        total_contribution: totalContribution,
        updated_by: req.user.name || req.user.email
      }, { transaction });

      // Delete existing configurations and boundaries
      await CAConfiguration.destroy({
        where: { group_id: id },
        transaction
      });

      await GradeBoundary.destroy({
        where: { group_id: id },
        transaction
      });

      // Create new CA configurations
      const configData = ca_configurations.map((config, index) => ({
        group_id: caGroup.id,
        ca_type: config.ca_type,
        ca_order: config.ca_order || (index + 1),
        ca_name: config.ca_name,
        description: config.description,
        contribution_percent: config.contribution_percent,
        weeks_config: config.weeks_config || [],
        total_max_score: config.total_max_score || 0,
        is_required: ['CA1', 'CA2', 'CA3', 'EXAM'].includes(config.ca_type),
        school_id: req.user.school_id,
        branch_id: req.user.branch_id,
        created_by: req.user.name || req.user.email
      }));

      await CAConfiguration.bulkCreate(configData, { transaction });

      // Create new grade boundaries
      if (grade_boundaries && grade_boundaries.length > 0) {
        const boundaryData = grade_boundaries.map(boundary => ({
          group_id: caGroup.id,
          grade: boundary.grade,
          min_percentage: boundary.min_percentage,
          max_percentage: boundary.max_percentage,
          remark: boundary.remark,
          grade_point: boundary.grade_point,
          is_passing: boundary.is_passing !== false,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id,
          created_by: req.user.name || req.user.email
        }));

        await GradeBoundary.bulkCreate(boundaryData, { transaction });
      }

      await transaction.commit();

      // Fetch the updated CA group
      const updatedCAGroup = await CAGroup.findOne({
        where: { id: caGroup.id },
        include: [
          {
            model: CAConfiguration,
            as: 'ca_configurations',
            order: [['ca_order', 'ASC']]
          },
          {
            model: GradeBoundary,
            as: 'grade_boundaries',
            order: [['min_percentage', 'DESC']]
          }
        ]
      });

      console.log(`✅ Updated CA group: ${group_name} with ${ca_configurations.length} CAs`);

      res.json({
        success: true,
        message: 'CA group updated successfully',
        data: updatedCAGroup
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error updating CA group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update CA group',
        error: error.message
      });
    }
  }

  /**
   * DELETE CA GROUP
   * @route DELETE /api/v2/ca-groups/:id
   */
  async deleteCAGroup(req, res) {
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

      // Find the CA group
      const caGroup = await CAGroup.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!caGroup) {
        return res.status(404).json({
          success: false,
          message: 'CA group not found'
        });
      }

      // Check if this is the active group
      if (caGroup.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the active CA group. Please activate another group first.'
        });
      }

      // Delete associated configurations and boundaries (cascade will handle this)
      await caGroup.destroy({ transaction });

      await transaction.commit();

      console.log(`✅ Deleted CA group: ${caGroup.group_name}`);

      res.json({
        success: true,
        message: 'CA group deleted successfully'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error deleting CA group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete CA group',
        error: error.message
      });
    }
  }

  /**
   * ACTIVATE CA GROUP
   * @route POST /api/v2/ca-groups/:id/activate
   */
  async activateCAGroup(req, res) {
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

      // Find the CA group
      const caGroup = await CAGroup.findOne({
        where: {
          id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        }
      });

      if (!caGroup) {
        return res.status(404).json({
          success: false,
          message: 'CA group not found'
        });
      }

      // Deactivate all other groups
      await CAGroup.update(
        { is_active: false },
        {
          where: {
            school_id: req.user.school_id,
            branch_id: req.user.branch_id,
            is_active: true
          },
          transaction
        }
      );

      // Activate this group
      await caGroup.update({
        is_active: true,
        updated_by: req.user.name || req.user.email
      }, { transaction });

      await transaction.commit();

      console.log(`✅ Activated CA group: ${caGroup.group_name}`);

      res.json({
        success: true,
        message: `CA group "${caGroup.group_name}" activated successfully`
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error activating CA group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate CA group',
        error: error.message
      });
    }
  }

  /**
   * GET ACTIVE CA GROUP
   * @route GET /api/v2/ca-groups/active
   */
  async getActiveCAGroup(req, res) {
    try {
      if (!req.user || !req.user.school_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Missing or invalid user authentication'
        });
      }

      const activeGroup = await CAGroup.findOne({
        where: {
          school_id: req.user.school_id,
          branch_id: req.user.branch_id,
          is_active: true
        },
        include: [
          {
            model: CAConfiguration,
            as: 'ca_configurations',
            order: [['ca_order', 'ASC']]
          },
          {
            model: GradeBoundary,
            as: 'grade_boundaries',
            order: [['min_percentage', 'DESC']]
          }
        ]
      });

      if (!activeGroup) {
        return res.status(404).json({
          success: false,
          message: 'No active CA group found'
        });
      }

      res.json({
        success: true,
        message: 'Active CA group retrieved successfully',
        data: activeGroup
      });

    } catch (error) {
      console.error('❌ Error getting active CA group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active CA group',
        error: error.message
      });
    }
  }
}

module.exports = new CAGroupController();