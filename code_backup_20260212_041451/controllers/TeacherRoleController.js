const db = require('../models');
const { Op } = require('sequelize');

class TeacherRoleController {
  // GET /api/v1/teacher-roles - Get teacher roles with permissions
  async getTeacherRoles(req, res) {
    try {
      const { school_id } = req.user;
      const { teacher_id, role_type, department } = req.query;

      const whereClause = { school_id };
      
      if (teacher_id) whereClause.teacher_id = teacher_id;
      if (role_type) whereClause.role_type = role_type;
      if (department) whereClause.department = department;

      const teacherRoles = await db.TeacherRole.findAll({
        where: whereClause,
        include: [{
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: teacherRoles,
        message: 'Teacher roles retrieved successfully'
      });
    } catch (error) {
      console.error('Get teacher roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve teacher roles'
      });
    }
  }

  // POST /api/v1/teacher-roles - Create or update teacher role
  async createTeacherRole(req, res) {
    try {
      const { school_id, id: current_user_id } = req.user;
      const { 
        teacher_id, 
        role_type, 
        department, 
        custom_permissions = {} 
      } = req.body;

      // Validate required fields
      if (!teacher_id || !role_type) {
        return res.status(400).json({
          success: false,
          error: 'Teacher ID and role type are required'
        });
      }

      // Check if teacher exists
      const teacher = await db.Staff.findByPk(teacher_id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          error: 'Teacher not found'
        });
      }

      // Get default permissions for role type
      const defaultPermissions = db.TeacherRole.getDefaultPermissions(role_type);
      const finalPermissions = { ...defaultPermissions, ...custom_permissions };

      // Create or update teacher role
      const [teacherRole, created] = await db.TeacherRole.findOrCreate({
        where: {
          teacher_id,
          school_id
        },
        defaults: {
          role_type,
          department,
          permissions: finalPermissions,
          is_active: true
        }
      });

      if (!created) {
        await teacherRole.update({
          role_type,
          department,
          permissions: finalPermissions
        });
      }

      // Load the complete teacher role with associations
      const completeTeacherRole = await db.TeacherRole.findByPk(teacherRole.id, {
        include: [{
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }]
      });

      res.status(created ? 201 : 200).json({
        success: true,
        data: completeTeacherRole,
        message: `Teacher role ${created ? 'created' : 'updated'} successfully`
      });
    } catch (error) {
      console.error('Create teacher role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create teacher role'
      });
    }
  }

  // PUT /api/v1/teacher-roles/:id/permissions - Update teacher permissions
  async updateTeacherPermissions(req, res) {
    try {
      const { id } = req.params;
      const { school_id } = req.user;
      const { permissions } = req.body;

      const teacherRole = await db.TeacherRole.findOne({
        where: { id, school_id }
      });

      if (!teacherRole) {
        return res.status(404).json({
          success: false,
          error: 'Teacher role not found'
        });
      }

      // Update permissions
      const updatedPermissions = { ...teacherRole.permissions, ...permissions };
      await teacherRole.update({ permissions: updatedPermissions });

      res.json({
        success: true,
        data: teacherRole,
        message: 'Teacher permissions updated successfully'
      });
    } catch (error) {
      console.error('Update teacher permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update teacher permissions'
      });
    }
  }

  // GET /api/v1/teacher-roles/permissions/:teacher_id - Get teacher permissions
  async getTeacherPermissions(req, res) {
    try {
      const { teacher_id } = req.params;
      const { school_id } = req.user;

      // Get teacher role permissions
      const teacherRole = await db.TeacherRole.findOne({
        where: {
          teacher_id,
          school_id,
          is_active: true
        }
      });

      // Get additional permissions
      const additionalPermissions = await db.TeacherPermission.getTeacherPermissions(teacher_id);

      // Combine permissions
      const rolePermissions = teacherRole ? teacherRole.permissions : {};
      const allPermissions = { ...rolePermissions, ...additionalPermissions };

      res.json({
        success: true,
        data: {
          teacher_id: parseInt(teacher_id),
          role_type: teacherRole?.role_type || 'Subject Teacher',
          department: teacherRole?.department,
          permissions: allPermissions,
          role_permissions: rolePermissions,
          additional_permissions: additionalPermissions
        },
        message: 'Teacher permissions retrieved successfully'
      });
    } catch (error) {
      console.error('Get teacher permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve teacher permissions'
      });
    }
  }

  // POST /api/v1/teacher-roles/check-permission - Check specific permission
  async checkPermission(req, res) {
    try {
      const { teacher_id, permission_key } = req.body;

      if (!teacher_id || !permission_key) {
        return res.status(400).json({
          success: false,
          error: 'Teacher ID and permission key are required'
        });
      }

      // Check role-based permission
      const teacherRole = await db.TeacherRole.findOne({
        where: {
          teacher_id,
          is_active: true
        }
      });

      let hasPermission = false;

      if (teacherRole && teacherRole.hasPermission(permission_key)) {
        hasPermission = true;
      } else {
        // Check additional permissions
        hasPermission = await db.TeacherPermission.checkPermission(teacher_id, permission_key);
      }

      res.json({
        success: true,
        data: {
          teacher_id: parseInt(teacher_id),
          permission_key,
          has_permission: hasPermission,
          source: hasPermission ? (teacherRole?.hasPermission(permission_key) ? 'role' : 'additional') : null
        },
        message: 'Permission check completed'
      });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check permission'
      });
    }
  }

  // GET /api/v1/teacher-roles/role-types - Get available role types with permissions
  async getRoleTypes(req, res) {
    try {
      const roleTypes = [
        'Form Master',
        'Subject Teacher',
        'Curriculum Designer',
        'Department Head',
        'Mentor Teacher',
        'Content Reviewer'
      ];

      const roleTypesWithPermissions = roleTypes.map(roleType => ({
        role_type: roleType,
        default_permissions: db.TeacherRole.getDefaultPermissions(roleType),
        description: this.getRoleDescription(roleType)
      }));

      res.json({
        success: true,
        data: roleTypesWithPermissions,
        message: 'Role types retrieved successfully'
      });
    } catch (error) {
      console.error('Get role types error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve role types'
      });
    }
  }

  // Helper method to get role descriptions
  getRoleDescription(roleType) {
    const descriptions = {
      'Form Master': 'Responsible for overall class management and student welfare',
      'Subject Teacher': 'Teaches specific subjects and creates lesson plans',
      'Curriculum Designer': 'Designs and structures curriculum content',
      'Department Head': 'Manages department operations and approves content',
      'Mentor Teacher': 'Provides guidance and mentorship to other teachers',
      'Content Reviewer': 'Reviews and ensures quality of educational content'
    };

    return descriptions[roleType] || 'Standard teaching role';
  }

  // DELETE /api/v1/teacher-roles/:id - Deactivate teacher role
  async deactivateTeacherRole(req, res) {
    try {
      const { id } = req.params;
      const { school_id } = req.user;

      const teacherRole = await db.TeacherRole.findOne({
        where: { id, school_id }
      });

      if (!teacherRole) {
        return res.status(404).json({
          success: false,
          error: 'Teacher role not found'
        });
      }

      await teacherRole.update({ is_active: false });

      res.json({
        success: true,
        message: 'Teacher role deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate teacher role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate teacher role'
      });
    }
  }

  // GET /api/v1/teacher-roles/analytics - Get role analytics
  async getRoleAnalytics(req, res) {
    try {
      const { school_id } = req.user;

      // Get role distribution
      const roleDistribution = await db.TeacherRole.findAll({
        where: { school_id, is_active: true },
        attributes: [
          'role_type',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['role_type'],
        raw: true
      });

      // Get department distribution
      const departmentDistribution = await db.TeacherRole.findAll({
        where: { 
          school_id, 
          is_active: true,
          department: { [Op.ne]: null }
        },
        attributes: [
          'department',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['department'],
        raw: true
      });

      // Get total active teachers
      const totalTeachers = await db.TeacherRole.count({
        where: { school_id, is_active: true }
      });

      res.json({
        success: true,
        data: {
          total_teachers: totalTeachers,
          role_distribution: roleDistribution.map(item => ({
            role_type: item.role_type,
            count: parseInt(item.count)
          })),
          department_distribution: departmentDistribution.map(item => ({
            department: item.department,
            count: parseInt(item.count)
          }))
        },
        message: 'Role analytics retrieved successfully'
      });
    } catch (error) {
      console.error('Get role analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve role analytics'
      });
    }
  }
}

module.exports = new TeacherRoleController();