const db = require("../models");
const { Op } = require("sequelize");

/**
 * Get all section configurations for a CA setup
 */
const getSectionConfigs = async (req, res) => {
  try {
    const { ca_setup_id } = req.params;
    const { school_id, branch_id } = req.user;

    const sectionConfigs = await db.CASectionConfig.findAll({
      where: {
        ca_setup_id,
        school_id,
        branch_id,
        is_active: true
      },
      include: [
        {
          model: db.CASetupV2,
          as: 'caSetup',
          attributes: ['id', 'ca_type', 'setup_name']
        }
      ],
      order: [['section_name', 'ASC']]
    });

    res.json({
      success: true,
      data: sectionConfigs,
      message: "Section configurations retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getSectionConfigs:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching section configurations.",
      error: error.message,
    });
  }
};

/**
 * Create or update section configuration
 */
const createUpdateSectionConfig = async (req, res) => {
  try {
    const {
      id,
      ca_setup_id,
      section_id,
      section_name,
      class_id,
      subject_id,
      custom_config
    } = req.body;

    const { school_id, branch_id, id: user_id } = req.user;

    // Validation
    if (!ca_setup_id || !section_id || !section_name) {
      return res.status(400).json({
        success: false,
        message: "CA setup ID, section ID, and section name are required.",
      });
    }

    // Verify CA setup exists and belongs to user
    const caSetup = await db.CASetupV2.findOne({
      where: {
        id: ca_setup_id,
        school_id,
        branch_id
      }
    });

    if (!caSetup) {
      return res.status(404).json({
        success: false,
        message: "CA setup not found.",
      });
    }

    let sectionConfig;

    if (id) {
      // Update existing configuration
      sectionConfig = await db.CASectionConfig.findOne({
        where: {
          id,
          school_id,
          branch_id
        }
      });

      if (!sectionConfig) {
        return res.status(404).json({
          success: false,
          message: "Section configuration not found.",
        });
      }

      await sectionConfig.update({
        section_name,
        class_id,
        subject_id,
        custom_config,
        updated_by: user_id
      });

    } else {
      // Check if configuration already exists for this section
      const existingConfig = await db.CASectionConfig.findOne({
        where: {
          ca_setup_id,
          section_id,
          school_id,
          branch_id
        }
      });

      if (existingConfig) {
        return res.status(400).json({
          success: false,
          message: `Configuration for section '${section_name}' already exists.`,
        });
      }

      // Create new configuration
      sectionConfig = await db.CASectionConfig.create({
        ca_setup_id,
        section_id,
        section_name,
        class_id,
        subject_id,
        custom_config,
        school_id,
        branch_id,
        created_by: user_id,
        updated_by: user_id
      });
    }

    res.json({
      success: true,
      data: sectionConfig,
      message: `Section configuration ${id ? "updated" : "created"} successfully!`,
    });

  } catch (error) {
    console.error("Error in createUpdateSectionConfig:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving section configuration.",
      error: error.message,
    });
  }
};

/**
 * Delete section configuration
 */
const deleteSectionConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id, branch_id, id: user_id } = req.user;

    const sectionConfig = await db.CASectionConfig.findOne({
      where: {
        id,
        school_id,
        branch_id
      }
    });

    if (!sectionConfig) {
      return res.status(404).json({
        success: false,
        message: "Section configuration not found.",
      });
    }

    // Soft delete
    await sectionConfig.update({
      is_active: false,
      updated_by: user_id
    });

    res.json({
      success: true,
      message: "Section configuration deleted successfully!",
    });

  } catch (error) {
    console.error("Error in deleteSectionConfig:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting section configuration.",
      error: error.message,
    });
  }
};

/**
 * Bulk update section configurations
 */
const bulkUpdateSectionConfigs = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { ca_setup_id, sections, update_type, update_data } = req.body;
    const { school_id, branch_id, id: user_id } = req.user;

    // Validation
    if (!ca_setup_id || !sections || !update_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "CA setup ID, sections, and update type are required.",
      });
    }

    // Verify CA setup exists
    const caSetup = await db.CASetupV2.findOne({
      where: {
        id: ca_setup_id,
        school_id,
        branch_id
      },
      transaction
    });

    if (!caSetup) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "CA setup not found.",
      });
    }

    let updatedConfigs = [];

    for (const sectionId of sections) {
      let sectionConfig = await db.CASectionConfig.findOne({
        where: {
          ca_setup_id,
          section_id: sectionId,
          school_id,
          branch_id
        },
        transaction
      });

      if (update_type === 'create_or_update') {
        if (sectionConfig) {
          // Update existing
          await sectionConfig.update({
            custom_config: update_data.custom_config || sectionConfig.custom_config,
            updated_by: user_id
          }, { transaction });
        } else {
          // Create new
          sectionConfig = await db.CASectionConfig.create({
            ca_setup_id,
            section_id: sectionId,
            section_name: update_data.section_names?.[sectionId] || `Section ${sectionId}`,
            class_id: update_data.class_id,
            subject_id: update_data.subject_id,
            custom_config: update_data.custom_config,
            school_id,
            branch_id,
            created_by: user_id,
            updated_by: user_id
          }, { transaction });
        }
        updatedConfigs.push(sectionConfig);
      } else if (update_type === 'delete' && sectionConfig) {
        await sectionConfig.update({
          is_active: false,
          updated_by: user_id
        }, { transaction });
        updatedConfigs.push(sectionConfig);
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      data: updatedConfigs,
      message: `Bulk ${update_type} completed successfully for ${updatedConfigs.length} sections!`,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in bulkUpdateSectionConfigs:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while bulk updating section configurations.",
      error: error.message,
    });
  }
};

/**
 * Get available sections for a school/branch
 */
const getAvailableSections = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { class_id, subject_id } = req.query;

    // This would typically query your sections/classes table
    // For now, returning a mock response
    const sections = [
      { section_id: 'SEC001', section_name: 'Primary 1A', class_id: 'PRI1', class_name: 'Primary 1' },
      { section_id: 'SEC002', section_name: 'Primary 1B', class_id: 'PRI1', class_name: 'Primary 1' },
      { section_id: 'SEC003', section_name: 'Primary 2A', class_id: 'PRI2', class_name: 'Primary 2' },
      { section_id: 'SEC004', section_name: 'Primary 2B', class_id: 'PRI2', class_name: 'Primary 2' },
      { section_id: 'SEC005', section_name: 'JSS 1A', class_id: 'JSS1', class_name: 'JSS 1' },
      { section_id: 'SEC006', section_name: 'JSS 1B', class_id: 'JSS1', class_name: 'JSS 1' },
      { section_id: 'SEC007', section_name: 'SSS 1A', class_id: 'SSS1', class_name: 'SSS 1' },
      { section_id: 'SEC008', section_name: 'SSS 1B', class_id: 'SSS1', class_name: 'SSS 1' },
    ];

    let filteredSections = sections;

    if (class_id) {
      filteredSections = filteredSections.filter(section => section.class_id === class_id);
    }

    res.json({
      success: true,
      data: filteredSections,
      message: "Available sections retrieved successfully",
    });

  } catch (error) {
    console.error("Error in getAvailableSections:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching available sections.",
      error: error.message,
    });
  }
};

module.exports = {
  getSectionConfigs,
  createUpdateSectionConfig,
  deleteSectionConfig,
  bulkUpdateSectionConfigs,
  getAvailableSections,
};