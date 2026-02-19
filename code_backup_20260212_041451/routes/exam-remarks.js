const express = require('express');
const router = express.Router();
const db = require('../models');

router.post('/', async (req, res) => {
  try {
    const { query_type, academic_year, term, remark_type, admission_no, remark, created_by } = req.body;

    if (query_type === 'select') {
      const whereClause = {};
      if (academic_year) whereClause.academic_year = academic_year;
      if (term) whereClause.term = term;
      if (remark_type) whereClause.remark_type = remark_type;
      if (admission_no) whereClause.admission_no = admission_no;

      console.log('📝 Fetching exam_remarks with whereClause:', whereClause);
      const remarks = await db.exam_remarks.findAll({ where: whereClause });
      console.log('📝 Found', remarks.length, 'exam_remarks records');
      return res.json({ success: true, data: remarks });
    }

    // Support fetching by student (admission_no only)
    if (query_type === 'select_by_student') {
      if (!admission_no) {
        return res.status(400).json({ success: false, message: 'admission_no is required' });
      }

      const whereClause = { admission_no };
      if (academic_year) whereClause.academic_year = academic_year;
      if (term) whereClause.term = term;
      if (remark_type) whereClause.remark_type = remark_type;

      console.log('📝 Fetching exam_remarks for student:', admission_no, whereClause);
      const remarks = await db.exam_remarks.findAll({ where: whereClause });
      console.log('📝 Found', remarks.length, 'remarks for student');
      return res.json({ success: true, data: remarks });
    }

    if (query_type === 'insert' || query_type === 'update') {
      if (!admission_no || !remark || !remark_type) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const [record, isCreated] = await db.exam_remarks.findOrCreate({
        where: { admission_no, academic_year, term, remark_type },
        defaults: { remark, created_by }
      });

      if (!isCreated) {
        await record.update({ remark, created_by });
      }

      return res.json({ success: true, data: record });
    }

    if (query_type === 'delete') {
      if (!admission_no) {
        return res.status(400).json({ success: false, message: 'admission_no is required' });
      }

      const whereClause = { admission_no };
      if (academic_year) whereClause.academic_year = academic_year;
      if (term) whereClause.term = term;
      if (remark_type) whereClause.remark_type = remark_type;

      await db.exam_remarks.destroy({ where: whereClause });
      return res.json({ success: true, message: 'Remark deleted successfully' });
    }

    if (query_type === 'fetch_teacher_remarks' || query_type === 'get-teacher-remarks') {
      const { teacher_id, class_code, created_by } = req.body;
      
      // Require either created_by, teacher_id, or class_code for filtering
      if (!created_by && !teacher_id && !class_code) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide created_by, teacher_id, or class_code to filter teacher remarks' 
        });
      }

      let whereClause = {};
      if (academic_year) whereClause.academic_year = academic_year;
      if (term) whereClause.term = term;
      if (remark_type) whereClause.remark_type = remark_type;

      // Filter by class_code if provided (get students from that class)
      if (class_code) {
        const students = await db.sequelize.query(
          'SELECT admission_no FROM students WHERE class_code = ?',
          { replacements: [class_code], type: db.sequelize.QueryTypes.SELECT }
        );
        const admissionNos = students.map(s => s.admission_no);
        if (admissionNos.length > 0) {
          whereClause.admission_no = admissionNos;
        }
      } else if (admission_no) {
        whereClause.admission_no = admission_no;
      }

      // Filter by teacher
      if (created_by) {
        whereClause.created_by = created_by;
      } else if (teacher_id) {
        whereClause.created_by = teacher_id;
      } else if (req.user?.id) {
        const teacher = await db.sequelize.query(
          'SELECT id FROM teachers WHERE user_id = ?',
          { replacements: [req.user.id], type: db.sequelize.QueryTypes.SELECT }
        );
        if (teacher.length > 0) {
          whereClause.created_by = teacher[0].id;
        }
      }

      const remarks = await db.exam_remarks.findAll({ where: whereClause });
      return res.json({ success: true, data: remarks });
    }

    res.status(400).json({ success: false, message: 'Invalid query_type' });
  } catch (error) {
    console.error('Exam Remarks API error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
