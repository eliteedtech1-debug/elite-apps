const { 
  upload,
  uploadDocuments,
  getApplicantDocuments,
  verifyDocument,
  downloadDocument,
  deleteDocument,
  getDocumentVerificationSummary
} = require("../controllers/document_management");
const passport = require("passport");

module.exports = (app) => {
  // Upload documents for an applicant
  app.post("/documents/upload",
    passport.authenticate('jwt', { session: false }),
    upload.array('documents', 10), // Allow up to 10 files
    uploadDocuments
  );

  // Get documents for an applicant
  app.get("/documents/applicant/:applicant_id",
    passport.authenticate('jwt', { session: false }),
    getApplicantDocuments
  );

  // Verify/reject a document
  app.put("/documents/verify/:document_id",
    passport.authenticate('jwt', { session: false }),
    verifyDocument
  );

  // Download a document
  app.get("/documents/download/:document_id",
    passport.authenticate('jwt', { session: false }),
    downloadDocument
  );

  // Delete a document
  app.delete("/documents/:document_id",
    passport.authenticate('jwt', { session: false }),
    deleteDocument
  );

  // Get document verification summary
  app.get("/documents/verification-summary",
    passport.authenticate('jwt', { session: false }),
    getDocumentVerificationSummary
  );
};
