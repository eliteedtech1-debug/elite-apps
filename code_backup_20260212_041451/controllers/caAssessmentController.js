const db = require("../models"); // Adjust path as needed

// --- CA Setup Management ---

const getAllCASetups = async (req, res) => {
  const { branch_id } = req.query
  try {
    const results = await db.sequelize.query(`CALL GetAllCASetups(:branch_id)`, {
      replacements: {
        branch_id: branch_id ?? req.user.branch_id,
        branch_id
      }
    });
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getAllCASetups:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching CA setups.",
      error: error.message, // Provide more detail in development
    });
  }
};

const getSectionCASetup = async (req, res) => {
  const { branch_id, section, academic_year, term } = req.query
  try {
    const sectionSpecific = await db.sequelize.query(
      `SELECT DISTINCT cs.*, aw.begin_date AS week_begin_date, aw.end_date AS week_end_date
       FROM ca_setup cs
       LEFT JOIN academic_weeks aw ON cs.week_number = aw.week_number 
         AND cs.school_id = aw.school_id 
         AND cs.branch_id = aw.branch_id
         AND aw.academic_year = :academic_year
         AND aw.term = :term
       WHERE cs.branch_id = :branch_id AND cs.section = :section AND cs.status = 'Active'
       ORDER BY cs.ca_type, cs.week_number`,
      {
        replacements: { 
          branch_id: branch_id ?? req.user.branch_id, 
          section,
          academic_year,
          term
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const results = sectionSpecific.length > 0 ? sectionSpecific : await db.sequelize.query(
      `SELECT DISTINCT cs.*, aw.begin_date AS week_begin_date, aw.end_date AS week_end_date
       FROM ca_setup cs
       LEFT JOIN academic_weeks aw ON cs.week_number = aw.week_number 
         AND cs.school_id = aw.school_id 
         AND cs.branch_id = aw.branch_id
         AND aw.academic_year = :academic_year
         AND aw.term = :term
       WHERE cs.branch_id = :branch_id AND cs.section = 'All' AND cs.status = 'Active'
       ORDER BY cs.ca_type, cs.week_number`,
      { 
        replacements: { 
          branch_id: branch_id ?? req.user.branch_id,
          academic_year,
          term
        }, 
        type: db.sequelize.QueryTypes.SELECT 
      }
    );

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error in getSectionCASetup:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching CA setups.",
      error: error.message,
    });
  }
};;
const getCASetup = async (req, res) => {
  const { caType, academic_year = null, academicYear = null, term = null, section = null, status = null, query_type = null } = req.query;
  const school_id = req.user?.school_id || req.headers['x-school-id'];
  const branch_id = req.user?.branch_id || req.headers['x-branch-id'];

  try {
    let query, replacements;
    
    if (query_type === 'select-all') {
      // Group by ca_type and section for Monthly CA - return one row per CA type with aggregated data
      query = `
        SELECT 
          MIN(cs.id) as id,
          cs.ca_type,
          cs.section,
          cs.school_id,
          cs.branch_id,
          cs.status,
          MAX(cs.is_active) as is_active,
          MAX(cs.is_locked) as is_locked,
          COALESCE(MAX(cs.intended_contribution_percent), SUM(cs.overall_contribution_percent)) as overall_contribution_percent,
          MAX(cs.intended_contribution_percent) as intended_contribution_percent,
          SUM(cs.max_score) as total_max_score,
          COUNT(*) as week_count,
          GROUP_CONCAT(cs.week_number ORDER BY cs.week_number) as weeks,
          MIN(cs.created_at) as created_at,
          MAX(cs.updated_at) as updated_at
        FROM ca_setup cs 
        WHERE cs.school_id = :school_id AND cs.branch_id = :branch_id AND cs.status = 'Active'
        GROUP BY cs.ca_type, cs.section, cs.school_id, cs.branch_id, cs.status
        ORDER BY cs.section, cs.ca_type`;
      replacements = { school_id, branch_id };
      
      const results = await db.sequelize.query(query, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });

      return res.json({
        success: true,
        data: results,
      });
    } else {
      query = `
        SELECT cs.*, ac.academic_year, ac.term 
        FROM ca_setup cs
        LEFT JOIN academic_calendar ac ON cs.school_id = ac.school_id AND cs.branch_id = ac.branch_id
        WHERE cs.school_id = :school_id AND cs.branch_id = :branch_id
      `;
      replacements = { school_id, branch_id };
      
      if (caType) {
        query += ' AND cs.ca_type = :ca_type';
        replacements.ca_type = caType;
      }
      if (section) {
        query += ' AND cs.section = :section';
        replacements.section = section;
      }
      if (status !== null) {
        query += ' AND cs.status = :status';
        replacements.status = status;
      }
    }

    query += ' ORDER BY cs.section, cs.ca_type, cs.week_number';

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getCASetup:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching CA setup.",
      error: error.message,
    });
  }
};

const listCASetups = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, academicYear, term, caType, section, status } = req.query;
    
    let query = `
      SELECT cs.*, ac.academic_year, ac.term, ac.begin_date, ac.end_date
      FROM ca_setup cs
      LEFT JOIN academic_calendar ac ON cs.school_id = ac.school_id AND cs.branch_id = ac.branch_id
      WHERE cs.school_id = :school_id 
      AND cs.branch_id = :branch_id
    `;
    
    const replacements = { 
      school_id: school_id || req.user.school_id, 
      branch_id: branch_id || req.user.branch_id 
    };

    if (academic_year || academicYear) {
      query += ` AND ac.academic_year = :academic_year`;
      replacements.academic_year = academic_year || academicYear;
    }

    if (term) {
      query += ` AND ac.term = :term`;
      replacements.term = term;
    }

    if (caType) {
      query += ` AND cs.ca_type = :caType`;
      replacements.caType = caType;
    }

    if (section && section !== 'All') {
      query += ` AND cs.section = :section`;
      replacements.section = section;
    }

    if (status !== null && status !== undefined) {
      query += ` AND cs.status = :status`;
      replacements.status = status;
    }

    query += ` ORDER BY cs.week_number ASC`;

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getCASetup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch CA setups",
      error: error.message,
    });
  }
};

const createUpdateCASetup = async (req, res) => {
  const {
    ca_type,
    academic_year,
    term,
    overall_contribution_percent,
    week_number,
    max_score,
    branch_id,
    section = null,
    intended_contribution_percent
  } = req.body;

  console.log('=== CA Setup Creation Request ===');
  console.log('Request body:', req.body);
  console.log('User info:', { school_id: req.user.school_id, branch_id: req.user.branch_id });

  try {
    const params = {
      p_ca_type: ca_type,
      p_overall_contribution: parseFloat(overall_contribution_percent),
      p_week_no: parseInt(week_number),
      p_max_score: parseFloat(max_score),
      p_section: section || null,
      p_school_id: req.user.school_id,
      p_branch_id: branch_id || req.user.branch_id,
      p_intended_contribution: parseFloat(intended_contribution_percent || overall_contribution_percent)
    };

    console.log('Stored procedure parameters:', params);

    await db.sequelize.query(
      `CALL CreateUpdateCASetup(:p_ca_type, :p_overall_contribution, :p_week_no, :p_max_score, :p_section, :p_school_id, :p_branch_id, :p_intended_contribution)`,
      {
        replacements: params,
      }
    );
    
    console.log('CA setup created successfully');
    res.json({
      success: true,
      message: "CA setup saved successfully",
    });
  } catch (error) {
    console.error("Error in createUpdateCASetup:", error);
    console.error("Error details:", {
      message: error.message,
      sql: error.sql,
      parameters: error.parameters
    });
    res.status(500).json({
      success: false,
      message: "An error occurred while saving CA setup.",
      error: error.message,
    });
  }
};

const updateCASetupStatus = async (req, res) => {
  const { id, query_type } = req.body;
  
  console.log('=== CA Setup Status Update Request ===');
  console.log('Request body:', req.body);
  console.log('User:', req.user);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'CA Setup ID is required'
    });
  }

  if (!['Activate', 'Deactivate', 'Delete'].includes(query_type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query_type. Use "Activate", "Deactivate", or "Delete".'
    });
  }

  try {
    const statusValue = query_type === 'Activate' ? 'Active' : 'Inactive';
    
    if (query_type === 'Delete') {
      await db.sequelize.query(
        'DELETE FROM ca_setup WHERE id = :id',
        {
          replacements: { id },
          type: db.sequelize.QueryTypes.DELETE
        }
      );
    } else {
      await db.sequelize.query(
        'UPDATE ca_setup SET status = :status, updated_at = NOW() WHERE id = :id',
        {
          replacements: { id, status: statusValue },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
    }

    console.log(`CA Setup ${id} ${query_type}d successfully`);
    
    res.json({
      success: true,
      message: `CA setup ${query_type.toLowerCase()}d successfully`
    });
  } catch (error) {
    console.error('Error updating CA setup status:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating CA setup status',
      error: error.message
    });
  }
};

const lockUnlockCASetup = async (req, res) => {
  const { id } = req.params;
  const { is_locked } = req.body;
  
  console.log('=== CA Setup Lock/Unlock Request ===');
  console.log('ID:', id);
  console.log('is_locked:', is_locked);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'CA Setup ID is required'
    });
  }

  try {
    await db.sequelize.query(
      'UPDATE ca_setup SET is_locked = :is_locked, updated_at = NOW() WHERE id = :id',
      {
        replacements: { id, is_locked: is_locked ? 1 : 0 },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    console.log(`CA Setup ${id} ${is_locked ? 'locked' : 'unlocked'} successfully`);
    
    res.json({
      success: true,
      message: `CA setup ${is_locked ? 'locked' : 'unlocked'} successfully`
    });
  } catch (error) {
    console.error('Error locking/unlocking CA setup:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating lock status',
      error: error.message
    });
  }
};

const deleteCASetup = async (req, res) => {
  const { id, query_type, branch_id, ca_type, section, status } = req.body;
  const school_id = req.user?.school_id || req.headers['x-school-id'];
  const req_branch_id = branch_id || req.user?.branch_id || req.headers['x-branch-id'];

  try {
    if (query_type === 'Delete' && ca_type) {
      // Delete all records for ca_type and section (for grouped Monthly CA)
      await db.sequelize.query(
        `DELETE FROM ca_setup 
         WHERE ca_type = :ca_type 
         AND section = :section 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
        { 
          replacements: { ca_type, section: section || 'All', school_id, branch_id: req_branch_id },
          type: db.sequelize.QueryTypes.DELETE
        }
      );
      return res.json({
        success: true,
        message: "CA setup deleted successfully",
      });
    }

    // Require ID for single record operations
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required for CA setup updates'
      });
    }

    if (query_type === 'Activate') {
      await db.sequelize.query(
        `UPDATE ca_setup SET status = 'Active', updated_at = NOW() WHERE id = :id`,
        { replacements: { id: parseInt(id) } }
      );
      res.json({ success: true, message: "CA setup activated successfully" });
    } else if (query_type === 'Deactivate') {
      await db.sequelize.query(
        `UPDATE ca_setup SET status = 'Inactive', updated_at = NOW() WHERE id = :id`,
        { replacements: { id: parseInt(id) } }
      );
      res.json({ success: true, message: "CA setup deactivated successfully" });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid query_type. Use "Activate", "Deactivate" or "Delete"'
      });
    }
  } catch (error) {
    console.error("Error in CA setup operation:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating CA setup.",
      error: error.message,
    });
  }
};

// --- Grade Boundaries ---

const getGradeBoundaries = async (req, res) => {
  const { branch_id, query_type = 'select' } = req.query;
  try {
    const results = await db.sequelize.query(
      `CALL GetGradeBoundaries(:query_type, :branch_id)`,
      {
        replacements: { query_type, branch_id },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getGradeBoundaries:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching grade boundaries.",
      error: error.message,
    });
  }
};

const createUpdateGradeBoundaries = async (req, res) => {
  const {
    branch_id,
    grades, // Expecting a JSON string or array
  } = req.body;

  try {
    // Ensure grades is a JSON string before passing
    const gradesJson =
      typeof grades === "string" ? grades : JSON.stringify(grades);

    await db.sequelize.query(
      `CALL CreateUpdateGradeBoundariesJSON(:grades, :school_id, :branch_id)`,
      {
        replacements: {
          grades: gradesJson,
          school_id: req.user.school_id,
          branch_id: branch_id ?? req.user.branch_id,
        },
      }
    );
    res.json({
      success: true,
      message: "Grade boundaries saved successfully",
    });
  } catch (error) {
    console.error("Error in createUpdateGradeBoundaries:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving grade boundaries.",
      error: error.message,
    });
  }
};
const deleteGradeBoundaries = async (req, res) => {
  const { id } = req.query;
  try {
    await db.sequelize.query(
      `CALL DeleteCAAndGradeBoundaries(:query_type,:id)`,
      {
        replacements: {
          query_type: "grade",
          id,
          school_id: req.user.school_id,
        },
      }
    );
    res.json({
      success: true,
      message: "Grade boundaries deactivated successfully",
    });
  } catch (error) {
    console.error("Error in deleting grade boundaries:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting grade boundaries.",
      error: error.message,
    });
  }
};
// --- Academic Data ---

const getClasses = async (req, res) => {
  const { branch_id } = req.query
  try {
    const results = await db.sequelize.query(`CALL GetClasses(:branch_id)`, {
      replacements: {
        branch_id: branch_id ?? req.user.branch_id
      }
    })
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getClasses:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching classes.",
      error: error.message,
    });
  }
};

const getSubjectsByClass = async (req, res) => {
  const { classCode, class_code } = req.query;
  try {
    const [results] = await db.sequelize.query(
      `CALL GetSubjectsByClass(:classCode)`,
      {
        replacements: { classCode: classCode ?? class_code },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getSubjectsByClass:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching subjects.",
      error: error.message,
    });
  }
};
const getStudentsByClassSubject = async (req, res) => {
  const { classCode, subjectCode } = req.query;

  if (!classCode) {
    return res.status(400).json({
      success: false,
      message: "classCode is required",
    });
  }

  try {
    let query;
    let replacements = { classCode };

    if (subjectCode && subjectCode !== "ALL_SUBJECTS") {
      // Fetch students for a specific subject
      query = `
        SELECT *
        FROM student_subjects_view
        WHERE class_code = :classCode
          AND subject_code = :subjectCode
          AND status IN ('Active', 'Suspended')
          AND (
              subject_type = 'core' 
              OR student_stream IN ('General', 'None', subject_type)
          )
        ORDER BY admission_no, student_name ASC
      `;
      replacements.subjectCode = subjectCode;
    } else {
      // Fetch all students for the class with all their assigned subjects
      // This will return multiple rows per student if they have multiple subjects
      query = `
        SELECT
          s.admission_no,
          s.student_name,
          s.current_class AS class_code,
          sub.subject_code,
          sub.subject AS subject_name,
          sub.type AS subject_type
        FROM students s
        INNER JOIN classes c ON s.current_class = c.class_code
        INNER JOIN subjects sub ON c.class_code = sub.class_code AND sub.status = 'Active'
        WHERE s.current_class = :classCode
          AND s.status IN ('Active', 'Suspended')
          AND (
              sub.type = 'core'
              OR s.stream = 'General'
              OR s.stream = 'None'
              OR s.stream = sub.type
          )
        ORDER BY s.admission_no, sub.subject_code ASC
      `;
    }

    // Fetch student data
    const students = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT,
    });

    return res.json({
      success: true,
      data: students,
      message: `Fetched ${students.length} student(s) for class ${classCode}${subjectCode && subjectCode !== "ALL_SUBJECTS" ? ` and subject ${subjectCode}` : ' and all subjects'}`,
    });
  } catch (err) {
    console.error("Error fetching students by class & subject:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching students",
      error: err.message,
    });
  }
};


// --- Weekly Progress Report / Dashboard ---

const getAcademicWeeks = async (req, res) => {
  const { caType, academicYear, term, startMonth, endMonth } = req.query;
  try {
    const [results] = await db.sequelize.query(
      `CALL GetAcademicWeeks(:caType, :academicYear, :term, :startMonth, :endMonth)`,
      {
        replacements: { caType, academicYear, term, startMonth, endMonth },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getAcademicWeeks:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching academic weeks.",
      error: error.message,
    });
  }
};

const getDashboardData = async (req, res) => {
  const {
    classCode,
    subjectCode,
    caType,
    academicYear,
    term,
    startMonth,
    endMonth,
  } = req.query;
  try {
    const [results] = await db.sequelize.query(
      `CALL GetDashboardData(:classCode, :subjectCode, :caType, :academicYear, :term, :startMonth, :endMonth, :school_id)`,
      {
        replacements: {
          classCode,
          subjectCode,
          caType,
          academicYear,
          term,
          startMonth,
          endMonth,
          school_id: req.user.school_id,
        },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching dashboard data.",
      error: error.message,
    });
  }
};

const getWeekAccessControl = async (req, res) => {
  const { classCode, subjectCode, caType, academicYear, term } = req.query;
  try {
    const [results] = await db.sequelize.query(
      `CALL GetWeekAccessControl(:classCode, :subjectCode, :caType, :academicYear, :term)`,
      {
        replacements: { classCode, subjectCode, caType, academicYear, term },
      }
    );
    res.json({
      success: true,
      data: results[0] || null, // Assuming single row result
    });
  } catch (error) {
    console.error("Error in getWeekAccessControl:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching week access control.",
      error: error.message,
    });
  }
};

const updateWeekAccessControl = async (req, res) => {
  const {
    classCode,
    subjectCode,
    caType,
    currentWeek,
    unlockedWeeks, // Expecting a JSON string or array
    finalResults,
    academicYear,
    term,
  } = req.body;

  try {
    // Ensure unlockedWeeks is a JSON string before passing
    const unlockedWeeksJson =
      typeof unlockedWeeks === "string"
        ? unlockedWeeks
        : JSON.stringify(unlockedWeeks);

    await db.sequelize.query(
      `CALL UpdateWeekAccessControl(:classCode, :subjectCode, :caType, :currentWeek, :unlockedWeeks, :finalResults, :academicYear, :term)`,
      {
        replacements: {
          classCode,
          subjectCode,
          caType,
          currentWeek,
          unlockedWeeks: unlockedWeeksJson,
          finalResults,
          academicYear,
          term,
        },
      }
    );
    res.json({
      success: true,
      message: "Week access control updated successfully",
    });
  } catch (error) {
    console.error("Error in updateWeekAccessControl:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating week access control.",
      error: error.message,
    });
  }
};

// --- Score Management ---

const insertUpdateScore = async (req, res) => {
  const {
    admissionNo,
    subjectCode,
    classCode,
    caSetupId,
    score,
    caType,
    weekNumber,
    academicYear,
    term,
    branch_id
  } = req.body;

  try {
    await db.sequelize.query(
      `CALL InsertUpdateScore(:admissionNo, :subjectCode, :classCode, :caSetupId, :score, :caType, :weekNumber, :academicYear, :term, :branch_id)`,
      {
        replacements: {
          admissionNo,
          subjectCode,
          classCode,
          caSetupId,
          score,
          caType,
          weekNumber,
          academicYear,
          term,
          branch_id
        },
      }
    );
    res.json({
      success: true,
      message: "Score saved successfully",
    });
  } catch (error) {
    console.error("Error in insertUpdateScore:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving the score.",
      error: error.message,
    });
  }
};

const handleGetScoreRequest = async (req, res) => {
  const {
    query_type,
    admissionNo,
    subjectCode,
    classCode,
    caType,
    weekNumber,
    academicYear,
    term,
  } = req.body;

  try {
    if (
      !query_type ||
      (query_type !== "SELECT" && query_type !== "SELECT-ALL")
    ) {
      console.error("❌ Invalid query_type in caAssessmentController:", {
        query_type,
        supported_types: ["SELECT", "SELECT-ALL"],
        timestamp: new Date().toISOString(),
        user_id: req.user?.user_id,
        school_id: req.user?.school_id,
      });

      return res.status(400).json({
        success: false,
        message:
          "Invalid request. Please check your request parameters and try again.",
        error_code: "INVALID_REQUEST",
      });
    }

    const results = await db.sequelize.query(
      `CALL GetStudentScores(:query_type, :admissionNo, :subjectCode, :classCode, :caType, :academicYear, :term, :weekNumber)`,
      {
        replacements: {
          query_type,
          admissionNo,
          subjectCode,
          classCode,
          caType,
          academicYear,
          term,
          weekNumber,
        },
      }
    );

    // Fetch CA configuration for the class
    // First, get the section for the class
    const [classInfo] = await db.sequelize.query(
      `SELECT section FROM classes WHERE class_code = :classCode LIMIT 1`,
      {
        replacements: { classCode },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const section = classInfo?.section || 'All';

    // Check if section-specific config exists first
    let caConfiguration = await db.sequelize.query(
      `SELECT 
        ca_type as assessment_type,
        overall_contribution_percent as contribution_percent,
        status,
        is_locked,
        week_number,
        id as ca_setup_id,
        max_score
       FROM ca_setup
       WHERE school_id = :school_id
       AND branch_id = :branch_id
       AND section = :section
       AND status = 'Active'
       ORDER BY ca_type, week_number`,
      {
        replacements: {
          school_id: req.user.school_id,
          branch_id: req.user.branch_id,
          section: section
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // If no section-specific config found, fallback to 'All'
    if (caConfiguration.length === 0) {
      caConfiguration = await db.sequelize.query(
        `SELECT 
          ca_type as assessment_type,
          overall_contribution_percent as contribution_percent,
          status,
          is_locked,
          week_number,
          id as ca_setup_id,
          max_score
         FROM ca_setup
         WHERE school_id = :school_id
         AND branch_id = :branch_id
         AND section = 'All'
         AND status = 'Active'
         ORDER BY ca_type, week_number`,
        {
          replacements: {
            school_id: req.user.school_id,
            branch_id: req.user.branch_id
          },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
    }

    // Deduplicate by ca_setup_id to prevent duplicate CA types
    const uniqueConfiguration = [];
    const seenIds = new Set();
    caConfiguration.forEach((item) => {
      if (!seenIds.has(item.ca_setup_id)) {
        seenIds.add(item.ca_setup_id);
        uniqueConfiguration.push(item);
      }
    });
    caConfiguration = uniqueConfiguration;

    return res.json({ 
      success: true, 
      data: results,
      caConfiguration: caConfiguration,
      section: section
    });
  } catch (error) {
    console.error("Error in handleScoreRequest:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during score retrieval.",
      error: error.message,
    });
  }
};

// const getClassCAReports = async (req, res) => {
//   const {
//     query_type = null,
//     class_code = null,
//     ca_type = null,
//     academic_year = null,
//     term = null,
//     admission_no = null,
//   } = req.body;

//   try {
//     if (query_type === 'View Class CA Report') {
//       // Direct SQL query with proper positioning using window functions
//       const query = `
//         -- Calculate rankings based on total scores per student for the subject
//         SELECT 
//           all_scores.admission_no,
//           all_scores.subject_code,
//           all_scores.ca_setup_id,
//           all_scores.score,
//           all_scores.max_score,
//           all_scores.week_number,
//           all_scores.assessment_type,
//           all_scores.student_name,
//           all_scores.class_name,
//           all_scores.school_id,
//           all_scores.current_class,
//           all_scores.subject,
//           all_scores.academic_year,
//           all_scores.term,
//           all_scores.overall_contribution_percent,
//           class_counts.total_students_in_class,
//           all_scores.avg_per_subject,
//           -- Calculate position based on total scores per student in the subject
//           subject_rankings.sbj_position
//         FROM (
//           SELECT 
//             ws.admission_no,
//             ws.subject_code,
//             ws.ca_setup_id,
//             ws.score,
//             ws.max_score,
//             ws.week_number,
//             ws.assessment_type,
//             s.student_name,
//             c.class_name,
//             s.school_id,
//             c.class_code AS current_class,
//             sub.subject AS subject,
//             COALESCE(aw.academic_year, :academic_year) AS academic_year,
//             COALESCE(aw.term, :term) AS term,
//             cs.overall_contribution_percent,
//             -- Calculate average score for this subject and CA type
//             AVG(ws.score) OVER (
//               PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
//             ) AS avg_per_subject
//           FROM weekly_scores ws
//           INNER JOIN students s ON ws.admission_no = s.admission_no
//           INNER JOIN classes c ON s.current_class = c.class_code
//           INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
//           INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
//           LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number 
//             AND aw.school_id = :school_id
//           WHERE ws.assessment_type = :ca_type
//             AND s.current_class = :class_code
//             AND s.school_id = :school_id
//         ) AS all_scores
//         JOIN (
//           -- Calculate total scores per student per subject and assign rankings
//           SELECT
//             ws.admission_no,
//             ws.subject_code,
//             ws.assessment_type,
//             ROW_NUMBER() OVER (
//               PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
//               ORDER BY SUM(ws.score) DESC, s.student_name ASC
//             ) AS sbj_position
//           FROM weekly_scores ws
//           INNER JOIN students s ON ws.admission_no = s.admission_no
//           INNER JOIN classes c ON s.current_class = c.class_code
//           WHERE ws.assessment_type = :ca_type
//             AND s.current_class = :class_code
//             AND s.school_id = :school_id
//           GROUP BY ws.admission_no, ws.subject_code, ws.assessment_type, s.current_class, s.student_name
//         ) AS subject_rankings ON all_scores.admission_no = subject_rankings.admission_no
//           AND all_scores.subject_code = subject_rankings.subject_code
//           AND all_scores.assessment_type = subject_rankings.assessment_type
//         JOIN (
//           -- Subquery to calculate total number of students in the class
//           SELECT 
//             s.current_class,
//             COUNT(DISTINCT s.admission_no) AS total_students_in_class
//           FROM students s
//           WHERE s.current_class = :class_code
//             AND s.school_id = :school_id
//           GROUP BY s.current_class
//         ) AS class_counts ON all_scores.current_class = class_counts.current_class
//         ORDER BY all_scores.subject_code, all_scores.score DESC, all_scores.student_name
//       `;

//       const results = await db.sequelize.query(query, {
//         replacements: {
//           academic_year,
//           ca_type,
//           class_code,
//           school_id: req.user.school_id,
//           term,
//         },
//         type: db.sequelize.QueryTypes.SELECT
//       });

//       return res.json({ success: true, data: results });

//     } else if (query_type === "View Student CA Report") {
//       // Similar query for individual student report
//       const query = `
//         -- Calculate rankings based on total scores per student for the subject
//         SELECT 
//           all_scores.admission_no,
//           all_scores.subject_code,
//           all_scores.ca_setup_id,
//           all_scores.score,
//           all_scores.max_score,
//           all_scores.week_number,
//           all_scores.assessment_type,
//           all_scores.student_name,
//           all_scores.class_name,
//           all_scores.school_id,
//           all_scores.current_class,
//           all_scores.subject,
//           all_scores.academic_year,
//           all_scores.term,
//           all_scores.overall_contribution_percent,
//           class_counts.total_students_in_class,
//           all_scores.avg_per_subject,
//           -- Calculate position based on total scores per student in the subject
//           subject_rankings.sbj_position
//         FROM (
//           SELECT 
//             ws.admission_no,
//             ws.subject_code,
//             ws.ca_setup_id,
//             ws.score,
//             ws.max_score,
//             ws.week_number,
//             ws.assessment_type,
//             s.student_name,
//             c.class_name,
//             s.school_id,
//             c.class_code AS current_class,
//             sub.subject AS subject,
//             COALESCE(aw.academic_year, :academic_year) AS academic_year,
//             COALESCE(aw.term, :term) AS term,
//             cs.overall_contribution_percent,
//             -- Calculate average score for this subject and CA type
//             AVG(ws.score) OVER (
//               PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
//             ) AS avg_per_subject
//           FROM weekly_scores ws
//           INNER JOIN students s ON ws.admission_no = s.admission_no
//           INNER JOIN classes c ON s.current_class = c.class_code
//           INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
//           INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
//           LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number 
//             AND aw.school_id = :school_id
//           WHERE ws.assessment_type = :ca_type
//             AND ws.admission_no = :admission_no
//             AND s.school_id = :school_id
//         ) AS all_scores
//         JOIN (
//           -- Calculate total scores per student per subject and assign rankings
//           SELECT
//             ws.admission_no,
//             ws.subject_code,
//             ws.assessment_type,
//             ROW_NUMBER() OVER (
//               PARTITION BY c.class_code, ws.subject_code, ws.assessment_type
//               ORDER BY SUM(ws.score) DESC, s.student_name ASC
//             ) AS sbj_position
//           FROM weekly_scores ws
//           INNER JOIN students s ON ws.admission_no = s.admission_no
//           INNER JOIN classes c ON s.current_class = c.class_code
//           WHERE ws.assessment_type = :ca_type
//             AND c.class_code = (
//               SELECT current_class FROM students WHERE admission_no = :admission_no
//             )
//             AND s.school_id = :school_id
//           GROUP BY ws.admission_no, ws.subject_code, ws.assessment_type, c.class_code, s.student_name
//         ) AS subject_rankings ON all_scores.admission_no = subject_rankings.admission_no
//           AND all_scores.subject_code = subject_rankings.subject_code
//           AND all_scores.assessment_type = subject_rankings.assessment_type
//         JOIN (
//           -- Subquery to calculate total number of students in the class
//           SELECT 
//             s.current_class,
//             COUNT(DISTINCT s.admission_no) AS total_students_in_class
//           FROM students s
//           INNER JOIN (
//             SELECT DISTINCT current_class 
//             FROM students 
//             WHERE admission_no = :admission_no
//           ) AS student_class ON s.current_class = student_class.current_class
//           WHERE s.school_id = :school_id
//           GROUP BY s.current_class
//         ) AS class_counts ON all_scores.current_class = class_counts.current_class
//         ORDER BY all_scores.subject_code, all_scores.score DESC
//       `;

//       const results = await db.sequelize.query(query, {
//         replacements: {
//           academic_year,
//           ca_type,
//           admission_no,
//           school_id: req.user.school_id,
//           term,
//         },
//         type: db.sequelize.QueryTypes.SELECT
//       });

//       return res.json({ success: true, data: results });

//     } else if (query_type === "student admission_no") {
//       // Get distinct student admission numbers and names
//       const query = `
//         SELECT DISTINCT 
//           s.admission_no,
//           s.student_name 
//         FROM students s
//         WHERE s.school_id = :school_id
//           AND s.status = 'Active'
//         ORDER BY s.student_name
//       `;

//       const results = await db.sequelize.query(query, {
//         replacements: {
//           school_id: req.user.school_id,
//         },
//         type: db.sequelize.QueryTypes.SELECT
//       });

//       return res.json({ success: true, data: results });

//     } else {
//       // Fallback to original stored procedure for other query types
//       const results = await db.sequelize.query(
//         `CALL GetClassCAReports(:query_type, :class_code, :ca_type, :academic_year, :term, :admission_no, :branch_id, :school_id)`,
//         {
//           replacements: {
//             query_type,
//             class_code,
//             ca_type,
//             academic_year,
//             term,
//             admission_no,
//             branch_id: req.user.branch_id,
//             school_id: req.user.school_id,
//           },
//         }
//       );

//       return res.json({ success: true, data: results });
//     }

//   } catch (error) {
//     console.error("Error in getClassCAReports:", error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred during class CA report retrieval.",
//       error: error.message,
//     });
//   }
// };
// const bulkInsertUpdateScores = async (req, res) => {
//   const { scores } = req.body; // Expecting an array of score objects

//   if (!Array.isArray(scores) || scores.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid or empty scores array provided."
//     });
//   }

//   const transaction = await db.sequelize.transaction();
//   try {
//     for (const scoreData of scores) {
//       await transaction.query(
//         `CALL InsertUpdateScore(:admissionNo, :subjectCode, :classCode, :academicWeekId, :score, :caType, :weekNumber, :academicYear, :term)`,
//         {
//           replacements: {
//             admissionNo: scoreData.admissionNo,
//             subjectCode: scoreData.subjectCode,
//             classCode: scoreData.classCode,
//             academicWeekId: scoreData.academicWeekId,
//             score: scoreData.score,
//             caType: scoreData.caType,
//             weekNumber: scoreData.weekNumber,
//             academicYear: scoreData.academicYear,
//             term: scoreData.term
//           },
//           transaction // Use the transaction
//         }
//       );
//     }
//     await transaction.commit();
//     res.json({
//       success: true,
//       message: 'Bulk scores saved successfully'
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error('Error in bulkInsertUpdateScores:', error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while saving bulk scores.",
//       error: error.message
//     });
//   }
// };

// --- Statistics and Reporting ---

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Saves a bulk of scores to the database. Each score object in the array
 * should contain the following properties:
 * - admissionNo: The admission number of the student whose score is being saved
 * - subjectCode: The subject code associated with the score
 * - classCode: The class code associated with the score
 * - score: The score value
 * - caSetupId: The CA setup ID associated with the score
 * - caType: The type of CA associated with the score
 * - weekNumber: The week number associated with the score
 * - academicYear: The academic year associated with the score
 * - term: The term associated with the score
 * - branch_id: The branch ID of the school associated with the scores
 * 
 * If the scores array is invalid or empty, returns a 400 response with an error message.
 * If an error occurs while saving the scores, rolls back the transaction and returns a 500 response with an error message.
 * If the scores are saved successfully, returns a 200 response with a success message.
 */
/*******  c6bec5d3-a7ae-4619-943e-0920dfae7dad  *******/

const getClassCAReports = async (req, res) => {
  const {
    query_type = null,
    class_code = null,
    ca_type = null,
    academic_year = null,
    term = null,
    admission_no = null,
  } = req.body;

  try {
    const school_id = req.user.school_id;

    /** ---------------------------------------------------------
     *  Helper: Fetch CA Configuration
     * ----------------------------------------------------------
     */
    const fetchCAConfiguration = async () => {
      const classSection = await db.sequelize.query(
        `SELECT section FROM classes WHERE class_code = :class_code AND school_id = :school_id`,
        { replacements: { class_code, school_id }, type: db.sequelize.QueryTypes.SELECT }
      );
      const section = classSection[0]?.section;

      const sectionSpecific = await db.sequelize.query(
        `SELECT ca_type AS assessment_type, 
          COALESCE(SUM(DISTINCT intended_contribution_percent), MAX(overall_contribution_percent)) AS contribution_percent,
          MIN(week_number) AS week_number, 
          MIN(id) AS ca_setup_id, SUM(max_score) AS max_score
        FROM ca_setup WHERE school_id = :school_id AND section = :section AND status = 'Active'
        GROUP BY ca_type
        ORDER BY CASE ca_type WHEN 'CA1' THEN 1 WHEN 'CA2' THEN 2 WHEN 'CA3' THEN 3 WHEN 'CA4' THEN 4 WHEN 'EXAM' THEN 5 ELSE 6 END`,
        { replacements: { school_id, section }, type: db.sequelize.QueryTypes.SELECT }
      );

      return sectionSpecific.length > 0 ? sectionSpecific : db.sequelize.query(
        `SELECT ca_type AS assessment_type,
          COALESCE(SUM(DISTINCT intended_contribution_percent), MAX(overall_contribution_percent)) AS contribution_percent,
          MIN(week_number) AS week_number,
          MIN(id) AS ca_setup_id, SUM(max_score) AS max_score
        FROM ca_setup WHERE school_id = :school_id AND section = 'All' AND status = 'Active'
        GROUP BY ca_type
        ORDER BY CASE ca_type WHEN 'CA1' THEN 1 WHEN 'CA2' THEN 2 WHEN 'CA3' THEN 3 WHEN 'CA4' THEN 4 WHEN 'EXAM' THEN 5 ELSE 6 END`,
        { replacements: { school_id }, type: db.sequelize.QueryTypes.SELECT }
      );
    };

    /** ---------------------------------------------------------
     *  CASE 1: View Class CA Report
     * ----------------------------------------------------------
     */
if (query_type === "View Class CA Report") {
  const branch_id = req.headers['x-branch-id'] || req.user?.branch_id;
  console.log('CA Report Debug:', { class_code, ca_type, academic_year, term, school_id, branch_id });
  
  const results = await db.sequelize.query(
    `SELECT
      s.admission_no,
      s.student_name,
      s.stream AS student_stream,
      s.profile_picture,
      c.class_code,
      c.class_name,
      sub.subject_code,
      sub.subject,
      sub.type AS subject_type,
      NULL AS ca1_score,
      NULL AS ca1_contribution,
      NULL AS ca2_score,
      NULL AS ca2_contribution,
      NULL AS ca3_score,
      NULL AS ca3_contribution,
      NULL AS ca4_score,
      NULL AS ca4_contribution,
      NULL AS exam_score,
      NULL AS exam_contribution,
      NULL AS total_score,
      '0.00' AS total_max_score,
      NULL AS percentage,
      NULL AS subject_position,
      NULL AS student_position,
      1 AS total_students,
      NULL AS grade,
      NULL AS remark,
      :academic_year AS academic_year,
      :term AS term
    FROM students s
    INNER JOIN classes c ON s.current_class = c.class_code
    INNER JOIN subjects sub ON sub.class_code = c.class_code AND sub.status = 'Active'
    WHERE c.class_code = :class_code
      AND s.school_id = :school_id
      AND s.branch_id = :branch_id
      AND c.school_id = :school_id
      AND s.status = 'Active'
    ORDER BY s.student_name, sub.subject`,
    {
      replacements: { class_code, ca_type, academic_year, term, school_id, branch_id },
      type: db.sequelize.QueryTypes.SELECT
    }
  );

  const caConfiguration = await fetchCAConfiguration();

  // Calculate actual CA scores from weekly_scores
  const scoresMap = new Map();
  
  if (results.length > 0) {
    const weeklyScores = await db.sequelize.query(
      `SELECT ws.admission_no, ws.subject_code, ws.assessment_type, 
        SUM(ws.score) as total_score, 
        SUM(cs.max_score) as total_max_score,
        AVG(cs.overall_contribution_percent) as contribution_percent
      FROM weekly_scores ws
      INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
      INNER JOIN students s ON ws.admission_no = s.admission_no
      WHERE s.current_class = :class_code AND s.school_id = :school_id
      GROUP BY ws.admission_no, ws.subject_code, ws.assessment_type`,
      {
        replacements: { class_code, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    weeklyScores.forEach(score => {
      const key = `${score.admission_no}|${score.subject_code}`;
      if (!scoresMap.has(key)) scoresMap.set(key, {});
      
      const percentage = score.total_max_score > 0 ? (score.total_score / score.total_max_score) * 100 : 0;
      const contributionScore = (percentage * score.contribution_percent) / 100;
      
      scoresMap.get(key)[`${score.assessment_type.toLowerCase()}_score`] = score.total_score;
      scoresMap.get(key)[`${score.assessment_type.toLowerCase()}_contribution`] = contributionScore;
    });
  }

  // Apply calculated scores to results
  const enhancedResults = results.map(row => {
    const key = `${row.admission_no}|${row.subject_code}`;
    const calculatedScores = scoresMap.get(key) || {};
    
    return {
      ...row,
      ca1_score: calculatedScores.ca1_score || row.ca1_score,
      ca1_contribution: calculatedScores.ca1_contribution || row.ca1_contribution,
      ca2_score: calculatedScores.ca2_score || row.ca2_score,
      ca2_contribution: calculatedScores.ca2_contribution || row.ca2_contribution,
      ca3_score: calculatedScores.ca3_score || row.ca3_score,
      ca3_contribution: calculatedScores.ca3_contribution || row.ca3_contribution,
      ca4_score: calculatedScores.ca4_score || row.ca4_score,
      ca4_contribution: calculatedScores.ca4_contribution || row.ca4_contribution,
      exam_score: calculatedScores.exam_score || row.exam_score,
      exam_contribution: calculatedScores.exam_contribution || row.exam_contribution,
    };
  });

  // Get section for the class
  const [classInfo] = await db.sequelize.query(
    `SELECT section FROM classes WHERE class_code = :class_code LIMIT 1`,
    { replacements: { class_code }, type: db.sequelize.QueryTypes.SELECT }
  );

  return res.json({
    success: true,
    data: enhancedResults,
    caConfiguration,
    studentRemarks: {},
    section: classInfo?.section || ''
  });
}

    /** ---------------------------------------------------------
     *  CASE 2: View Student CA Report
     * ----------------------------------------------------------
     */
    if (query_type === "View Student CA Report") {
      const studentQuery = `
        SELECT 
          all_scores.*,
          class_counts.total_students_in_class,
          subject_rankings.sbj_position
        FROM (
          SELECT 
            ws.admission_no,
            ws.subject_code,
            ws.ca_setup_id,
            ws.score,
            ws.max_score,
            ws.week_number,
            ws.assessment_type,
            s.student_name,
            c.class_name,
            s.school_id,                                 -- FIXED
            c.class_code AS current_class,
            sub.subject AS subject,
            COALESCE(aw.academic_year, :academic_year) AS academic_year,
            COALESCE(aw.term, :term) AS term,
            cs.overall_contribution_percent,
            AVG(ws.score) OVER (
              PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
            ) AS avg_per_subject
          FROM weekly_scores ws
          INNER JOIN students s ON ws.admission_no = s.admission_no
          INNER JOIN classes c ON s.current_class = c.class_code
          INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
          INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
          LEFT JOIN academic_weeks aw 
            ON ws.week_number = aw.week_number
           AND aw.school_id = s.school_id               -- FIXED
        WHERE ws.assessment_type = :ca_type
          AND ws.admission_no = :admission_no
          AND s.school_id = :school_id                  -- FIXED
          AND (
            sub.type = 'core'
            OR s.stream IN ('General', 'None')
            OR s.stream = sub.type
          )
        ) AS all_scores

        JOIN (
          SELECT
            ws.admission_no,
            ws.subject_code,
            ws.assessment_type,
            ROW_NUMBER() OVER (
              PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
              ORDER BY SUM(ws.score) DESC, s.student_name ASC
            ) AS sbj_position
          FROM weekly_scores ws
          INNER JOIN students s ON ws.admission_no = s.admission_no
          WHERE ws.assessment_type = :ca_type
            AND s.school_id = :school_id                -- FIXED
          GROUP BY ws.admission_no, ws.subject_code, ws.assessment_type, s.current_class, s.student_name
        ) AS subject_rankings
        ON all_scores.admission_no = subject_rankings.admission_no
        AND all_scores.subject_code = subject_rankings.subject_code
        AND all_scores.assessment_type = subject_rankings.assessment_type

        JOIN (
          SELECT 
            s.current_class,
            COUNT(DISTINCT s.admission_no) AS total_students_in_class
          FROM students s
          INNER JOIN (
            SELECT DISTINCT current_class 
            FROM students WHERE admission_no = :admission_no
          ) AS std_class
            ON s.current_class = std_class.current_class
          WHERE s.school_id = :school_id                -- FIXED
          GROUP BY s.current_class
        ) AS class_counts
        ON all_scores.current_class = class_counts.current_class

        ORDER BY all_scores.subject_code, all_scores.score DESC, all_scores.student_name
      `;

      const results = await db.sequelize.query(studentQuery, {
        replacements: { academic_year, term, ca_type, admission_no, school_id },
        type: db.sequelize.QueryTypes.SELECT,
      });

      return res.json({ success: true, data: results });
    }

    /** ---------------------------------------------------------
     *  DEFAULT FLEXIBLE QUERY (fixed)
     * ----------------------------------------------------------
     */

    let baseQuery = `
      SELECT
        ws.admission_no,
        ws.subject_code,
        ws.ca_setup_id,
        ws.score,
        ws.max_score,
        ws.week_number,
        ws.assessment_type,
        s.student_name,
        c.class_name,
        s.school_id,                   -- FIXED
        c.class_code AS current_class,
        sub.subject AS subject,
        COALESCE(aw.academic_year, :academic_year) AS academic_year,
        COALESCE(aw.term, :term) AS term,
        cs.overall_contribution_percent,
        s.status,
        COUNT(*) OVER (
          PARTITION BY ws.subject_code, ws.assessment_type
        ) AS total_students_in_class,
        AVG(ws.score) OVER (
          PARTITION BY ws.subject_code, ws.assessment_type
        ) AS avg_per_subject,
        ROW_NUMBER() OVER (
          PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
          ORDER BY ws.score DESC, s.student_name ASC
        ) AS sbj_position
      FROM weekly_scores ws
      INNER JOIN students s ON ws.admission_no = s.admission_no
      INNER JOIN classes c ON s.current_class = c.class_code
      INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
      INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
      LEFT JOIN academic_weeks aw
        ON ws.week_number = aw.week_number
       AND aw.academic_year = :academic_year
       AND aw.term = :term
       AND aw.school_id = s.school_id                 -- FIXED
      WHERE s.school_id = :school_id                  -- FIXED
        AND s.status = 'Active'
        AND (
          sub.type = 'core'
          OR s.stream IN ('General', 'None')
          OR s.stream = sub.type
        )
    `;

    const replacements = { academic_year, term, school_id };

    if (admission_no) {
      baseQuery += ` AND ws.admission_no = :admission_no `;
      replacements.admission_no = admission_no;
    }

    if (class_code) {
      baseQuery += ` AND c.class_code = :class_code `;
      replacements.class_code = class_code;
    }

    if (ca_type) {
      baseQuery += ` AND ws.assessment_type = :ca_type `;
      replacements.ca_type = ca_type;
    }

    baseQuery += `
      ORDER BY s.current_class, sub.subject_code, ws.assessment_type, ws.score DESC
    `;

    const defaultResults = await db.sequelize.query(baseQuery, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT,
    });

    const caConfiguration = await fetchCAConfiguration();

    return res.json({
      success: true,
      data: defaultResults,
      caConfiguration: caConfiguration || [],
    });

  } catch (error) {
    console.error("Error in getClassCAReports:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during class CA report retrieval.",
      error: error.message,
    });
  }
};



const bulkInsertUpdateScores = async (req, res) => {
  const { scores, branch_id } = req.body;

  if (!Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid or empty scores array provided.",
    });
  }

  const transaction = await db.sequelize.transaction();
  try {
    // Fetch current academic year and term from academic_calendar if missing
    let defaultAcademicYear = null;
    let defaultTerm = null;
    
    const branchId = branch_id || req.headers['x-branch-id'] || req.user?.branch_id;
    
    if (branchId) {
      const [calendarSettings] = await db.sequelize.query(
        `SELECT academic_year, term 
         FROM academic_calendar 
         WHERE branch_id = :branch_id 
         AND status = 'Active'
         LIMIT 1`,
        {
          replacements: { branch_id: branchId },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      
      if (calendarSettings) {
        defaultAcademicYear = calendarSettings.academic_year;
        defaultTerm = calendarSettings.term;
      }
    }

    for (const scoreData of scores) {
      console.log('Processing score:', { 
        admissionNo: scoreData.admissionNo,
        weekNumber: scoreData.weekNumber,
        caType: scoreData.caType,
        caSetupId: scoreData.caSetupId,
        score: scoreData.score,
        branch_id: branchId
      });
      
      // Debug: Check if CA setup exists
      const [caSetupCheck] = await db.sequelize.query(
        `SELECT id, week_number, ca_type, max_score, status 
         FROM ca_setup 
         WHERE week_number = :weekNumber 
         AND branch_id = :branch_id`,
        {
          replacements: { weekNumber: scoreData.weekNumber, branch_id: branchId },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      console.log('CA Setup found:', caSetupCheck);
      
      const escapedAdmissionNo = `'${scoreData.admissionNo.replace(/'/g, "''")}'`;
      
      // Use default values if academicYear or term is empty
      const academicYear = scoreData.academicYear && scoreData.academicYear.trim() !== '' 
        ? scoreData.academicYear 
        : defaultAcademicYear;
      const term = scoreData.term && scoreData.term.trim() !== '' 
        ? scoreData.term 
        : defaultTerm;

      await db.sequelize.query(
        `CALL InsertUpdateScore(${escapedAdmissionNo}, :subjectCode, :classCode, :score,  :caSetupId, :caType, :weekNumber, :academicYear, :term, :branch_id)`,
        {
          replacements: {
            subjectCode: scoreData.subjectCode,
            classCode: scoreData.classCode,
            caSetupId: scoreData.caSetupId,
            score: scoreData.score,
            caType: scoreData.caType,
            weekNumber: scoreData.weekNumber,
            academicYear: academicYear,
            term: term,
            branch_id: branchId
          },
          transaction,
        }
      );
    }

    await transaction.commit();
    res.json({
      success: true,
      message: "Bulk scores saved successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in bulkInsertUpdateScores:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving bulk scores.",
      error: error.message,
    });
  }
};

const deleteScore = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.sequelize.query(
      'DELETE FROM weekly_scores WHERE id = :id',
      {
        replacements: { id },
        type: db.Sequelize.QueryTypes.DELETE
      }
    );
    
    if (result[1] === 0) {
      return res.status(404).json({
        success: false,
        message: "Assessment record not found"
      });
    }
    
    res.json({
      success: true,
      message: "Assessment record deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting score:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the assessment record.",
      error: error.message
    });
  }
};

const getCAStatistics = async (req, res) => {
  const { classCode, subjectCode, caType, academicYear, term } = req.query;
  try {
    const [results] = await db.sequelize.query(
      `CALL GetCAStatistics(:classCode, :subjectCode, :caType, :academicYear, :term)`,
      {
        replacements: { classCode, subjectCode, caType, academicYear, term },
      }
    );
    res.json({
      success: true,
      data: results[0] || null, // Assuming single row result
    });
  } catch (error) {
    console.error("Error in getCAStatistics:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching CA statistics.",
      error: error.message,
    });
  }
};

const generateCAReport = async (req, res) => {
  const { classCode, subjectCode, caType, academicYear, term } = req.query;
  try {
    const [results] = await db.sequelize.query(
      `CALL GenerateCAReport(:classCode, :subjectCode, :caType, :academicYear, :term)`,
      {
        replacements: { classCode, subjectCode, caType, academicYear, term },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in generateCAReport:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating the CA report.",
      error: error.message,
    });
  }
};

// --- Administrative ---

const lockAllScores = async (req, res) => {
  const { classCode, subjectCode, caType } = req.body;
  try {
    await db.sequelize.query(
      `CALL LockAllScores(:classCode, :subjectCode, :caType)`,
      {
        replacements: { classCode, subjectCode, caType },
      }
    );
    res.json({
      success: true,
      message: "All scores locked successfully",
    });
  } catch (error) {
    console.error("Error in lockAllScores:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while locking scores.",
      error: error.message,
    });
  }
};

const unlockSpecificWeek = async (req, res) => {
  const { classCode, subjectCode, weekNumber, caType } = req.body;
  try {
    await db.sequelize.query(
      `CALL UnlockSpecificWeek(:classCode, :subjectCode, :weekNumber, :caType)`,
      {
        replacements: { classCode, subjectCode, weekNumber, caType },
      }
    );
    res.json({
      success: true,
      message: `Week ${weekNumber} unlocked successfully`,
    });
  } catch (error) {
    console.error("Error in unlockSpecificWeek:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while unlocking the week.",
      error: error.message,
    });
  }
};

const getStudentEndOfTermReport = async (req, res) => {
  const { admissionNo = null, academicYear = null, term = null } = req.body;
  try {
    const results = await db.sequelize.query(
      `CALL GetStudentEndOfTermReport(:admissionNo, :academicYear, :term, :school_id)`,
      {
        replacements: {
          admissionNo,
          academicYear,
          term,
          school_id: req.user.school_id,
        },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getStudentEndOfTermReport:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching student end of term report.",
      error: error.message,
    });
  }
};

const getClassEndOfTermReport = async (req, res) => {
  const { classCode = null, academicYear = null, term = null } = req.body;
  try {
    const results = await db.sequelize.query(
      `CALL GetClassSummaryReport(:classCode, :academicYear, :term, :school_id)`,
      {
        replacements: {
          classCode,
          school_id: req.user.school_id,
          academicYear,
          term,
        },
      }
    );
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getClassEndOfTermReport:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching class end of term report.",
      error: error.message,
    });
  }
};

const getEndOfTermReport = async (req, res) => {
  let {
    queryType = null,
    admissionNo = null,
    academicYear = null,
    term = null,
    classCode = null,
    class_code = null,
  } = req.body;

  // Support both classCode and class_code
  classCode = classCode || class_code;

  // Auto-detect queryType if not provided
  if (!queryType) {
    if (admissionNo) {
      queryType = 'student';
    } else if (classCode) {
      queryType = 'class';
    }
  }

  try {
    let query = '';
    let replacements = {
      academicYear,
      term,
      schoolId: req.user.school_id,
    };

  if (queryType === 'student') {
  // Get end of term report for a specific student (ranked within the whole class)
  query = `
    WITH student_subject_totals AS (
      SELECT
        s.admission_no,
        s.student_name,
        c.class_code,
        c.class_name,
        c.section,
        sub.subject_code,
        sub.subject,
        -- CA breakdowns per student-subject (raw scores and fixed contributions)
        SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) AS ca1_score,
        COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.intended_contribution_percent END), 
                 MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.overall_contribution_percent END), 10.00) AS ca1_contribution,
        SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) AS ca2_score,
        COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.intended_contribution_percent END), 
                 MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.overall_contribution_percent END), 20.00) AS ca2_contribution,
        SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_score,
        COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA3' THEN cs.intended_contribution_percent END), 
                 MAX(CASE WHEN ws.assessment_type = 'CA3' THEN cs.overall_contribution_percent END), 0.00) AS ca3_contribution,
        SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_score,
        COALESCE(MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.intended_contribution_percent END), 
                 MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.overall_contribution_percent END), 70.00) AS exam_contribution,
        -- totals and raw percentage
        SUM(ws.score) AS total_score,
        SUM(ws.max_score) AS total_max_score,
        CASE WHEN SUM(ws.max_score) > 0
          THEN ROUND((SUM(ws.score) / SUM(ws.max_score)) * 100, 2)
          ELSE NULL END AS percentage
      FROM students s
      INNER JOIN classes c ON s.current_class = c.class_code
      INNER JOIN school_setup ss ON s.school_id = ss.school_id
      INNER JOIN subjects sub ON sub.class_code = c.class_code AND sub.status = 'Active'
        AND (
          c.stream != 'Mixed'
          OR sub.type IN ('Core', 'General', 'None')
          OR sub.type = s.stream
        )
      LEFT JOIN weekly_scores ws
        ON s.admission_no = ws.admission_no
        AND sub.subject_code = ws.subject_code
        AND ws.academic_year = :academicYear
        AND ws.term = :term
      LEFT JOIN ca_setup cs ON ws.ca_setup_id = cs.id
      LEFT JOIN academic_weeks aw
        ON ws.week_number = aw.week_number
        AND aw.school_id = s.school_id
        AND aw.academic_year = :academicYear
        AND aw.term = :term
      WHERE s.current_class = (
          SELECT current_class FROM students WHERE admission_no = :admissionNo LIMIT 1
        )
        AND s.school_id = :schoolId
        AND s.status = 'Active'
      GROUP BY s.admission_no, s.student_name, c.class_code, c.class_name, c.section,
               sub.subject_code, sub.subject
    ),

    -- Calculate overall student totals across all subjects
    student_overall_totals AS (
      SELECT
        admission_no,
        SUM(total_score) AS overall_total_score
      FROM student_subject_totals
      GROUP BY admission_no
    ),

    -- Rank students by overall performance
    student_overall_ranking AS (
      SELECT
        admission_no,
        overall_total_score,
        CASE WHEN overall_total_score IS NOT NULL THEN RANK() OVER (ORDER BY overall_total_score DESC) ELSE NULL END AS student_position,
        COUNT(*) OVER () AS total_students
      FROM student_overall_totals
    ),

    ranked AS (
      SELECT
        sst.*,
        CASE 
          WHEN sst.total_score IS NOT NULL AND EXISTS (
            SELECT 1 FROM student_subject_totals sst2 
            WHERE sst2.subject_code = sst.subject_code 
            AND sst2.total_score IS NOT NULL
          ) 
          THEN RANK() OVER (
            PARTITION BY sst.subject_code
            ORDER BY sst.total_score DESC, sst.student_name ASC
          ) 
          ELSE NULL 
        END AS subject_position,
        COUNT(*) OVER (PARTITION BY sst.subject_code) AS total_students_in_subject
      FROM student_subject_totals sst
    )

    SELECT
      r.admission_no,
      r.student_name,
      r.class_code,
      r.class_name,
      r.section,
      r.subject_code,
      r.subject,
      r.ca1_score,
      r.ca1_contribution,
      r.ca2_score,
      r.ca2_contribution,
      r.ca3_score,
      r.ca3_contribution,
      r.exam_score,
      r.exam_contribution,
      r.total_score,
      r.total_max_score,
      r.percentage,
      CASE WHEN r.total_score IS NOT NULL THEN r.subject_position ELSE NULL END AS subject_position,
      r.total_students_in_subject,
      sor.student_position,
      sor.total_students,
      -- Set grade to '-' if all scores are 0 (subject not taken)
      CASE
        WHEN r.ca1_score = 0 AND r.ca2_score = 0 AND r.ca3_score = 0 AND r.exam_score = 0 THEN '-'
        ELSE NULL
      END AS grade,
      -- Set remark to 'Not Taken' if all scores are 0
      CASE
        WHEN r.ca1_score = 0 AND r.ca2_score = 0 AND r.ca3_score = 0 AND r.exam_score = 0 THEN 'Not Taken'
        ELSE NULL
      END AS remark,
      :academicYear AS academic_year,
      :term AS term
    FROM ranked r
    LEFT JOIN student_overall_ranking sor ON r.admission_no = sor.admission_no
    WHERE r.admission_no = :admissionNo
    ORDER BY r.subject;
  `;
  replacements.admissionNo = admissionNo;
} else if (queryType === 'class') {
      // Get end of term report for a specific class
      query = `
        WITH student_subject_scores AS (
          SELECT
            s.admission_no,
            s.student_name,
            c.class_code,
            c.class_name,
            c.section,
            sub.subject_code,
            sub.subject AS subject,
            -- CA1 scores (raw scores and fixed contributions)
            SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) AS ca1_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.overall_contribution_percent END), 10.00) AS ca1_contribution,
            -- CA2 scores (raw scores and fixed contributions)
            SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) AS ca2_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.overall_contribution_percent END), 20.00) AS ca2_contribution,
            -- CA3 scores
            SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA3' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA3' THEN cs.overall_contribution_percent END), 0.00) AS ca3_contribution,
            -- EXAM scores (raw scores and fixed contributions)
            SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.overall_contribution_percent END), 70.00) AS exam_contribution,
            -- Total and percentage (use weighted contributions)
            COALESCE(CASE WHEN SUM(CASE WHEN ws.assessment_type = 'CA1' THEN cs.max_score END) > 0 THEN ROUND((SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) / SUM(CASE WHEN ws.assessment_type = 'CA1' THEN cs.max_score END)) * COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.intended_contribution_percent END), MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.overall_contribution_percent END), 10.00), 2) ELSE 0 END, 0) + COALESCE(CASE WHEN SUM(CASE WHEN ws.assessment_type = 'CA2' THEN cs.max_score END) > 0 THEN ROUND((SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) / SUM(CASE WHEN ws.assessment_type = 'CA2' THEN cs.max_score END)) * COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.intended_contribution_percent END), MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.overall_contribution_percent END), 20.00), 2) ELSE 0 END, 0) + COALESCE(CASE WHEN SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.max_score END) > 0 THEN ROUND((SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) / SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.max_score END)) * COALESCE(MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.intended_contribution_percent END), MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.overall_contribution_percent END), 70.00), 2) ELSE 0 END, 0) AS total_score,
            100.00 AS total_max_score,
            CASE
              WHEN SUM(ws.max_score) > 0 THEN ROUND((SUM(ws.score) / SUM(ws.max_score)) * 100, 2)
              ELSE NULL
            END AS percentage
          FROM students s
          INNER JOIN classes c ON s.current_class = c.class_code
          INNER JOIN school_setup ss ON s.school_id = ss.school_id
          INNER JOIN subjects sub ON sub.class_code = c.class_code AND sub.status = 'Active'
            AND (
              c.stream != 'Mixed'
              OR sub.type IN ('Core', 'General', 'None')
              OR sub.type = s.stream
            )
          LEFT JOIN weekly_scores ws ON s.admission_no = ws.admission_no
            AND sub.subject_code = ws.subject_code
            AND ws.academic_year = :academicYear
            AND ws.term = :term
          LEFT JOIN ca_setup cs ON ws.ca_setup_id = cs.id
          LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
            AND aw.school_id = s.school_id
            AND aw.academic_year = :academicYear
            AND aw.term = :term
          WHERE c.class_code = :classCode
            AND s.school_id = :schoolId
            AND s.status = 'Active'
          GROUP BY s.admission_no, s.student_name, c.class_code, c.class_name, c.section,
                   sub.subject_code, sub.subject
        ),

        -- Calculate overall student totals across all subjects
        student_overall_totals AS (
          SELECT
            admission_no,
            SUM(total_score) AS overall_total_score
          FROM student_subject_scores
          GROUP BY admission_no
        ),

        -- Rank students by overall performance
        student_overall_ranking AS (
          SELECT
            admission_no,
            overall_total_score,
            CASE WHEN overall_total_score IS NOT NULL THEN RANK() OVER (ORDER BY overall_total_score DESC) ELSE NULL END AS student_position,
            COUNT(*) OVER () AS total_students
          FROM student_overall_totals
        )

        SELECT
          sss.*,
          -- Calculate position per subject
          CASE WHEN sss.total_score IS NOT NULL THEN RANK() OVER (
            PARTITION BY sss.subject_code
            ORDER BY sss.total_score DESC, sss.student_name ASC
          ) ELSE NULL END AS subject_position,
          sor.student_position,
          sor.total_students,
          -- Set grade to '-' if all scores are 0 (subject not taken)
          CASE
            WHEN sss.ca1_score = 0 AND sss.ca2_score = 0 AND sss.ca3_score = 0 AND sss.exam_score = 0 THEN '-'
            ELSE NULL
          END AS grade,
          -- Set remark to 'Not Taken' if all scores are 0
          CASE
            WHEN sss.ca1_score = 0 AND sss.ca2_score = 0 AND sss.ca3_score = 0 AND sss.exam_score = 0 THEN 'Not Taken'
            ELSE NULL
          END AS remark,
          :academicYear AS academic_year,
          :term AS term
        FROM student_subject_scores sss
        LEFT JOIN student_overall_ranking sor ON sss.admission_no = sor.admission_no
        ORDER BY sss.student_name, sss.subject
      `;
      replacements.classCode = classCode;

    } else if (queryType === 'all') {
      // Get data for all classes
      query = `
        SELECT
          s.admission_no,
          s.student_name,
          c.class_code,
          c.class_name,
          sub.subject_code,
          sub.subject AS subject,
          SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) AS ca1_score,
          MAX(CASE WHEN ws.assessment_type = 'CA[1-4]' THEN cs.overall_contribution_percent END) AS ca1_contribution,
          SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) AS ca2_score,
          MAX(CASE WHEN ws.assessment_type = 'CA[1-4]' THEN cs.overall_contribution_percent END) AS ca2_contribution,
          SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_score,
          MAX(CASE WHEN ws.assessment_type = 'CA[1-4]' THEN cs.overall_contribution_percent END) AS ca3_contribution,
          SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_score,
          MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.overall_contribution_percent END) AS exam_contribution,
          SUM(ws.score) AS total_score,
          SUM(ws.max_score) AS total_max_score,
          CASE
            WHEN SUM(ws.max_score) > 0 THEN ROUND((SUM(ws.score) / SUM(ws.max_score)) * 100, 2)
            ELSE 0
          END AS percentage,
          :academicYear AS academic_year,
          :term AS term
        FROM students s
        INNER JOIN classes c ON s.current_class = c.class_code
        INNER JOIN subjects sub ON sub.class_code = c.class_code
        LEFT JOIN weekly_scores ws ON s.admission_no = ws.admission_no
          AND sub.subject_code = ws.subject_code
          AND ws.academic_year = :academicYear
          AND ws.term = :term
        LEFT JOIN ca_setup cs ON ws.ca_setup_id = cs.id
        WHERE s.school_id = :schoolId
          AND s.status = 'Active'
        GROUP BY s.admission_no, s.student_name, c.class_code, c.class_name,
                 sub.subject_code, sub.subject
        ORDER BY c.class_name, s.student_name, sub.subject
      `;

    } else if (queryType === 'section') {
      // Get data for a specific section
      const { section } = req.body;
      if (!section) {
        return res.status(400).json({
          success: false,
          message: 'Section is required for section query type',
          error: 'MISSING_SECTION'
        });
      }

      query = `
        SELECT
          s.admission_no,
          s.student_name,
          c.class_code,
          c.class_name,
          sub.subject_code,
          sub.subject AS subject,
          SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) AS ca1_score,
          MAX(CASE WHEN ws.assessment_type = 'CA[1-4]' THEN cs.overall_contribution_percent END) AS ca1_contribution,
          SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) AS ca2_score,
          MAX(CASE WHEN ws.assessment_type = 'CA[1-4]' THEN cs.overall_contribution_percent END) AS ca2_contribution,
          SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_score,
          MAX(CASE WHEN ws.assessment_type = 'CA[1-4]' THEN cs.overall_contribution_percent END) AS ca3_contribution,
          SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_score,
          MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.overall_contribution_percent END) AS exam_contribution,
          SUM(ws.score) AS total_score,
          SUM(ws.max_score) AS total_max_score,
          CASE
            WHEN SUM(ws.max_score) > 0 THEN ROUND((SUM(ws.score) / SUM(ws.max_score)) * 100, 2)
            ELSE 0
          END AS percentage,
          :academicYear AS academic_year,
          :term AS term
        FROM students s
        INNER JOIN classes c ON s.current_class = c.class_code
        INNER JOIN subjects sub ON sub.class_code = c.class_code
        LEFT JOIN weekly_scores ws ON s.admission_no = ws.admission_no
          AND sub.subject_code = ws.subject_code
          AND ws.academic_year = :academicYear
          AND ws.term = :term
        LEFT JOIN ca_setup cs ON ws.ca_setup_id = cs.id
        WHERE s.school_id = :schoolId
          AND s.status = 'Active'
          AND s.section = :section
        GROUP BY s.admission_no, s.student_name, c.class_code, c.class_name,
                 sub.subject_code, sub.subject
        ORDER BY c.class_name, s.student_name, sub.subject
      `;
      replacements.section = section;

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid queryType. Use "student", "class", "all", or "section".',
        error: 'INVALID_QUERY_TYPE'
      });
    }

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    // Get CA configuration for the school/branch
    const caConfigQuery = `
      SELECT DISTINCT ca_type as assessment_type, overall_contribution_percent as contribution_percent, status 
      FROM ca_setup 
      WHERE school_id = :schoolId 
        AND branch_id = :branchId
        AND status = 'Active'
      ORDER BY FIELD(ca_type, 'CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'CA6', 'CA7', 'EXAM')
    `;
    
    const caConfiguration = await db.sequelize.query(caConfigQuery, {
      replacements: { schoolId: req.user.school_id, branchId: req.user.branch_id || req.headers['x-branch-id'] },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: results,
      caConfiguration,
    });
  } catch (error) {
    console.error("Error in getEndOfTermReport:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the end of term report.",
      error: error.message,
    });
  }
};


/**
 * Update weekly_scores status based on query_type (Teacher, FormMaster, Admin)
 */
const updateScoreStatus = async (req, res) => {
  const { query_type, subject_code, class_code, academic_year, term } = req.body;

  // 🧩 Basic validation
  if (!query_type || !academic_year || !term) {
    return res.status(400).json({
      success: false,
      error: "query_type, academic_year, and term are required.",
    });
  }

  try {
    // 🧠 Call the stored procedure
    const result = await db.sequelize.query(
      "CALL UpdateScoreStatus(:query_type, :p_subject_code, :p_class_code, :p_academic_year, :p_term)",
      {
        replacements: {
          query_type,
          p_subject_code: subject_code || null,
          p_class_code: class_code || null,
          p_academic_year: academic_year,
          p_term: term,
        },
      }
    );

    // 🧾 Extract message from stored procedure (the SELECT at the end)
    const message =
      result?.[0]?.message || result?.message || "Status update completed.";

    return res.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("❌ Error executing UpdateScoreStatus:", error);
    return res.status(500).json({
      success: false,
      error: error.original?.sqlMessage || error.message,
    });
  }
};



/**
 * Lock assessment scores to prevent further editing
 */
const lockAssessment = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { ca_type, academic_year, term, class_codes, section } = req.body;

    console.log("Lock Assessment Request:", { school_id, branch_id, ca_type, academic_year, term, class_codes });

    if (!ca_type || !academic_year || !term || !class_codes || class_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CA type, academic year, term, and class codes are required.",
      });
    }

    const whereConditions = `
      assessment_type = ? AND
      academic_year = ? AND
      term = ? AND
      class_code IN (?)
    `;

    const updateQuery = `
      UPDATE weekly_scores
      SET is_locked = 1,
          locked_at = NOW(),
          locked_by = ?
      WHERE ${whereConditions}
    `;

    await db.sequelize.query(updateQuery, {
      replacements: [
        req.user.user_id || req.user.staff_id,
        ca_type,
        academic_year,
        term,
        class_codes,
      ],
      type: db.Sequelize.QueryTypes.UPDATE,
    });

    res.json({
      success: true,
      message: `Assessment ${ca_type} has been locked for ${class_codes.length} class${class_codes.length > 1 ? 'es' : ''}.`,
      data: { ca_type, academic_year, term, locked_classes: class_codes, locked_at: new Date() },
    });
  } catch (error) {
    console.error("Error in lockAssessment:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while locking the assessment.",
      error: error.message,
    });
  }
};

/**
 * Unlock assessment scores to allow editing
 */
const unlockAssessment = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { ca_type, academic_year, term, class_codes } = req.body;

    console.log("Unlock Assessment Request:", { ca_type, academic_year, term, class_codes });

    if (!ca_type || !academic_year || !term || !class_codes || class_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CA type, academic year, term, and class codes are required.",
      });
    }

    const whereConditions = `
      assessment_type = ? AND
      academic_year = ? AND
      term = ? AND
      class_code IN (?)
    `;

    const updateQuery = `
      UPDATE weekly_scores
      SET is_locked = 0,
          unlocked_at = NOW(),
          unlocked_by = ?
      WHERE ${whereConditions}
    `;

    await db.sequelize.query(updateQuery, {
      replacements: [
        req.user.user_id || req.user.staff_id,
        ca_type,
        academic_year,
        term,
        class_codes,
      ],
      type: db.Sequelize.QueryTypes.UPDATE,
    });

    res.json({
      success: true,
      message: `Assessment ${ca_type} has been unlocked for ${class_codes.length} class${class_codes.length > 1 ? 'es' : ''}.`,
      data: { ca_type, academic_year, term, unlocked_classes: class_codes, unlocked_at: new Date() },
    });
  } catch (error) {
    console.error("Error in unlockAssessment:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while unlocking the assessment.",
      error: error.message,
    });
  }
};

/**
 * Change assessment status (workflow management)
 */
const changeAssessmentStatus = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { ca_type, academic_year, term, class_codes, new_status } = req.body;

    console.log("Change Status Request:", { ca_type, academic_year, term, class_codes, new_status });

    const validStatuses = ['Draft', 'Submitted', 'Released', 'Approved', 'Archived', 'UnderReview', 'Cancelled'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const whereConditions = `
      assessment_type = ? AND
      academic_year = ? AND
      term = ? AND
      class_code IN (?)
    `;

    const updateQuery = `
      UPDATE weekly_scores
      SET status = ?,
          status_changed_at = NOW(),
          status_changed_by = ?
      WHERE ${whereConditions}
    `;

    await db.sequelize.query(updateQuery, {
      replacements: [
        new_status,
        req.user.user_id || req.user.staff_id,
        ca_type,
        academic_year,
        term,
        class_codes,
      ],
      type: db.Sequelize.QueryTypes.UPDATE,
    });

    res.json({
      success: true,
      message: `Assessment status changed to ${new_status} for ${class_codes.length} class${class_codes.length > 1 ? 'es' : ''}.`,
      data: { ca_type, academic_year, term, new_status, affected_classes: class_codes },
    });
  } catch (error) {
    console.error("Error in changeAssessmentStatus:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while changing assessment status.",
      error: error.message,
    });
  }
};

/**
 * Send notification to teachers
 */
const sendTeacherNotification = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { ca_type, academic_year, term, class_codes, message: notificationMessage, reminder_type } = req.body;

    console.log("Send Notification Request:", { ca_type, class_codes, reminder_type });

    if (!notificationMessage || !class_codes || class_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message and class codes are required.",
      });
    }

    // Get form teachers for the selected classes
    const teacherQuery = `
      SELECT DISTINCT c.class_code, c.class_name, s.staff_id, s.name as teacher_name, s.email
      FROM classes c
      LEFT JOIN staffs s ON c.form_teacher = s.staff_id
      WHERE c.class_code IN (?)
        AND c.school_id = ?
        AND c.branch_id = ?
    `;

    const [teachers] = await db.sequelize.query(teacherQuery, {
      replacements: [class_codes, school_id, branch_id],
      type: db.Sequelize.QueryTypes.SELECT,
    });

    // Log notifications (you can integrate with email service here)
    const notificationData = Array.isArray(teachers) ? teachers.map(t => ({
      teacher_id: t.staff_id,
      teacher_name: t.teacher_name,
      class_code: t.class_code,
      class_name: t.class_name,
      message: notificationMessage,
      reminder_type: reminder_type || 'general',
      ca_type,
      sent_at: new Date(),
    })) : [];

    console.log("Notifications to send:", notificationData);

    // TODO: Integrate with actual notification/email service
    // For now, just log the notifications

    res.json({
      success: true,
      message: `Notification sent to ${notificationData.length} teacher${notificationData.length !== 1 ? 's' : ''}.`,
      data: {
        notifications_sent: notificationData.length,
        teachers: notificationData,
      },
    });
  } catch (error) {
    console.error("Error in sendTeacherNotification:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while sending notifications.",
      error: error.message,
    });
  }
};

/**
 * Set submission deadline for assessment
 */
const setSubmissionDeadline = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { ca_type, academic_year, term, class_codes, deadline } = req.body;

    console.log("Set Deadline Request:", { ca_type, class_codes, deadline });

    if (!deadline || !class_codes || class_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Deadline and class codes are required.",
      });
    }

    const whereConditions = `
      assessment_type = ? AND
      academic_year = ? AND
      term = ? AND
      class_code IN (?)
    `;

    const updateQuery = `
      UPDATE weekly_scores
      SET submission_deadline = ?,
          deadline_set_at = NOW(),
          deadline_set_by = ?
      WHERE ${whereConditions}
    `;

    await db.sequelize.query(updateQuery, {
      replacements: [
        deadline,
        req.user.user_id || req.user.staff_id,
        ca_type,
        academic_year,
        term,
        class_codes,
      ],
      type: db.Sequelize.QueryTypes.UPDATE,
    });

    res.json({
      success: true,
      message: `Submission deadline set for ${class_codes.length} class${class_codes.length > 1 ? 'es' : ''}.`,
      data: {
        ca_type,
        academic_year,
        term,
        deadline,
        affected_classes: class_codes,
      },
    });
  } catch (error) {
    console.error("Error in setSubmissionDeadline:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while setting the deadline.",
      error: error.message,
    });
  }
};

/**
 * Release assessment results to students and parents
 * Updates the status field in weekly_scores table to "Released"
 */
const releaseAssessment = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const {
      query_type,
      ca_type,
      academic_year,
      term,
      class_codes,
      section,
    } = req.body;

    console.log("Release Assessment Request:", {
      school_id,
      branch_id,
      ca_type,
      academic_year,
      term,
      class_codes,
      section,
    });

    // Validate required fields
    if (!ca_type || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: "CA type, academic year, and term are required.",
      });
    }

    if (!class_codes || !Array.isArray(class_codes) || class_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one class code must be provided.",
      });
    }

    // If releasing EXAM, also release all CAs for the same term
    // Individual CA releases (CA1, CA2, CA3, CA4) only release that specific CA
    let assessmentTypes = [ca_type];
    if (ca_type === 'EXAM') {
      assessmentTypes = ['CA1', 'CA2', 'CA3', 'CA4', 'EXAM'];
      console.log('Releasing EXAM - will also release all CAs:', assessmentTypes);
    } else {
      console.log('Releasing individual assessment:', ca_type);
    }

    // Build the WHERE clause for updating weekly_scores
    const whereConditions = `
      assessment_type IN (?) AND
      academic_year = ? AND
      term = ? AND
      class_code IN (?)
    `;

    const values = [
      assessmentTypes,
      academic_year,
      term,
      class_codes,
    ];

    // Update the status to "Released" in weekly_scores table
    const updateQuery = `
      UPDATE weekly_scores
      SET status = 'Released',
          updated_at = NOW()
      WHERE ${whereConditions}
    `;

    const [result] = await db.sequelize.query(updateQuery, {
      replacements: values,
      type: db.Sequelize.QueryTypes.UPDATE,
    });

    console.log(`Updated records to Released status`);

    // Get the affected classes for response
    const classQuery = `
      SELECT class_code, class_name
      FROM classes
      WHERE class_code IN (?)
        AND school_id = ?
        AND branch_id = ?
    `;

    const [affectedClasses] = await db.sequelize.query(classQuery, {
      replacements: [class_codes, school_id, branch_id],
      type: db.Sequelize.QueryTypes.SELECT,
    });

    const classNames = Array.isArray(affectedClasses)
      ? affectedClasses.map(c => c.class_name).join(", ")
      : "";

    res.json({
      success: true,
      message: `Assessment ${ca_type} has been released for ${class_codes.length} class${class_codes.length > 1 ? 'es' : ''}: ${classNames}`,
      data: {
        ca_type,
        academic_year,
        term,
        released_classes: affectedClasses,
        released_at: new Date(),
      },
    });

  } catch (error) {
    console.error("Error in releaseAssessment:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while releasing the assessment.",
      error: error.message,
    });
  }
};

const getAssessmentProgress = async (req, res) => {
  const { academic_year, term, class_code } = req.body;
  const school_id = req.user.school_id;

  try {
    const query = `
      SELECT 
        c.class_code,
        c.class_name,
        COUNT(DISTINCT s.admission_no) as total_students,
        COUNT(DISTINCT sub.subject_code) as total_subjects,
        (SELECT GROUP_CONCAT(DISTINCT ca_type ORDER BY ca_type) 
         FROM ca_setup 
         WHERE school_id = :school_id AND status = 'Active') as active_cas,
        (COUNT(DISTINCT s.admission_no) * COUNT(DISTINCT sub.subject_code) * 
         (SELECT COUNT(DISTINCT ca_type) FROM ca_setup WHERE school_id = :school_id AND status = 'Active')) as expected_scores,
        COUNT(DISTINCT CONCAT(ws.admission_no, '-', ws.subject_code, '-', ws.assessment_type)) as submitted_scores,
        ROUND((COUNT(DISTINCT CONCAT(ws.admission_no, '-', ws.subject_code, '-', ws.assessment_type)) / 
               NULLIF((COUNT(DISTINCT s.admission_no) * COUNT(DISTINCT sub.subject_code) * 
               (SELECT COUNT(DISTINCT ca_type) FROM ca_setup WHERE school_id = :school_id AND status = 'Active')), 0)) * 100, 1) as completion_percentage
      FROM classes c
      INNER JOIN students s ON c.class_code = s.current_class AND s.status = 'Active' AND s.school_id = :school_id
      INNER JOIN subjects sub ON sub.class_code = c.class_code AND sub.status = 'Active'
      LEFT JOIN weekly_scores ws ON s.admission_no = ws.admission_no 
        AND sub.subject_code = ws.subject_code 
        AND ws.academic_year = :academic_year 
        AND ws.term = :term
      WHERE c.class_code = :class_code
      GROUP BY c.class_code, c.class_name
    `;

    const result = await db.sequelize.query(query, {
      replacements: { school_id, academic_year, term, class_code },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: result[0] || {
        class_code,
        total_students: 0,
        total_subjects: 0,
        expected_scores: 0,
        submitted_scores: 0,
        completion_percentage: 0
      }
    });
  } catch (error) {
    console.error('Error fetching assessment progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment progress',
      error: error.message
    });
  }
};

/**
 * Get class-level shared data (logos, signatures) - fetch once for entire class
 */
const getClassSharedData = async (req, res) => {
  try {
    const { class_code } = req.body;
    const school_id = req.user.school_id;

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: 'class_code is required'
      });
    }

    const query = `
      SELECT 
        c.class_code,
        c.class_name,
        s.school_name,
        s.school_logo,
        s.school_address,
        s.school_phone,
        s.school_email,
        ftu.digital_signature AS form_teacher_signature,
        CONCAT(ft.first_name, ' ', ft.last_name) AS form_teacher_name,
        p.digital_signature AS principal_signature,
        CONCAT(pu.first_name, ' ', pu.last_name) AS principal_name
      FROM classes c
      INNER JOIN schools s ON c.school_id = s.school_id
      LEFT JOIN teachers ft ON c.form_teacher_id = ft.id
      LEFT JOIN users ftu ON ft.user_id = ftu.id
      LEFT JOIN users p ON p.user_type = 'Principal' AND p.school_id = :school_id
      LEFT JOIN users pu ON p.id = pu.id
      WHERE c.class_code = :class_code 
        AND c.school_id = :school_id
      LIMIT 1
    `;

    const results = await db.sequelize.query(query, {
      replacements: { class_code, school_id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });

  } catch (error) {
    console.error('Error fetching class shared data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching class shared data',
      error: error.message
    });
  }
};

/**
 * Get student remarks and signatures (separate from report data)
 */
const getStudentRemarksAndSignatures = async (req, res) => {
  try {
    const { admission_no, academic_year, term } = req.body;
    const school_id = req.user.school_id;

    if (!admission_no || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: 'admission_no, academic_year, and term are required'
      });
    }

    const query = `
      SELECT 
        s.admission_no,
        tr.remark AS teacher_remark,
        pr.remark AS principal_remark
      FROM students s
      LEFT JOIN exam_remarks tr ON s.admission_no = tr.admission_no 
        AND tr.academic_year = :academic_year 
        AND tr.term = :term 
        AND tr.remark_type = 'Teacher Remark'
      LEFT JOIN exam_remarks pr ON s.admission_no = pr.admission_no 
        AND pr.academic_year = :academic_year 
        AND pr.term = :term 
        AND pr.remark_type = 'Principal Remark'
      WHERE s.admission_no = :admission_no 
        AND s.school_id = :school_id
      LIMIT 1
    `;

    const results = await db.sequelize.query(query, {
      replacements: { admission_no, academic_year, term, school_id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    if (results.length === 0) {
      return res.json({
        success: true,
        data: {
          teacher_remark: null,
          principal_remark: null
        }
      });
    }

    res.json({
      success: true,
      data: results[0]
    });

  } catch (error) {
    console.error('Error fetching student remarks:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching remarks',
      error: error.message
    });
  }
};

/**
 * Get section release status - single query for all classes in a section
 * Returns release percentage for the Release button
 */
const getSectionReleaseStatus = async (req, res) => {
  try {
    const { section, academic_year, term } = req.body;
    const school_id = req.user.school_id || req.headers['x-school-id'];
    const branch_id = req.user.branch_id || req.headers['x-branch-id'];

    if (!section || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: "section, academic_year, and term are required"
      });
    }

    const query = `
      SELECT 
        c.class_code,
        c.class_name,
        ws.assessment_type,
        COUNT(DISTINCT ws.id) as total_records,
        SUM(CASE WHEN ws.status = 'Released' THEN 1 ELSE 0 END) as released_records,
        CASE WHEN COUNT(DISTINCT ws.id) > 0 AND COUNT(DISTINCT ws.id) = SUM(CASE WHEN ws.status = 'Released' THEN 1 ELSE 0 END) THEN 1 ELSE 0 END as is_released
      FROM classes c
      LEFT JOIN weekly_scores ws ON c.class_code = ws.class_code 
        AND ws.academic_year = ?
        AND ws.term = ?
        AND ws.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM')
      WHERE c.section = ?
        AND c.school_id = ?
        AND c.branch_id = ?
        AND c.status = 'Active'
      GROUP BY c.class_code, c.class_name, ws.assessment_type
      ORDER BY c.class_name, ws.assessment_type
    `;

    const results = await db.sequelize.query(query, {
      replacements: [academic_year, term, section, school_id, branch_id],
      type: db.sequelize.QueryTypes.SELECT
    });

    // Calculate totals
    let totalAssessments = 0;
    let releasedAssessments = 0;

    results.forEach(row => {
      if (row.assessment_type && row.total_records > 0) {
        totalAssessments++;
        if (row.is_released === 1) releasedAssessments++;
      }
    });

    const percentage = totalAssessments > 0 ? Math.round((releasedAssessments / totalAssessments) * 100) : 0;

    res.json({
      success: true,
      data: {
        section,
        academic_year,
        term,
        total_assessments: totalAssessments,
        released_assessments: releasedAssessments,
        percentage,
        details: results
      }
    });
  } catch (error) {
    console.error("Error in getSectionReleaseStatus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get section release status",
      error: error.message
    });
  }
};

/**
 * Get End of Session Aggregate Report - Averages CA and Exam scores across all 3 terms
 * Calculates averaged CA scores (CA1-CA4) and Exam scores across First Term, Second Term, Third Term
 */
const getEndOfSessionAggregateReport = async (req, res) => {
  let {
    queryType = 'class',
    academic_year,
    class_code,
    admissionNo = null,
  } = req.body;

  try {
    // Get school's actual terms from academic_calendar
    const schoolTermsQuery = `
      SELECT DISTINCT term_name 
      FROM academic_calendar 
      WHERE academic_year = :academic_year 
        AND school_id = :schoolId 
        AND is_active = 1
      ORDER BY term_order
    `;
    
    const schoolTerms = await db.sequelize.query(schoolTermsQuery, {
      replacements: { academic_year, schoolId: req.user.school_id },
      type: db.sequelize.QueryTypes.SELECT,
    });

    const termNames = schoolTerms.length > 0 
      ? schoolTerms.map(t => t.term_name)
      : ['First Term', 'Second Term', 'Third Term']; // fallback

    // Validate minimum terms for aggregate report
    if (termNames.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Aggregate report requires data from at least 2 terms. Current academic calendar has insufficient terms.",
      });
    }

    // Get CA configuration to determine weights
    const caConfigQuery = `
      SELECT assessment_type, contribution_percent 
      FROM ca_setup 
      WHERE class_code = :class_code 
        AND academic_year = :academic_year 
        AND school_id = :schoolId 
        AND is_active = 1
    `;
    
    const caConfig = await db.sequelize.query(caConfigQuery, {
      replacements: { class_code, academic_year, schoolId: req.user.school_id },
      type: db.sequelize.QueryTypes.SELECT,
    });

    // Calculate weights from configuration
    let totalCaWeight = 0;
    let examWeight = 60; // default fallback

    caConfig.forEach(config => {
      const assessmentType = (config.assessment_type || '').toLowerCase();
      const weight = parseFloat(config.contribution_percent || '0');
      
      if (assessmentType.includes('exam')) {
        examWeight = weight;
      } else {
        totalCaWeight += weight;
      }
    });

    // Fallback to defaults if no config found
    if (totalCaWeight === 0) totalCaWeight = 40;
    if (examWeight === 0) examWeight = 60;

    // Convert to decimal for calculation
    const caWeightDecimal = totalCaWeight / 100;
    const examWeightDecimal = examWeight / 100;

    let query = "";
    let replacements = {
      academic_year,
      class_code,
      schoolId: req.user.school_id,
      caWeight: caWeightDecimal,
      examWeight: examWeightDecimal,
    };

    // Add term parameters dynamically
    termNames.forEach((term, i) => {
      replacements[`term${i}`] = term;
    });

    const termPlaceholders = termNames.map((_, i) => `:term${i}`).join(',');

    if (queryType === 'class') {
      // Get aggregated report for entire class across all available terms
      query = `
        WITH term_averages AS (
          SELECT
            s.admission_no,
            s.student_name,
            c.class_code,
            c.class_name,
            sub.subject_code,
            sub.subject,
            ws.term,
            -- Average CA scores per term (CA1-CA4)
            AVG(CASE WHEN ws.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4') THEN ws.score END) as term_ca_avg,
            -- Average Exam scores per term
            AVG(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) as term_exam_avg
          FROM weekly_scores ws
          INNER JOIN students s ON ws.admission_no = s.admission_no
          INNER JOIN classes c ON ws.class_code = c.class_code
          INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
          WHERE ws.academic_year = :academic_year
            AND ws.class_code = :class_code
            AND ws.school_id = :schoolId
            AND ws.term IN (${termPlaceholders})
          GROUP BY s.admission_no, s.student_name, c.class_code, c.class_name, 
                   sub.subject_code, sub.subject, ws.term
        ),
        session_aggregates AS (
          SELECT
            admission_no,
            student_name,
            class_code,
            class_name,
            subject_code,
            subject,
            -- Average CA across all available terms
            ROUND(AVG(term_ca_avg), 2) as ca_score,
            -- Average Exam across all available terms  
            ROUND(AVG(term_exam_avg), 2) as exam_score,
            -- Calculate total score using dynamic weights
            ROUND((AVG(term_ca_avg) * :caWeight) + (AVG(term_exam_avg) * :examWeight), 2) as total_score,
            COUNT(DISTINCT CASE WHEN term_ca_avg IS NOT NULL THEN term END) as ca_terms_count,
            COUNT(DISTINCT CASE WHEN term_exam_avg IS NOT NULL THEN term END) as exam_terms_count
          FROM term_averages
          GROUP BY admission_no, student_name, class_code, class_name, subject_code, subject
        ),
        ranked_results AS (
          SELECT
            *,
            -- Calculate grade based on total score
            CASE 
              WHEN total_score >= 90 THEN 'A+'
              WHEN total_score >= 80 THEN 'A'
              WHEN total_score >= 70 THEN 'B+'
              WHEN total_score >= 60 THEN 'B'
              WHEN total_score >= 50 THEN 'C+'
              WHEN total_score >= 40 THEN 'C'
              WHEN total_score >= 30 THEN 'D'
              ELSE 'F'
            END as grade,
            -- Calculate position within subject
            ROW_NUMBER() OVER (PARTITION BY subject_code ORDER BY total_score DESC) as subject_position,
            -- Calculate overall position (average across all subjects)
            ROW_NUMBER() OVER (ORDER BY AVG(total_score) OVER (PARTITION BY admission_no) DESC) as overall_position
          FROM session_aggregates
          WHERE ca_score IS NOT NULL OR exam_score IS NOT NULL
        )
        SELECT
          admission_no,
          student_name,
          class_code,
          class_name,
          subject_code,
          subject,
          ca_score,
          exam_score,
          total_score,
          grade,
          subject_position,
          overall_position,
          ca_terms_count,
          exam_terms_count,
          :academic_year as academic_year,
          'Session Aggregate' as report_type
        FROM ranked_results
        ORDER BY admission_no, subject_code
      `;
    } else if (queryType === 'student' && admissionNo) {
      // Get aggregated report for specific student
      replacements.admissionNo = admissionNo;
      
      query = `
        WITH term_averages AS (
          SELECT
            s.admission_no,
            s.student_name,
            c.class_code,
            c.class_name,
            sub.subject_code,
            sub.subject,
            ws.term,
            -- Average CA scores per term (CA1-CA4)
            AVG(CASE WHEN ws.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4') THEN ws.score END) as term_ca_avg,
            -- Average Exam scores per term
            AVG(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) as term_exam_avg
          FROM weekly_scores ws
          INNER JOIN students s ON ws.admission_no = s.admission_no
          INNER JOIN classes c ON ws.class_code = c.class_code
          INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
          WHERE ws.academic_year = :academic_year
            AND ws.admission_no = :admissionNo
            AND ws.school_id = :schoolId
            AND ws.term IN (${termPlaceholders})
          GROUP BY s.admission_no, s.student_name, c.class_code, c.class_name, 
                   sub.subject_code, sub.subject, ws.term
        ),
        session_aggregates AS (
          SELECT
            admission_no,
            student_name,
            class_code,
            class_name,
            subject_code,
            subject,
            -- Average CA across all available terms
            ROUND(AVG(term_ca_avg), 2) as ca_score,
            -- Average Exam across all available terms  
            ROUND(AVG(term_exam_avg), 2) as exam_score,
            -- Calculate total score using dynamic weights
            ROUND((AVG(term_ca_avg) * :caWeight) + (AVG(term_exam_avg) * :examWeight), 2) as total_score,
            COUNT(DISTINCT CASE WHEN term_ca_avg IS NOT NULL THEN term END) as ca_terms_count,
            COUNT(DISTINCT CASE WHEN term_exam_avg IS NOT NULL THEN term END) as exam_terms_count
          FROM term_averages
          GROUP BY admission_no, student_name, class_code, class_name, subject_code, subject
        )
        SELECT
          admission_no,
          student_name,
          class_code,
          class_name,
          subject_code,
          subject,
          ca_score,
          exam_score,
          total_score,
          -- Calculate grade based on total score
          CASE 
            WHEN total_score >= 90 THEN 'A+'
            WHEN total_score >= 80 THEN 'A'
            WHEN total_score >= 70 THEN 'B+'
            WHEN total_score >= 60 THEN 'B'
            WHEN total_score >= 50 THEN 'C+'
            WHEN total_score >= 40 THEN 'C'
            WHEN total_score >= 30 THEN 'D'
            ELSE 'F'
          END as grade,
          ca_terms_count,
          exam_terms_count,
          :academic_year as academic_year,
          'Session Aggregate' as report_type
        FROM session_aggregates
        WHERE ca_score IS NOT NULL OR exam_score IS NOT NULL
        ORDER BY subject_code
      `;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid queryType or missing required parameters. Use 'class' with class_code or 'student' with admissionNo.",
      });
    }

    const results = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT,
    });

    if (!results || results.length === 0) {
      return res.json({
        success: true,
        message: "No data found for the specified criteria.",
        data: {
          academic_year,
          class_code,
          queryType,
          report_type: 'Session Aggregate',
          students: [],
          summary: {
            total_students: 0,
            total_subjects: 0,
            terms_covered: termNames,
            terms_count: termNames.length,
            school_term_structure: `${termNames.length}-term system`,
            weights: {
              ca_weight: totalCaWeight,
              exam_weight: examWeight
            }
          }
        },
      });
    }

    // Group results by student for better organization
    const groupedResults = {};
    results.forEach(row => {
      if (!groupedResults[row.admission_no]) {
        groupedResults[row.admission_no] = {
          admission_no: row.admission_no,
          student_name: row.student_name,
          class_code: row.class_code,
          class_name: row.class_name,
          overall_position: row.overall_position || null,
          subjects: []
        };
      }
      
      groupedResults[row.admission_no].subjects.push({
        subject_code: row.subject_code,
        subject: row.subject,
        ca_score: row.ca_score,
        exam_score: row.exam_score,
        total_score: row.total_score,
        grade: row.grade,
        subject_position: row.subject_position || null,
        ca_terms_count: row.ca_terms_count,
        exam_terms_count: row.exam_terms_count
      });
    });

    const students = Object.values(groupedResults);
    const uniqueSubjects = [...new Set(results.map(r => r.subject_code))];

    res.json({
      success: true,
      message: "End of session aggregate report generated successfully.",
      data: {
        academic_year,
        class_code,
        queryType,
        report_type: 'Session Aggregate',
        students,
        summary: {
          total_students: students.length,
          total_subjects: uniqueSubjects.length,
          terms_covered: termNames,
          terms_count: termNames.length,
          school_term_structure: `${termNames.length}-term system`,
          weights: {
            ca_weight: totalCaWeight,
            exam_weight: examWeight
          },
          calculation_method: {
            ca_score: `Average of CA1-CA4 across ${termNames.length} terms`,
            exam_score: `Average of EXAM scores across ${termNames.length} terms`, 
            total_score: `${totalCaWeight}% CA + ${examWeight}% Exam`,
            terms_used: termNames.join(', '),
            grading: "A+ (90+), A (80+), B+ (70+), B (60+), C+ (50+), C (40+), D (30+), F (<30)"
          }
        }
      },
    });

  } catch (error) {
    console.error("Error in getEndOfSessionAggregateReport:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating the end of session aggregate report.",
      error: error.message,
    });
  }
};

module.exports = {
  // CA Setup
  getAllCASetups,
  getCASetup,
  createUpdateCASetup,
  deleteCASetup,
  updateCASetupStatus,
  lockUnlockCASetup,
  // Grade Boundaries
  getGradeBoundaries,
  createUpdateGradeBoundaries,
  deleteGradeBoundaries,
  // Academic Data
  getClasses,
  getSubjectsByClass,
  getStudentsByClassSubject,
  // Dashboard / Weeks
  getAcademicWeeks,
  getDashboardData,
  getWeekAccessControl,
  updateWeekAccessControl,
  // Scores
  insertUpdateScore,
  bulkInsertUpdateScores,
  deleteScore,
  // Stats/Reports
  getCAStatistics,
  generateCAReport,
  // Admin
  lockAllScores,
  unlockSpecificWeek,
  handleGetScoreRequest,
  getClassCAReports,
  getStudentEndOfTermReport,
  getClassEndOfTermReport,
  getEndOfTermReport,
  getEndOfSessionAggregateReport,
  getClassSharedData,
  getStudentRemarksAndSignatures,
  getAssessmentProgress,
  listCASetups,
  updateScoreStatus,
  getSectionCASetup,
  getSectionReleaseStatus,
  // Assessment Workflow Management
  releaseAssessment,
  lockAssessment,
  unlockAssessment,
  changeAssessmentStatus,
  sendTeacherNotification,
  setSubmissionDeadline,
};
