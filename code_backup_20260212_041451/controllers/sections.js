const db = require("../models");

const CreateSections = async (req, res) => {
  const {
    school_id = "",
    section_id = "",
    section_name = "",
    branch_id,
    short_name = "",
  } = req.body;

  try {
    const finalSchoolId = school_id || req.user?.school_id;
    const finalBranchId = branch_id || req.user?.branch_id;

    if (!finalSchoolId || !section_name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: school_id and section_name are required",
      });
    }

    const newSectionId = section_id || `SEC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const sectionAddress = section_name.substring(0, 10);

    // 🔥 This avoids duplicate key errors automatically
    const [results] = await db.sequelize.query(
      `INSERT INTO school_section_table (
          section_id, section_name, school_id, branch_id, section_address
        )
        VALUES (
          :section_id, :section_name, :school_id, :branch_id, :section_address
        )
        ON DUPLICATE KEY UPDATE
          section_name = VALUES(section_name),
          section_address = VALUES(section_address)`,
      {
        replacements: {
          section_id: newSectionId,
          section_name,
          school_id: finalSchoolId,
          branch_id: finalBranchId,
          section_address: sectionAddress,
        },
        type: db.sequelize.QueryTypes.INSERT,
      }
    );

    res.json({
      success: true,
      message: "Section inserted or updated successfully",
      data: {
        section_id: newSectionId,
        section_name,
        school_id: finalSchoolId,
        branch_id: finalBranchId,
        short_name: short_name || section_name.substring(0, 10),
      },
    });
  } catch (error) {
    console.error("Error creating/updating section:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving the section.",
      error: error.message,
    });
  }
};


const getSections = async (req, res) => {
  const {
    section_id = "",
    section_name = "",
    short_name = "",
  } = req.body;

  const { 
    query_type = "select", 
    school_id = "",
    branch_id = "" 
  } = req.query;

  try {
    // Build query dynamically based on parameters
    let whereClause = 'WHERE 1=1';
    const replacements = {};
    
    // Priority: query params > headers > JWT user values
    const finalSchoolId = school_id || req.headers['x-school-id'] || req.user?.school_id;
    const finalBranchId = branch_id || req.headers['x-branch-id'] || req.user?.branch_id;
    
    console.log('getSections - school_id:', school_id, 'branch_id:', branch_id);
    console.log('getSections - finalSchoolId:', finalSchoolId, 'finalBranchId:', finalBranchId);
    
    if (finalSchoolId) {
      whereClause += ' AND school_id = :school_id';
      replacements.school_id = finalSchoolId;
    }
    
    if (finalBranchId) {
      whereClause += ' AND branch_id = :branch_id';
      replacements.branch_id = finalBranchId;
    }
    
    if (section_id) {
      whereClause += ' AND section_id = :section_id';
      replacements.section_id = section_id;
    }
    
    if (section_name) {
      whereClause += ' AND section_name = :section_name';
      replacements.section_name = section_name;
    }
    
    if (short_name) {
      whereClause += ' AND short_name = :short_name';
      replacements.short_name = short_name;
    }

    whereClause +=" AND status='Active'";

    console.log('getSections - whereClause:', whereClause);
    console.log('getSections - replacements:', replacements);

    const results = await db.sequelize.query(
      `SELECT 
         section_id,
         section_name,
         school_id,
         branch_id,
         section_address,
         status
       FROM school_section_table 
       ${whereClause}
       ORDER BY section_id ASC`,
      {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    console.log('getSections - results:', results);

    res.json({
      success: true,
      message: "Sections fetched successfully",
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching sections.",
      error: error.message
    });
  }
};

const deleteSection = async (req, res) => {
  const {
    query_type = "delete",
    section_id = "",
    school_id = "",
    branch_id = "",
  } = req.body;

  try {
    // Validate required fields
    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: section_id"
      });
    }

    const finalSchoolId = school_id || req.user?.school_id;
    const finalBranchId = branch_id || req.user?.branch_id;

    // First check if section exists
    const [existingSections] = await db.sequelize.query(
      `SELECT section_id, section_name FROM school_section_table 
       WHERE section_id = :section_id 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
      {
        replacements: {
          section_id,
          school_id: finalSchoolId,
          branch_id: finalBranchId,
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!existingSections || existingSections.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    const sectionName = existingSections[0].section_name;

    // Check if section has any classes
    const [classCheck] = await db.sequelize.query(
      `SELECT COUNT(*) as class_count FROM classes 
       WHERE section = :section_name 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
      {
        replacements: {
          section_name: sectionName,
          school_id: finalSchoolId,
          branch_id: finalBranchId,
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const classCount = classCheck[0]?.class_count || 0;

    if (classCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete section '${sectionName}'. It contains ${classCount} class(es). Please remove all classes from this section first.`,
        class_count: classCount,
        deletion_prevented: true
      });
    }

    // If no classes, proceed with deletion using direct SQL
    const [results] = await db.sequelize.query(
      `DELETE FROM school_section_table 
       WHERE section_id = :section_id 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
      {
        replacements: {
          section_id,
          school_id: finalSchoolId,
          branch_id: finalBranchId,
        },
        type: db.sequelize.QueryTypes.DELETE
      }
    );

    res.json({
      success: true,
      message: `Section '${sectionName}' deleted successfully`,
      results,
      deletion_completed: true,
      section_name: sectionName
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the section.",
      error: error.message
    });
  }
};

module.exports = {
  CreateSections,
  getSections,
  deleteSection,
};
