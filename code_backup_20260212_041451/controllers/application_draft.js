const db = require("../models");
const moment = require("moment");

/**
 * Application Draft Controller
 * Handles saving, retrieving, and managing application drafts
 */

/**
 * Save application as draft
 */
const saveApplicationDraft = async (req, res) => {
  try {
    const {
      draft_id = null,
      draft_name = 'Untitled Draft',
      form_data,
      step_completed = 0,
      is_auto_save = false
    } = req.body;

    const user_id = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;

    if (!form_data) {
      return res.status(400).json({
        success: false,
        message: "Form data is required"
      });
    }

    let query, replacements;

    if (draft_id) {
      // Update existing draft
      query = `
        UPDATE application_drafts 
        SET draft_name = :draft_name,
            form_data = :form_data,
            step_completed = :step_completed,
            is_auto_save = :is_auto_save,
            updated_at = NOW()
        WHERE draft_id = :draft_id AND user_id = :user_id AND school_id = :school_id
      `;
      replacements = {
        draft_id,
        draft_name,
        form_data: JSON.stringify(form_data),
        step_completed,
        is_auto_save,
        user_id,
        school_id
      };
    } else {
      // Create new draft
      const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      query = `
        INSERT INTO application_drafts 
        (draft_id, user_id, school_id, branch_id, draft_name, form_data, 
         step_completed, is_auto_save, created_at, updated_at)
        VALUES (:draft_id, :user_id, :school_id, :branch_id, :draft_name, 
                :form_data, :step_completed, :is_auto_save, NOW(), NOW())
      `;
      replacements = {
        draft_id: newDraftId,
        user_id,
        school_id,
        branch_id,
        draft_name,
        form_data: JSON.stringify(form_data),
        step_completed,
        is_auto_save
      };
    }

    await db.sequelize.query(query, { replacements });

    res.json({
      success: true,
      message: "Draft saved successfully",
      data: {
        draft_id: draft_id || replacements.draft_id,
        draft_name,
        step_completed,
        saved_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error saving application draft:", error);
    res.status(500).json({
      success: false,
      message: "Error saving application draft",
      error: error.message
    });
  }
};

/**
 * Get user's application drafts
 */
const getUserDrafts = async (req, res) => {
  try {
    const user_id = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;

    const drafts = await db.sequelize.query(
      `SELECT 
         draft_id,
         draft_name,
         step_completed,
         is_auto_save,
         created_at,
         updated_at,
         CASE 
           WHEN JSON_EXTRACT(form_data, '$.name_of_applicant') IS NOT NULL 
           THEN JSON_UNQUOTE(JSON_EXTRACT(form_data, '$.name_of_applicant'))
           ELSE 'Unnamed Applicant'
         END as applicant_name,
         CASE 
           WHEN JSON_EXTRACT(form_data, '$.last_class') IS NOT NULL 
           THEN JSON_UNQUOTE(JSON_EXTRACT(form_data, '$.last_class'))
           ELSE 'No Class Selected'
         END as class_applied
       FROM application_drafts
       WHERE user_id = :user_id AND school_id = :school_id
       ORDER BY updated_at DESC`,
      {
        replacements: { user_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        drafts
      }
    });

  } catch (error) {
    console.error("Error fetching user drafts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user drafts",
      error: error.message
    });
  }
};

/**
 * Get specific draft details
 */
const getDraftDetails = async (req, res) => {
  try {
    const { draft_id } = req.params;
    const user_id = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;

    const draft = await db.sequelize.query(
      `SELECT 
         draft_id,
         draft_name,
         form_data,
         step_completed,
         is_auto_save,
         created_at,
         updated_at
       FROM application_drafts
       WHERE draft_id = :draft_id AND user_id = :user_id AND school_id = :school_id`,
      {
        replacements: { draft_id, user_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!draft.length) {
      return res.status(404).json({
        success: false,
        message: "Draft not found"
      });
    }

    const draftData = draft[0];
    
    // Parse form_data JSON
    try {
      draftData.form_data = JSON.parse(draftData.form_data);
    } catch (parseError) {
      console.error("Error parsing form_data:", parseError);
      draftData.form_data = {};
    }

    res.json({
      success: true,
      data: draftData
    });

  } catch (error) {
    console.error("Error fetching draft details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching draft details",
      error: error.message
    });
  }
};

/**
 * Delete application draft
 */
const deleteDraft = async (req, res) => {
  try {
    const { draft_id } = req.params;
    const user_id = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;

    const result = await db.sequelize.query(
      `DELETE FROM application_drafts 
       WHERE draft_id = :draft_id AND user_id = :user_id AND school_id = :school_id`,
      {
        replacements: { draft_id, user_id, school_id }
      }
    );

    if (result[1] === 0) {
      return res.status(404).json({
        success: false,
        message: "Draft not found"
      });
    }

    res.json({
      success: true,
      message: "Draft deleted successfully",
      data: {
        draft_id,
        deleted_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error deleting draft:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting draft",
      error: error.message
    });
  }
};

/**
 * Convert draft to application
 */
const convertDraftToApplication = async (req, res) => {
  try {
    const { draft_id } = req.params;
    const user_id = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;

    // Get draft data
    const draft = await db.sequelize.query(
      `SELECT form_data FROM application_drafts
       WHERE draft_id = :draft_id AND user_id = :user_id AND school_id = :school_id`,
      {
        replacements: { draft_id, user_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!draft.length) {
      return res.status(404).json({
        success: false,
        message: "Draft not found"
      });
    }

    let formData;
    try {
      formData = JSON.parse(draft[0].form_data);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid draft data format"
      });
    }

    // Prepare application data
    const applicationData = {
      ...formData,
      status: "submitted",
      school_id,
      branch_id
    };

    // Submit application using the existing stored procedure
    const result = await db.sequelize.query(
      `CALL school_admission_form(:query_type, :upload,:applicant_id,:guardian_id,:parent_id, :type_of_application, :name_of_applicant, :home_address, :date_of_birth, :guardian_name, :guardian_phone_no, :guardian_email, :guardian_address, :guardian_relationship, :parent_fullname, :parent_phone_no, :parent_email, :parent_address, :parent_occupation, :state_of_origin, :l_g_a, :last_school_attended, :mathematics, :english, :special_health_needs, :sex, :admission_no, :school, :status,:academic_year,:school_id,:branch_id,:short_name,:last_class,:others,:id,:other_score)`,
      {
        replacements: {
          query_type: "create",
          upload: applicationData.upload || "",
          applicant_id: "",
          guardian_id: "",
          parent_id: "",
          type_of_application: applicationData.type_of_application || "",
          name_of_applicant: applicationData.name_of_applicant || "",
          home_address: applicationData.home_address || "",
          date_of_birth: applicationData.date_of_birth ? moment.utc(applicationData.date_of_birth).local().format("YYYY-MM-DD") : null,
          guardian_name: applicationData.guardian_name || "",
          guardian_phone_no: applicationData.guardian_phone_no || "",
          guardian_email: applicationData.guardian_email || "",
          guardian_address: applicationData.guardian_address || "",
          guardian_relationship: applicationData.guardian_relationship || "",
          parent_fullname: applicationData.parent_fullname || "",
          parent_phone_no: applicationData.parent_phone_no || "",
          parent_email: applicationData.parent_email || "",
          parent_address: applicationData.parent_address || "",
          parent_occupation: applicationData.parent_occupation || "",
          state_of_origin: applicationData.state_of_origin || "",
          l_g_a: applicationData.l_g_a || "",
          last_school_attended: applicationData.last_school_attended || "",
          mathematics: applicationData.mathematics || "",
          english: applicationData.english || "",
          special_health_needs: applicationData.special_health_needs || "",
          sex: applicationData.sex || "",
          admission_no: applicationData.admission_no || "",
          school: applicationData.school || "",
          status: "submitted",
          academic_year: applicationData.academic_year || "",
          school_id,
          branch_id,
          short_name: applicationData.short_name || "",
          last_class: applicationData.last_class || "",
          others: applicationData.others || "",
          id: null,
          other_score: applicationData.other_score || 0
        }
      }
    );

    // Delete the draft after successful submission
    await db.sequelize.query(
      `DELETE FROM application_drafts WHERE draft_id = :draft_id`,
      {
        replacements: { draft_id }
      }
    );

    res.json({
      success: true,
      message: "Draft converted to application successfully",
      data: {
        application: result[0][0],
        draft_id,
        submitted_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error converting draft to application:", error);
    res.status(500).json({
      success: false,
      message: "Error converting draft to application",
      error: error.message
    });
  }
};

/**
 * Generate application preview
 */
const generateApplicationPreview = async (req, res) => {
  try {
    const { form_data } = req.body;

    if (!form_data) {
      return res.status(400).json({
        success: false,
        message: "Form data is required for preview"
      });
    }

    // Process and format the form data for preview
    const preview = {
      personal_information: {
        name: form_data.name_of_applicant || 'Not provided',
        date_of_birth: form_data.date_of_birth || 'Not provided',
        sex: form_data.sex || 'Not provided',
        home_address: form_data.home_address || 'Not provided',
        state_of_origin: form_data.state_of_origin || 'Not provided',
        lga: form_data.l_g_a || 'Not provided',
        special_health_needs: form_data.special_health_needs || 'None'
      },
      academic_information: {
        type_of_application: form_data.type_of_application || 'Not specified',
        class_applied: form_data.last_class || 'Not specified',
        last_school_attended: form_data.last_school_attended || 'Not provided',
        academic_year: form_data.academic_year || 'Not specified'
      },
      guardian_information: {
        name: form_data.guardian_name || 'Not provided',
        phone: form_data.guardian_phone_no || 'Not provided',
        email: form_data.guardian_email || 'Not provided',
        address: form_data.guardian_address || 'Not provided',
        relationship: form_data.guardian_relationship || 'Not provided'
      },
      parent_information: {
        name: form_data.parent_fullname || 'Not provided',
        phone: form_data.parent_phone_no || 'Not provided',
        email: form_data.parent_email || 'Not provided',
        address: form_data.parent_address || 'Not provided',
        occupation: form_data.parent_occupation || 'Not provided'
      },
      examination_scores: {
        mathematics: form_data.mathematics || 'Not taken',
        english: form_data.english || 'Not taken',
        other_score: form_data.other_score || 'Not taken'
      },
      additional_info: {
        others: form_data.others || 'None provided'
      }
    };

    // Calculate completion percentage
    const totalFields = 20; // Approximate number of important fields
    let completedFields = 0;

    Object.values(preview).forEach(section => {
      Object.values(section).forEach(value => {
        if (value && value !== 'Not provided' && value !== 'Not specified' && value !== 'None' && value !== 'Not taken' && value !== 'None provided') {
          completedFields++;
        }
      });
    });

    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    res.json({
      success: true,
      data: {
        preview,
        completion_stats: {
          completed_fields: completedFields,
          total_fields: totalFields,
          completion_percentage: completionPercentage
        },
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error generating application preview:", error);
    res.status(500).json({
      success: false,
      message: "Error generating application preview",
      error: error.message
    });
  }
};

module.exports = {
  saveApplicationDraft,
  getUserDrafts,
  getDraftDetails,
  deleteDraft,
  convertDraftToApplication,
  generateApplicationPreview
};
