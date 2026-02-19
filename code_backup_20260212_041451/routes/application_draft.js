const { 
  saveApplicationDraft,
  getUserDrafts,
  getDraftDetails,
  deleteDraft,
  convertDraftToApplication,
  generateApplicationPreview
} = require("../controllers/application_draft");
const passport = require("passport");

module.exports = (app) => {
  // Save application as draft
  app.post("/drafts/save",
    passport.authenticate('jwt', { session: false }),
    saveApplicationDraft
  );

  // Get user's application drafts
  app.get("/drafts",
    passport.authenticate('jwt', { session: false }),
    getUserDrafts
  );

  // Get specific draft details
  app.get("/drafts/:draft_id",
    passport.authenticate('jwt', { session: false }),
    getDraftDetails
  );

  // Delete application draft
  app.delete("/drafts/:draft_id",
    passport.authenticate('jwt', { session: false }),
    deleteDraft
  );

  // Convert draft to application
  app.post("/drafts/:draft_id/submit",
    passport.authenticate('jwt', { session: false }),
    convertDraftToApplication
  );

  // Generate application preview
  app.post("/applications/preview",
    passport.authenticate('jwt', { session: false }),
    generateApplicationPreview
  );
};
