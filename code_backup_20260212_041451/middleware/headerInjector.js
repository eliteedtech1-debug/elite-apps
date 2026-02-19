/**
 * Middleware to inject header values (school_id, branch_id) into multiple request locations
 * This ensures that controllers can access these values through multiple pathways:
 * - req.requestedSchoolId/req.requestedBranchId (convenience properties)
 * - req.body.school_id/req.body.branch_id (body properties)
 * - req.query.school_id/req.query.branch_id (query properties)
 */
const headerInjector = (req, res, next) => {
  // Extract school_id and branch_id from headers
  const headerSchoolId = req.headers['x-school-id'];
  const headerBranchId = req.headers['x-branch-id'];
  
  console.log('🔍 Header Injector - Headers received:', {
    'x-school-id': headerSchoolId,
    'x-branch-id': headerBranchId,
    original_body_school_id: req.body && req.body.school_id,
    original_query_school_id: req.query && req.query.school_id
  });

  // Add to request object for easy access (convenience properties)
  req.requestedSchoolId = headerSchoolId;
  req.requestedBranchId = headerBranchId;

  // Inject school_id into request body if present in headers and not already in body
  if (headerSchoolId && req.body && typeof req.body === 'object') {
    if (!req.body.school_id) {
      req.body.school_id = headerSchoolId;
    }
  }

  // Inject branch_id into request body if present in headers and not already in body
  if (headerBranchId && req.body && typeof req.body === 'object') {
    if (!req.body.branch_id) {
      req.body.branch_id = headerBranchId;
    }
  }

  // Inject school_id into query parameters if present in headers and not already in query
  if (headerSchoolId && req.query && typeof req.query === 'object') {
    if (!req.query.school_id) {
      req.query.school_id = headerSchoolId;
    }
  }

  // Inject branch_id into query parameters if present in headers and not already in query
  if (headerBranchId && req.query && typeof req.query === 'object') {
    if (!req.query.branch_id) {
      req.query.branch_id = headerBranchId;
    }
  }

  console.log('🔍 Header Injector - Values after injection:', {
    requestedSchoolId: req.requestedSchoolId,
    requestedBranchId: req.requestedBranchId,
    body_school_id: req.body && req.body.school_id,
    body_branch_id: req.body && req.body.branch_id,
    query_school_id: req.query && req.query.school_id,
    query_branch_id: req.query && req.query.branch_id
  });

  next();
};

module.exports = { headerInjector };