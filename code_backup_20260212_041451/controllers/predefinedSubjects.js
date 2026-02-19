const db = require("../models");
const { Op } = require("sequelize");

const getPredefinedSubjects = async (req, res) => {
  try {
    const { section, stream, school_id } = req.query;
    const userSchoolId = req.user?.school_id;

    const where = { status: 'Active' };
    
    if (section) where.section = section;
    if (stream) where.stream = stream;
    
    where[Op.or] = [
      { school_id: null },
      { school_id: school_id || userSchoolId }
    ];

    const subjects = await db.PredefinedSubject.findAll({
      where,
      order: [['section', 'ASC'], ['stream', 'ASC'], ['name', 'ASC']]
    });

    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error("Error fetching predefined subjects:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPredefinedSubject = async (req, res) => {
  try {
    const { name, type, section, stream, school_id } = req.body;
    const userSchoolId = req.user?.school_id;

    if (!name || !type || !section) {
      return res.status(400).json({ 
        success: false, 
        error: "Name, type, and section are required" 
      });
    }

    const subject = await db.PredefinedSubject.create({
      name,
      type,
      section,
      stream: stream || null,
      school_id: school_id || userSchoolId,
      status: 'Active'
    });

    res.json({ success: true, data: subject, message: "Subject created successfully" });
  } catch (error) {
    console.error("Error creating predefined subject:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePredefinedSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, section, stream, status } = req.body;

    const subject = await db.PredefinedSubject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ success: false, error: "Subject not found" });
    }

    await subject.update({ name, type, section, stream, status });

    res.json({ success: true, data: subject, message: "Subject updated successfully" });
  } catch (error) {
    console.error("Error updating predefined subject:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deletePredefinedSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await db.PredefinedSubject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ success: false, error: "Subject not found" });
    }

    await subject.update({ status: 'Inactive' });

    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting predefined subject:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPredefinedSubjects,
  createPredefinedSubject,
  updatePredefinedSubject,
  deletePredefinedSubject
};
