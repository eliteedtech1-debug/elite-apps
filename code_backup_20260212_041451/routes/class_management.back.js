const {
  class_management,
  get_class_management,

  get_section,
  get_section_classes,
} = require("../controllers/class_management");
const { deleteSection } = require("../controllers/sections");
const config = require("../config/config");
// OLD: const { subjects, get_subjects } = require("../controllers/subject_management"); // DEPRECATED
const { handleSubjectOperations, getSubjectsLegacy } = require("../controllers/subjects");
const passport = require("passport");
const {
  getAllClasses,
  createClasses,
  deleteClasses,
  updateClasses,
  classOperationRouter,
  getClassSections,
  assignFormMaster,
  getAvailableTeachers,
  assignSubjectTeacher,
  getClassSubjects,
  getSubjects,
  getClassSpecificSubjects,
} = require("../controllers/classController");

// Debug: Check if models are loading correctly
const db = require("../models");
console.log('🔍 Route initialization - db available:', !!db);
console.log('🔍 Route initialization - db.Subject available:', !!db?.Subject);
if (db) {
    console.log('🔍 Available models:', Object.keys(db).filter(key => typeof db[key] === 'object' && db[key].name));
}

module.exports = (app) => {
  app.post(
    "/class_management",
    passport.authenticate("jwt", { session: false }),
    class_management
  );
  app.get(
    "/get_class_management",

    passport.authenticate("jwt", { session: false }),
    get_class_management
  );

  app.post(
    "/classes",
    passport.authenticate("jwt", {
      session: false,
    }),
    classOperationRouter
  );
  app.delete(
    "/classes",
    passport.authenticate("jwt", {
      session: false,
    }),
    deleteClasses
  );
  app.put(
    "/classes",
    passport.authenticate("jwt", {
      session: false,
    }),
    updateClasses
  );
  app.get(
    "/classes",
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      req.body = req.query;
      getAllClasses(req, res);
    }
  );

  // Get available class sections for filtering
  app.get(
    "/class-sections",
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      req.body = req.query;
      getClassSections(req, res);
    }
  );

  app.get(
    "/get_sections",
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      req.body = req.query;
      get_section(req, res);
    }
  );
    app.post(
        "/subjects",
        passport.authenticate('jwt', { session: false }),
        handleSubjectOperations // Enhanced controller
    );
    app.get(
        "/subjects",
        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            // Add debugging and fallback for Subject model issues
            const db = require("../models");
            console.log('🔍 GET /subjects route called');
            console.log('db available:', !!db);
            console.log('db.Subject available:', !!db?.Subject);
            
            if (!db || !db.Subject) {
                console.error('❌ Subject model not available in route');
                return res.status(500).json({
                    success: false,
                    message: "Subject model is not available. Database connection issue.",
                    debug: {
                        db_available: !!db,
                        subject_model_available: !!db?.Subject,
                        available_models: db ? Object.keys(db).filter(key => typeof db[key] === 'object' && db[key].name) : []
                    }
                });
            }
            
            // Call the legacy handler
            getSubjectsLegacy(req, res, next);
        }
    );
    app.get("/get-sections", 
        passport.authenticate('jwt', { session: false }),
        async (req, res) => {
            const { branch_id = null } = req.query;
            
            console.log('🔍 get-sections called with:', { branch_id, user_branch: req.user?.branch_id });
            
            try {
                const final_branch_id = branch_id || req.user?.branch_id;
                
                if (!final_branch_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Branch ID is required'
                    });
                }
                
                // Get distinct sections from classes table for the branch
                const sections = await db.sequelize.query(
                    `SELECT DISTINCT section as section_name FROM classes WHERE branch_id = ? AND school_id = ? AND status = 'Active' ORDER BY section`,
                    {
                        replacements: [final_branch_id, req.user.school_id],
                        type: db.sequelize.QueryTypes.SELECT
                    }
                );
                
                console.log('📝 Found sections:', sections);
                
                res.json({
                    success: true,
                    data: sections // UI expects 'data' property
                });
            } catch (err) {
                console.error('Error in get-sections:', err);
                res.status(500).json({
                    success: false,
                    message: 'An error occurred while fetching sections.',
                    error: err.message
                });
            }
        }
      );
    app.get("/get_sections", 
        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
        req.body = req.query;
        get_section(req, res);
      });
      // API Endpoint
  app.get("/get_section_classes/:section", (req, res, next) => {
    req.body = {
      query_type: "select-section-classes",
      section: req.params.section,
    };
    get_section_classes(req, res);
  });

  // Branch sections endpoint for section deletion
  app.post(
    "/branch/sections",
    passport.authenticate("jwt", { session: false }),
    deleteSection
  );

  // Form Master assignment endpoints
  app.post(
    "/assign-form-master",
    passport.authenticate("jwt", { session: false }),
    assignFormMaster
  );

  app.get(
    "/available-teachers",
    passport.authenticate("jwt", { session: false }),
    getAvailableTeachers
  );

  // Subject teacher assignment endpoints
  app.post(
    "/assign-subject-teacher",
    passport.authenticate("jwt", { session: false }),
    assignSubjectTeacher
  );

  app.get(
    "/class-subjects/:class_code",
    passport.authenticate("jwt", { session: false }),
    getClassSubjects
  );

  app.get(
    "/subjects",
    passport.authenticate("jwt", { session: false }),
    getSubjects
  );

  app.get(
    "/class-specific-subjects/:class_code",
    passport.authenticate("jwt", { session: false }),
    getClassSpecificSubjects
  );
};
