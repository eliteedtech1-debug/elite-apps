const auditDB = require('../models/audit');
const { v4: uuidv4 } = require('uuid');

class AuditService {
  async log({
    userId,
    userType,
    userName,
    action,
    entityType,
    entityId,
    schoolId,
    branchId,
    description,
    oldValues = null,
    newValues = null,
    req = null
  }) {
    try {
      const changes = this.calculateChanges(oldValues, newValues);
      
      return await auditDB.AuditTrail.create({
        user_id: userId,
        user_type: userType,
        user_name: userName,
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        school_id: schoolId,
        branch_id: branchId,
        description,
        old_values: oldValues,
        new_values: newValues,
        changes,
        ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
        user_agent: req?.headers?.['user-agent'],
        request_id: req?.id || uuidv4()
      });
    } catch (error) {
      console.error('Audit log failed:', error);
      return null;
    }
  }

  calculateChanges(oldValues, newValues) {
    if (!oldValues || !newValues) return null;
    
    const changes = {};
    Object.keys(newValues).forEach(key => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key]
        };
      }
    });
    
    return Object.keys(changes).length > 0 ? changes : null;
  }

  async getEntityHistory(entityType, entityId, { limit = 50, offset = 0 }) {
    return await auditDB.AuditTrail.findAll({
      where: {
        entity_type: entityType,
        entity_id: String(entityId)
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async getUserActivity(userId, { limit = 50, offset = 0, startDate, endDate }) {
    const where = { user_id: userId };
    const { Op } = auditDB.sequelize.Sequelize;
    if (startDate) where.createdAt = { [Op.gte]: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: endDate };

    return await auditDB.AuditTrail.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async getSchoolActivity(schoolId, { limit = 100, offset = 0, action, entityType }) {
    const where = { school_id: schoolId };
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;

    return await auditDB.AuditTrail.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async canRollback(auditId) {
    const audit = await auditDB.AuditTrail.findByPk(auditId);
    if (!audit) return { can: false, reason: 'Audit log not found' };
    if (audit.is_rolled_back) return { can: false, reason: 'Already rolled back' };
    if (!audit.old_values) return { can: false, reason: 'No previous state to restore' };
    
    const mainDB = require('../models');
    const model = mainDB[audit.entity_type];
    if (!model) return { can: false, reason: 'Entity type not found' };
    
    const entity = await model.findByPk(audit.entity_id);
    if (!entity && audit.action !== 'DELETE') {
      return { can: false, reason: 'Entity no longer exists' };
    }
    
    return { can: true };
  }

  async rollback(auditId, userId, userName, reason) {
    const audit = await auditDB.AuditTrail.findByPk(auditId);
    const canRollback = await this.canRollback(auditId);
    
    if (!canRollback.can) {
      throw new Error(canRollback.reason);
    }

    const mainDB = require('../models');
    const model = mainDB[audit.entity_type];
    let result;

    switch (audit.action) {
      case 'CREATE':
        result = await model.destroy({ where: { id: audit.entity_id } });
        break;
        
      case 'UPDATE':
        result = await model.update(audit.old_values, { 
          where: { id: audit.entity_id } 
        });
        break;
        
      case 'DELETE':
        result = await model.create({ ...audit.old_values, id: audit.entity_id });
        break;
        
      default:
        throw new Error(`Cannot rollback action: ${audit.action}`);
    }

    await audit.update({
      is_rolled_back: true,
      rolled_back_at: new Date(),
      rolled_back_by: userId,
      rollback_reason: reason
    });

    await this.log({
      userId,
      userType: 'admin',
      userName,
      action: 'ROLLBACK',
      entityType: audit.entity_type,
      entityId: audit.entity_id,
      schoolId: audit.school_id,
      branchId: audit.branch_id,
      description: `Rolled back ${audit.action} on ${audit.entity_type} #${audit.entity_id}. Reason: ${reason}`
    });

    return result;
  }
}

module.exports = new AuditService();
