/**
 * Question Paper PDF Generation Service
 *
 * Generates printable question papers from approved submissions
 * Uses the uploaded question file and wraps it with school letterhead
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../models');

/**
 * Generate PDF metadata for a submission
 * This returns the information needed to generate/download the PDF
 * The actual PDF rendering will be done on the frontend using @react-pdf/renderer
 *
 * @param {number} submissionId - Submission ID
 * @returns {Promise<Object>} PDF metadata
 */
async function generateQuestionPaperPDF(submissionId) {
  try {
    // Get submission details with all related information
    const [submission] = await db.sequelize.query(
      `SELECT
        ces.*,
        cs.ca_type,
        cs.max_score,
        u.name as teacher_name,
        ss.school_name,
        ss.school_short_name,
        ss.school_logo,
        ss.school_address,
        ss.school_phone,
        ss.school_email,
        sub.subject as subject_name,
        c.class_name
       FROM ca_exam_submissions ces
       LEFT JOIN ca_setup cs ON ces.ca_setup_id = cs.id
       LEFT JOIN users u ON ces.teacher_id = u.id
       LEFT JOIN school_setup ss ON ces.school_id = ss.school_id
       LEFT JOIN subjects sub ON ces.subject_id = sub.subject_id
       LEFT JOIN classes c ON ces.class_id = c.class_code
       WHERE ces.id = :submission_id`,
      {
        replacements: { submission_id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Check if submission is approved
    if (submission.status !== 'Approved') {
      throw new Error(`Cannot generate PDF. Submission status is: ${submission.status}`);
    }

    // Get the question file URL (either original or replacement)
    const questionFileUrl = submission.replacement_file_url || submission.question_file_url;
    const questionFileName = submission.replacement_file_name || submission.question_file_name;

    if (!questionFileUrl) {
      throw new Error('No question file found for this submission');
    }

    // Return PDF metadata for frontend rendering
    const pdfMetadata = {
      success: true,
      submission: {
        id: submission.id,
        submission_code: submission.submission_code,
        ca_type: submission.ca_type,
        max_score: submission.max_score,
        subject_name: submission.subject_name,
        class_name: submission.class_name,
        teacher_name: submission.teacher_name,
        academic_year: submission.academic_year,
        term: submission.term
      },
      school: {
        school_name: submission.school_name,
        short_name: submission.school_short_name,
        logo: submission.school_logo,
        address: submission.school_address,
        phone: submission.school_phone,
        email: submission.school_email
      },
      questionFile: {
        url: questionFileUrl,
        fileName: questionFileName,
        fileType: submission.question_file_type
      },
      generatedAt: new Date().toISOString()
    };

    return pdfMetadata;

  } catch (error) {
    console.error('Error generating PDF metadata:', error);
    throw error;
  }
}

/**
 * Generate PDFs for multiple submissions (bulk generation)
 * @param {Array<number>} submissionIds - Array of submission IDs
 * @returns {Promise<Array>} Array of PDF metadata
 */
async function generateBulkPapers(submissionIds) {
  try {
    const pdfMetadataArray = [];

    for (const submissionId of submissionIds) {
      try {
        const metadata = await generateQuestionPaperPDF(submissionId);
        pdfMetadataArray.push(metadata);
      } catch (error) {
        console.error(`Error generating PDF for submission ${submissionId}:`, error);
        pdfMetadataArray.push({
          success: false,
          submissionId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      total: submissionIds.length,
      successful: pdfMetadataArray.filter(p => p.success).length,
      failed: pdfMetadataArray.filter(p => !p.success).length,
      pdfs: pdfMetadataArray
    };

  } catch (error) {
    console.error('Error generating bulk PDFs:', error);
    throw error;
  }
}

/**
 * Get question file path for download
 * @param {number} submissionId - Submission ID
 * @returns {Promise<string>} File path
 */
async function getQuestionFilePath(submissionId) {
  try {
    const [submission] = await db.sequelize.query(
      `SELECT question_file_url, replacement_file_url, question_file_name
       FROM ca_exam_submissions
       WHERE id = :submission_id`,
      {
        replacements: { submission_id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!submission) {
      throw new Error('Submission not found');
    }

    const fileUrl = submission.replacement_file_url || submission.question_file_url;

    if (!fileUrl) {
      throw new Error('No question file found');
    }

    // Return full file path
    const filePath = path.join(process.cwd(), fileUrl);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error('Question file not found on server');
    }

    return {
      filePath,
      fileName: submission.question_file_name
    };

  } catch (error) {
    console.error('Error getting question file path:', error);
    throw error;
  }
}

/**
 * Log print activity
 * @param {number} submissionId - Submission ID
 * @param {number} userId - User ID who printed
 * @param {string} printType - 'Preview', 'Download', or 'Print'
 * @param {number} copiesCount - Number of copies
 */
async function logPrintActivity(submissionId, userId, printType, copiesCount = 1) {
  try {
    // Get submission details for logging
    const [submission] = await db.sequelize.query(
      `SELECT school_id, branch_id FROM ca_exam_submissions WHERE id = :submission_id`,
      {
        replacements: { submission_id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Insert print log
    await db.sequelize.query(
      `INSERT INTO ca_exam_print_logs (
        submission_id,
        school_id,
        branch_id,
        printed_by,
        print_date,
        print_type,
        copies_count
      ) VALUES (
        :submission_id,
        :school_id,
        :branch_id,
        :printed_by,
        NOW(),
        :print_type,
        :copies_count
      )`,
      {
        replacements: {
          submission_id: submissionId,
          school_id: submission.school_id,
          branch_id: submission.branch_id,
          printed_by: userId,
          print_type: printType,
          copies_count: copiesCount
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    // Update submission print status
    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET is_printed = 1,
           printed_by = :printed_by,
           printed_date = NOW(),
           print_count = print_count + 1
       WHERE id = :submission_id`,
      {
        replacements: {
          submission_id: submissionId,
          printed_by: userId
        },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    console.log(`✅ Print activity logged: ${printType} for submission ${submissionId}`);
    return { success: true };

  } catch (error) {
    console.error('Error logging print activity:', error);
    throw error;
  }
}

module.exports = {
  generateQuestionPaperPDF,
  generateBulkPapers,
  getQuestionFilePath,
  logPrintActivity
};
