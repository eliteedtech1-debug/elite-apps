const db = require("../models");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

/**
 * Document Management Controller
 * Handles document upload, verification, and management for applications
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/documents");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow specific file types
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, DOC, and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Upload documents for an application
 */
const uploadDocuments = async (req, res) => {
  try {
    const { applicant_id, document_type, description = '' } = req.body;
    const uploaded_by = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    // Verify applicant exists and belongs to the school
    const applicant = await db.sequelize.query(
      `SELECT applicant_id FROM school_applicants WHERE applicant_id = :applicant_id AND school_id = :school_id`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!applicant.length) {
      return res.status(404).json({
        success: false,
        message: "Applicant not found"
      });
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      const documentData = {
        document_id: uuidv4(),
        applicant_id,
        document_type,
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        description,
        uploaded_by,
        school_id,
        branch_id,
        verification_status: 'pending',
        upload_date: new Date()
      };

      // Insert document record
      await db.sequelize.query(
        `INSERT INTO application_documents 
         (document_id, applicant_id, document_type, original_filename, stored_filename, 
          file_path, file_size, mime_type, description, uploaded_by, school_id, branch_id, 
          verification_status, upload_date, created_at)
         VALUES (:document_id, :applicant_id, :document_type, :original_filename, :stored_filename,
                 :file_path, :file_size, :mime_type, :description, :uploaded_by, :school_id, :branch_id,
                 :verification_status, :upload_date, NOW())`,
        {
          replacements: documentData
        }
      );

      uploadedDocuments.push({
        document_id: documentData.document_id,
        original_filename: documentData.original_filename,
        document_type: documentData.document_type,
        file_size: documentData.file_size,
        upload_date: documentData.upload_date
      });
    }

    res.json({
      success: true,
      message: "Documents uploaded successfully",
      data: {
        applicant_id,
        uploaded_documents: uploadedDocuments
      }
    });

  } catch (error) {
    console.error("Error uploading documents:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading documents",
      error: error.message
    });
  }
};

/**
 * Get documents for an applicant
 */
const getApplicantDocuments = async (req, res) => {
  try {
    const { applicant_id } = req.params;
    const school_id = req.user?.school_id;

    const documents = await db.sequelize.query(
      `SELECT 
         ad.document_id,
         ad.document_type,
         ad.original_filename,
         ad.file_size,
         ad.mime_type,
         ad.description,
         ad.verification_status,
         ad.verification_notes,
         ad.verified_by,
         ad.verified_at,
         ad.upload_date,
         ad.created_at,
         u1.name as uploaded_by_name,
         u2.name as verified_by_name
       FROM application_documents ad
       LEFT JOIN users u1 ON ad.uploaded_by = u1.id
       LEFT JOIN users u2 ON ad.verified_by = u2.id
       WHERE ad.applicant_id = :applicant_id AND ad.school_id = :school_id
       ORDER BY ad.upload_date DESC`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        applicant_id,
        documents
      }
    });

  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching documents",
      error: error.message
    });
  }
};

/**
 * Verify/reject a document
 */
const verifyDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const { verification_status, verification_notes = '' } = req.body;
    const verified_by = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;

    if (!['approved', 'rejected', 'requires_resubmission'].includes(verification_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status"
      });
    }

    // Check if document exists and belongs to the school
    const document = await db.sequelize.query(
      `SELECT document_id, applicant_id FROM application_documents 
       WHERE document_id = :document_id AND school_id = :school_id`,
      {
        replacements: { document_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!document.length) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Update document verification status
    await db.sequelize.query(
      `UPDATE application_documents 
       SET verification_status = :verification_status,
           verification_notes = :verification_notes,
           verified_by = :verified_by,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE document_id = :document_id`,
      {
        replacements: {
          verification_status,
          verification_notes,
          verified_by,
          document_id
        }
      }
    );

    // Log verification activity
    await db.sequelize.query(
      `INSERT INTO application_status_history 
       (applicant_id, previous_status, new_status, comments, updated_by, school_id, created_at)
       VALUES (:applicant_id, 'document_verification', :new_status, :comments, :updated_by, :school_id, NOW())`,
      {
        replacements: {
          applicant_id: document[0].applicant_id,
          new_status: `document_${verification_status}`,
          comments: `Document verification: ${verification_status}. ${verification_notes}`,
          updated_by: verified_by,
          school_id
        }
      }
    );

    res.json({
      success: true,
      message: "Document verification updated successfully",
      data: {
        document_id,
        verification_status,
        verified_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error verifying document:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying document",
      error: error.message
    });
  }
};

/**
 * Download a document
 */
const downloadDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const school_id = req.user?.school_id;

    const document = await db.sequelize.query(
      `SELECT file_path, original_filename, mime_type 
       FROM application_documents 
       WHERE document_id = :document_id AND school_id = :school_id`,
      {
        replacements: { document_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!document.length) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    const filePath = document[0].file_path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server"
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document[0].original_filename}"`);
    res.setHeader('Content-Type', document[0].mime_type);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading document",
      error: error.message
    });
  }
};

/**
 * Delete a document
 */
const deleteDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const school_id = req.user?.school_id;
    const deleted_by = req.user?.id || req.user?.user_id;

    // Get document details
    const document = await db.sequelize.query(
      `SELECT file_path, applicant_id, original_filename 
       FROM application_documents 
       WHERE document_id = :document_id AND school_id = :school_id`,
      {
        replacements: { document_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!document.length) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Delete file from filesystem
    const filePath = document[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document record
    await db.sequelize.query(
      `DELETE FROM application_documents WHERE document_id = :document_id`,
      {
        replacements: { document_id }
      }
    );

    // Log deletion activity
    await db.sequelize.query(
      `INSERT INTO application_status_history 
       (applicant_id, previous_status, new_status, comments, updated_by, school_id, created_at)
       VALUES (:applicant_id, 'document_management', 'document_deleted', :comments, :updated_by, :school_id, NOW())`,
      {
        replacements: {
          applicant_id: document[0].applicant_id,
          comments: `Document deleted: ${document[0].original_filename}`,
          updated_by: deleted_by,
          school_id
        }
      }
    );

    res.json({
      success: true,
      message: "Document deleted successfully",
      data: {
        document_id,
        deleted_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting document",
      error: error.message
    });
  }
};

/**
 * Get document verification summary
 */
const getDocumentVerificationSummary = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;

    let branchFilter = '';
    if (branch_id) {
      branchFilter = `AND ad.branch_id = '${branch_id}'`;
    }

    const summary = await db.sequelize.query(`
      SELECT 
        ad.verification_status,
        COUNT(*) as count,
        COUNT(DISTINCT ad.applicant_id) as unique_applicants
      FROM application_documents ad
      WHERE ad.school_id = :school_id ${branchFilter}
      GROUP BY ad.verification_status
      ORDER BY count DESC
    `, {
      replacements: { school_id },
      type: db.sequelize.QueryTypes.SELECT
    });

    const pendingDocuments = await db.sequelize.query(`
      SELECT 
        ad.document_id,
        ad.applicant_id,
        sa.name_of_applicant,
        ad.document_type,
        ad.original_filename,
        ad.upload_date,
        DATEDIFF(NOW(), ad.upload_date) as days_pending
      FROM application_documents ad
      JOIN school_applicants sa ON ad.applicant_id = sa.applicant_id
      WHERE ad.school_id = :school_id ${branchFilter}
      AND ad.verification_status = 'pending'
      ORDER BY ad.upload_date ASC
      LIMIT 20
    `, {
      replacements: { school_id },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        verification_summary: summary,
        pending_documents: pendingDocuments
      }
    });

  } catch (error) {
    console.error("Error fetching document verification summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching document verification summary",
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadDocuments,
  getApplicantDocuments,
  verifyDocument,
  downloadDocument,
  deleteDocument,
  getDocumentVerificationSummary
};
