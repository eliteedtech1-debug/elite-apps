const db = require("../models");

// Get all character traits for a school/branch
const getCharacterTraits = (req, res) => {
  const { query_type, school_id, branch_id, section } = req.body;
  
  const finalSchoolId = school_id || req.user.school_id || req.headers['x-school-id'];
  const finalBranchId = branch_id || req.headers['x-branch-id'] || req.user.branch_id;

  if (query_type === 'Select School Characters') {
    // If section provided, filter by section (with fallback to 'All')
    if (section) {
      db.sequelize.query(
        `SELECT id, school_id, branch_id, category, description, section
         FROM character_traits
         WHERE school_id = :school_id
           AND branch_id = :branch_id
           AND (section = :section OR section = 'All')
         ORDER BY FIELD(section, :section, 'All'), category, description`,
        {
          replacements: { school_id: finalSchoolId, branch_id: finalBranchId, section },
          type: db.Sequelize.QueryTypes.SELECT
        }
      )
      .then((results) => {
        res.json({ success: true, results });
      })
      .catch((error) => {
        console.error('Error fetching character traits:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch character traits' });
      });
    } else {
      // No section - return all traits
      db.sequelize.query(
        `SELECT id, school_id, branch_id, category, description, section
         FROM character_traits
         WHERE school_id = :school_id
           AND branch_id = :branch_id
         ORDER BY section, category, description`,
        {
          replacements: { school_id: finalSchoolId, branch_id: finalBranchId },
          type: db.Sequelize.QueryTypes.SELECT
        }
      )
      .then((results) => {
        res.json({ success: true, results });
      })
      .catch((error) => {
        console.error('Error fetching character traits:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch character traits' });
      });
    }
  } else {
    res.status(400).json({ success: false, message: 'Invalid query_type' });
  }
};

// Manage character traits (create, update, delete, copy)
const manageCharacterTraits = async (req, res) => {
  try {
    const { query_type, old_category, new_category, category, section, school_id, branch_id, 
            from_section, to_section, from_branch_id, to_branch_id, description, status, id } = req.body;
    
    const finalSchoolId = school_id || req.user.school_id || req.headers['x-school-id'];
    const finalBranchId = branch_id || req.headers['x-branch-id'] || req.user.branch_id;

    // Update Domain Category
    if (query_type === 'Update Domain Category') {
      await db.sequelize.query(
        `UPDATE character_traits 
         SET category = :new_category 
         WHERE category = :old_category 
           AND section = :section 
           AND school_id = :school_id
           AND branch_id = :branch_id`,
        {
          replacements: { old_category, new_category, section, school_id: finalSchoolId, branch_id: finalBranchId },
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );
      return res.json({ success: true, message: 'Domain category updated successfully' });
    }

    // Delete Domain
    if (query_type === 'Delete Domain') {
      await db.sequelize.query(
        `DELETE FROM character_traits 
         WHERE category = :category 
           AND section = :section 
           AND school_id = :school_id
           AND branch_id = :branch_id`,
        {
          replacements: { category, section, school_id: finalSchoolId, branch_id: finalBranchId },
          type: db.Sequelize.QueryTypes.DELETE
        }
      );
      return res.json({ success: true, message: 'Domain deleted successfully' });
    }

    // Copy Domains
    if (query_type === 'Copy Domains') {
      const query = from_section === 'ALL'
        ? `INSERT INTO character_traits (school_id, branch_id, section, category, description)
           SELECT school_id, branch_id, :to_section, category, description
           FROM character_traits WHERE school_id = :school_id AND branch_id = :branch_id`
        : `INSERT INTO character_traits (school_id, branch_id, section, category, description)
           SELECT school_id, branch_id, :to_section, category, description
           FROM character_traits WHERE section = :from_section AND school_id = :school_id AND branch_id = :branch_id`;
      
      await db.sequelize.query(query, {
        replacements: { from_section, to_section, school_id: finalSchoolId, branch_id: finalBranchId },
        type: db.Sequelize.QueryTypes.INSERT
      });
      return res.json({ success: true, message: 'Domains copied successfully' });
    }

    // Copy from Branch
    if (query_type === 'Copy from Branch') {
      const fromBranchCondition = from_branch_id === 'NULL' || from_branch_id === '' 
        ? 'branch_id IS NULL' 
        : 'branch_id = :from_branch_id';
      
      await db.sequelize.query(
        `INSERT INTO character_traits (school_id, branch_id, section, category, description)
         SELECT :school_id, :to_branch_id, section, category, description
         FROM character_traits WHERE school_id = :school_id AND ${fromBranchCondition}`,
        {
          replacements: {
            from_branch_id: from_branch_id === 'NULL' || from_branch_id === '' ? null : from_branch_id,
            to_branch_id: to_branch_id || finalBranchId,
            school_id: finalSchoolId
          },
          type: db.Sequelize.QueryTypes.INSERT
        }
      );
      return res.json({ success: true, message: 'Traits copied from branch successfully' });
    }

    // Create Character
    if (query_type === 'Create Character') {
      await db.sequelize.query(
        `INSERT INTO character_traits (school_id, branch_id, category, description, section)
         VALUES (:school_id, :branch_id, :category, :description, :section)`,
        {
          replacements: { school_id: finalSchoolId, branch_id: finalBranchId, category, description, section },
          type: db.Sequelize.QueryTypes.INSERT
        }
      );
      return res.json({ success: true, message: 'Character trait created successfully' });
    }

    // Update Character
    if (query_type === 'Update Character') {
      await db.sequelize.query(
        `UPDATE character_traits 
         SET category = :category, description = :description, section = :section
         WHERE id = :id AND school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: { id, category, description, section, school_id: finalSchoolId, branch_id: finalBranchId },
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );
      return res.json({ success: true, message: 'Character trait updated successfully' });
    }

    // Delete Character
    if (query_type === 'Delete Character') {
      await db.sequelize.query(
        `DELETE FROM character_traits 
         WHERE id = :id AND school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: { id, school_id: finalSchoolId, branch_id: finalBranchId },
          type: db.Sequelize.QueryTypes.DELETE
        }
      );
      return res.json({ success: true, message: 'Character trait deleted successfully' });
    }

    res.status(400).json({ success: false, message: 'Invalid query_type' });
  } catch (error) {
    console.error('Character traits error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

module.exports = {
  getCharacterTraits,
  manageCharacterTraits
};
