const passport = require("passport");
const config = require("../config/config");
const {
  // Enhanced functions
  enhanced_time_slots,
  get_enhanced_time_slots,
  delete_enhanced_time_slots,
  get_nigerian_templates,
  generate_from_template,
  get_teacher_assignments,
  generate_ai_timetable,
  get_prayer_times,
  get_ramadan_adjustments,
  bulk_enhanced_time_slots,
  
  // Backward compatibility
  class_timing,
  get_class_timing,
  delete_class_timing,
  bulk_class_timing,
  get_time_slots,
} = require("../controllers/class_timing");

module.exports = (app) => {
  // Health check endpoint for debugging
  app.get("/health", (req, res) => {
    res.json({ 
      success: true, 
      message: "Enhanced Time Slots API is running", 
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 54001,
      features: ['Nigerian Templates', 'AI Optimization', 'Cultural Integration']
    });
  });

  // Enhanced Nigerian School Time Slot Management
  app.post("/api/enhanced-time-slots", passport.authenticate("jwt", { session: false }), enhanced_time_slots);
  app.get("/api/enhanced-time-slots", passport.authenticate("jwt", { session: false }), get_enhanced_time_slots);
  app.delete("/api/enhanced-time-slots", passport.authenticate("jwt", { session: false }), delete_enhanced_time_slots);
  app.get("/api/nigerian-templates", passport.authenticate("jwt", { session: false }), get_nigerian_templates);
  app.post("/api/generate-from-template", passport.authenticate("jwt", { session: false }), generate_from_template);
  app.get("/api/teacher-assignments", passport.authenticate("jwt", { session: false }), get_teacher_assignments);
  app.post("/api/generate-ai-timetable", passport.authenticate("jwt", { session: false }), generate_ai_timetable);
  app.get("/api/prayer-times", passport.authenticate("jwt", { session: false }), get_prayer_times);
  app.get("/api/ramadan-adjustments", passport.authenticate("jwt", { session: false }), get_ramadan_adjustments);
  app.post("/api/bulk-enhanced-time-slots", passport.authenticate("jwt", { session: false }), bulk_enhanced_time_slots);
  
  // Advanced AI Optimization
  app.post("/api/generate-ai-timetable", passport.authenticate("jwt", { session: false }), generate_ai_timetable);

  // Backward compatibility endpoints
  app.post("/class_timing", passport.authenticate("jwt", { session: false }), class_timing);
  app.post("/bulk_class_timing", passport.authenticate("jwt", { session: false }), bulk_class_timing);
  app.get("/get_class_timing", passport.authenticate("jwt", { session: false }), get_class_timing);
  app.delete("/class_timing", passport.authenticate("jwt", { session: false }), delete_class_timing);
  app.get("/time_slots", 
    (req, res, next) => {
      console.log(`🔍 /time_slots endpoint hit:`);
      console.log(`   Query params:`, req.query);
      console.log(`   Headers:`, {
        'x-school-id': req.headers['x-school-id'],
        'x-branch-id': req.headers['x-branch-id'],
        'authorization': req.headers.authorization ? 'Bearer [PRESENT]' : 'MISSING'
      });
      console.log(`   User:`, req.user ? { id: req.user.id, school_id: req.user.school_id } : 'NOT_AUTHENTICATED');
      next();
    },
    passport.authenticate("jwt", { session: false }), 
    get_time_slots
  );
};
