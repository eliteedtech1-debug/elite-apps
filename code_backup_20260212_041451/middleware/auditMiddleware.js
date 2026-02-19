const auditService = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  req.id = uuidv4();
  next();
};

const auditAction = (entityType, action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (data.success && req.user) {
        const entityId = data.data?.id || data.data?.item_id || req.params.id || req.body.id;
        const schoolId = req.headers['x-school-id'] || req.user.school_id;
        const branchId = req.headers['x-branch-id'] || req.user.branch_id;
        
        auditService.log({
          userId: req.user.id,
          userType: req.user.user_type,
          userName: req.user.name || req.user.email,
          action,
          entityType,
          entityId,
          schoolId,
          branchId,
          description: `${action} ${entityType} #${entityId}`,
          oldValues: req.auditOldValues,
          newValues: data.data,
          req
        }).catch(err => console.error('Audit log failed:', err));
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

const captureOldValues = (model) => {
  return async (req, res, next) => {
    const id = req.params.id;
    if (id) {
      try {
        const record = await model.findByPk(id);
        if (record) {
          req.auditOldValues = record.toJSON();
        }
      } catch (error) {
        console.error('Failed to capture old values:', error);
      }
    }
    next();
  };
};

module.exports = {
  requestIdMiddleware,
  auditAction,
  captureOldValues
};
