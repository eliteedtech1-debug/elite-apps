const db = require('../models');

/**
 * Utility to ensure admin users exist in teachers table for payroll enrollment
 */
class AdminTeacherSync {
  
  /**
   * Get admin users that need to be synced to teachers table
   */
  static async getAdminUsersToSync(schoolId = null, branchId = null) {
    try {
      console.log('🔍 Finding admin users that need syncing...');
      
      let whereClause = "u.user_type IN ('admin', 'branchadmin') AND u.status = 'Active'";
      let replacements = [];
      
      if (schoolId) {
        whereClause += " AND u.school_id = ?";
        replacements.push(schoolId);
      }
      
      if (branchId) {
        whereClause += " AND u.branch_id = ?";
        replacements.push(branchId);
      }

      // Find admin users not in teachers table
      const missingAdmins = await db.sequelize.query(`
        SELECT 
          u.id as user_id,
          u.name,
          u.email,
          u.phone as mobile_no,
          u.school_id,
          u.branch_id,
          u.user_type,
          u.createdAt as created_at
        FROM users u
        WHERE ${whereClause}
        AND u.id NOT IN (
          SELECT DISTINCT user_id 
          FROM teachers 
          WHERE user_id IS NOT NULL
        )
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      return {
        success: true,
        admins: missingAdmins,
        count: missingAdmins.length
      };

    } catch (error) {
      console.error('❌ Error finding admin users to sync:', error);
      return {
        success: false,
        error: error.message,
        admins: [],
        count: 0
      };
    }
  }

  /**
   * Add specific admin users to teachers table with selected roles
   */
  static async addAdminUsersToTeachers(adminUsers) {
    try {
      console.log(`🔄 Adding ${adminUsers.length} admin users to teachers table...`);
      
      let addedCount = 0;

      for (const admin of adminUsers) {
        await db.sequelize.query(`
          INSERT INTO teachers (
            name, email, mobile_no, staff_role, school_id, branch_id, 
            user_id, status, date_enrolled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, NOW(), NOW())
        `, {
          replacements: [
            admin.name,
            admin.email,
            admin.mobile_no || '',
            admin.staff_role,
            admin.school_id,
            admin.branch_id,
            admin.user_id,
            admin.created_at
          ]
        });

        console.log(`✅ Added ${admin.name} (${admin.staff_role}) to teachers table`);
        addedCount++;
      }

      return {
        success: true,
        added: addedCount,
        message: `Successfully added ${addedCount} admin users to teachers table`
      };

    } catch (error) {
      console.error('❌ Error adding admin users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync admin/branchadmin users to teachers table (legacy method)
   */
  static async syncAdminUsers(schoolId = null, branchId = null) {
    try {
      console.log('🔄 Syncing admin users to teachers table...');
      
      let whereClause = "u.user_type IN ('admin', 'branchadmin') AND u.status = 'Active'";
      let replacements = [];
      
      if (schoolId) {
        whereClause += " AND u.school_id = ?";
        replacements.push(schoolId);
      }
      
      if (branchId) {
        whereClause += " AND u.branch_id = ?";
        replacements.push(branchId);
      }

      // Find admin users not in teachers table
      const missingAdmins = await db.sequelize.query(`
        SELECT 
          u.id as user_id,
          u.name,
          u.email,
          u.phone as mobile_no,
          u.school_id,
          u.branch_id,
          u.user_type,
          u.createdAt as created_at
        FROM users u
        WHERE ${whereClause}
        AND u.id NOT IN (
          SELECT DISTINCT user_id 
          FROM teachers 
          WHERE user_id IS NOT NULL
        )
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      console.log(`📊 Found ${missingAdmins.length} admin users to add to teachers table`);

      // Add missing admins to teachers table
      for (const admin of missingAdmins) {
        const staffRole = admin.user_type === 'admin' ? 'Principal' : 'Director';
        
        await db.sequelize.query(`
          INSERT INTO teachers (
            name, email, mobile_no, staff_role, school_id, branch_id, 
            user_id, status, date_enrolled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, NOW(), NOW())
        `, {
          replacements: [
            admin.name,
            admin.email,
            admin.mobile_no,
            staffRole,
            admin.school_id,
            admin.branch_id,
            admin.user_id,
            admin.created_at
          ]
        });

        console.log(`✅ Added ${admin.name} (${staffRole}) to teachers table`);
      }

      // Update existing teachers with missing user_id linkage
      const updatedLinks = await db.sequelize.query(`
        UPDATE teachers t
        JOIN users u ON (
          t.email = u.email 
          AND t.school_id = u.school_id 
          AND (t.branch_id = u.branch_id OR (t.branch_id IS NULL AND u.branch_id IS NULL))
        )
        SET t.user_id = u.id
        WHERE t.user_id IS NULL 
        AND u.user_type IN ('admin', 'branchadmin', 'teacher')
        AND u.status = 'Active'
        ${schoolId ? 'AND u.school_id = ?' : ''}
        ${branchId ? 'AND u.branch_id = ?' : ''}
      `, {
        replacements: schoolId && branchId ? [schoolId, branchId] : 
                     schoolId ? [schoolId] : []
      });

      return {
        success: true,
        added: missingAdmins.length,
        message: `Successfully synced ${missingAdmins.length} admin users to teachers table`
      };

    } catch (error) {
      console.error('❌ Error syncing admin users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get admin users who can be enrolled in payroll
   */
  static async getAdminTeachers(schoolId, branchId = null) {
    try {
      let whereClause = "t.school_id = ?";
      let replacements = [schoolId];
      
      if (branchId) {
        whereClause += " AND t.branch_id = ?";
        replacements.push(branchId);
      }

      const adminTeachers = await db.sequelize.query(`
        SELECT 
          t.id,
          t.name,
          t.email,
          t.staff_role,
          t.payroll_status,
          t.grade_id,
          t.step,
          u.user_type
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE ${whereClause}
        AND u.user_type IN ('admin', 'branchadmin')
        AND t.status = 'Active'
        ORDER BY t.staff_role, t.name
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      return adminTeachers;
    } catch (error) {
      console.error('❌ Error getting admin teachers:', error);
      return [];
    }
  }
}

module.exports = AdminTeacherSync;
