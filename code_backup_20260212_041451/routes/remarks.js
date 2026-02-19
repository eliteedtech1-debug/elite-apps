const express = require('express');
const router = express.Router();
const db = require('../models');

router.post('/', async (req, res) => {
  try {
    const { query_type, class_code, academic_year, term, remark_type, admission_no, remark } = req.body;
    const school_id = req.headers['x-school-id'];

    if (query_type === 'select') {
      const whereClause = {};
      // Only add school_id if it's provided (exam_remarks table might not have this column)
      if (school_id) whereClause.school_id = school_id;
      if (class_code) whereClause.class_code = class_code;
      if (academic_year) whereClause.academic_year = academic_year;
      if (term) whereClause.term = term;
      if (remark_type) whereClause.remark_type = remark_type;
      if (admission_no) whereClause.admission_no = admission_no;

      const remarks = await db.remarks.findAll({ where: whereClause });
      return res.json({ success: true, data: remarks });
    }

    if (query_type === 'insert' || query_type === 'update') {
      if (!admission_no || !remark || !remark_type) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const [record, created] = await db.remarks.findOrCreate({
        where: { school_id, admission_no, academic_year, term, remark_type },
        defaults: { class_code, remark }
      });

      if (!created) {
        await record.update({ remark, class_code });
      }

      return res.json({ success: true, data: record });
    }

    res.status(400).json({ success: false, message: 'Invalid query_type' });
  } catch (error) {
    console.error('Remarks API error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
