const db = require("../models");
const { Op } = require('sequelize');

/**
 * Enhanced Subjects Controller
 * Replaces stored procedure calls with ORM operations for better maintainability
 * and AI-friendly code structure while maintaining backward compatibility.
 * 
 * BRANCH ISOLATION ENFORCED:
 * - All operations are restricted to user's assigned branch or explicitly validated branches
 * - Cross-branch access is prevented unless user has multi-branch permissions
 * - Branch validation is performed on every request
 */

/**
 * Validate branch access for the current user
 * @param {Object} req - Express request object
 * @param {string} requestedBranchId - Branch ID being requested
 * @returns {Object} - { isValid: boolean, finalBranchId: string, message?: string }
 */
const validateBranchAccess = async (req, requestedBranchId = null) => {
  const user = req.user;
  const userBranchId = user?.branch_id;
  const userType = user?.user_type?.toLowerCase();
  const schoolId = user?.school_id;

  // Developer has access to all branches
  if (userType === 'developer' || userType === 'superadmin') {
    if (requestedBranchId) {
      return { isValid: true, finalBranchId: requestedBranchId, message: "Developer access granted" };
    }
  }

  // If no specific branch requested, use user's branch
  if (!requestedBranchId) {
    if (!userBranchId) {
      return {
        isValid: false,
        finalBranchId: null,
        message: "User is not assigned to any branch. Please contact administrator."
      };
    }
    return {
      isValid: true,
      finalBranchId: userBranchId,
      message: "Using user's assigned branch"
    };
  }

  // If requested branch is same as user's branch, allow
  if (requestedBranchId === userBranchId) {
    return {
      isValid: true,
      finalBranchId: requestedBranchId,
      message: "Access granted to user's assigned branch"
    };
  }

  // If user has no branch_id but is requesting a specific branch, validate it exists
  if (!userBranchId) {
    try {
      const branchExists = await db.sequelize.query(
        "SELECT branch_id FROM school_locations WHERE branch_id = ? AND school_id = ? LIMIT 1",
        {
          replacements: [requestedBranchId, schoolId],
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (branchExists.length > 0) {
        console.log(`🔐 BRANCH ACCESS: User ${user.id} (no assigned branch) accessing branch ${requestedBranchId}`);
        return {
          isValid: true,
          finalBranchId: requestedBranchId,
          message: "Access granted to requested branch"
        };
      } else {
        return {
          isValid: false,
          finalBranchId: null,
          message: "Requested branch does not exist or does not belong to your school"
        };
      }
    } catch (error) {
      console.error("Error validating branch access:", error);
      return {
        isValid: false,
        finalBranchId: null,
        message: "Error validating branch access"
      };
    }
  }

  // Check if user has multi-branch access (for admins or special roles)
  if (userType === 'Admin' || userType === 'SuperAdmin') {
    // Verify the requested branch exists and belongs to the same school
    try {
      const branchExists = await db.sequelize.query(
        "SELECT branch_id FROM school_locations WHERE branch_id = ? AND school_id = ? LIMIT 1",
        {
          replacements: [requestedBranchId, schoolId],
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (branchExists.length > 0) {
        console.log(`🔐 BRANCH ACCESS: Admin ${user.id} accessing branch ${requestedBranchId}`);
        return {
          isValid: true,
          finalBranchId: requestedBranchId,
          message: "Admin access granted to requested branch"
        };
      } else {
        return {
          isValid: false,
          finalBranchId: null,
          message: "Requested branch does not exist or does not belong to your school"
        };
      }
    } catch (error) {
      console.error("Error validating branch access:", error);
      return {
        isValid: false,
        finalBranchId: null,
        message: "Error validating branch access"
      };
    }
  }

  // For non-admin users, deny cross-branch access
  console.warn(`⚠️ SECURITY ALERT: User ${user.id} (${userType}) attempted to access branch ${requestedBranchId} but is assigned to ${userBranchId}`);
  return {
    isValid: false,
    finalBranchId: null,
    message: "You do not have permission to access this branch"
  };
};

/**
 * Create a single subject
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// const createSubject = async (req, res) => {
//   try {
//     const {
//       subject,
//       section,
//       class_code,
//       type = 'core',
//       is_elective = false,
//       elective_group = null,
//       weekly_hours = 0.0,
//       status = 'Active',
//       branch_id = null
//     } = req.body;

//     const school_id = req.user?.school_id;
    
//     // Validate branch access
//     const branchValidation = await validateBranchAccess(req, branch_id);
//     if (!branchValidation.isValid) {
//       return res.status(403).json({
//         success: false,
//         message: branchValidation.message,
//         error_type: "BRANCH_ACCESS_DENIED"
//       });
//     }
//     const final_branch_id = branchValidation.finalBranchId;

//     if (!school_id || !final_branch_id || !subject || !section || !class_code) {
//       return res.status(400).json({
//         success: false,
//         message: "School ID, branch ID, subject name, section, and class code are required. Subjects are branch-specific."
//       });
//     }

//     // Generate unique subject code using resilient generator (branch-specific)
//     const subject_code = await db.Subject.generateSubjectCode(school_id, final_branch_id, subject, section);

//     // Create the subject
//     const newSubject = await db.Subject.create({
//       subject_code,
//       subject,
//       school_id,
//       section,
//       class_code,
//       type,
//       is_elective,
//       elective_group,
//       weekly_hours,
//       status,
//       branch_id: final_branch_id
//     });

//     res.json({
//       success: true,
//       message: "Subject created successfully",
//       data: newSubject
//     });

//   } catch (error) {
//     console.error("Error creating subject:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
/**
 * Create a single subject with optional stream assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSubject = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      subject,
      section,
      class_code,
      type = 'core',
      is_elective = false,
      elective_group = null,
      weekly_hours = 0.0,
      status = 'Active',
      branch_id: requestedBranchId = null,
      stream_names = [] // Array of stream names like ["Science", "Technical"]
    } = req.body;

    const school_id = req.user?.school_id;

    // Validate branch access
    const branchValidation = await validateBranchAccess(req, requestedBranchId);
    if (!branchValidation.isValid) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: branchValidation.message,
        error_type: "BRANCH_ACCESS_DENIED"
      });
    }
    const final_branch_id = branchValidation.finalBranchId;

    // Validate required fields
    if (!school_id || !final_branch_id || !subject || !section || !class_code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, subject name, section, and class code are required. Subjects are branch-specific."
      });
    }

    // ✅ Check if school uses class-level streams
    const schoolConfig = await db.SchoolSetup.findOne({
      where: { school_id },
      attributes: ['has_class_stream'],
      transaction
    });
    const schoolHasClassStream = schoolConfig?.has_class_stream === 1;

    // Generate unique subject code
    const subject_code = await db.Subject.generateSubjectCode(school_id, final_branch_id, subject, section);

    // Create the subject
    const newSubject = await db.Subject.create({
      subject_code,
      subject,
      school_id,
      section,
      class_code,
      type,
      is_elective,
      elective_group,
      weekly_hours,
      status,
      branch_id: final_branch_id
    }, { transaction });

    // ✅ Handle stream assignment ONLY if school uses streams AND streams provided
    if (schoolHasClassStream && Array.isArray(stream_names) && stream_names.length > 0) {
      // Validate against ENUM
      const validStreams = stream_names
        .map(s => String(s).trim())
        .filter(s => ['General','Science','Arts','Technical','Commercial','None'].includes(s));

      if (validStreams.length > 0) {
        // Insert into subject_streams with IGNORE to prevent duplicates
        await db.sequelize.query(
          'INSERT IGNORE INTO subject_streams (subject_code, stream) VALUES ?',
          {
            replacements: [validStreams.map(stream => [newSubject.subject_code, stream])],
            type: db.sequelize.QueryTypes.INSERT,
            transaction
          }
        );
        console.log(`✅ Assigned ${validStreams.length} streams to subject ${newSubject.subject_code}`);
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Subject created successfully",
      data: {
        ...newSubject.toJSON(),
        streams: schoolHasClassStream ? stream_names : [] // Return for frontend confirmation
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating subject:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
/**
 * Create multiple subjects in bulk
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// const createBulkSubjects = async (req, res) => {
//   try {
//     const {
//       section,
//       classes = [],
//       subject: subjectsList = [], // Legacy format
//       subjects: subjectsArray = [], // New format
//       branch_id = null
//     } = req.body;

//     const school_id = req.user?.school_id || req.body.school_id;
    
//     console.log('🔍 createBulkSubjects - Request data:', {
//       section,
//       classesCount: classes.length,
//       subjectsListCount: subjectsList.length,
//       subjectsArrayCount: subjectsArray.length,
//       school_id,
//       branch_id
//     });

//     // Validate branch access
//     const branchValidation = await validateBranchAccess(req, branch_id);
//     if (!branchValidation.isValid) {
//       return res.status(403).json({
//         success: false,
//         message: branchValidation.message,
//         error_type: "BRANCH_ACCESS_DENIED"
//       });
//     }
//     const final_branch_id = branchValidation.finalBranchId;

//     // Enhanced validation with better error messages
//     if (!school_id) {
//       return res.status(400).json({
//         success: false,
//         message: "School ID is required. Please ensure user is authenticated or provide school_id in request.",
//         error_type: "MISSING_SCHOOL_ID"
//       });
//     }

//     if (!final_branch_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Branch ID is required. Please ensure user has branch assignment or provide branch_id in request.",
//         error_type: "MISSING_BRANCH_ID"
//       });
//     }

//     if (!section) {
//       return res.status(400).json({
//         success: false,
//         message: "Section is required for bulk subject creation.",
//         error_type: "MISSING_SECTION"
//       });
//     }

//     if (!classes.length) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one class is required for bulk subject creation.",
//         error_type: "MISSING_CLASSES"
//       });
//     }

//     // Handle both legacy and new subject formats - UI sends 'subject' array
//     const finalSubjectsList = subjectsList.length > 0 ? subjectsList : subjectsArray;
    
//     console.log('📝 UI payload analysis:', {
//       subjectsList_length: subjectsList.length,
//       subjectsArray_length: subjectsArray.length,
//       finalSubjectsList_length: finalSubjectsList.length,
//       sample_subject: finalSubjectsList[0]
//     });
    
//     if (!finalSubjectsList.length) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one subject is required. Use 'subject' or 'subjects' array.",
//         error_type: "MISSING_SUBJECTS"
//       });
//     }

//     console.log(`📚 Processing ${finalSubjectsList.length} subjects for ${classes.length} classes in section: ${section}`);

//     const subjectsToCreate = [];
//     const subjectsToReactivate = [];
//     const alreadyActiveSubjects = [];
//     const validationErrors = [];
//     const validTypes = ['core', 'science', 'art', 'commercial', 'technology', 'vocational', 'health', 'language', 'selective'];

//     // Generate subjects for each class
//     for (const classCode of classes) {
//       if (!classCode || typeof classCode !== 'string' || classCode.trim() === '') {
//         validationErrors.push(`Invalid class code: '${classCode}' - must be a non-empty string`);
//         continue;
//       }

//       for (let i = 0; i < finalSubjectsList.length; i++) {
//         const subjectData = finalSubjectsList[i];

//         // Enhanced subject validation
//         if (!subjectData.subject || typeof subjectData.subject !== 'string' || subjectData.subject.trim() === '') {
//           validationErrors.push(`Subject ${i + 1}: Subject name is required and must be a non-empty string`);
//           continue;
//         }

//         // Normalize and validate type
//         let normalizedType = 'core'; // Default
//         if (subjectData.type) {
//           const typeStr = String(subjectData.type).toLowerCase().trim();
//           if (validTypes.includes(typeStr)) {
//             normalizedType = typeStr;
//           } else {
//             console.log(`⚠️ Invalid type '${subjectData.type}' for subject '${subjectData.subject}', using 'core'`);
//           }
//         }

//         // Check if subject already exists for this class (regardless of status)
//         try {
//           const existingSubject = await db.Subject.findOne({
//             where: {
//               school_id,
//               branch_id: final_branch_id,
//               class_code: classCode.trim(),
//               subject: subjectData.subject.trim()
//             }
//           });

//           if (existingSubject) {
//             if (existingSubject.status === 'Inactive') {
//               // Subject exists but is inactive - mark for reactivation
//               console.log(`♻️ Subject '${subjectData.subject}' exists but inactive for class ${classCode} - will reactivate`);
//               subjectsToReactivate.push({
//                 subject_code: existingSubject.subject_code,
//                 subject: subjectData.subject.trim(),
//                 class_code: classCode.trim(),
//                 type: normalizedType,
//                 is_elective: Boolean(subjectData.is_elective),
//                 elective_group: subjectData.elective_group || null,
//                 weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0
//               });
//             } else {
//               // Subject already active
//               console.log(`✓ Subject '${subjectData.subject}' already active for class ${classCode}`);
//               alreadyActiveSubjects.push(existingSubject);
//             }
//           } else {
//             // Subject doesn't exist - mark for creation
//             subjectsToCreate.push({
//               subject: subjectData.subject.trim(),
//               school_id,
//               section,
//               class_code: classCode.trim(),
//               type: normalizedType,
//               is_elective: Boolean(subjectData.is_elective),
//               elective_group: subjectData.elective_group || null,
//               weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
//               status: 'Active',
//               branch_id: final_branch_id
//             });
//           }
//         } catch (checkError) {
//           console.error(`Error checking existing subject '${subjectData.subject}' for class '${classCode}':`, checkError);
//           validationErrors.push(`Subject '${subjectData.subject}' for class '${classCode}': Error checking if subject exists`);
//         }
//       }
//     }

//     // Return validation errors if any
//     if (validationErrors.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors found",
//         errors: validationErrors,
//         error_type: "VALIDATION_ERROR"
//       });
//     }

//     // Reactivate inactive subjects first
//     const reactivatedSubjects = [];
//     if (subjectsToReactivate.length > 0) {
//       console.log(`♻️ Reactivating ${subjectsToReactivate.length} inactive subjects...`);

//       for (const subjectToReactivate of subjectsToReactivate) {
//         try {
//           const [affectedRows] = await db.Subject.update(
//             {
//               status: 'Active',
//               type: subjectToReactivate.type,
//               is_elective: subjectToReactivate.is_elective,
//               elective_group: subjectToReactivate.elective_group,
//               weekly_hours: subjectToReactivate.weekly_hours
//             },
//             {
//               where: {
//                 subject_code: subjectToReactivate.subject_code,
//                 school_id,
//                 branch_id: final_branch_id
//               }
//             }
//           );

//           if (affectedRows > 0) {
//             const reactivatedSubject = await db.Subject.findOne({
//               where: { subject_code: subjectToReactivate.subject_code }
//             });
//             reactivatedSubjects.push(reactivatedSubject);
//             console.log(`✅ Reactivated: ${subjectToReactivate.subject} for class ${subjectToReactivate.class_code}`);
//           }
//         } catch (reactivateError) {
//           console.error(`Error reactivating subject '${subjectToReactivate.subject}':`, reactivateError);
//           validationErrors.push(`Failed to reactivate '${subjectToReactivate.subject}' for class '${subjectToReactivate.class_code}'`);
//         }
//       }
//     }

//     // If nothing to create and all subjects are handled (active or reactivated)
//     if (subjectsToCreate.length === 0 && reactivatedSubjects.length === 0) {
//       return res.json({
//         success: true,
//         message: "All subjects already exist and are active for the specified classes",
//         data: alreadyActiveSubjects,
//         meta: {
//           total_requested: finalSubjectsList.length * classes.length,
//           already_active: alreadyActiveSubjects.length,
//           reactivated: 0,
//           created: 0,
//           classes: classes,
//           section: section
//         }
//       });
//     }

//     if (subjectsToCreate.length === 0 && reactivatedSubjects.length > 0) {
//       return res.json({
//         success: true,
//         message: `${reactivatedSubjects.length} inactive subjects reactivated successfully`,
//         data: [...reactivatedSubjects, ...alreadyActiveSubjects],
//         meta: {
//           total_requested: finalSubjectsList.length * classes.length,
//           already_active: alreadyActiveSubjects.length,
//           reactivated: reactivatedSubjects.length,
//           created: 0,
//           classes: classes,
//           section: section
//         }
//       });
//     }

//     console.log(`🚀 Creating ${subjectsToCreate.length} subjects across ${classes.length} classes`);

//     // Create subjects with enhanced error handling - SKIP BULK, GO STRAIGHT TO INDIVIDUAL
//     console.log('🚀 Creating subjects individually for better error handling...');
//     let createdSubjects = [];
//     const individualResults = [];
//     const individualErrors = [];
    
//     // Skip bulk creation entirely and go straight to individual creation for better debugging
//     // try {
//     //   createdSubjects = await db.Subject.bulkCreateSubjects(subjectsToCreate);
//     // } catch (createError) {
//     //   console.error('Error in bulk creation:', createError);
      
//       for (const subjectData of subjectsToCreate) {
//         try {
//           console.log(`🔧 Creating subject: ${subjectData.subject} for class: ${subjectData.class_code}`);
//           console.log('📋 Subject data:', JSON.stringify(subjectData, null, 2));
          
//           // Generate globally unique subject code
//           let subject_code;
//           let attempts = 0;
//           const maxAttempts = 10;
          
//           while (attempts < maxAttempts) {
//             try {
//               // Try the original generator first
//               if (attempts === 0) {
//                 subject_code = await db.Subject.generateSubjectCode(school_id, final_branch_id, subjectData.subject, subjectData.section);
//                 console.log(`🔑 Generated subject code (attempt ${attempts + 1}): ${subject_code}`);
//               } else {
//                 // Use fallback methods for subsequent attempts
//                 const timestamp = Date.now();
//                 const random = Math.random().toString(36).substr(2, 5);
//                 const attemptSuffix = attempts > 1 ? `_${attempts}` : '';
//                 subject_code = `SBJ_${timestamp}_${random}${attemptSuffix}`;
//                 console.log(`🔑 Fallback subject code (attempt ${attempts + 1}): ${subject_code}`);
//               }
              
//               // Check if this code already exists globally
//               const existingSubject = await db.Subject.findOne({
//                 where: {
//                   subject_code: subject_code
//                 }
//               });
              
//               if (!existingSubject) {
//                 console.log(`✅ Subject code ${subject_code} is unique, proceeding...`);
//                 break; // Code is unique, exit loop
//               } else {
//                 console.log(`⚠️ Subject code ${subject_code} already exists, trying again...`);
//                 attempts++;
//                 continue;
//               }
//             } catch (codeError) {
//               console.log(`❌ Subject code generation failed (attempt ${attempts + 1}):`, codeError.message);
//               attempts++;
//               continue;
//             }
//           }
          
//           if (attempts >= maxAttempts) {
//             // Final fallback: use timestamp + random + process ID
//             const timestamp = Date.now();
//             const random = Math.random().toString(36).substr(2, 8);
//             const processId = process.pid || Math.floor(Math.random() * 1000);
//             subject_code = `SBJ_FINAL_${timestamp}_${random}_${processId}`;
//             console.log(`🆘 Using final fallback subject code: ${subject_code}`);
//           }
          
//           // Create a clean subject data object with all required fields
//           const fullSubjectData = {
//             subject_code: subject_code,
//             subject: subjectData.subject,
//             school_id: school_id,
//             status: subjectData.status || 'Active',
//             section: subjectData.section,
//             sub_section: subjectData.sub_section || null,
//             type: subjectData.type || 'core',
//             is_elective: Boolean(subjectData.is_elective) || false,
//             elective_group: subjectData.elective_group || null,
//             branch_id: final_branch_id,
//             weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
//             class_code: subjectData.class_code
//           };
          
//           console.log('📝 Full subject data for creation:', JSON.stringify(fullSubjectData, null, 2));
          
//           const createdSubject = await db.Subject.create(fullSubjectData);
          
//           console.log(`✅ Successfully created subject: ${createdSubject.subject_code}`);
//           individualResults.push(createdSubject);
//         } catch (individualError) {
//           console.error(`❌ Error creating subject '${subjectData.subject}' for class '${subjectData.class_code}':`, individualError);
//           console.error('📊 Error details:', {
//             name: individualError.name,
//             message: individualError.message,
//             sql: individualError.sql,
//             sqlState: individualError.sqlState,
//             sqlMessage: individualError.sqlMessage,
//             errors: individualError.errors
//           });
          
//           // Extract more detailed error information
//           let detailedError = individualError.message;
          
//           if (individualError.name === 'SequelizeValidationError') {
//             const validationErrors = individualError.errors.map(err => `${err.path}: ${err.message}`).join(', ');
//             detailedError = `Validation failed: ${validationErrors}`;
//           } else if (individualError.name === 'SequelizeUniqueConstraintError') {
//             detailedError = `Duplicate entry: ${individualError.message}`;
//           } else if (individualError.name === 'SequelizeForeignKeyConstraintError') {
//             detailedError = `Foreign key constraint: ${individualError.message}`;
//           } else if (individualError.sqlMessage) {
//             detailedError = `Database error: ${individualError.sqlMessage}`;
//           }
          
//           individualErrors.push({
//             subject: subjectData.subject,
//             class_code: subjectData.class_code,
//             error: detailedError,
//             error_type: individualError.name,
//             subject_data: subjectData
//           });
//         }
//       }
      
//       // Set the results
//       createdSubjects = individualResults;
      
//       // Handle results
//       if (individualResults.length === 0) {
//         return res.status(500).json({
//           success: false,
//           message: "Failed to create any subjects",
//           errors: individualErrors,
//           error_type: "CREATION_FAILED"
//         });
//       }
      
//       // Return partial success if some subjects were created but some failed
//       if (individualErrors.length > 0) {
//         return res.status(207).json({ // 207 Multi-Status
//           success: true,
//           message: `Partial success: ${individualResults.length} subjects created, ${individualErrors.length} failed`,
//           data: createdSubjects,
//           errors: individualErrors,
//           meta: {
//             total_requested: subjectsToCreate.length,
//             created: individualResults.length,
//             failed: individualErrors.length,
//             classes: classes,
//             section: section,
//             school_id,
//             branch_id: final_branch_id
//           }
//         });
//       }
//     // }  // End of commented bulk creation try-catch

//     // Combine created and reactivated subjects
//     const allProcessedSubjects = [...reactivatedSubjects, ...createdSubjects, ...alreadyActiveSubjects];

//     // Build descriptive message
//     const messageParts = [];
//     if (createdSubjects.length > 0) {
//       messageParts.push(`${createdSubjects.length} created`);
//     }
//     if (reactivatedSubjects.length > 0) {
//       messageParts.push(`${reactivatedSubjects.length} reactivated`);
//     }
//     if (alreadyActiveSubjects.length > 0) {
//       messageParts.push(`${alreadyActiveSubjects.length} already active`);
//     }

//     const finalMessage = `Subjects processed successfully: ${messageParts.join(', ')}`;

//     res.json({
//       success: true,
//       message: finalMessage,
//       data: allProcessedSubjects,
//       meta: {
//         total_requested: finalSubjectsList.length * classes.length,
//         created: createdSubjects.length,
//         reactivated: reactivatedSubjects.length,
//         already_active: alreadyActiveSubjects.length,
//         classes: classes,
//         section: section,
//         school_id,
//         branch_id: final_branch_id
//       }
//     });

//   } catch (error) {
//     console.error("Error creating bulk subjects:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       error_type: "INTERNAL_ERROR",
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// };
/**
 * Create multiple subjects in bulk with optional stream assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createBulkSubjects = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      section,
      classes = [],
      subject: subjectsList = [], // Legacy format
      subjects: subjectsArray = [], // New format
      branch_id = null
    } = req.body;
    const school_id = req.user?.school_id || req.body.school_id;
    console.log('🔍 createBulkSubjects - Request data:', {
      section,
      classesCount: classes.length,
      subjectsListCount: subjectsList.length,
      subjectsArrayCount: subjectsArray.length,
      school_id,
      branch_id
    });

    // Validate branch access
    const branchValidation = await validateBranchAccess(req, branch_id);
    if (!branchValidation.isValid) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: branchValidation.message,
        error_type: "BRANCH_ACCESS_DENIED"
      });
    }
    const final_branch_id = branchValidation.finalBranchId;

    // Enhanced validation with better error messages
    if (!school_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "School ID is required. Please ensure user is authenticated or provide school_id in request.",
        error_type: "MISSING_SCHOOL_ID"
      });
    }
    if (!final_branch_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Branch ID is required. Please ensure user has branch assignment or provide branch_id in request.",
        error_type: "MISSING_BRANCH_ID"
      });
    }
    if (!section) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Section is required for bulk subject creation.",
        error_type: "MISSING_SECTION"
      });
    }
    if (!classes.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "At least one class is required for bulk subject creation.",
        error_type: "MISSING_CLASSES"
      });
    }

    // Handle both legacy and new subject formats - UI sends 'subject' array
    const finalSubjectsList = subjectsList.length > 0 ? subjectsList : subjectsArray;
    console.log('📝 UI payload analysis:', {
      subjectsList_length: subjectsList.length,
      subjectsArray_length: subjectsArray.length,
      finalSubjectsList_length: finalSubjectsList.length,
      sample_subject: finalSubjectsList[0]
    });

    if (!finalSubjectsList.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "At least one subject is required. Use 'subject' or 'subjects' array.",
        error_type: "MISSING_SUBJECTS"
      });
    }

    // ✅ Get school config to check if streams are enabled
    const schoolConfig = await db.SchoolSetup.findOne({
      where: { school_id },
      attributes: ['has_class_stream'],
      transaction
    });
    const schoolHasClassStream = schoolConfig?.has_class_stream === 1;

    console.log(`📚 Processing ${finalSubjectsList.length} subjects for ${classes.length} classes in section: ${section}`);
    const subjectsToCreate = [];
    const subjectsToReactivate = [];
    const alreadyActiveSubjects = [];
    const validationErrors = [];
    const validTypes = ['core', 'science', 'arts', 'commercial', 'technical', 'vocational', 'health', 'language', 'selective'];
    
    // Helper function to normalize type to Title case
    const normalizeType = (type) => {
      if (!type) return 'Core';
      const typeStr = String(type).toLowerCase().trim();
      
      // Map variations to standard types
      const typeMap = {
        'core': 'Core',
        'science': 'Science', 
        'art': 'Arts',
        'arts': 'Arts',
        'commercial': 'Commercial',
        'technical': 'Technical',
        'technology': 'Technical',
        'vocational': 'Vocational',
        'health': 'Health',
        'language': 'Language',
        'selective': 'Selective'
      };
      
      return typeMap[typeStr] || 'Core';
    };

    // Generate subjects for each class
    for (const classCode of classes) {
      if (!classCode || typeof classCode !== 'string' || classCode.trim() === '') {
        validationErrors.push(`Invalid class code: '${classCode}' - must be a non-empty string`);
        continue;
      }
      for (let i = 0; i < finalSubjectsList.length; i++) {
        const subjectData = finalSubjectsList[i];
        // Enhanced subject validation
        if (!subjectData.subject || typeof subjectData.subject !== 'string' || subjectData.subject.trim() === '') {
          validationErrors.push(`Subject ${i + 1}: Subject name is required and must be a non-empty string`);
          continue;
        }
        // Normalize type to Title case
        const normalizedType = normalizeType(subjectData.type);

        // Check if subject already exists for this class (regardless of status)
        try {
          const existingSubject = await db.Subject.findOne({
            where: {
              school_id,
              branch_id: final_branch_id,
              class_code: classCode.trim(),
              subject: subjectData.subject.trim()
            },
            transaction
          });
          if (existingSubject) {
            if (existingSubject.status === 'Inactive') {
              // Subject exists but is inactive - mark for reactivation with latest data
              console.log(`♻️ Subject '${subjectData.subject}' exists but inactive for class ${classCode} - will reactivate with latest data`);
              subjectsToReactivate.push({
                subject_code: existingSubject.subject_code,
                subject: subjectData.subject.trim(),
                class_code: classCode.trim(),
                type: normalizedType,
                is_elective: Boolean(subjectData.is_elective),
                elective_group: subjectData.elective_group || null,
                weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
                // ✅ Preserve stream_names for reactivation (if applicable)
                stream_names: schoolHasClassStream ? subjectData.stream_names : undefined
              });
            } else {
              // Subject already active - update with latest data
              console.log(`🔄 Subject '${subjectData.subject}' already active for class ${classCode} - updating with latest data`);
              subjectsToReactivate.push({
                subject_code: existingSubject.subject_code,
                subject: subjectData.subject.trim(),
                class_code: classCode.trim(),
                type: normalizedType,
                is_elective: Boolean(subjectData.is_elective),
                elective_group: subjectData.elective_group || null,
                weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
                // ✅ Preserve stream_names for update (if applicable)
                stream_names: schoolHasClassStream ? subjectData.stream_names : undefined,
                isUpdate: true // Flag to indicate this is an update, not reactivation
              });
            }
          } else {
            // Subject doesn't exist - mark for creation
            subjectsToCreate.push({
              subject: subjectData.subject.trim(),
              school_id,
              section,
              class_code: classCode.trim(),
              type: normalizedType,
              is_elective: Boolean(subjectData.is_elective),
              elective_group: subjectData.elective_group || null,
              weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
              status: 'Active',
              branch_id: final_branch_id,
              // ✅ Include stream_names only if school uses streams
              stream_names: schoolHasClassStream ? subjectData.stream_names : undefined
            });
          }
        } catch (checkError) {
          console.error(`Error checking existing subject '${subjectData.subject}' for class '${classCode}':`, checkError);
          validationErrors.push(`Subject '${subjectData.subject}' for class '${classCode}': Error checking if subject exists`);
        }
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Validation errors found",
        errors: validationErrors,
        error_type: "VALIDATION_ERROR"
      });
    }

    // Reactivate/update existing subjects with latest data
    const reactivatedSubjects = [];
    const updatedSubjects = [];
    if (subjectsToReactivate.length > 0) {
      console.log(`🔄 Processing ${subjectsToReactivate.length} existing subjects (reactivation/update)...`);
      for (const subjectToProcess of subjectsToReactivate) {
        try {
          const updateData = {
            status: 'Active', // Always set to Active (for both reactivation and update)
            type: subjectToProcess.type,
            is_elective: subjectToProcess.is_elective,
            elective_group: subjectToProcess.elective_group,
            weekly_hours: subjectToProcess.weekly_hours
          };

          const [affectedRows] = await db.Subject.update(
            updateData,
            {
              where: {
                subject_code: subjectToProcess.subject_code,
                school_id,
                branch_id: final_branch_id
              },
              transaction
            }
          );

          if (affectedRows > 0) {
            const updatedSubject = await db.Subject.findOne({
              where: { subject_code: subjectToProcess.subject_code },
              transaction
            });

            // ✅ Handle stream assignment for processed subjects
            if (schoolHasClassStream && subjectToProcess.stream_names && Array.isArray(subjectToProcess.stream_names)) {
              // Clear existing streams first, then add new ones
              await db.sequelize.query(
                'DELETE FROM subject_streams WHERE subject_code = ?',
                {
                  replacements: [updatedSubject.subject_code],
                  type: db.sequelize.QueryTypes.DELETE,
                  transaction
                }
              );

              const validStreams = subjectToProcess.stream_names
                .map(s => String(s).trim())
                .filter(s => ['General','Science','Arts','Technical','Commercial','None'].includes(s));

              if (validStreams.length > 0) {
                await db.sequelize.query(
                  'INSERT INTO subject_streams (subject_code, stream) VALUES ?',
                  {
                    replacements: [validStreams.map(stream => [updatedSubject.subject_code, stream])],
                    type: db.sequelize.QueryTypes.INSERT,
                    transaction
                  }
                );
                console.log(`✅ Streams updated for subject ${updatedSubject.subject_code}:`, validStreams);
              }
            }

            if (subjectToProcess.isUpdate) {
              updatedSubjects.push(updatedSubject);
              console.log(`✅ Updated: ${subjectToProcess.subject} for class ${subjectToProcess.class_code}`);
            } else {
              reactivatedSubjects.push(updatedSubject);
              console.log(`✅ Reactivated: ${subjectToProcess.subject} for class ${subjectToProcess.class_code}`);
            }
          }
        } catch (processError) {
          console.error(`Error processing subject '${subjectToProcess.subject}':`, processError);
          validationErrors.push(`Failed to process '${subjectToProcess.subject}' for class '${subjectToProcess.class_code}'`);
        }
      }
    }

    // If nothing to create and all subjects are handled
    if (subjectsToCreate.length === 0 && reactivatedSubjects.length === 0 && updatedSubjects.length === 0) {
      await transaction.commit();
      return res.json({
        success: true,
        message: "All subjects already exist and are active for the specified classes",
        data: alreadyActiveSubjects,
        meta: {
          total_requested: finalSubjectsList.length * classes.length,
          already_active: alreadyActiveSubjects.length,
          reactivated: 0,
          updated: 0,
          created: 0,
          classes: classes,
          section: section
        }
      });
    }

    if (subjectsToCreate.length === 0 && (reactivatedSubjects.length > 0 || updatedSubjects.length > 0)) {
      await transaction.commit();
      const totalProcessed = reactivatedSubjects.length + updatedSubjects.length;
      let message = "";
      if (reactivatedSubjects.length > 0 && updatedSubjects.length > 0) {
        message = `${reactivatedSubjects.length} subjects reactivated and ${updatedSubjects.length} subjects updated with latest data`;
      } else if (reactivatedSubjects.length > 0) {
        message = `${reactivatedSubjects.length} inactive subjects reactivated successfully`;
      } else {
        message = `${updatedSubjects.length} subjects updated with latest data`;
      }
      
      return res.json({
        success: true,
        message: message,
        data: [...reactivatedSubjects, ...updatedSubjects, ...alreadyActiveSubjects],
        meta: {
          total_requested: finalSubjectsList.length * classes.length,
          already_active: alreadyActiveSubjects.length,
          reactivated: reactivatedSubjects.length,
          updated: updatedSubjects.length,
          created: 0,
          classes: classes,
          section: section
        }
      });
    }

    console.log(`🚀 Creating ${subjectsToCreate.length} subjects across ${classes.length} classes`);

    // Create subjects individually for better error handling
    console.log('🚀 Creating subjects individually for better error handling...');
    let createdSubjects = [];
    const individualResults = [];
    const individualErrors = [];

    for (const subjectData of subjectsToCreate) {
      try {
        console.log(`🔧 Creating subject: ${subjectData.subject} for class: ${subjectData.class_code}`);
        console.log('📋 Subject data:', JSON.stringify(subjectData, null, 2));

        // Generate globally unique subject code
        let subject_code;
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
          try {
            if (attempts === 0) {
              subject_code = await db.Subject.generateSubjectCode(school_id, final_branch_id, subjectData.subject, subjectData.section);
              console.log(`🔑 Generated subject code (attempt ${attempts + 1}): ${subject_code}`);
            } else {
              const timestamp = Date.now();
              const random = Math.random().toString(36).substr(2, 5);
              const attemptSuffix = attempts > 1 ? `_${attempts}` : '';
              subject_code = `SBJ_${timestamp}_${random}${attemptSuffix}`;
              console.log(`🔑 Fallback subject code (attempt ${attempts + 1}): ${subject_code}`);
            }

            const existingSubject = await db.Subject.findOne({
              where: { subject_code: subject_code },
              transaction
            });
            if (!existingSubject) {
              console.log(`✅ Subject code ${subject_code} is unique, proceeding...`);
              break;
            } else {
              console.log(`⚠️ Subject code ${subject_code} already exists, trying again...`);
              attempts++;
              continue;
            }
          } catch (codeError) {
            console.log(`❌ Subject code generation failed (attempt ${attempts + 1}):`, codeError.message);
            attempts++;
            continue;
          }
        }

        if (attempts >= maxAttempts) {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 8);
          const processId = process.pid || Math.floor(Math.random() * 1000);
          subject_code = `SBJ_FINAL_${timestamp}_${random}_${processId}`;
          console.log(`🆘 Using final fallback subject code: ${subject_code}`);
        }

        // Create a clean subject data object with all required fields
        const fullSubjectData = {
          subject_code: subject_code,
          subject: subjectData.subject,
          school_id: school_id,
          status: subjectData.status || 'Active',
          section: subjectData.section,
          sub_section: subjectData.sub_section || null,
          type: subjectData.type || 'core',
          is_elective: Boolean(subjectData.is_elective) || false,
          elective_group: subjectData.elective_group || null,
          branch_id: final_branch_id,
          weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
          class_code: subjectData.class_code
        };

        console.log('📝 Full subject data for creation:', JSON.stringify(fullSubjectData, null, 2));
        const createdSubject = await db.Subject.create(fullSubjectData, { transaction });
        console.log(`✅ Successfully created subject: ${createdSubject.subject_code}`);

        // ✅ Handle stream assignment for newly created subjects
        if (schoolHasClassStream && subjectData.stream_names && Array.isArray(subjectData.stream_names)) {
          const validStreams = subjectData.stream_names
            .map(s => String(s).trim())
            .filter(s => ['General','Science','Arts','Technical','Commercial','None'].includes(s));

          if (validStreams.length > 0) {
            await db.sequelize.query(
              'INSERT IGNORE INTO subject_streams (subject_code, stream) VALUES ?',
              {
                replacements: [validStreams.map(stream => [createdSubject.subject_code, stream])],
                type: db.sequelize.QueryTypes.INSERT,
                transaction
              }
            );
            console.log(`✅ Streams assigned to new subject ${createdSubject.subject_code}:`, validStreams);
          }
        }

        individualResults.push(createdSubject);
      } catch (individualError) {
        console.error(`❌ Error creating subject '${subjectData.subject}' for class '${subjectData.class_code}':`, individualError);
        console.error('📊 Error details:', {
          name: individualError.name,
          message: individualError.message,
          sql: individualError.sql,
          sqlState: individualError.sqlState,
          sqlMessage: individualError.sqlMessage,
          errors: individualError.errors
        });

        let detailedError = individualError.message;
        if (individualError.name === 'SequelizeValidationError') {
          const validationErrors = individualError.errors.map(err => `${err.path}: ${err.message}`).join(', ');
          detailedError = `Validation failed: ${validationErrors}`;
        } else if (individualError.name === 'SequelizeUniqueConstraintError') {
          detailedError = `Duplicate entry: ${individualError.message}`;
        } else if (individualError.name === 'SequelizeForeignKeyConstraintError') {
          detailedError = `Foreign key constraint: ${individualError.message}`;
        } else if (individualError.sqlMessage) {
          detailedError = `Database error: ${individualError.sqlMessage}`;
        }

        individualErrors.push({
          subject: subjectData.subject,
          class_code: subjectData.class_code,
          error: detailedError,
          error_type: individualError.name,
          subject_data: subjectData
        });
      }
    }

    createdSubjects = individualResults;

    if (individualResults.length === 0) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to create any subjects",
        errors: individualErrors,
        error_type: "CREATION_FAILED"
      });
    }

    // Handle partial success
    if (individualErrors.length > 0) {
      await transaction.commit();
      return res.status(207).json({
        success: true,
        message: `Partial success: ${individualResults.length} subjects created, ${individualErrors.length} failed`,
        data: createdSubjects,
        errors: individualErrors,
        meta: {
          total_requested: subjectsToCreate.length,
          created: individualResults.length,
          failed: individualErrors.length,
          classes: classes,
          section: section,
          school_id,
          branch_id: final_branch_id
        }
      });
    }

    await transaction.commit();

    // Combine created, reactivated, and updated subjects
    const allProcessedSubjects = [...reactivatedSubjects, ...updatedSubjects, ...createdSubjects, ...alreadyActiveSubjects];

    // Build descriptive message
    const messageParts = [];
    if (createdSubjects.length > 0) {
      messageParts.push(`${createdSubjects.length} created`);
    }
    if (reactivatedSubjects.length > 0) {
      messageParts.push(`${reactivatedSubjects.length} reactivated`);
    }
    if (updatedSubjects.length > 0) {
      messageParts.push(`${updatedSubjects.length} updated with latest data`);
    }
    if (alreadyActiveSubjects.length > 0) {
      messageParts.push(`${alreadyActiveSubjects.length} already active`);
    }
    const finalMessage = `Subjects processed successfully: ${messageParts.join(', ')}`;

    res.json({
      success: true,
      message: finalMessage,
      data: allProcessedSubjects,
      meta: {
        total_requested: finalSubjectsList.length * classes.length,
        created: createdSubjects.length,
        reactivated: reactivatedSubjects.length,
        updated: updatedSubjects.length,
        already_active: alreadyActiveSubjects.length,
        classes: classes,
        section: section,
        school_id,
        branch_id: final_branch_id
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in createBulkSubjects:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
    await transaction.rollback();
    console.error("Error creating bulk subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error_type: "INTERNAL_ERROR",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
/**
 * Assign subjects to a specific class
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// const assignSubjectsToClass = async (req, res) => {
//   try {
//     const {
//       class_code,
//       subjects: subjectsList = [],
//       branch_id = null,
//       section: providedSection = null // Allow section to be provided
//     } = req.body;

//     const school_id = req.user?.school_id || req.body.school_id; // Allow school_id in body
//     const user_branch_id = req.user?.branch_id;
//     const final_branch_id = branch_id || user_branch_id;

//     console.log('🔍 assignSubjectsToClass - Request data:', {
//       class_code,
//       subjectsCount: subjectsList.length,
//       school_id,
//       final_branch_id,
//       providedSection
//     });

//     // Enhanced validation with better error messages
//     if (!school_id) {
//       return res.status(400).json({
//         success: false,
//         message: "School ID is required. Please ensure user is authenticated or provide school_id in request.",
//         error_type: "MISSING_SCHOOL_ID"
//       });
//     }

//     if (!final_branch_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Branch ID is required. Please ensure user has branch assignment or provide branch_id in request.",
//         error_type: "MISSING_BRANCH_ID"
//       });
//     }

//     if (!class_code) {
//       return res.status(400).json({
//         success: false,
//         message: "Class code is required.",
//         error_type: "MISSING_CLASS_CODE"
//       });
//     }

//     if (!subjectsList.length) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one subject is required.",
//         error_type: "MISSING_SUBJECTS"
//       });
//     }

//     // Get class information to determine section (with fallback)
//     let section = providedSection;
    
//     if (!section) {
//       try {
//         const classInfo = await db.sequelize.query(
//           "SELECT section FROM classes WHERE class_code = ? AND school_id = ? AND branch_id = ? LIMIT 1",
//           {
//             replacements: [class_code, school_id, final_branch_id],
//             type: db.sequelize.QueryTypes.SELECT
//           }
//         );

//         if (classInfo.length > 0) {
//           section = classInfo[0].section;
//         } else {
//           // Fallback: try to find class without branch restriction
//           const classInfoFallback = await db.sequelize.query(
//             "SELECT section FROM classes WHERE class_code = ? AND school_id = ? LIMIT 1",
//             {
//               replacements: [class_code, school_id],
//               type: db.sequelize.QueryTypes.SELECT
//             }
//           );
          
//           if (classInfoFallback.length > 0) {
//             section = classInfoFallback[0].section;
//             console.log(`⚠️ Class found without branch restriction, using section: ${section}`);
//           } else {
//             // Default section if class not found
//             section = 'PRIMARY';
//             console.log(`⚠️ Class ${class_code} not found, defaulting to PRIMARY section`);
//           }
//         }
//       } catch (classError) {
//         console.error('Error fetching class info:', classError);
//         section = 'PRIMARY'; // Default fallback
//       }
//     }

//     console.log(`📚 Using section: ${section} for class: ${class_code}`);

//     const subjectsToCreate = [];
//     const subjectsToReactivate = [];
//     const alreadyActiveSubjects = [];
//     const validationErrors = [];
//     const validTypes = ['core', 'science', 'art', 'commercial', 'technology', 'vocational', 'health', 'language', 'selective'];

//     for (let i = 0; i < subjectsList.length; i++) {
//       const subjectData = subjectsList[i];

//       // Enhanced subject validation
//       if (!subjectData.subject || typeof subjectData.subject !== 'string' || subjectData.subject.trim() === '') {
//         validationErrors.push(`Subject ${i + 1}: Subject name is required and must be a non-empty string`);
//         continue;
//       }

//       // Normalize and validate type
//       let normalizedType = 'core'; // Default
//       if (subjectData.type) {
//         const typeStr = String(subjectData.type).toLowerCase().trim();
//         if (validTypes.includes(typeStr)) {
//           normalizedType = typeStr;
//         } else {
//           console.log(`⚠️ Invalid type '${subjectData.type}' for subject '${subjectData.subject}', using 'core'`);
//         }
//       }

//       // Check if subject already exists for this class (regardless of status)
//       try {
//         const existingSubject = await db.Subject.findOne({
//           where: {
//             school_id,
//             branch_id: final_branch_id,
//             class_code,
//             subject: subjectData.subject.trim()
//           }
//         });

//         if (existingSubject) {
//           if (existingSubject.status === 'Inactive') {
//             // Subject exists but is inactive - mark for reactivation
//             console.log(`♻️ Subject '${subjectData.subject}' exists but inactive for class ${class_code} - will reactivate`);
//             subjectsToReactivate.push({
//               subject_code: existingSubject.subject_code,
//               subject: subjectData.subject.trim(),
//               type: normalizedType,
//               is_elective: Boolean(subjectData.is_elective),
//               elective_group: subjectData.elective_group || null,
//               weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0
//             });
//           } else {
//             // Subject already active
//             console.log(`✓ Subject '${subjectData.subject}' already active for class ${class_code}`);
//             alreadyActiveSubjects.push(existingSubject);
//           }
//         } else {
//           // Subject doesn't exist - mark for creation
//           subjectsToCreate.push({
//             subject: subjectData.subject.trim(),
//             school_id,
//             section,
//             class_code,
//             type: normalizedType,
//             is_elective: Boolean(subjectData.is_elective),
//             elective_group: subjectData.elective_group || null,
//             weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
//             status: 'Active',
//             branch_id: final_branch_id
//           });
//         }
//       } catch (checkError) {
//         console.error(`Error checking existing subject '${subjectData.subject}':`, checkError);
//         validationErrors.push(`Subject '${subjectData.subject}': Error checking if subject exists`);
//       }
//     }

//     // Return validation errors if any
//     if (validationErrors.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors found",
//         errors: validationErrors,
//         error_type: "VALIDATION_ERROR"
//       });
//     }

//     // Reactivate inactive subjects first
//     const reactivatedSubjects = [];
//     if (subjectsToReactivate.length > 0) {
//       console.log(`♻️ Reactivating ${subjectsToReactivate.length} inactive subjects...`);

//       for (const subjectToReactivate of subjectsToReactivate) {
//         try {
//           const [affectedRows] = await db.Subject.update(
//             {
//               status: 'Active',
//               type: subjectToReactivate.type,
//               is_elective: subjectToReactivate.is_elective,
//               elective_group: subjectToReactivate.elective_group,
//               weekly_hours: subjectToReactivate.weekly_hours
//             },
//             {
//               where: {
//                 subject_code: subjectToReactivate.subject_code,
//                 school_id,
//                 branch_id: final_branch_id
//               }
//             }
//           );

//           if (affectedRows > 0) {
//             const reactivatedSubject = await db.Subject.findOne({
//               where: { subject_code: subjectToReactivate.subject_code }
//             });
//             reactivatedSubjects.push(reactivatedSubject);
//             console.log(`✅ Reactivated: ${subjectToReactivate.subject}`);
//           }
//         } catch (reactivateError) {
//           console.error(`Error reactivating subject '${subjectToReactivate.subject}':`, reactivateError);
//         }
//       }
//     }

//     if (subjectsToCreate.length === 0 && reactivatedSubjects.length === 0) {
//       return res.json({
//         success: true,
//         message: "All subjects are already assigned and active for this class",
//         data: alreadyActiveSubjects,
//         meta: {
//           total_requested: subjectsList.length,
//           already_active: alreadyActiveSubjects.length,
//           reactivated: 0,
//           created: 0
//         }
//       });
//     }

//     if (subjectsToCreate.length === 0 && reactivatedSubjects.length > 0) {
//       return res.json({
//         success: true,
//         message: `${reactivatedSubjects.length} inactive subjects reactivated successfully`,
//         data: [...reactivatedSubjects, ...alreadyActiveSubjects],
//         meta: {
//           total_requested: subjectsList.length,
//           already_active: alreadyActiveSubjects.length,
//           reactivated: reactivatedSubjects.length,
//           created: 0
//         }
//       });
//     }

//     console.log(`🚀 Creating ${subjectsToCreate.length} subjects for class ${class_code}`);

//     // Create subjects individually for better error handling
//     console.log('🚀 Creating subjects individually for better error handling...');
//     let createdSubjects = [];
//     const individualResults = [];
//     const individualErrors = [];
    
//     // Skip bulk creation and go straight to individual creation
//     // try {
//     //   createdSubjects = await db.Subject.bulkCreateSubjects(subjectsToCreate);
//     // } catch (createError) {
//     //   console.error('Error creating subjects:', createError);
      
//       for (const subjectData of subjectsToCreate) {
//         try {
//           console.log(`🔧 Creating subject: ${subjectData.subject} for class: ${subjectData.class_code}`);
//           console.log('📋 Subject data:', JSON.stringify(subjectData, null, 2));
          
//           // Generate globally unique subject code
//           let subject_code;
//           let attempts = 0;
//           const maxAttempts = 10;
          
//           while (attempts < maxAttempts) {
//             try {
//               // Try the original generator first
//               if (attempts === 0) {
//                 subject_code = await db.Subject.generateSubjectCode(school_id, final_branch_id, subjectData.subject, subjectData.section);
//                 console.log(`🔑 Generated subject code (attempt ${attempts + 1}): ${subject_code}`);
//               } else {
//                 // Use fallback methods for subsequent attempts
//                 const timestamp = Date.now();
//                 const random = Math.random().toString(36).substr(2, 5);
//                 const attemptSuffix = attempts > 1 ? `_${attempts}` : '';
//                 subject_code = `SBJ_${timestamp}_${random}${attemptSuffix}`;
//                 console.log(`🔑 Fallback subject code (attempt ${attempts + 1}): ${subject_code}`);
//               }
              
//               // Check if this code already exists globally
//               const existingSubject = await db.Subject.findOne({
//                 where: {
//                   subject_code: subject_code
//                 }
//               });
              
//               if (!existingSubject) {
//                 console.log(`✅ Subject code ${subject_code} is unique, proceeding...`);
//                 break; // Code is unique, exit loop
//               } else {
//                 console.log(`⚠️ Subject code ${subject_code} already exists, trying again...`);
//                 attempts++;
//                 continue;
//               }
//             } catch (codeError) {
//               console.log(`❌ Subject code generation failed (attempt ${attempts + 1}):`, codeError.message);
//               attempts++;
//               continue;
//             }
//           }
          
//           if (attempts >= maxAttempts) {
//             // Final fallback: use timestamp + random + process ID
//             const timestamp = Date.now();
//             const random = Math.random().toString(36).substr(2, 8);
//             const processId = process.pid || Math.floor(Math.random() * 1000);
//             subject_code = `SBJ_FINAL_${timestamp}_${random}_${processId}`;
//             console.log(`🆘 Using final fallback subject code: ${subject_code}`);
//           }
          
//           // Create a clean subject data object with all required fields
//           const fullSubjectData = {
//             subject_code: subject_code,
//             subject: subjectData.subject,
//             school_id: school_id,
//             status: subjectData.status || 'Active',
//             section: subjectData.section,
//             sub_section: subjectData.sub_section || null,
//             type: subjectData.type || 'core',
//             is_elective: Boolean(subjectData.is_elective) || false,
//             elective_group: subjectData.elective_group || null,
//             branch_id: final_branch_id,
//             weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
//             class_code: subjectData.class_code
//           };
          
//           console.log('📝 Full subject data for creation:', JSON.stringify(fullSubjectData, null, 2));
          
//           const createdSubject = await db.Subject.create(fullSubjectData);
          
//           console.log(`✅ Successfully created subject: ${createdSubject.subject_code}`);
//           individualResults.push(createdSubject);
//         } catch (individualError) {
//           console.error(`❌ Error creating subject '${subjectData.subject}':`, individualError);
//           console.error('📊 Error details:', {
//             name: individualError.name,
//             message: individualError.message,
//             sql: individualError.sql,
//             sqlState: individualError.sqlState,
//             sqlMessage: individualError.sqlMessage,
//             errors: individualError.errors
//           });
          
//           // Extract more detailed error information
//           let detailedError = individualError.message;
          
//           if (individualError.name === 'SequelizeValidationError') {
//             const validationErrors = individualError.errors.map(err => `${err.path}: ${err.message}`).join(', ');
//             detailedError = `Validation failed: ${validationErrors}`;
//           } else if (individualError.name === 'SequelizeUniqueConstraintError') {
//             detailedError = `Duplicate entry: ${individualError.message}`;
//           } else if (individualError.name === 'SequelizeForeignKeyConstraintError') {
//             detailedError = `Foreign key constraint: ${individualError.message}`;
//           } else if (individualError.sqlMessage) {
//             detailedError = `Database error: ${individualError.sqlMessage}`;
//           }
          
//           individualErrors.push({
//             subject: subjectData.subject,
//             error: detailedError,
//             error_type: individualError.name,
//             subject_data: subjectData
//           });
//         }
//       }
      
//       // Set the results
//       createdSubjects = individualResults;
      
//       // Handle results
//       if (individualResults.length === 0) {
//         return res.status(500).json({
//           success: false,
//           message: "Failed to create any subjects",
//           errors: individualErrors,
//           error_type: "CREATION_FAILED"
//         });
//       }
//     // }  // End of commented bulk creation try-catch

//     // Combine created and reactivated subjects
//     const allProcessedSubjects = [...reactivatedSubjects, ...createdSubjects, ...alreadyActiveSubjects];

//     // Build descriptive message
//     const messageParts = [];
//     if (createdSubjects.length > 0) {
//       messageParts.push(`${createdSubjects.length} created`);
//     }
//     if (reactivatedSubjects.length > 0) {
//       messageParts.push(`${reactivatedSubjects.length} reactivated`);
//     }
//     if (alreadyActiveSubjects.length > 0) {
//       messageParts.push(`${alreadyActiveSubjects.length} already active`);
//     }

//     const finalMessage = `Subjects assigned to class successfully: ${messageParts.join(', ')}`;

//     res.json({
//       success: true,
//       message: finalMessage,
//       data: allProcessedSubjects,
//       meta: {
//         total_requested: subjectsList.length,
//         created: createdSubjects.length,
//         reactivated: reactivatedSubjects.length,
//         already_active: alreadyActiveSubjects.length,
//         class_code,
//         section,
//         school_id,
//         branch_id: final_branch_id
//       }
//     });

//   } catch (error) {
//     console.error("Error assigning subjects to class:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       error_type: "INTERNAL_ERROR",
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// };
/**
 * Assign subjects to a specific class
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const assignSubjectsToClass = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      class_code,
      subjects: subjectsList = [],
      branch_id = null,
      section: providedSection = null
    } = req.body;
    const school_id = req.user?.school_id || req.body.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    // Validate branch access
    const branchValidation = await validateBranchAccess(req, branch_id);
    if (!branchValidation.isValid) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: branchValidation.message,
        error_type: "BRANCH_ACCESS_DENIED"
      });
    }
    const validated_branch_id = branchValidation.finalBranchId;

    // Enhanced validation
    if (!school_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "School ID is required.",
        error_type: "MISSING_SCHOOL_ID"
      });
    }
    if (!validated_branch_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Branch ID is required.",
        error_type: "MISSING_BRANCH_ID"
      });
    }
    if (!class_code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Class code is required.",
        error_type: "MISSING_CLASS_CODE"
      });
    }
    if (!subjectsList.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "At least one subject is required.",
        error_type: "MISSING_SUBJECTS"
      });
    }

    // Get section
    let section = providedSection;
    if (!section) {
      const classInfo = await db.sequelize.query(
        "SELECT section FROM classes WHERE class_code = ? AND school_id = ? AND branch_id = ? LIMIT 1",
        {
          replacements: [class_code, school_id, validated_branch_id],
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      if (classInfo.length > 0) {
        section = classInfo[0].section;
      } else {
        section = 'PRIMARY';
      }
    }

    // ✅ Check if school uses class streams
    const schoolConfig = await db.SchoolSetup.findOne({
      where: { school_id },
      attributes: ['has_class_stream'],
      transaction
    });
    const schoolHasClassStream = schoolConfig?.has_class_stream === 1;

    const subjectsToCreate = [];
    const subjectsToReactivate = [];
    const alreadyActiveSubjects = [];
    
    // Helper function to normalize type to Title case
    const normalizeType = (type) => {
      if (!type) return 'Core';
      const typeStr = String(type).toLowerCase().trim();
      
      // Map variations to standard types
      const typeMap = {
        'core': 'Core',
        'science': 'Science', 
        'art': 'Arts',
        'arts': 'Arts',
        'commercial': 'Commercial',
        'technical': 'Technical',
        'technology': 'Technical',
        'vocational': 'Vocational',
        'health': 'Health',
        'language': 'Language',
        'selective': 'Selective'
      };
      
      return typeMap[typeStr] || 'Core';
    };

    for (let i = 0; i < subjectsList.length; i++) {
      const subjectData = subjectsList[i];
      if (!subjectData.subject || typeof subjectData.subject !== 'string' || subjectData.subject.trim() === '') {
        continue;
      }

      const normalizedType = normalizeType(subjectData.type);

      const existingSubject = await db.Subject.findOne({
        where: {
          school_id,
          branch_id: validated_branch_id,
          class_code,
          subject: subjectData.subject.trim()
        },
        transaction
      });

      if (existingSubject) {
        if (existingSubject.status === 'Inactive') {
          subjectsToReactivate.push({
            subject_code: existingSubject.subject_code,
            subject: subjectData.subject.trim(),
            type: normalizedType,
            is_elective: Boolean(subjectData.is_elective),
            elective_group: subjectData.elective_group || null,
            weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
            // ✅ Preserve stream_names for reactivation
            stream_names: schoolHasClassStream ? subjectData.stream_names : undefined
          });
        } else {
          alreadyActiveSubjects.push(existingSubject);
        }
      } else {
        subjectsToCreate.push({
          subject: subjectData.subject.trim(),
          school_id,
          section,
          class_code,
          type: normalizedType,
          is_elective: Boolean(subjectData.is_elective),
          elective_group: subjectData.elective_group || null,
          weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
          status: 'Active',
          branch_id: validated_branch_id,
          // ✅ Include stream_names only if school uses streams
          stream_names: schoolHasClassStream ? subjectData.stream_names : undefined
        });
      }
    }

    // Reactivate subjects
    const reactivatedSubjects = [];
    for (const subjectToReactivate of subjectsToReactivate) {
      const [affectedRows] = await db.Subject.update(
        {
          status: 'Active',
          type: subjectToReactivate.type,
          is_elective: subjectToReactivate.is_elective,
          elective_group: subjectToReactivate.elective_group,
          weekly_hours: subjectToReactivate.weekly_hours
        },
        {
          where: {
            subject_code: subjectToReactivate.subject_code,
            school_id,
            branch_id: validated_branch_id
          },
          transaction
        }
      );

      if (affectedRows > 0) {
        const reactivatedSubject = await db.Subject.findOne({
          where: { subject_code: subjectToReactivate.subject_code },
          transaction
        });

        // ✅ Handle stream assignment for reactivated subjects
        if (schoolHasClassStream && subjectToReactivate.stream_names && Array.isArray(subjectToReactivate.stream_names)) {
          const validStreams = subjectToReactivate.stream_names
            .map(s => String(s).trim())
            .filter(s => ['General','Science','Arts','Technical','Commercial','None'].includes(s));

          if (validStreams.length > 0) {
            await db.sequelize.query(
              'INSERT IGNORE INTO subject_streams (subject_code, stream) VALUES ?',
              {
                replacements: [validStreams.map(stream => [reactivatedSubject.subject_code, stream])],
                type: db.sequelize.QueryTypes.INSERT,
                transaction
              }
            );
          }
        }

        reactivatedSubjects.push(reactivatedSubject);
      }
    }

    // Create new subjects
    const createdSubjects = [];
    for (const subjectData of subjectsToCreate) {
      let subject_code;
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        try {
          if (attempts === 0) {
            subject_code = await db.Subject.generateSubjectCode(school_id, validated_branch_id, subjectData.subject, subjectData.section);
          } else {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 5);
            const attemptSuffix = attempts > 1 ? `_${attempts}` : '';
            subject_code = `SBJ_${timestamp}_${random}${attemptSuffix}`;
          }

          const existingSubject = await db.Subject.findOne({
            where: { subject_code },
            transaction
          });
          if (!existingSubject) break;
          attempts++;
        } catch (codeError) {
          attempts++;
        }
      }

      if (attempts >= maxAttempts) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 8);
        const processId = process.pid || Math.floor(Math.random() * 1000);
        subject_code = `SBJ_FINAL_${timestamp}_${random}_${processId}`;
      }

      const fullSubjectData = {
        subject_code,
        subject: subjectData.subject,
        school_id,
        status: 'Active',
        section: subjectData.section,
        sub_section: subjectData.sub_section || null,
        type: subjectData.type || 'core',
        is_elective: Boolean(subjectData.is_elective) || false,
        elective_group: subjectData.elective_group || null,
        branch_id: validated_branch_id,
        weekly_hours: parseFloat(subjectData.weekly_hours) || 0.0,
        class_code: subjectData.class_code
      };

      const createdSubject = await db.Subject.create(fullSubjectData, { transaction });

      // ✅ Handle stream assignment for new subjects
      if (schoolHasClassStream && subjectData.stream_names && Array.isArray(subjectData.stream_names)) {
        const validStreams = subjectData.stream_names
          .map(s => String(s).trim())
          .filter(s => ['General','Science','Arts','Technical','Commercial','None'].includes(s));

        if (validStreams.length > 0) {
          await db.sequelize.query(
            'INSERT IGNORE INTO subject_streams (subject_code, stream) VALUES ?',
            {
              replacements: [validStreams.map(stream => [createdSubject.subject_code, stream])],
              type: db.sequelize.QueryTypes.INSERT,
              transaction
            }
          );
        }
      }

      createdSubjects.push(createdSubject);
    }

    await transaction.commit();

    const allProcessedSubjects = [...reactivatedSubjects, ...createdSubjects, ...alreadyActiveSubjects];
    const messageParts = [];
    if (createdSubjects.length > 0) messageParts.push(`${createdSubjects.length} created`);
    if (reactivatedSubjects.length > 0) messageParts.push(`${reactivatedSubjects.length} reactivated`);
    if (alreadyActiveSubjects.length > 0) messageParts.push(`${alreadyActiveSubjects.length} already active`);

    res.json({
      success: true,
      message: `Subjects assigned to class successfully: ${messageParts.join(', ')}`,
       allProcessedSubjects,
      meta: {
        total_requested: subjectsList.length,
        created: createdSubjects.length,
        reactivated: reactivatedSubjects.length,
        already_active: alreadyActiveSubjects.length,
        class_code,
        section,
        school_id,
        branch_id: validated_branch_id
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error assigning subjects to class:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error_type: "INTERNAL_ERROR",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
/**
 * Remove subjects from a specific class
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeSubjectsFromClass = async (req, res) => {
  try {
    const {
      class_code,
      subject_code, // Single subject code for individual removal
      subjects: subjectsList = []
    } = req.body;

    const school_id = req.user?.school_id;
    
    // Validate branch access
    const branchValidation = await validateBranchAccess(req, req.body.branch_id);
    if (!branchValidation.isValid) {
      return res.status(403).json({
        success: false,
        message: branchValidation.message,
        error_type: "BRANCH_ACCESS_DENIED"
      });
    }
    const final_branch_id = branchValidation.finalBranchId;

    if (!school_id || !final_branch_id || !class_code) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and class code are required."
      });
    }

    // Only allow single subject removal - no mass removal
    if (subject_code) {
      // Individual subject removal by subject_code
      const [affectedRows] = await db.Subject.update(
        { status: 'Inactive' },
        {
          where: {
            school_id,
            branch_id: final_branch_id,
            class_code,
            subject_code,
            status: 'Active'
          }
        }
      );

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Subject not found or already inactive"
        });
      }

      res.json({
        success: true,
        message: "Subject removed successfully",
        data: {
          affected_rows: affectedRows,
          class_code,
          subject_code
        }
      });
    } else {
      // Reject mass removal requests
      return res.status(400).json({
        success: false,
        message: "Mass removal not allowed. Please remove subjects individually using subject_code."
      });
    }

  } catch (error) {
    console.error("Error removing subject from class:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update a subject
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// const updateSubject = async (req, res) => {
//   try {
//     const {
//       subject_code,
//       subject,
//       type,
//       is_elective,
//       elective_group,
//       weekly_hours,
//       status,
//       apply_to_all = false
//     } = req.body;

//     const school_id = req.user?.school_id;
//     const user_branch_id = req.user?.branch_id;
//     const final_branch_id = req.body.branch_id || user_branch_id;

//     if (!school_id || !final_branch_id || !subject_code) {
//       return res.status(400).json({
//         success: false,
//         message: "School ID, branch ID, and subject code are required. Subjects are branch-specific."
//       });
//     }

//     const updateData = {};
//     if (subject !== undefined) updateData.subject = subject;
//     if (type !== undefined) updateData.type = type;
//     if (is_elective !== undefined) updateData.is_elective = is_elective;
//     if (elective_group !== undefined) updateData.elective_group = elective_group;
//     if (weekly_hours !== undefined) updateData.weekly_hours = weekly_hours;
//     if (status !== undefined) updateData.status = status;

//     let affectedRows;

//     if (apply_to_all) {
//       // Get the original subject name to update all subjects with the same name (branch-aware)
//       const originalSubject = await db.Subject.findOne({
//         where: { subject_code, school_id, branch_id: final_branch_id }
//       });

//       if (!originalSubject) {
//         return res.status(404).json({
//           success: false,
//           message: "Subject not found"
//         });
//       }

//       // Update all subjects with the same name across all classes (within branch)
//       [affectedRows] = await db.Subject.update(updateData, {
//         where: {
//           school_id,
//           branch_id: final_branch_id,
//           subject: originalSubject.subject
//         }
//       });
//     } else {
//       // Update only the specific subject (branch-aware)
//       [affectedRows] = await db.Subject.update(updateData, {
//         where: {
//           school_id,
//           branch_id: final_branch_id,
//           subject_code
//         }
//       });
//     }

//     if (affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Subject not found or no changes made"
//       });
//     }

//     // Get the updated subject(s) (branch-aware)
//     const updatedSubjects = await db.Subject.findAll({
//       where: apply_to_all ? 
//         { school_id, branch_id: final_branch_id, subject: (await db.Subject.findOne({ where: { subject_code, school_id, branch_id: final_branch_id } })).subject } :
//         { school_id, branch_id: final_branch_id, subject_code }
//     });

//     res.json({
//       success: true,
//       message: apply_to_all ? 
//         `Subject updated across ${affectedRows} records` : 
//         "Subject updated successfully",
//       data: {
//         affected_rows: affectedRows,
//         apply_to_all,
//         subjects: updatedSubjects
//       }
//     });

//   } catch (error) {
//     console.error("Error updating subject:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
/**
 * Update a subject with optional stream update
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSubject = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      subject_code,
      subject,
      type,
      is_elective,
      elective_group,
      weekly_hours,
      status,
      stream_names, // NEW: Optional stream update
      apply_to_all = false
    } = req.body;
    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = req.body.branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject code are required."
      });
    }

    // ✅ Check if school uses class streams
    const schoolConfig = await db.SchoolSetup.findOne({
      where: { school_id },
      attributes: ['has_class_stream'],
      transaction
    });
    const schoolHasClassStream = schoolConfig?.has_class_stream === 1;

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (type !== undefined) updateData.type = type;
    if (is_elective !== undefined) updateData.is_elective = is_elective;
    if (elective_group !== undefined) updateData.elective_group = elective_group;
    if (weekly_hours !== undefined) updateData.weekly_hours = weekly_hours;
    if (status !== undefined) updateData.status = status;

    let affectedRows;
    let subjectsToUpdate = [];

    if (apply_to_all) {
      const originalSubject = await db.Subject.findOne({
        where: { subject_code, school_id, branch_id: final_branch_id },
        transaction
      });
      if (!originalSubject) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }
      [affectedRows] = await db.Subject.update(updateData, {
        where: {
          school_id,
          branch_id: final_branch_id,
          subject: originalSubject.subject
        },
        transaction
      });
      subjectsToUpdate = await db.Subject.findAll({
        where: {
          school_id,
          branch_id: final_branch_id,
          subject: originalSubject.subject
        },
        transaction
      });
    } else {
      [affectedRows] = await db.Subject.update(updateData, {
        where: {
          school_id,
          branch_id: final_branch_id,
          subject_code
        },
        transaction
      });
      const updatedSubject = await db.Subject.findOne({
        where: { subject_code, school_id, branch_id: final_branch_id },
        transaction
      });
      if (updatedSubject) subjectsToUpdate = [updatedSubject];
    }

    if (affectedRows === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Subject not found or no changes made"
      });
    }

    // ✅ Handle stream update ONLY if school uses streams AND stream_names provided
    if (schoolHasClassStream && stream_names && Array.isArray(stream_names)) {
      const validStreams = stream_names
        .map(s => String(s).trim())
        .filter(s => ['General','Science','Arts','Technical','Commercial','None'].includes(s));

      for (const subject of subjectsToUpdate) {
        // Delete existing streams
        await db.sequelize.query(
          'DELETE FROM subject_streams WHERE subject_code = ?',
          {
            replacements: [subject.subject_code],
            type: db.sequelize.QueryTypes.DELETE,
            transaction
          }
        );

        // Insert new streams
        if (validStreams.length > 0) {
          await db.sequelize.query(
            'INSERT IGNORE INTO subject_streams (subject_code, stream) VALUES ?',
            {
              replacements: [validStreams.map(stream => [subject.subject_code, stream])],
              type: db.sequelize.QueryTypes.INSERT,
              transaction
            }
          );
        }
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: apply_to_all ? 
        `Subject updated across ${affectedRows} records` : 
        "Subject updated successfully",
       subjectsToUpdate
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error updating subject:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
/**
 * Soft delete a subject (set status to Inactive)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const softDeleteSubject = async (req, res) => {
  try {
    const {
      subject_code,
      apply_to_all = false
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = req.body.branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_code) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject code are required. Subjects are branch-specific."
      });
    }

    let affectedRows;

    if (apply_to_all) {
      // Get the subject name to disable all subjects with the same name (branch-aware)
      const originalSubject = await db.Subject.findOne({
        where: { subject_code, school_id, branch_id: final_branch_id }
      });

      if (!originalSubject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      [affectedRows] = await db.Subject.update(
        { status: 'Inactive' },
        {
          where: {
            school_id,
            branch_id: final_branch_id,
            subject: originalSubject.subject,
            status: 'Active'
          }
        }
      );
    } else {
      affectedRows = await db.Subject.softDelete(subject_code, school_id, final_branch_id);
    }

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or already inactive"
      });
    }

    res.json({
      success: true,
      message: apply_to_all ? 
        `Subject disabled across ${affectedRows} records` : 
        "Subject disabled successfully",
      data: {
        subject_code,
        status: 'Inactive',
        apply_to_all,
        affected_rows: affectedRows
      }
    });

  } catch (error) {
    console.error("Error soft deleting subject:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Re-enable a subject (set status to Active)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const enableSubject = async (req, res) => {
  try {
    const {
      subject_code,
      apply_to_all = false
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = req.body.branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_code) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject code are required. Subjects are branch-specific."
      });
    }

    let affectedRows;

    if (apply_to_all) {
      // Get the subject name to enable all subjects with the same name (branch-aware)
      const originalSubject = await db.Subject.findOne({
        where: { subject_code, school_id, branch_id: final_branch_id }
      });

      if (!originalSubject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      [affectedRows] = await db.Subject.update(
        { status: 'Active' },
        {
          where: {
            school_id,
            branch_id: final_branch_id,
            subject: originalSubject.subject,
            status: 'Inactive'
          }
        }
      );
    } else {
      affectedRows = await db.Subject.reactivate(subject_code, school_id, final_branch_id);
    }

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or already active"
      });
    }

    res.json({
      success: true,
      message: apply_to_all ? 
        `Subject enabled across ${affectedRows} records` : 
        "Subject enabled successfully",
      data: {
        subject_code,
        status: 'Active',
        apply_to_all,
        affected_rows: affectedRows
      }
    });

  } catch (error) {
    console.error("Error enabling subject:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subjects with various filtering options
 * SUPPORTS BRANCH FILTERING - Users can query specific branches if provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjects = async (req, res) => {
  try {
    console.log('🔍 getSubjects called with query:', req.query);
    
    // Check if db.Subject is available
    if (!db || !db.Subject) {
      console.error('❌ db.Subject is not available in enhanced controller:', { 
        db: !!db, 
        Subject: !!db?.Subject,
        dbKeys: db ? Object.keys(db) : [],
        subjectMethods: db?.Subject ? Object.getOwnPropertyNames(db.Subject) : []
      });
      return res.status(500).json({
        success: false,
        error: "Subject model is not available in enhanced controller. Database connection issue.",
        debug: {
          db_available: !!db,
          subject_model_available: !!db?.Subject,
          available_models: db ? Object.keys(db).filter(key => typeof db[key] === 'object' && db[key].name) : [],
          db_keys: db ? Object.keys(db) : []
        }
      });
    }
    
    const {
      query_type = "select-all",
      section = null,
      class_code = null,
      type = null,
      include_electives = 'true',
      elective_group = null,
      status = 'Active',
      branch_id = null
    } = req.query;

    const school_id = req.user?.school_id;
    const userType = req.user?.user_type?.toLowerCase();
    
    // Developer can access any school via header
    const effectiveSchoolId = (userType === 'developer' || userType === 'superadmin') 
      ? (req.headers['x-school-id'] || school_id) 
      : school_id;
    
    // Get branch_id from query or header
    const requestedBranchId = branch_id || req.headers['x-branch-id'];
    
    // Validate branch access
    const branchValidation = await validateBranchAccess(req, requestedBranchId);
    if (!branchValidation.isValid) {
      return res.status(403).json({
        success: false,
        message: branchValidation.message,
        error_type: "BRANCH_ACCESS_DENIED"
      });
    }
    const final_branch_id = branchValidation.finalBranchId;

    if (!effectiveSchoolId || !final_branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and branch ID are required. User must be assigned to a branch to view subjects."
      });
    }

    const whereClause = {
      school_id: effectiveSchoolId,
      branch_id: final_branch_id,
      status: status === 'all' ? { [Op.in]: ['Active', 'Inactive'] } : status
    };

    // Apply filters
    if (section) whereClause.section = section;
    if (class_code) whereClause.class_code = class_code;
    if (type) whereClause.type = type;

    // Handle elective filtering
    if (include_electives === 'false') {
      whereClause.is_elective = false;
    } else if (include_electives === 'only') {
      whereClause.is_elective = true;
    }

    if (elective_group) {
      whereClause.elective_group = elective_group;
    }

    const subjects = await db.Subject.findAll({
      where: whereClause,
      order: [
        ['section', 'ASC'],
        ['is_elective', 'ASC'],
        ['type', 'ASC'],
        ['elective_group', 'ASC'],
        ['subject', 'ASC']
      ]
    });

    // Fetch class names for all class_codes
    const classCodes = [...new Set(subjects.map(s => s.class_code).filter(Boolean))];
    let classMap = {};
    if (classCodes.length > 0) {
      const classes = await db.sequelize.query(
        `SELECT class_code, class_name FROM classes WHERE class_code IN (?)`,
        { replacements: [classCodes], type: db.sequelize.QueryTypes.SELECT }
      );
      classMap = classes.reduce((acc, c) => { acc[c.class_code] = c.class_name; return acc; }, {});
    }

    // Format results for frontend compatibility
    const formattedSubjects = subjects.map(subject => ({
      subject_code: subject.subject_code,
      subject: subject.subject,
      section: subject.section,
      sub_section: subject.sub_section,
      type: subject.type,
      is_elective: subject.is_elective,
      elective_group: subject.elective_group,
      weekly_hours: subject.weekly_hours,
      status: subject.status,
      class_code: subject.class_code,
      class_name: classMap[subject.class_code] || subject.class_code,
      created_at: subject.created_at,
      updated_at: subject.updated_at,
      display_name: subject.getDisplayName ? subject.getDisplayName() : subject.subject,
      type_description: subject.getTypeDescription ? subject.getTypeDescription() : subject.type
    }));

    // Group subjects for better organization
    const groupedSubjects = {
      by_section: {},
      by_type: {},
      by_elective_group: {}
    };

    formattedSubjects.forEach(subject => {
      // Group by section
      if (!groupedSubjects.by_section[subject.section]) {
        groupedSubjects.by_section[subject.section] = [];
      }
      groupedSubjects.by_section[subject.section].push(subject);

      // Group by type
      if (!groupedSubjects.by_type[subject.type]) {
        groupedSubjects.by_type[subject.type] = [];
      }
      groupedSubjects.by_type[subject.type].push(subject);

      // Group by elective group
      if (subject.is_elective && subject.elective_group) {
        if (!groupedSubjects.by_elective_group[subject.elective_group]) {
          groupedSubjects.by_elective_group[subject.elective_group] = [];
        }
        groupedSubjects.by_elective_group[subject.elective_group].push(subject);
      }
    });

    res.json({
      success: true,
      data: formattedSubjects,
      meta: {
        total: formattedSubjects.length,
        core_subjects: formattedSubjects.filter(s => !s.is_elective).length,
        elective_subjects: formattedSubjects.filter(s => s.is_elective).length,
        sections: Object.keys(groupedSubjects.by_section),
        types: Object.keys(groupedSubjects.by_type),
        elective_groups: Object.keys(groupedSubjects.by_elective_group),
        user_branch_id: req.user?.branch_id,
        queried_branch_id: final_branch_id,
        branch_filtering_applied: true,
        filters_applied: {
          section,
          class_code,
          type,
          include_electives,
          elective_group,
          status,
          applied_branch_id: final_branch_id
        }
      },
      grouped: groupedSubjects
    });

  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get subjects by section (for frontend compatibility)
 * SUPPORTS BRANCH FILTERING - Users can query specific branches if provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjectsBySection = async (req, res) => {
  try {
    const {
      section,
      include_electives = 'true',
      elective_group = null,
      branch_id = null
    } = req.query;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    
    // Use provided branch_id or fall back to user's branch_id
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !section) {
      return res.status(400).json({
        success: false,
        message: "School ID, section, and user branch assignment are required. Subjects are branch-specific."
      });
    }

    const options = {
      branch_id: final_branch_id,
      includeElectives: include_electives === 'true' ? undefined : include_electives === 'only',
      electiveGroup: elective_group
    };

    const subjects = await db.Subject.getBySection(school_id, section, options);

    const formattedResults = subjects.map(subject => ({
      label: subject.getDisplayName(),
      value: subject.subject_code,
      subject: subject.subject,
      subject_code: subject.subject_code,
      section: subject.section,
      sub_section: subject.sub_section,
      type: subject.type,
      is_elective: subject.is_elective,
      elective_group: subject.elective_group,
      status: subject.status,
      class_code: subject.class_code
    }));

    // Group subjects by type
    const coreSubjects = formattedResults.filter(s => !s.is_elective);
    const electiveSubjects = formattedResults.filter(s => s.is_elective);
    
    const electiveGroups = {};
    electiveSubjects.forEach(subject => {
      const group = subject.elective_group || 'General';
      if (!electiveGroups[group]) {
        electiveGroups[group] = [];
      }
      electiveGroups[group].push(subject);
    });

    res.json({
      success: true,
      data: formattedResults,
      meta: {
        total: formattedResults.length,
        core_subjects: coreSubjects.length,
        elective_subjects: electiveSubjects.length,
        elective_groups: Object.keys(electiveGroups),
        section: section,
        school_id: school_id,
        user_branch_id: user_branch_id,
        queried_branch_id: final_branch_id,
        branch_filtering_applied: true
      },
      grouped: {
        core: coreSubjects,
        electives: electiveGroups
      }
    });

  } catch (error) {
    console.error("Error fetching subjects by section:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get elective groups for a section
 * SUPPORTS BRANCH FILTERING - Users can query specific branches if provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getElectiveGroups = async (req, res) => {
  try {
    const {
      section,
      branch_id = null
    } = req.query;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    
    // Use provided branch_id or fall back to user's branch_id
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !section) {
      return res.status(400).json({
        success: false,
        message: "School ID, section, and user branch assignment are required. Elective groups are branch-specific."
      });
    }

    const groups = await db.Subject.getElectiveGroups(school_id, section, final_branch_id);

    const formattedGroups = groups.map(group => ({
      label: group,
      value: group
    }));

    res.json({
      success: true,
      data: formattedGroups,
      meta: {
        total: formattedGroups.length,
        section: section,
        school_id: school_id,
        user_branch_id: user_branch_id,
        queried_branch_id: final_branch_id,
        branch_filtering_applied: true
      }
    });

  } catch (error) {
    console.error("Error fetching elective groups:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk update multiple subjects
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkUpdateSubjects = async (req, res) => {
  try {
    const {
      subjects = [],
      branch_id = null
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subjects.length) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subjects array are required. Subjects are branch-specific."
      });
    }

    const results = [];
    const errors = [];

    // Process each subject update
    for (const subjectUpdate of subjects) {
      try {
        const { subject_code, ...updateData } = subjectUpdate;
        
        if (!subject_code) {
          errors.push({ subject_code: 'missing', error: 'Subject code is required' });
          continue;
        }

        const [affectedRows] = await db.Subject.update(updateData, {
          where: {
            subject_code,
            school_id,
            branch_id: final_branch_id
          }
        });

        if (affectedRows > 0) {
          const updatedSubject = await db.Subject.findOne({
            where: { subject_code, school_id, branch_id: final_branch_id }
          });
          results.push(updatedSubject);
        } else {
          errors.push({ subject_code, error: 'Subject not found or no changes made' });
        }
      } catch (error) {
        errors.push({ subject_code: subjectUpdate.subject_code, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        updated: results,
        errors: errors,
        summary: {
          total_requested: subjects.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error("Error in bulk update subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk delete multiple subjects
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkDeleteSubjects = async (req, res) => {
  try {
    const {
      subject_codes = [],
      permanent = false,
      branch_id = null
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_codes.length) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject_codes array are required. Subjects are branch-specific."
      });
    }

    let affectedRows;
    
    if (permanent) {
      // Permanent delete (use with caution)
      affectedRows = await db.Subject.destroy({
        where: {
          subject_code: { [Op.in]: subject_codes },
          school_id,
          branch_id: final_branch_id
        }
      });
    } else {
      // Soft delete (set status to Inactive)
      [affectedRows] = await db.Subject.update(
        { status: 'Inactive' },
        {
          where: {
            subject_code: { [Op.in]: subject_codes },
            school_id,
            branch_id: final_branch_id,
            status: 'Active'
          }
        }
      );
    }

    res.json({
      success: true,
      message: `${affectedRows} subjects ${permanent ? 'permanently deleted' : 'deactivated'} successfully`,
      data: {
        affected_rows: affectedRows,
        subject_codes: subject_codes,
        permanent: permanent,
        branch_id: final_branch_id
      }
    });

  } catch (error) {
    console.error("Error in bulk delete subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk enable multiple subjects
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkEnableSubjects = async (req, res) => {
  try {
    const {
      subject_codes = [],
      branch_id = null
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_codes.length) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject_codes array are required. Subjects are branch-specific."
      });
    }

    const [affectedRows] = await db.Subject.update(
      { status: 'Active' },
      {
        where: {
          subject_code: { [Op.in]: subject_codes },
          school_id,
          branch_id: final_branch_id,
          status: 'Inactive'
        }
      }
    );

    res.json({
      success: true,
      message: `${affectedRows} subjects enabled successfully`,
      data: {
        affected_rows: affectedRows,
        subject_codes: subject_codes,
        branch_id: final_branch_id
      }
    });

  } catch (error) {
    console.error("Error in bulk enable subjects:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get multiple subjects by their codes (bulk fetch)
 * SUPPORTS BRANCH FILTERING - Users can query specific branches if provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjectsByCodes = async (req, res) => {
  try {
    const {
      subject_codes = [],
      branch_id = null
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    
    // Use provided branch_id or fall back to user's branch_id
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_codes.length) {
      return res.status(400).json({
        success: false,
        message: "School ID, user branch assignment, and subject_codes array are required. Subjects are branch-specific."
      });
    }

    const subjects = await db.Subject.findAll({
      where: {
        subject_code: { [Op.in]: subject_codes },
        school_id,
        branch_id: final_branch_id
      },
      order: [['subject', 'ASC']]
    });

    const formattedSubjects = subjects.map(subject => ({
      subject_code: subject.subject_code,
      subject: subject.subject,
      section: subject.section,
      sub_section: subject.sub_section,
      type: subject.type,
      is_elective: subject.is_elective,
      elective_group: subject.elective_group,
      weekly_hours: subject.weekly_hours,
      status: subject.status,
      class_code: subject.class_code,
      created_at: subject.created_at,
      updated_at: subject.updated_at,
      display_name: subject.getDisplayName(),
      type_description: subject.getTypeDescription()
    }));

    res.json({
      success: true,
      data: formattedSubjects,
      meta: {
        requested: subject_codes.length,
        found: formattedSubjects.length,
        missing: subject_codes.length - formattedSubjects.length,
        user_branch_id: user_branch_id,
        queried_branch_id: final_branch_id,
        branch_filtering_applied: true
      }
    });

  } catch (error) {
    console.error("Error fetching subjects by codes:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Copy subjects from one class to another (bulk operation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const copySubjectsBetweenClasses = async (req, res) => {
  try {
    const {
      source_class_code,
      target_class_codes = [],
      branch_id = null,
      copy_settings = true // Copy elective settings, weekly hours, etc.
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !source_class_code || !target_class_codes.length) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, source class code, and target class codes are required. Subjects are branch-specific."
      });
    }

    // Get subjects from source class
    const sourceSubjects = await db.Subject.findAll({
      where: {
        class_code: source_class_code,
        school_id,
        branch_id: final_branch_id,
        status: 'Active'
      }
    });

    if (!sourceSubjects.length) {
      return res.status(404).json({
        success: false,
        message: "No active subjects found in source class"
      });
    }

    const subjectsToCreate = [];
    const results = [];

    // Create subjects for each target class
    for (const targetClassCode of target_class_codes) {
      for (const sourceSubject of sourceSubjects) {
        // Check if subject already exists in target class
        const existingSubject = await db.Subject.findOne({
          where: {
            class_code: targetClassCode,
            subject: sourceSubject.subject,
            school_id,
            branch_id: final_branch_id,
            status: 'Active'
          }
        });

        if (!existingSubject) {
          const subjectData = {
            subject: sourceSubject.subject,
            school_id,
            section: sourceSubject.section,
            class_code: targetClassCode,
            type: copy_settings ? sourceSubject.type : 'core',
            is_elective: copy_settings ? sourceSubject.is_elective : false,
            elective_group: copy_settings ? sourceSubject.elective_group : null,
            weekly_hours: copy_settings ? sourceSubject.weekly_hours : 0.0,
            status: 'Active',
            branch_id: final_branch_id
          };
          subjectsToCreate.push(subjectData);
        }
      }
    }

    if (subjectsToCreate.length > 0) {
      const createdSubjects = await db.Subject.bulkCreateSubjects(subjectsToCreate);
      results.push(...createdSubjects);
    }

    res.json({
      success: true,
      message: `${results.length} subjects copied successfully`,
      data: {
        source_class: source_class_code,
        target_classes: target_class_codes,
        subjects_copied: results.length,
        copy_settings: copy_settings,
        created_subjects: results
      }
    });

  } catch (error) {
    console.error("Error copying subjects between classes:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Legacy operation: Delete subject (permanent delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSubject = async (req, res) => {
  try {
    const {
      id: subject_code,
      branch_id = null
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_code) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject code are required. Subjects are branch-specific."
      });
    }

    // Permanent delete (use with caution)
    const affectedRows = await db.Subject.destroy({
      where: {
        subject_code,
        school_id,
        branch_id: final_branch_id
      }
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    res.json({
      success: true,
      message: "Subject deleted permanently",
      data: {
        subject_code,
        affected_rows: affectedRows
      }
    });

  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Legacy operation: Update subject (backward compatibility)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSubjectLegacy = async (req, res) => {
  try {
    const {
      id: subject_code_from_id,
      subject_code: subject_code_direct,
      subjects: subject_from_subjects,
      subject: subject_direct,
      section,
      status,
      class_code,
      type,
      apply_to_all = false,
      branch_id = null
    } = req.body;

    // Handle both legacy (id, subjects) and new (subject_code, subject) parameter formats
    const subject_code = subject_code_direct || subject_code_from_id;
    const subject = subject_direct || subject_from_subjects;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !subject_code) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and subject code are required. Subjects are branch-specific."
      });
    }

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (section !== undefined) updateData.section = section;
    if (status !== undefined) updateData.status = status;
    if (class_code !== undefined) updateData.class_code = class_code;
    if (type !== undefined) updateData.type = type;

    let affectedRows;

    if (apply_to_all) {
      // Get the original subject name to update all subjects with the same name (branch-aware)
      const originalSubject = await db.Subject.findOne({
        where: { subject_code, school_id, branch_id: final_branch_id }
      });

      if (!originalSubject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      // Update all subjects with the same name across all classes (within branch)
      [affectedRows] = await db.Subject.update(updateData, {
        where: {
          school_id,
          branch_id: final_branch_id,
          subject: originalSubject.subject
        }
      });
    } else {
      // Update only the specific subject (branch-aware)
      [affectedRows] = await db.Subject.update(updateData, {
        where: {
          subject_code,
          school_id,
          branch_id: final_branch_id
        }
      });
    }

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or no changes made"
      });
    }

    // Get the updated subject(s) (branch-aware)
    const updatedSubjects = await db.Subject.findAll({
      where: apply_to_all ? 
        { school_id, branch_id: final_branch_id, subject: (await db.Subject.findOne({ where: { subject_code, school_id, branch_id: final_branch_id } })).subject } :
        { school_id, branch_id: final_branch_id, subject_code }
    });

    res.json({
      success: true,
      message: apply_to_all ? 
        `Subject updated across ${affectedRows} records` : 
        "Subject updated successfully",
      data: {
        affected_rows: affectedRows,
        apply_to_all,
        subjects: updatedSubjects
      }
    });

  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Legacy operation: Get subjects by section and class (select-section-subjects)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjectsByClassCode = async (req, res) => {
  try {
    const {
      class_code,
      branch_id = null
    } = req.body;

    const school_id = req.user?.school_id;
    const user_branch_id = req.user?.branch_id;
    const final_branch_id = branch_id || user_branch_id;

    if (!school_id || !final_branch_id || !class_code) {
      return res.status(400).json({
        success: false,
        message: "School ID, branch ID, and class code are required. Subjects are branch-specific."
      });
    }

    const subjects = await db.Subject.findAll({
      where: {
        class_code,
        status: 'Active',
        school_id,
        branch_id: final_branch_id
      },
      order: [['subject_code', 'ASC']]
    });

    res.json({
      success: true,
      data: subjects,
      meta: {
        total: subjects.length,
        class_code,
        school_id,
        branch_id: final_branch_id
      }
    });

  } catch (error) {
    console.error("Error fetching subjects by class code:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all subjects for classes where the user is a form master
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjectsForFormMaster = async (req, res) => {
  try {
    const { class_code } = req.body;
    const school_id = req.user?.school_id;

    if (!school_id || !class_code) {
      return res.status(400).json({
        success: false,
        message: "School ID and class code are required."
      });
    }

    // Fetch all subjects for the class without checking form master access since that's handled separately at the form level
    const subjects = await db.Subject.findAll({
      where: {
        class_code: class_code,
        status: 'Active',
        school_id: school_id
      },
      order: [['subject_code', 'ASC']]
    });

    return res.json({
      success: true,
      data: subjects,
      meta: {
        total: subjects.length,
        class_code,
        school_id
      }
    });
  } catch (error) {
    console.error("Error fetching subjects for class:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Main handler for subject operations (replaces stored procedure calls)
 * Enhanced with additional bulk operations + ALL legacy operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleSubjectOperations = async (req, res) => {
  try {
    const { query_type } = req.body;

    switch (query_type) {
      // Core CRUD operations
      case 'create':
        return await createSubject(req, res);
      
      case 'create_bulk':
      case 'bulk_create': // Alternative naming
        return await createBulkSubjects(req, res);
      
      case 'update':
      case 'update_subject':
        return await updateSubjectLegacy(req, res);
      
      case 'delete':
        return await deleteSubject(req, res);
      
      // Class assignment operations
      case 'assign_to_class':
        return await assignSubjectsToClass(req, res);
      
      case 'remove_from_class':
        return await removeSubjectsFromClass(req, res);
      
      // Query operations (with branch isolation)
      case 'select-all':
      case 'select':
        return await getSubjects(req, res);
      
      case 'select-section-subjects':
        return await getSubjectsByClassCode(req, res);
      
      // Enhanced bulk operations
      case 'bulk_update':
        return await bulkUpdateSubjects(req, res);
      
      case 'soft_delete_subject':
        return await softDeleteSubject(req, res);
      
      case 'bulk_delete':
        return await bulkDeleteSubjects(req, res);
      
      case 'enable_subject':
        return await enableSubject(req, res);
      
      case 'bulk_enable':
        return await bulkEnableSubjects(req, res);
      
      case 'get_by_codes':
        return await getSubjectsByCodes(req, res);
      
      case 'copy_between_classes':
        return await copySubjectsBetweenClasses(req, res);

      case 'get_form_master_subjects':
        return await getSubjectsForFormMaster(req, res);

      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported query type: ${query_type}. Available types: create, create_bulk, update, delete, assign_to_class, remove_from_class, select-all, select, select-section-subjects, bulk_update, soft_delete_subject, bulk_delete, enable_subject, bulk_enable, get_by_codes, copy_between_classes`
        });
    }

  } catch (error) {
    console.error("Error in handleSubjectOperations:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error_type: "HANDLER_ERROR",
      query_type: req.body.query_type,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  // Core CRUD operations
  createSubject,
  createBulkSubjects,
  updateSubject,
  updateSubjectLegacy,
  deleteSubject,
  
  // Class assignment operations
  assignSubjectsToClass,
  removeSubjectsFromClass,
  
  // Query operations
  getSubjects,
  getSubjectsBySection,
  getSubjectsByClassCode,
  getSubjectsByCodes,
  getElectiveGroups,
  
  // Enhanced bulk operations
  bulkUpdateSubjects,
  bulkDeleteSubjects,
  bulkEnableSubjects,
  copySubjectsBetweenClasses,
  
  // Status management
  softDeleteSubject,
  enableSubject,

  // Form master operations
  getSubjectsForFormMaster,

  // Main handler (supports ALL operations)
  handleSubjectOperations
};