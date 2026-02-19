const db = require("../models");
const { Op } = require("sequelize");

/**
 * Get all available templates
 */
const getAllTemplates = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { category, ca_type } = req.query;

    const whereClause = {
      is_active: true,
      [Op.or]: [
        { is_system_template: true },
        { school_id, branch_id }
      ]
    };

    if (category) {
      whereClause.template_category = category;
    }

    const templates = await db.CATemplate.findAll({
      where: whereClause,
      order: [
        ['is_system_template', 'DESC'],
        ['template_category', 'ASC'],
        ['template_name', 'ASC']
      ]
    });

    // Filter by CA type if specified
    let filteredTemplates = templates;
    if (ca_type) {
      filteredTemplates = templates.filter(template => 
        template.ca_types.includes(ca_type)
      );
    }

    res.json({
      success: true,
      data: filteredTemplates,
      message: "Templates retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getAllTemplates:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching templates.",
      error: error.message,
    });
  }
};

/**
 * Get a specific template by ID
 */
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id, branch_id } = req.user;

    const template = await db.CATemplate.findOne({
      where: {
        id,
        is_active: true,
        [Op.or]: [
          { is_system_template: true },
          { school_id, branch_id }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found.",
      });
    }

    res.json({
      success: true,
      data: template,
      message: "Template retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getTemplate:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching template.",
      error: error.message,
    });
  }
};

/**
 * Create a new template
 */
const createTemplate = async (req, res) => {
  try {
    const {
      template_name,
      template_category = 'custom',
      description,
      ca_types,
      assessment_mode = 'week_based',
      template_config,
      knowledge_domains,
      overall_contribution_percent = 15.00
    } = req.body;

    const { school_id, branch_id, id: user_id } = req.user;

    // Validation
    if (!template_name || !ca_types || !template_config) {
      return res.status(400).json({
        success: false,
        message: "Template name, CA types, and template configuration are required.",
      });
    }

    // Check if template name already exists
    const existingTemplate = await db.CATemplate.findOne({
      where: {
        template_name,
        school_id,
        branch_id,
        is_active: true
      }
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: `Template with name '${template_name}' already exists.`,
      });
    }

    const template = await db.CATemplate.create({
      template_name,
      template_category,
      description,
      ca_types,
      assessment_mode,
      template_config,
      knowledge_domains,
      overall_contribution_percent,
      school_id,
      branch_id,
      created_by: user_id,
      updated_by: user_id
    });

    res.json({
      success: true,
      data: template,
      message: "Template created successfully!",
    });

  } catch (error) {
    console.error("Error in createTemplate:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating template.",
      error: error.message,
    });
  }
};

/**
 * Update an existing template
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      template_name,
      template_category,
      description,
      ca_types,
      assessment_mode,
      template_config,
      knowledge_domains,
      overall_contribution_percent
    } = req.body;

    const { school_id, branch_id, id: user_id } = req.user;

    const template = await db.CATemplate.findOne({
      where: {
        id,
        school_id,
        branch_id,
        is_system_template: false // Can't update system templates
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found or cannot be updated.",
      });
    }

    await template.update({
      template_name,
      template_category,
      description,
      ca_types,
      assessment_mode,
      template_config,
      knowledge_domains,
      overall_contribution_percent,
      updated_by: user_id
    });

    res.json({
      success: true,
      data: template,
      message: "Template updated successfully!",
    });

  } catch (error) {
    console.error("Error in updateTemplate:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating template.",
      error: error.message,
    });
  }
};

/**
 * Delete a template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id, branch_id, id: user_id } = req.user;

    const template = await db.CATemplate.findOne({
      where: {
        id,
        school_id,
        branch_id,
        is_system_template: false // Can't delete system templates
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found or cannot be deleted.",
      });
    }

    // Soft delete
    await template.update({
      is_active: false,
      updated_by: user_id
    });

    res.json({
      success: true,
      message: "Template deleted successfully!",
    });

  } catch (error) {
    console.error("Error in deleteTemplate:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting template.",
      error: error.message,
    });
  }
};

/**
 * Initialize system templates
 */
const initializeSystemTemplates = async (req, res) => {
  try {
    const systemTemplates = [
      {
        template_name: "Standard Weekly Assessment",
        template_category: "standard",
        description: "Traditional weekly assessment with 4 weeks configuration",
        ca_types: ["CA", "CA1", "CA2", "CA3", "CA4", "TEST", "TEST1", "TEST2", "TEST3", "TEST4"],
        assessment_mode: "week_based",
        overall_contribution_percent: 15.00,
        template_config: {
          weeks: [
            { week_number: 1, max_score: 10 },
            { week_number: 2, max_score: 10 },
            { week_number: 3, max_score: 10 },
            { week_number: 4, max_score: 20 }
          ],
          gradeBoundaries: [
            { grade: 'A', min_percentage: 80, max_percentage: 100, remark: 'Excellent' },
            { grade: 'B', min_percentage: 70, max_percentage: 79, remark: 'Very Good' },
            { grade: 'C', min_percentage: 60, max_percentage: 69, remark: 'Good' },
            { grade: 'D', min_percentage: 50, max_percentage: 59, remark: 'Pass' },
            { grade: 'F', min_percentage: 0, max_percentage: 49, remark: 'Fail' }
          ]
        },
        is_system_template: true
      },
      {
        template_name: "Enhanced Flexible CA Structure",
        template_category: "enhanced",
        description: "Flexible CA1-CA4 structure with assignments and smart time constraints",
        ca_types: ["CA", "CA1", "CA2", "CA3", "CA4"],
        assessment_mode: "week_based_enhanced",
        overall_contribution_percent: 15.00,
        template_config: {
          ca_structure: {
            ca1: {
              enabled: true,
              label: 'CA1',
              type: 'weekly_ca',
              weeks: 4,
              weekly_scores: [10, 10, 10, 20],
              score: 0
            },
            ca2: {
              enabled: false,
              label: 'CA2',
              type: 'weekly_ca',
              weeks: 4,
              weekly_scores: [10, 10, 10, 20],
              score: 0
            },
            ca3: {
              enabled: false,
              label: 'CA3',
              type: 'weekly_ca',
              weeks: 4,
              weekly_scores: [10, 10, 10, 20],
              score: 0
            },
            ca4: {
              enabled: false,
              label: 'CA4',
              type: 'weekly_ca',
              weeks: 4,
              weekly_scores: [10, 10, 10, 20],
              score: 0
            },
            assignment1: {
              enabled: false,
              label: 'Assignment',
              type: 'assignment',
              weeks: 0,
              weekly_scores: [],
              score: 20
            },
            assignment2: {
              enabled: false,
              label: 'Project',
              type: 'assignment',
              weeks: 0,
              weekly_scores: [],
              score: 15
            }
          },
          gradeBoundaries: [
            { grade: 'A', min_percentage: 80, max_percentage: 100, remark: 'Excellent' },
            { grade: 'B', min_percentage: 70, max_percentage: 79, remark: 'Very Good' },
            { grade: 'C', min_percentage: 60, max_percentage: 69, remark: 'Good' },
            { grade: 'D', min_percentage: 50, max_percentage: 59, remark: 'Pass' },
            { grade: 'F', min_percentage: 0, max_percentage: 49, remark: 'Fail' }
          ]
        },
        is_system_template: true
      },
      {
        template_name: "Date-Based Assessment",
        template_category: "standard",
        description: "Traditional CA1, CA2, CA3 with specific dates",
        ca_types: ["CA", "CA1", "CA2", "CA3", "CA4", "TEST", "TEST1", "TEST2", "TEST3", "TEST4"],
        assessment_mode: "date_based",
        overall_contribution_percent: 15.00,
        template_config: {
          assessments: [
            { assessment_number: 1, assessment_name: 'CA1', assessment_date: '', max_score: 15, weight_percentage: 30 },
            { assessment_number: 2, assessment_name: 'CA2', assessment_date: '', max_score: 20, weight_percentage: 40 },
            { assessment_number: 3, assessment_name: 'CA3', assessment_date: '', max_score: 15, weight_percentage: 30 }
          ],
          gradeBoundaries: [
            { grade: 'A', min_percentage: 80, max_percentage: 100, remark: 'Excellent' },
            { grade: 'B', min_percentage: 70, max_percentage: 79, remark: 'Very Good' },
            { grade: 'C', min_percentage: 60, max_percentage: 69, remark: 'Good' },
            { grade: 'D', min_percentage: 50, max_percentage: 59, remark: 'Pass' },
            { grade: 'F', min_percentage: 0, max_percentage: 49, remark: 'Fail' }
          ]
        },
        is_system_template: true
      }
    ];

    // Create system templates if they don't exist
    for (const templateData of systemTemplates) {
      const existingTemplate = await db.CATemplate.findOne({
        where: {
          template_name: templateData.template_name,
          is_system_template: true
        }
      });

      if (!existingTemplate) {
        await db.CATemplate.create(templateData);
      }
    }

    res.json({
      success: true,
      message: "System templates initialized successfully!",
    });

  } catch (error) {
    console.error("Error in initializeSystemTemplates:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while initializing system templates.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  initializeSystemTemplates,
};