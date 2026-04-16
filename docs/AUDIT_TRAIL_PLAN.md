# 📝 Audit Trail & Rollback System - Implementation Plan

## Overview
Add comprehensive audit logging and rollback capability without disrupting existing functionality.

---

## Phase 1: Audit Trail Infrastructure (3 hours)

### 1.1 Create Audit Log Model
**File:** `elscholar-api/src/models/AuditTrail.js`
```javascript
module.exports = (sequelize, DataTypes) => {
  const AuditTrail = sequelize.define('AuditTrail', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    // Who
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    
    // What
    action: {
      type: DataTypes.ENUM(
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
        'PAYMENT', 'REFUND', 'GRADE_CHANGE', 'PROMOTION'
      ),
      allowNull: false,
      index: true
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true
    },
    entity_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true
    },
    
    // Where
    school_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
      index: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    
    // Details
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    
    // Context
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      index: true
    },
    
    // Rollback
    is_rolled_back: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    rolled_back_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rolled_back_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rollback_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_trails',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['school_id', 'created_at'] },
      { fields: ['action', 'created_at'] }
    ]
  });

  return AuditTrail;
};
```

### 1.2 Create Audit Service
**File:** `elscholar-api/src/services/auditService.js`
```javascript
const db = require('../models');
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
    const changes = this.calculateChanges(oldValues, newValues);
    
    return await db.AuditTrail.create({
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
      ip_address: req?.ip || req?.headers['x-forwarded-for'],
      user_agent: req?.headers['user-agent'],
      request_id: req?.id || uuidv4()
    });
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
    return await db.AuditTrail.findAll({
      where: {
        entity_type: entityType,
        entity_id: String(entityId)
      },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }

  async getUserActivity(userId, { limit = 50, offset = 0, startDate, endDate }) {
    const where = { user_id: userId };
    if (startDate) where.created_at = { [db.Sequelize.Op.gte]: startDate };
    if (endDate) where.created_at = { ...where.created_at, [db.Sequelize.Op.lte]: endDate };

    return await db.AuditTrail.findAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }

  async getSchoolActivity(schoolId, { limit = 100, offset = 0, action, entityType }) {
    const where = { school_id: schoolId };
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;

    return await db.AuditTrail.findAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }

  async canRollback(auditId) {
    const audit = await db.AuditTrail.findByPk(auditId);
    if (!audit) return { can: false, reason: 'Audit log not found' };
    if (audit.is_rolled_back) return { can: false, reason: 'Already rolled back' };
    if (!audit.old_values) return { can: false, reason: 'No previous state to restore' };
    
    // Check if entity still exists
    const model = db[audit.entity_type];
    if (!model) return { can: false, reason: 'Entity type not found' };
    
    const entity = await model.findByPk(audit.entity_id);
    if (!entity && audit.action !== 'DELETE') {
      return { can: false, reason: 'Entity no longer exists' };
    }
    
    return { can: true };
  }

  async rollback(auditId, userId, reason) {
    const audit = await db.AuditTrail.findByPk(auditId);
    const canRollback = await this.canRollback(auditId);
    
    if (!canRollback.can) {
      throw new Error(canRollback.reason);
    }

    const model = db[audit.entity_type];
    let result;

    switch (audit.action) {
      case 'CREATE':
        // Delete the created record
        result = await model.destroy({ where: { id: audit.entity_id } });
        break;
        
      case 'UPDATE':
        // Restore old values
        result = await model.update(audit.old_values, { 
          where: { id: audit.entity_id } 
        });
        break;
        
      case 'DELETE':
        // Recreate the deleted record
        result = await model.create({ ...audit.old_values, id: audit.entity_id });
        break;
        
      default:
        throw new Error(`Cannot rollback action: ${audit.action}`);
    }

    // Mark as rolled back
    await audit.update({
      is_rolled_back: true,
      rolled_back_at: new Date(),
      rolled_back_by: userId,
      rollback_reason: reason
    });

    // Log the rollback action
    await this.log({
      userId,
      userType: 'admin',
      userName: 'System',
      action: 'ROLLBACK',
      entityType: audit.entity_type,
      entityId: audit.entity_id,
      schoolId: audit.school_id,
      branchId: audit.branch_id,
      description: `Rolled back ${audit.action} on ${audit.entity_type}`,
      oldValues: audit.new_values,
      newValues: audit.old_values
    });

    return result;
  }
}

module.exports = new AuditService();
```

---

## Phase 2: Middleware Integration (2 hours)

### 2.1 Create Audit Middleware
**File:** `elscholar-api/src/middleware/auditMiddleware.js`
```javascript
const auditService = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

// Add request ID to all requests
const requestIdMiddleware = (req, res, next) => {
  req.id = uuidv4();
  next();
};

// Audit wrapper for controllers
const auditAction = (entityType, action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only audit successful operations
      if (data.success && req.user) {
        const entityId = data.data?.id || req.params.id || req.body.id;
        
        auditService.log({
          userId: req.user.id,
          userType: req.user.user_type,
          userName: req.user.name || req.user.email,
          action,
          entityType,
          entityId,
          schoolId: req.headers['x-school-id'] || req.user.school_id,
          branchId: req.headers['x-branch-id'] || req.user.branch_id,
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

// Capture old values before update/delete
const captureOldValues = (model) => {
  return async (req, res, next) => {
    const id = req.params.id;
    if (id) {
      const record = await model.findByPk(id);
      if (record) {
        req.auditOldValues = record.toJSON();
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
```

### 2.2 Apply to Routes (Non-Disruptive)
**Example: Student Routes**
```javascript
const { auditAction, captureOldValues } = require('../middleware/auditMiddleware');
const db = require('../models');

// Add audit to existing routes without changing logic
router.post('/students', 
  auditAction('Student', 'CREATE'),
  studentController.create
);

router.put('/students/:id',
  captureOldValues(db.Student),
  auditAction('Student', 'UPDATE'),
  studentController.update
);

router.delete('/students/:id',
  captureOldValues(db.Student),
  auditAction('Student', 'DELETE'),
  studentController.delete
);
```

---

## Phase 3: Critical Operations Tracking (2 hours)

### 3.1 Payment Audit (High Priority)
```javascript
// In PaymentsController.js
const auditService = require('../services/auditService');

async createPayment(req, res) {
  const payment = await db.PaymentEntry.create(req.body);
  
  // Explicit audit for financial transactions
  await auditService.log({
    userId: req.user.id,
    userType: req.user.user_type,
    userName: req.user.name,
    action: 'PAYMENT',
    entityType: 'PaymentEntry',
    entityId: payment.item_id,
    schoolId: payment.school_id,
    branchId: payment.branch_id,
    description: `Payment of ₦${payment.amount} for ${payment.student_name}`,
    newValues: payment.toJSON(),
    req
  });
  
  res.json({ success: true, data: payment });
}
```

### 3.2 Grade Change Audit
```javascript
// In GradesController.js
async updateGrade(req, res) {
  const oldGrade = await db.Grade.findByPk(req.params.id);
  const newGrade = await oldGrade.update(req.body);
  
  await auditService.log({
    userId: req.user.id,
    userType: req.user.user_type,
    userName: req.user.name,
    action: 'GRADE_CHANGE',
    entityType: 'Grade',
    entityId: newGrade.id,
    schoolId: newGrade.school_id,
    branchId: newGrade.branch_id,
    description: `Grade changed from ${oldGrade.score} to ${newGrade.score}`,
    oldValues: oldGrade.toJSON(),
    newValues: newGrade.toJSON(),
    req
  });
  
  res.json({ success: true, data: newGrade });
}
```

---

## Phase 4: Audit UI & Rollback (3 hours)

### 4.1 Audit Routes
**File:** `elscholar-api/src/routes/audit.js`
```javascript
const router = require('express').Router();
const auditService = require('../services/auditService');

// Get entity history
router.get('/audit/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  const { limit, offset } = req.query;
  
  const history = await auditService.getEntityHistory(entityType, entityId, {
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0
  });
  
  res.json({ success: true, data: history });
});

// Get user activity
router.get('/audit/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit, offset, start_date, end_date } = req.query;
  
  const activity = await auditService.getUserActivity(userId, {
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
    startDate: start_date,
    endDate: end_date
  });
  
  res.json({ success: true, data: activity });
});

// Get school activity
router.get('/audit/school/:schoolId', async (req, res) => {
  const { schoolId } = req.params;
  const { limit, offset, action, entity_type } = req.query;
  
  const activity = await auditService.getSchoolActivity(schoolId, {
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0,
    action,
    entityType: entity_type
  });
  
  res.json({ success: true, data: activity });
});

// Check if can rollback
router.get('/audit/:auditId/can-rollback', async (req, res) => {
  const result = await auditService.canRollback(req.params.auditId);
  res.json({ success: true, ...result });
});

// Rollback action (requires admin)
router.post('/audit/:auditId/rollback', async (req, res) => {
  const { reason } = req.body;
  
  try {
    await auditService.rollback(req.params.auditId, req.user.id, reason);
    res.json({ success: true, message: 'Rollback successful' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### 4.2 Audit Viewer Component
**File:** `elscholar-ui/src/feature-module/audit/AuditViewer.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Input, message } from 'antd';
import { _getAsync, _postAsync } from '../Utils/Helper';

const AuditViewer = ({ entityType, entityId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [entityType, entityId]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await _getAsync(`/audit/${entityType}/${entityId}`);
    setHistory(data);
    setLoading(false);
  };

  const handleRollback = async (auditId: number) => {
    Modal.confirm({
      title: 'Confirm Rollback',
      content: (
        <div>
          <p>Are you sure you want to rollback this action?</p>
          <Input.TextArea 
            placeholder="Reason for rollback (required)"
            id="rollback-reason"
          />
        </div>
      ),
      onOk: async () => {
        const reason = (document.getElementById('rollback-reason') as HTMLTextAreaElement).value;
        if (!reason) {
          message.error('Reason is required');
          return;
        }
        
        await _postAsync(`/audit/${auditId}/rollback`, { reason });
        message.success('Rollback successful');
        loadHistory();
      }
    });
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (action: string) => <Tag color="blue">{action}</Tag>
    },
    {
      title: 'User',
      dataIndex: 'user_name'
    },
    {
      title: 'Description',
      dataIndex: 'description'
    },
    {
      title: 'Changes',
      dataIndex: 'changes',
      render: (changes: any) => changes ? Object.keys(changes).length : 0
    },
    {
      title: 'Action',
      render: (record: any) => (
        !record.is_rolled_back && record.old_values && (
          <Button size="small" onClick={() => handleRollback(record.id)}>
            Rollback
          </Button>
        )
      )
    }
  ];

  return (
    <Table
      dataSource={history}
      columns={columns}
      loading={loading}
      rowKey="id"
      pagination={{ pageSize: 20 }}
    />
  );
};

export default AuditViewer;
```

---

## Phase 5: Automated Audit Points (1 hour)

### 5.1 Sequelize Hooks (Global Audit)
**File:** `elscholar-api/src/hooks/auditHooks.js`
```javascript
const auditService = require('../services/auditService');

const registerAuditHooks = (model, entityType) => {
  model.addHook('afterCreate', async (instance, options) => {
    if (options.auditUser) {
      await auditService.log({
        ...options.auditUser,
        action: 'CREATE',
        entityType,
        entityId: instance.id,
        description: `Created ${entityType}`,
        newValues: instance.toJSON()
      });
    }
  });

  model.addHook('afterUpdate', async (instance, options) => {
    if (options.auditUser) {
      await auditService.log({
        ...options.auditUser,
        action: 'UPDATE',
        entityType,
        entityId: instance.id,
        description: `Updated ${entityType}`,
        oldValues: instance._previousDataValues,
        newValues: instance.toJSON()
      });
    }
  });

  model.addHook('afterDestroy', async (instance, options) => {
    if (options.auditUser) {
      await auditService.log({
        ...options.auditUser,
        action: 'DELETE',
        entityType,
        entityId: instance.id,
        description: `Deleted ${entityType}`,
        oldValues: instance.toJSON()
      });
    }
  });
};

module.exports = { registerAuditHooks };
```

---

## Benefits

✅ **Non-Disruptive:** Middleware-based, doesn't change existing code  
✅ **Comprehensive:** Tracks all CRUD operations  
✅ **Rollback:** Can undo changes safely  
✅ **Searchable:** Query by user, entity, date, action  
✅ **Compliance:** Full audit trail for regulations  
✅ **Performance:** Async logging, doesn't slow requests  

---

## Timeline: 11 hours total
- Phase 1: 3 hours (Infrastructure)
- Phase 2: 2 hours (Middleware)
- Phase 3: 2 hours (Critical ops)
- Phase 4: 3 hours (UI & Rollback)
- Phase 5: 1 hour (Automation)

---

## Priority Entities to Audit

1. **Financial** (Critical)
   - PaymentEntry
   - JournalEntry
   - PayrollLine

2. **Academic** (High)
   - Student
   - Grade
   - Attendance

3. **Administrative** (Medium)
   - Staff
   - User
   - Class

---

**Status:** Ready for implementation  
**Risk:** Low (non-invasive)  
**Storage:** ~1GB per 1M audit logs
