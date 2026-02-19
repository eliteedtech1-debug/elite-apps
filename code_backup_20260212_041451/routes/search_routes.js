const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const { redisConnection } = require('../utils/redisConnection');

const CACHE_TTL = 300;

router.post('/search/global', async (req, res) => {
  const { query, school_id, branch_id, limit = 10 } = req.body;
  
  const effectiveSchoolId = req.headers['x-school-id'] || school_id || req.user?.school_id;
  const effectiveBranchId = req.headers['x-branch-id'] || branch_id || req.user?.branch_id;
  
  if (!query || query.length < 2) {
    return res.json({ 
      success: true, 
      results: { students: [], staff: [], payments: [], classes: [] } 
    });
  }
  
  try {
    const cacheKey = `search:${effectiveSchoolId}:${effectiveBranchId}:${query.toLowerCase()}:${limit}`;
    
    const cached = await redisConnection.executeCommand('get', cacheKey);
    if (cached) {
      return res.json({ 
        success: true, 
        ...JSON.parse(cached),
        cached: true
      });
    }
    
    const [students, staff, payments, classes] = await Promise.all([
      searchStudents(query, effectiveSchoolId, effectiveBranchId, limit),
      searchStaff(query, effectiveSchoolId, effectiveBranchId, limit),
      searchPayments(query, effectiveSchoolId, effectiveBranchId, limit),
      searchClasses(query, effectiveSchoolId, effectiveBranchId, limit)
    ]);
    
    const results = { 
      results: { students, staff, payments, classes },
      query,
      timestamp: new Date()
    };
    
    await redisConnection.executeCommand('set', cacheKey, JSON.stringify(results), 'EX', CACHE_TTL);
    
    res.json({ success: true, ...results });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

async function searchStudents(query, school_id, branch_id, limit) {
  try {
    const searchTerm = `%${query}%`;
    
    return await db.Student.findAll({
      where: {
        school_id,
        branch_id,
        [Op.or]: [
          { first_name: { [Op.like]: searchTerm } },
          { surname: { [Op.like]: searchTerm } },
          { other_names: { [Op.like]: searchTerm } },
          { student_name: { [Op.like]: searchTerm } },
          { admission_no: { [Op.like]: searchTerm } },
          { class_name: { [Op.like]: searchTerm } },
          { email: { [Op.like]: searchTerm } },
          { phone: { [Op.like]: searchTerm } }
        ]
      },
      limit,
      attributes: [
        'id', 
        'first_name', 
        'surname',
        'student_name',
        'admission_no', 
        'class_name', 
        'section',
        'email',
        'status'
      ],
      order: [['first_name', 'ASC']]
    });
  } catch (error) {
    console.error('Student search error:', error);
    return [];
  }
}

async function searchStaff(query, school_id, branch_id, limit) {
  try {
    const searchTerm = `%${query}%`;
    
    return await db.Staff.findAll({
      where: {
        school_id,
        branch_id,
        [Op.or]: [
          { name: { [Op.like]: searchTerm } },
          { email: { [Op.like]: searchTerm } },
          { mobile_no: { [Op.like]: searchTerm } }
        ]
      },
      limit,
      attributes: [
        'staff_id', 
        'name',
        'user_type',
        'staff_type',
        'email',
        'mobile_no',
        'status'
      ],
      order: [['name', 'ASC']]
    });
  } catch (error) {
    console.error('Staff search error:', error);
    return [];
  }
}

async function searchPayments(query, school_id, branch_id, limit) {
  try {
    const searchTerm = `%${query}%`;
    
    return await db.PaymentEntry.findAll({
      where: {
        school_id,
        branch_id,
        [Op.or]: [
          { ref_no: { [Op.like]: searchTerm } },
          { student_name: { [Op.like]: searchTerm } },
          { admission_no: { [Op.like]: searchTerm } }
        ]
      },
      limit,
      attributes: [
        'item_id', 
        'ref_no', 
        'student_name',
        'admission_no',
        'amount', 
        'payment_date',
        'payment_method',
        'status'
      ],
      order: [['payment_date', 'DESC']]
    });
  } catch (error) {
    console.error('Payment search error:', error);
    return [];
  }
}

async function searchClasses(query, school_id, branch_id, limit) {
  try {
    const searchTerm = `%${query}%`;
    
    const classes = await db.Class.findAll({
      where: {
        school_id,
        branch_id,
        [Op.or]: [
          { class_name: { [Op.like]: searchTerm } },
          { section: { [Op.like]: searchTerm } }
        ]
      },
      limit,
      attributes: [
        'id', 
        'class_name', 
        'class_code',
        'section',
        'capacity'
      ],
      order: [['class_name', 'ASC']]
    });
    
    for (const cls of classes) {
      const count = await db.Student.count({
        where: {
          school_id,
          branch_id,
          class_name: cls.class_name
        }
      });
      cls.dataValues.student_count = count;
    }
    
    return classes;
  } catch (error) {
    console.error('Class search error:', error);
    return [];
  }
}

module.exports = router;
