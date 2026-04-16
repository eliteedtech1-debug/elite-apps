# Phase 2 — Backend API (Backend Expert)

## Tasks

### 1. Sequelize Models

**`elscholar-api/src/models/alumni.js`**
```js
module.exports = (sequelize, DataTypes) => {
  const Alumni = sequelize.define('Alumni', {
    student_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    school_id: { type: DataTypes.STRING, allowNull: false },
    branch_id: { type: DataTypes.STRING, allowNull: false },
    graduation_year: { type: DataTypes.INTEGER, allowNull: false },
    last_class: { type: DataTypes.STRING, defaultValue: 'SS3' },
    certificate_number: DataTypes.STRING,
    remarks: DataTypes.TEXT,
  }, { tableName: 'alumni', underscored: true });

  Alumni.associate = (models) => {
    Alumni.belongsTo(models.Student, { foreignKey: 'student_id' });
  };

  return Alumni;
};
```

**`elscholar-api/src/models/studentStatusLog.js`**
```js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('StudentStatusLog', {
    student_id: { type: DataTypes.INTEGER, allowNull: false },
    school_id: { type: DataTypes.STRING, allowNull: false },
    from_status: { type: DataTypes.STRING, allowNull: false },
    to_status: { type: DataTypes.STRING, allowNull: false },
    changed_by: { type: DataTypes.INTEGER, allowNull: false },
    reason: DataTypes.STRING,
  }, { tableName: 'student_status_log', underscored: true, updatedAt: false });
};
```

---

### 2. Routes

**`elscholar-api/src/routes/alumni.js`**
```js
const router = require('express').Router();
const ctrl = require('../controllers/alumniController');
const auth = require('../middleware/auth');

router.post('/graduate', auth, ctrl.graduateStudents);
router.post('/promote', auth, ctrl.promoteStudents);
router.get('/', auth, ctrl.getAlumni);
router.patch('/:studentId/status', auth, ctrl.updateStatus);

module.exports = router;
```

Register in main app:
```js
app.use('/api/alumni', require('./routes/alumni'));
```

---

### 3. Controller

**`elscholar-api/src/controllers/alumniController.js`**
```js
const { Student, Alumni, StudentStatusLog, sequelize } = require('../models');
const { Op } = require('sequelize');

const graduateStudents = async (req, res) => {
  const school_id = req.user.school_id;
  const branch_id = req.headers['x-branch-id'] || req.user.branch_id;
  const { academic_year, student_ids, remarks } = req.body;

  const t = await sequelize.transaction();
  try {
    const students = await Student.findAll({
      where: { id: { [Op.in]: student_ids }, school_id, status: 'active' },
      transaction: t,
    });

    for (const student of students) {
      await Alumni.create({
        student_id: student.id,
        school_id,
        branch_id,
        graduation_year: new Date(academic_year).getFullYear(),
        last_class: student.class_name || 'SS3',
        remarks,
      }, { transaction: t });

      await StudentStatusLog.create({
        student_id: student.id,
        school_id,
        from_status: 'active',
        to_status: 'graduated',
        changed_by: req.user.id,
        reason: `Graduated ${academic_year}`,
      }, { transaction: t });

      await student.update({ status: 'graduated', status_date: new Date() }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, graduated: students.length });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

const promoteStudents = async (req, res) => {
  const school_id = req.user.school_id;
  const { from_class, to_class, student_ids } = req.body;

  const t = await sequelize.transaction();
  try {
    await Student.update(
      { class_name: to_class },
      { where: { id: { [Op.in]: student_ids }, school_id, class_name: from_class }, transaction: t }
    );

    const logs = student_ids.map(id => ({
      student_id: id, school_id,
      from_status: 'active', to_status: 'active',
      changed_by: req.user.id,
      reason: `Promoted from ${from_class} to ${to_class}`,
    }));
    await StudentStatusLog.bulkCreate(logs, { transaction: t });

    await t.commit();
    res.json({ success: true, promoted: student_ids.length });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

const getAlumni = async (req, res) => {
  const school_id = req.user.school_id;
  const { graduation_year, branch_id, page = 1, limit = 50 } = req.query;

  const where = { school_id };
  if (graduation_year) where.graduation_year = graduation_year;
  if (branch_id) where.branch_id = branch_id;

  const { count, rows } = await Alumni.findAndCountAll({
    where,
    include: [{ association: 'Student', attributes: ['id', 'first_name', 'last_name', 'admission_number', 'status'] }],
    limit: Number(limit),
    offset: (page - 1) * limit,
    order: [['graduation_year', 'DESC']],
  });

  res.json({ success: true, total: count, data: rows });
};

const updateStatus = async (req, res) => {
  const school_id = req.user.school_id;
  const { studentId } = req.params;
  const { status, reason } = req.body;

  const t = await sequelize.transaction();
  try {
    const student = await Student.findOne({ where: { id: studentId, school_id }, transaction: t });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    await StudentStatusLog.create({
      student_id: student.id, school_id,
      from_status: student.status, to_status: status,
      changed_by: req.user.id, reason,
    }, { transaction: t });

    await student.update({ status, status_date: new Date(), status_reason: reason }, { transaction: t });

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { graduateStudents, promoteStudents, getAlumni, updateStatus };
```

---

## API Reference

### POST `/api/alumni/graduate`
```json
{
  "academic_year": "2025-2026",
  "student_ids": [1, 2, 3],
  "remarks": "WAEC 2026 set"
}
```

### POST `/api/alumni/promote`
```json
{
  "from_class": "JSS3",
  "to_class": "SS1",
  "student_ids": [4, 5, 6]
}
```

### GET `/api/alumni?graduation_year=2026&branch_id=BRCH00027&page=1&limit=50`

### PATCH `/api/alumni/:studentId/status`
```json
{
  "status": "withdrawn",
  "reason": "Family relocation"
}
```
