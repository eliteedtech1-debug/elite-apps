const passport = require("passport");
const { manageBranches, branchAdmin, getBranchAdmin, updateBranchAdmin, attendanceSetup, updateBranchSettings } = require("../controllers/school_location");
const { conditionalAuth, authBypass } = require("../middleware/authBypass");
const db = require("../models");
// const {authenticate} = require('../middleware/auth')
module.exports = (app) => {
  // Create a new branch
  app.post("/branches", 
    passport.authenticate("jwt", { session: false }), (req, res) => {
    req.body.query_type = "create";
    manageBranches(req, res);
  });

  // Get all branches for a specific school
  app.get("/branches", 
    conditionalAuth, (req, res,  next) => {
    req.body =  req.query
    manageBranches(req, res);
  })
  // Update a branch
  app.put("/branches/:branch_id",  passport.authenticate("jwt", { session: false }), (req, res) => {
    req.body.query_type = "update";
    req.body.branch_id = req.params.branch_id;
    manageBranches(req, res);
  });

  // Delete a specific branch
  app.delete("/branches/:branch_id",  passport.authenticate("jwt", { session: false }), (req, res) => {
    req.body = {
      query_type: "delete_one",
      branch_id: req.params.branch_id
    };
    manageBranches(req, res);
  });

  // Get branch admin
  app.get("/get-branch-admin", 
    passport.authenticate("jwt", { session: false }),
    getBranchAdmin
  );

  // Create branch admin
  app.post("/branch-admin", 
    passport.authenticate("jwt", { session: false }),
    branchAdmin
  );

  // Update branch admin
  app.post("/update-branch-admin", 
    passport.authenticate("jwt", { session: false }),
    updateBranchAdmin
  );

  // Delete branch admin
  app.delete("/delete-branch-admin", 
    passport.authenticate("jwt", { session: false }),
    updateBranchAdmin
  );
  // Update branch personal development scale
  app.post("/update-branch-personal-dev-scale", 
    passport.authenticate("jwt", { session: false }), 
    async (req, res) => {
      try {
        const { personal_dev_scale } = req.body;
        const branch_id = req.headers['x-branch-id'];
        const { school_id } = req.user;
        
        if (!branch_id) {
          return res.status(400).json({
            success: false,
            message: 'Branch ID is required'
          });
        }
        
        if (!personal_dev_scale || !['Alphabet', 'Numeric'].includes(personal_dev_scale)) {
          return res.status(400).json({
            success: false,
            message: 'Valid personal_dev_scale is required (Alphabet or Numeric)'
          });
        }
        
        const db = require('../models');
        
        // Update branch personal development scale
        await db.sequelize.query(
          `UPDATE school_locations 
           SET personal_dev_scale = :personal_dev_scale 
           WHERE branch_id = :branch_id 
           AND school_id = :school_id`,
          {
            replacements: { personal_dev_scale, branch_id, school_id },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );
        
        res.json({
          success: true,
          message: 'Branch personal development scale updated successfully',
          data: { personal_dev_scale, branch_id }
        });
      } catch (error) {
        console.error('Update branch personal dev scale error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update branch personal development scale',
          error: error.message
        });
      }
    }
  );

  // Debug endpoint for branches (no auth required) - for testing
  app.get("/branches-debug", (req, res) => {
    console.log('🔍 BRANCHES DEBUG REQUEST RECEIVED');
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    
    res.json({
      success: true,
      message: 'Branches debug endpoint is accessible',
      timestamp: new Date().toISOString(),
      headers: {
        'x-school-id': req.headers['x-school-id'],
        'x-branch-id': req.headers['x-branch-id'],
        'x-user-id': req.headers['x-user-id'],
        'x-user-type': req.headers['x-user-type'],
        'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
      },
      query: req.query,
      endpoint: 'branches-debug'
    });
  });

  app.put("/school-locations/:branch_id", passport.authenticate("jwt", { session: false }), updateBranchSettings);

  // Update branch opening and closing times
  app.post("/update-branch-times", passport.authenticate("jwt", { session: false }), async (req, res) => {
    try {
      const { branch_id } = req.query;
      const { opening_time, closing_time } = req.body;
      const { school_id } = req.user;
      
      if (!branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required'
        });
      }
      
      await db.sequelize.query(
        `UPDATE school_locations 
         SET opening_time = :opening_time, closing_time = :closing_time 
         WHERE branch_id = :branch_id 
         AND school_id = :school_id`,
        {
          replacements: { opening_time, closing_time, branch_id, school_id },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
      
      res.json({
        success: true,
        message: 'Branch times updated successfully',
        data: { opening_time, closing_time, branch_id }
      });
    } catch (error) {
      console.error('Update branch times error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update branch times',
        error: error.message
      });
    }
  });

  // Update bill format setting
  app.post("/api/school-locations/bill-format", passport.authenticate("jwt", { session: false }), async (req, res) => {
    try {
      const { branch_id, bill_format_with_breakdown } = req.body;
      const { school_id } = req.user;
      
      if (!branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required'
        });
      }
      
      await db.sequelize.query(
        `UPDATE school_locations 
         SET bill_format_with_breakdown = :bill_format_with_breakdown 
         WHERE branch_id = :branch_id 
         AND school_id = :school_id`,
        {
          replacements: { bill_format_with_breakdown, branch_id, school_id },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
      
      // Return the updated branch data
      const [updatedBranch] = await db.sequelize.query(
        `SELECT * FROM school_locations 
         WHERE branch_id = :branch_id AND school_id = :school_id`,
        {
          replacements: { branch_id, school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      
      res.json({
        success: true,
        message: 'Bill format setting updated successfully',
        data: updatedBranch
      });
    } catch (error) {
      console.error('Update bill format error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bill format setting',
        error: error.message
      });
    }
  });
};
