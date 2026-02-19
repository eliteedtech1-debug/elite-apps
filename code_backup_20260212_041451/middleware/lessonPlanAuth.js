// Role-based access control for lesson plans
const ADMIN_ROLES = ['admin', 'branchadmin'];
const TEACHER_ROLES = ['teacher'];

const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role || req.headers['x-user-type'];
  if (!ADMIN_ROLES.includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Admin access required' 
    });
  }
  next();
};

const requireTeacher = (req, res, next) => {
  const userRole = req.user?.role || req.headers['x-user-type'];
  if (!TEACHER_ROLES.includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Teacher access required' 
    });
  }
  next();
};

const requireBranchAccess = (req, res, next) => {
  const userBranchId = req.user?.branch_id || req.headers['x-branch-id'];
  const resourceBranchId = req.body?.branch_id || req.query?.branch_id;
  
  if (resourceBranchId && userBranchId !== resourceBranchId) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Branch access denied' 
    });
  }
  next();
};

module.exports = {
  requireAdmin,
  requireTeacher,
  requireBranchAccess,
  ADMIN_ROLES,
  TEACHER_ROLES
};
