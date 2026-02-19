const router = require('express').Router();
const auditService = require('../services/auditService');
const passport = require('passport');

const auth = passport.authenticate('jwt', { session: false });

router.get('/audit/:entityType/:entityId', auth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit, offset } = req.query;
    
    const history = await auditService.getEntityHistory(entityType, entityId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });
    
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset, start_date, end_date } = req.query;
    
    const activity = await auditService.getUserActivity(userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      startDate: start_date,
      endDate: end_date
    });
    
    res.json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit/school', auth, async (req, res) => {
  try {
    const { school_id, limit, offset, action, entity_type } = req.query;
    
    if (!school_id) {
      return res.status(400).json({ success: false, error: 'school_id is required' });
    }
    
    const activity = await auditService.getSchoolActivity(school_id, {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      action,
      entityType: entity_type
    });
    
    res.json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit/:auditId/can-rollback', auth, async (req, res) => {
  try {
    const result = await auditService.canRollback(req.params.auditId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/audit/:auditId/rollback', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }
    
    await auditService.rollback(
      req.params.auditId, 
      req.user.id,
      req.user.name || req.user.email,
      reason
    );
    
    res.json({ success: true, message: 'Rollback successful' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
