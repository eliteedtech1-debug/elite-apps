const {
  classes,
  getAllClasses,
  getAllClassesWithArms,
  createClasses,
  get_section,
  get_section_classes,
  getClassSections,
  assignFormMaster,
  getAvailableTeachers,
  assignSubjectTeacher,
  getClassSubjects,
  getSubjects,
  getClassSpecificSubjects,
  checkClassNamesExistence,
  getSectionSubjectAssignments,
  updateFormMaster,
} = require("../controllers/class_management");
const config = require("../config/config");
const {
  handleSubjectOperations,
  getSubjectsLegacy,
} = require("../controllers/subjects");

const passport = require("passport");
const {
  deleteClasses,
  updateClasses,
} = require("../controllers/classController.backup");

const db = require("../models");
const { deleteSection } = require("../controllers/sections");

module.exports = (app) => {

  // Working routes only - removed undefined functions
  
  app.post(
    "/classes",
    passport.authenticate("jwt", { session: false }),
    createClasses
  );
  app.put(
    "/classes",
    passport.authenticate("jwt", { session: false }),
    updateClasses
  );
  app.delete(
    "/classes",
    passport.authenticate("jwt", { session: false }),
    deleteClasses
  );
  app.put(
    "/classes/:class_code/form-master",
    passport.authenticate("jwt", {
      session: false
    }),
    updateFormMaster
  );
  app.get(
    "/classes",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;
      classes(req, res);
    }
  );
  app.get(
    "/getAllClasses",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;
      getAllClasses(req, res);
    }
  );
  app.get(
    "/getAllClassesWithArms",
    passport.authenticate("jwt", { session: false }),
    getAllClassesWithArms
  );
  app.get(
    "/getAllClassesWithCount",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;
      getAllClasses(req, res);
    }
  );

  app.get(
    "/get_sections",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;
      get_section(req, res);
    }
  );
  app.post(
    "/subjects",
    passport.authenticate("jwt", {
      session: false
    }),
    handleSubjectOperations // Enhanced controller
  );
  app.get(
    "/subjects",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      // Add debugging and fallback for Subject model issues
      const db = require("../models");
      console.log("🔍 GET /subjects route called");
      console.log("db available:", !!db);
      console.log("db.Subject available:", !!db?.Subject);

      if (!db || !db.Subject) {
        console.error("❌ Subject model not available in route");
        return res.status(500).json({
          success: false,
          message: "Subject model is not available. Database connection issue.",
          debug: {
            db_available: !!db,
            subject_model_available: !!db?.Subject,
            available_models: db ?
              Object.keys(db).filter(
                (key) => typeof db[key] === "object" && db[key].name
              ) :
              [],
          },
        });
      }

      // Call the legacy handler
      getSubjectsLegacy(req, res, next);
    }
  );
  app.get(
    "/get-sections",
    passport.authenticate("jwt", {
      session: false
    }),
    async (req, res) => {
      const {
        branch_id = null,
        school_id = null
      } = req.query;

      // Priority: query params > headers > JWT user values
      const final_branch_id = branch_id || req.headers['x-branch-id'] || req.user?.branch_id;
      const final_school_id = school_id || req.headers['x-school-id'] || req.user?.school_id;

      console.log("🔍 get-sections called with:", {
        branch_id: final_branch_id,
        school_id: final_school_id,
      });

      try {
        if (!final_branch_id) {
          return res.status(400).json({
            success: false,
            message: "Branch ID is required",
          });
        }

        // Get sections from school_section_table for the branch
        const sections = await db.sequelize.query(
          `SELECT section_id, section_name, school_id, branch_id, section_address, status 
           FROM school_section_table 
           WHERE branch_id = ? AND school_id = ? AND status = 'Active' 
           ORDER BY section_name`, {
            replacements: [final_branch_id, final_school_id],
            type: db.sequelize.QueryTypes.SELECT,
          }
        );

        console.log("📝 Found sections:", sections);

        res.json({
          success: true,
          data: sections,
        });
      } catch (err) {
        console.error("Error in get-sections:", err);
        res.status(500).json({
          success: false,
          message: "An error occurred while fetching sections.",
          error: err.message,
        });
      }
    }
  );
  app.get(
    "/get_sections",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;
      get_section(req, res);
    }
  );
  // API Endpoint
  app.get("/get_section_classes/:section", (req, res, next) => {
    req.body = {
      query_type: "select-section-classes",
      section: req.params.section,
    };
    get_section_classes(req, res);
  });

  // Get available class sections for filtering
  app.get(
    "/class-sections",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;
      getClassSections(req, res);
    }
  )
  // Get available class sections for filtering
  app.post(
    "/class-sections",
    passport.authenticate("jwt", {
      session: false
    }),
    getClassSections
  );


  // Branch sections endpoint for section deletion
  app.post(
    "/branch/sections",
    passport.authenticate("jwt", {
      session: false
    }),
    deleteSection
  );

  // Form Master assignment endpoints
  app.post(
    "/assign-form-master",
    passport.authenticate("jwt", {
      session: false
    }),
    assignFormMaster
  );

  app.get(
    "/available-teachers",
    passport.authenticate("jwt", {
      session: false
    }),
    getAvailableTeachers
  );

  // Subject teacher assignment endpoints
  app.post(
    "/assign-subject-teacher",
    passport.authenticate("jwt", {
      session: false
    }),
    assignSubjectTeacher
  );

  app.get(
    "/class-subjects/:class_code",
    passport.authenticate("jwt", {
      session: false
    }),
    getClassSubjects
  );

  app.get(
    "/subjects",
    passport.authenticate("jwt", {
      session: false
    }),
    getSubjects
  );

  app.get(
    "/class-specific-subjects/:class_code",
    passport.authenticate("jwt", {
      session: false
    }),
    getClassSpecificSubjects
  );

  // Get all subject-teacher assignments for a section (for Smart Timetable)
  app.get(
    "/section-subject-assignments",
    passport.authenticate("jwt", {
      session: false
    }),
    getSectionSubjectAssignments
  );

  app.post('/classes/check-existance',
    passport.authenticate("jwt", {
      session: false
    }),
    checkClassNamesExistence
  )
};