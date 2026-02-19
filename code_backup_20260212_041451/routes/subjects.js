const passport = require("passport");
const {
  getSubjectsBySection,
  getElectiveGroups,
  getSubjectsLegacy,
  updateSubjectElective,
  handleSubjectOperations,
  getSubjectsByClass
} = require("../controllers/subjects");

module.exports = (app) => {
  /**
   * POST /subjects
   * Handle various subject operations based on query_type
   * 
   * Body parameters:
   * - query_type (required): Operation type (create_bulk, assign_to_class, remove_from_class, update_subject, soft_delete_subject, enable_subject)
   * - school_id (required): School ID
   * - branch_id (required): Branch ID
   * - subject_code (optional): Subject code for update/delete operations
   * - subject (optional): Subject name
   * - type (optional): Subject type
   * - status (optional): Subject status
   * - apply_to_all (optional): Boolean to apply changes to all classes
   * - section (optional): Section name for bulk operations
   * - classes (optional): Array of class codes for bulk operations
   * - subjects (optional): Array of subjects for bulk operations
   */
  app.post(
    "/subjects",
    passport.authenticate("jwt", { session: false }),
    handleSubjectOperations
  );

  /**
   * POST /subjects/update_elective
   * Update elective information for a subject
   * 
   * Body parameters:
   * - subject_code (required): Subject code
   * - is_elective (optional): Boolean indicating if subject is elective
   * - elective_group (optional): Elective group name
   * - school_id (optional): School ID (defaults to authenticated user's school)
   */
  app.post(
    "/subjects/update_elective",
    passport.authenticate("jwt", { session: false }),
    updateSubjectElective
  );

  /**
   * GET /subjects/by-section
   * Get subjects filtered by section with elective support
   * 
   * Query parameters:
   * - section (required): Section name (e.g., NURSERY, PRIMARY, JUNIOR SECONDARY)
   * - school_id (optional): School ID (defaults to authenticated user's school)
   * - include_electives (optional): 'true' (default), 'false', or 'only'
   * - elective_group (optional): Filter by specific elective group
   */
  app.get(
    "/subjects/by-section",
    (req, res, next) => {
      console.log(`🔍 /subjects/by-section endpoint hit:`);
      console.log(`   Query params:`, req.query);
      console.log(`   User:`, req.user ? { id: req.user.id, school_id: req.user.school_id } : 'NOT_AUTHENTICATED');
      next();
    },
    passport.authenticate("jwt", { session: false }),
    getSubjectsBySection
  );

  /**
   * GET /subjects/elective-groups
   * Get available elective groups for a section
   * 
   * Query parameters:
   * - section (required): Section name
   * - school_id (optional): School ID (defaults to authenticated user's school)
   */
  app.get(
    "/subjects/elective-groups",
    passport.authenticate("jwt", { session: false }),
    getElectiveGroups
  );

  /**
   * GET /subjects
   * Legacy endpoint for backward compatibility
   * 
   * Query parameters:
   * - query_type: 'select-all' (default)
   * - section (optional): Filter by section
   * - school_id (optional): School ID
   */
  app.get(
    "/subjects",
    (req, res, next) => {
      console.log(`🔍 /subjects (legacy) endpoint hit:`);
      console.log(`   Query params:`, req.query);
      next();
    },
    passport.authenticate("jwt", { session: false }),
    getSubjectsLegacy
  );

  /**
   * GET /subjects/by-class
   * Get all subjects for a specific class
   * Used for student subject assignment
   *
   * Query parameters:
   * - class_code (required): Class code
   * - school_id (optional): School ID (defaults to authenticated user's school)
   */
  app.get(
    "/subjects/by-class",
    passport.authenticate("jwt", { session: false }),
    getSubjectsByClass
  );

  /**
   * GET /subjects/health
   * Health check for subjects API
   */
  app.get("/subjects/health", (req, res) => {
    res.json({
      success: true,
      message: "Subjects API with Enhanced Management Support is running",
      timestamp: new Date().toISOString(),
      endpoints: [
        "POST /subjects",
        "POST /subjects/update_elective",
        "GET /subjects/by-section",
        "GET /subjects/by-class",
        "GET /subjects/elective-groups",
        "GET /subjects (legacy)"
      ]
    });
  });
};